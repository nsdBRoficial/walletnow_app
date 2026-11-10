/**
 * @module supabase\functions\mainnet-funding\index.ts
 * @description WalletNow Protocol - Arquitetura de carteira inteligente e pagamentos Stellar.
 */
/**
 * mainnet-funding — Supabase Edge Function (PRODUÇÃO)
 * =====================================================
 *
 * Motor exclusivo de Auto-Funding (createAccount) para carteiras novas na MAINNET.
 * Isola o processo de funding da testnet e treasury principal.
 *
 * RESPONSABILIDADES:
 * - Valida a requisição e JWT.
 * - Checa Rate Limiting (por user_id).
 * - Checa Trava Dupla no BD (mainnet_funding_audit) para 1 funding/user e 1 funding/pubkey.
 * - Verifica o saldo real no Horizon Public para redundância.
 * - Usa a MAINNET_TREASURY_SECRET (Supabase Secrets) para enviar 2 XLM atomicamente via `createAccount`.
 * - Registra sucesso/falha no BD `mainnet_funding_audit` para prevenir ataques de corrida.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  Keypair,
  TransactionBuilder,
  Networks,
  Operation,
  Horizon,
} from 'npm:@stellar/stellar-sdk@14.6.1';

// ─── Configuração de CORS ─────────────────────────────────────────────────────

function getCorsHeaders(requestOrigin: string | null): Record<string, string> {
  const env = Deno.env.get('APP_ENV') ?? 'dev';
  
  const allowedOrigins = [
    'https://walletnow.app',
    'https://www.walletnow.app',
    'https://walletnow-app.vercel.app',
  ];

  if (env !== 'production') {
    allowedOrigins.push(
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://localhost:5173',
      'http://127.0.0.1:5173'
    );
  }

  const allowedOrigin =
    requestOrigin && allowedOrigins.includes(requestOrigin)
      ? requestOrigin
      : allowedOrigins[0];

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-forwarded-for',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
}

// ─── Tipos e Validações ────────────────────────────────────────────────────────
const STELLAR_PUBLIC_KEY_REGEX = /^G[A-Z2-7]{55}$/;
const FUNDING_AMOUNT = '2.0'; // Quantidade enviada na operação createAccount
const NETWORK = 'mainnet';

interface FundingRequest {
  publicKey: string;
}

// ─── Rate Limiting Em Memória ────────────────────────────────────────────────
const rateLimitMap = new Map<string, { count: number; windowStart: number }>();
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW = 60 * 1000;

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const existing = rateLimitMap.get(userId);

  if (!existing || now - existing.windowStart > RATE_LIMIT_WINDOW) {
    rateLimitMap.set(userId, { count: 1, windowStart: now });
    return true;
  }

  if (existing.count >= RATE_LIMIT_MAX) return false;

  existing.count += 1;
  return true;
}

// ─── Handler Principal ────────────────────────────────────────────────────────

serve(async (req: Request) => {
  const requestOrigin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(requestOrigin);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders, status: 200 });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ success: false, error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const errorResponse = (message: string, code: string, status = 400) =>
    new Response(JSON.stringify({ success: false, error: message, errorCode: code }), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  try {
    // 1. Validar JWT Supabase
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return errorResponse('Autenticação necessária.', 'UNAUTHORIZED', 401);
    }

    const jwt = authHeader.replace('Bearer ', '');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false },
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(jwt);
    if (authError || !user) {
      return errorResponse('Token inválido ou expirado.', 'INVALID_TOKEN', 401);
    }
    const userId = user.id;

    // 2. Rate Limiting em memória (Proteção L1)
    if (!checkRateLimit(userId)) {
      return errorResponse('Muitas requisições. Aguarde.', 'RATE_LIMIT', 429);
    }

    // 3. Body Parsing
    const body = (await req.json()) as FundingRequest;
    if (!body?.publicKey || !STELLAR_PUBLIC_KEY_REGEX.test(body.publicKey)) {
      return errorResponse('Public Key inválida.', 'INVALID_PUBKEY');
    }

    // 4. Conexão Supabase Service Role (Para gravar bypassando RLS)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    // 5. Proteção L2: Trava Dupla (Audit Table)
    console.log(`[MainnetFunding] Verificando trava dupla (Audit Table) para userId: ${userId} e publicKey: ${body.publicKey}`);
    const { data: existingAudit, error: auditCheckError } = await supabaseAdmin
      .from('mainnet_funding_audit')
      .select('id')
      .or(`user_id.eq.${userId},public_key.eq.${body.publicKey}`)
      .limit(1);
      
    if (auditCheckError) {
      console.error('[FundingAudit] DB Check Error:', auditCheckError);
      return errorResponse('Erro interno.', 'DB_ERROR', 500);
    }

    if (existingAudit && existingAudit.length > 0) {
      console.warn(`[FundingAudit] Bloqueado: Funding já realizado para userId: ${userId} ou publicKey: ${body.publicKey}`);
      return errorResponse('Funding já realizado para este usuário ou carteira.', 'ALREADY_FUNDED_DB', 409);
    }
    console.log(`[FundingAudit] Trava dupla verificada: Nenhuma auditoria prévia encontrada.`);

    // 6. Proteção L3: Horizon (garantir que a conta não exista ainda na Mainnet)
    console.log(`[HorizonMainnet] Verificando existência da conta no Horizon Mainnet: ${body.publicKey}`);
    const horizonUrl = 'https://horizon.stellar.org';
    const horizonServer = new Horizon.Server(horizonUrl);
    try {
      await horizonServer.loadAccount(body.publicKey);
      console.warn(`[HorizonMainnet] Bloqueado: Conta já existe na Mainnet (Ledger).`);
      return errorResponse('Conta já existe na Mainnet.', 'ALREADY_FUNDED_HORIZON', 409);
    } catch (e: any) {
      if (e.response?.status !== 404) {
        console.error('[HorizonMainnet] Erro de comunicação Horizon:', e.message);
        return errorResponse('Erro de comunicação Horizon.', 'HORIZON_ERROR', 502);
      }
      console.log(`[HorizonMainnet] Conta não encontrada (404). Pronta para createAccount.`);
    }

    // 7. Preparar Transação MAINNET
    console.log(`[MainnetTreasury] Preparando transação de createAccount...`);
    const treasurySecret = Deno.env.get('MAINNET_TREASURY_SECRET');
    if (!treasurySecret) {
      console.error('[MainnetTreasury] CRITICAL: MAINNET_TREASURY_SECRET não configurada!');
      return errorResponse('Treasury não configurada.', 'NO_TREASURY', 500);
    }

    let treasuryKeypair: Keypair;
    try {
      treasuryKeypair = Keypair.fromSecret(treasurySecret);
    } catch {
      return errorResponse('Treasury Secret inválida.', 'INVALID_TREASURY', 500);
    }

    const treasuryAccount = await horizonServer.loadAccount(treasuryKeypair.publicKey());
    const baseFee = Deno.env.get('STELLAR_BASE_FEE') || '100000';

    console.log(`[CreateAccount] Construindo transação atômica. Destino: ${body.publicKey}, Amount: ${FUNDING_AMOUNT} XLM`);
    const transaction = new TransactionBuilder(treasuryAccount, {
      fee: baseFee,
      networkPassphrase: Networks.PUBLIC,
    })
      .addOperation(
        Operation.createAccount({
          destination: body.publicKey,
          startingBalance: FUNDING_AMOUNT,
        })
      )
      .setTimeout(30)
      .build();

    console.log(`[CreateAccount] Assinando transação com MAINNET_TREASURY_SECRET...`);
    transaction.sign(treasuryKeypair);

    // 8. Submit via Horizon
    console.log(`[HorizonMainnet] Submetendo transação createAccount para a rede...`);
    let txHash: string;
    let ledger: number;
    try {
      const response = await horizonServer.submitTransaction(transaction);
      txHash = response.hash;
      ledger = response.ledger;
    } catch (opError: any) {
      console.error('[mainnet-funding] TX Failed:', opError?.response?.data?.extras?.result_codes || opError.message);
      return errorResponse('Falha ao executar funding na Mainnet.', 'TX_FAILED', 502);
    }

    // 9. Registrar Auditoria (Trava persistente)
    console.log(`[FundingAudit] Registrando funding no banco de dados para txHash: ${txHash}`);
    await supabaseAdmin.from('mainnet_funding_audit').insert({
      user_id: userId,
      public_key: body.publicKey,
      tx_hash: txHash,
      amount: parseFloat(FUNDING_AMOUNT),
      network: NETWORK,
    });

    console.log(`[MainnetFunding] ✅ SUCCESS! Conta criada: ${body.publicKey.slice(0, 8)}... Hash: ${txHash}, Ledger: ${ledger}`);

    return new Response(
      JSON.stringify({
        success: true,
        txHash,
        ledger,
        finalBalance: FUNDING_AMOUNT,
        explorerUrl: `https://stellar.expert/explorer/public/tx/${txHash}`
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err: any) {
    console.error('[mainnet-funding] Unexpected Error:', err.message);
    return errorResponse('Erro interno inesperado.', 'INTERNAL_ERROR', 500);
  }
});
