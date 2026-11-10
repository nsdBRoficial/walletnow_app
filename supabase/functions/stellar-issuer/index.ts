/**
 * @module supabase\functions\stellar-issuer\index.ts
 * @description WalletNow Protocol - Arquitetura de carteira inteligente e pagamentos Stellar.
 */
/**
 * stellar-issuer — Supabase Edge Function (PRODUÇÃO)
 * =====================================================
 *
 * Motor de assinatura server-side da WalletNow.
 * Centraliza TODAS as operações que requerem a issuer secret key.
 *
 * SEGURANÇA:
 * - STELLAR_ISSUER_SECRET vive APENAS em Supabase Vault (nunca no bundle client)
 * - JWT Supabase validado em TODAS as requisições
 * - Rate limiting por user_id (10 req/min)
 * - Whitelist de operações Stellar permitidas (nenhuma operação arbitrária)
 * - Validação rigorosa de todos os parâmetros de entrada
 * - Validação do conteúdo do XDR parcial antes de co-assinar
 * - Logs sanitizados — NUNCA logam chaves, JWTs ou seeds
 * - CORS restrito a origens autorizadas
 *
 * ACTIONS DISPONÍVEIS:
 * - fund_wallet:         ativa conta com XLM via treasury (sem user XDR)
 * - sponsor_wallet:      setup de trustline patrocinado (XDR parcial do user)
 * - mint_asset:          emite tokens para o usuário (XDR parcial se trustline nova)
 * - burn_asset:          queima tokens do usuário (XDR parcial do user)
 * - swap_assets:         troca de ativos via issuer market maker (XDR parcial)
 * - send_on_chain:       envio P2P gasless (XDR parcial)
 * - mint_reputation_zk:  mint de NFT KYC (XDR parcial)
 *
 * CONFIGURAR SECRETS (antes do deploy):
 *   supabase secrets set STELLAR_ISSUER_SECRET=S...
 *   supabase secrets set STELLAR_ISSUER_PUBLIC=G...
 *   supabase secrets set STELLAR_NETWORK=testnet
 *   supabase secrets set STELLAR_BASE_FEE=100000
 *
 * DEPLOY:
 *   supabase functions deploy stellar-issuer
 *
 * @see docs/mainnet/KEY_MANAGEMENT.md
 * @see docs/mainnet/EDGE_FUNCTION_DEPLOY.md
 * @see docs/mainnet/ISSUER_MIGRATION_AUDIT.md
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  Keypair,
  TransactionBuilder,
  Transaction,
  Networks,
  Operation,
  Asset,
  Memo,
  xdr,
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

  // Adiciona localhost dinamicamente apenas fora de produção
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

// ─── Tipos ────────────────────────────────────────────────────────────────────

type StellarNetworkType = 'testnet' | 'mainnet';

type IssuerAction =
  | 'fund_wallet'
  | 'sponsor_wallet'
  | 'mint_asset'
  | 'burn_asset'
  | 'swap_assets'
  | 'send_on_chain'
  | 'mint_reputation_zk';

interface BaseRequest {
  action: IssuerAction;
}

interface FundWalletRequest extends BaseRequest {
  action: 'fund_wallet';
  publicKey: string;
}

interface SponsorWalletRequest extends BaseRequest {
  action: 'sponsor_wallet';
  publicKey: string;
  partialXdr: string; // XDR base64 assinado pelo usuário
}

interface MintAssetRequest extends BaseRequest {
  action: 'mint_asset';
  publicKey: string;
  assetCode: string;
  amount: string;
  correlationId?: string;
  partialXdr?: string; // Presente se trustline nova (requer co-assinatura do user)
}

interface BurnAssetRequest extends BaseRequest {
  action: 'burn_asset';
  partialXdr: string;
  amount: string;
  correlationId: string;
}

interface SwapAssetsRequest extends BaseRequest {
  action: 'swap_assets';
  partialXdr: string;
  fromAssetCode: string;
  toAssetCode: string;
  payAmount: string;
  receiveAmount: string;
}

interface SendOnChainRequest extends BaseRequest {
  action: 'send_on_chain';
  partialXdr: string;
  destPublicKey: string;
  assetCode: string;
  amount: string;
}

interface MintReputationZkRequest extends BaseRequest {
  action: 'mint_reputation_zk';
  publicKey: string;
  partialXdr: string;
  zkHash: string;
}

type IssuerRequest =
  | FundWalletRequest
  | SponsorWalletRequest
  | MintAssetRequest
  | BurnAssetRequest
  | SwapAssetsRequest
  | SendOnChainRequest
  | MintReputationZkRequest;

interface IssuerResponse {
  success: boolean;
  txHash?: string;
  error?: string;
  errorCode?: string;
}

// ─── Rate Limiting (em memória — suficiente para Edge Function stateless) ────

const rateLimitMap = new Map<string, { count: number; windowStart: number }>();
const RATE_LIMIT_MAX = 10;   // máx 10 requisições
const RATE_LIMIT_WINDOW = 60 * 1000; // por minuto

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const existing = rateLimitMap.get(userId);

  if (!existing || now - existing.windowStart > RATE_LIMIT_WINDOW) {
    rateLimitMap.set(userId, { count: 1, windowStart: now });
    return true; // OK
  }

  if (existing.count >= RATE_LIMIT_MAX) {
    return false; // Rate limit atingido
  }

  existing.count += 1;
  return true; // OK
}

// ─── Validação de Parâmetros ──────────────────────────────────────────────────

const STELLAR_PUBLIC_KEY_REGEX = /^G[A-Z2-7]{55}$/;
const ASSET_CODE_REGEX = /^[A-Z0-9]{1,12}$/;
const AMOUNT_REGEX = /^\d+(\.\d{1,7})?$/;
// Tipos de Operação Stellar permitidos para co-assinatura (whitelist estrita)
const ALLOWED_OPERATION_TYPES = new Set([
  'payment',
  'changeTrust',
  'createAccount',
  'beginSponsoringFutureReserves',
  'endSponsoringFutureReserves',
]);

function validatePublicKey(key: string): boolean {
  return STELLAR_PUBLIC_KEY_REGEX.test(key);
}

function validateAssetCode(code: string): boolean {
  return code === 'XLM' || ASSET_CODE_REGEX.test(code);
}

function validateAmount(amount: string): boolean {
  return AMOUNT_REGEX.test(amount) && parseFloat(amount) > 0 && parseFloat(amount) < 1_000_000;
}

/**
 * Valida e deserializa um XDR parcial.
 * Garante que:
 * 1. O XDR é uma transação Stellar válida
 * 2. Todas as operações estão na whitelist
 * 3. O XDR não contém operações maliciosas
 */
function validateAndDeserializeXdr(
  partialXdr: string,
  networkPassphrase: string
): Transaction {
  let tx: Transaction;
  try {
    tx = new Transaction(partialXdr, networkPassphrase);
  } catch (e) {
    throw new Error('XDR inválido ou malformado.');
  }

  // Validar que todas as operações são do tipo permitido
  for (const op of tx.operations) {
    if (!ALLOWED_OPERATION_TYPES.has(op.type)) {
      throw new Error(`Tipo de operação não permitido: ${op.type}`);
    }
  }

  return tx;
}

// ─── Utilitários Stellar ──────────────────────────────────────────────────────

function getNetworkPassphrase(network: StellarNetworkType): string {
  return network === 'mainnet' ? Networks.PUBLIC : Networks.TESTNET;
}

function getHorizonUrl(network: StellarNetworkType): string {
  return network === 'mainnet'
    ? 'https://horizon.stellar.org'
    : 'https://horizon-testnet.stellar.org';
}

function getAsset(code: string, issuerPublic: string): Asset {
  return code === 'XLM' ? Asset.native() : new Asset(code, issuerPublic);
}

// ─── Handlers de Cada Action ──────────────────────────────────────────────────

/**
 * fund_wallet: Ativa uma nova conta Stellar com XLM da treasury.
 * Não requer assinatura do usuário.
 */
async function handleFundWallet(
  payload: FundWalletRequest,
  issuerKeypair: Keypair,
  baseFee: string,
  networkPassphrase: string,
  horizonUrl: string
): Promise<string> {
  if (!validatePublicKey(payload.publicKey)) {
    throw new Error('publicKey inválida.');
  }

  const horizonServer = new Horizon.Server(horizonUrl);
  const issuerAccount = await horizonServer.loadAccount(issuerKeypair.publicKey());

  // Verificar se a conta já existe para não desperdiçar XLM
  try {
    await horizonServer.loadAccount(payload.publicKey);
    // Se chegou aqui, conta já existe
    return 'ALREADY_FUNDED';
  } catch (e: any) {
    if (e.response?.status !== 404) throw e;
  }

  const transaction = new TransactionBuilder(issuerAccount, {
    fee: baseFee,
    networkPassphrase,
  })
    .addOperation(
      Operation.createAccount({
        destination: payload.publicKey,
        startingBalance: '1.5', // 1 XLM base reserve + 0.5 XLM buffer para trustlines
      })
    )
    .setTimeout(30)
    .build();

  transaction.sign(issuerKeypair);

  const response = await horizonServer.submitTransaction(transaction);
  return response.hash;
}

/**
 * sponsor_wallet: Co-assina um XDR parcial do usuário para setup de trustlines patrocinado.
 * O usuário já assinou o XDR. A Edge Function valida, adiciona assinatura do issuer e submete.
 */
async function handleSponsorWallet(
  payload: SponsorWalletRequest,
  issuerKeypair: Keypair,
  networkPassphrase: string,
  horizonUrl: string
): Promise<string> {
  if (!validatePublicKey(payload.publicKey)) {
    throw new Error('publicKey inválida.');
  }

  const tx = validateAndDeserializeXdr(payload.partialXdr, networkPassphrase);

  // Segurança: garantir que o fee payer não é diferente do issuer esperado
  if (tx.source !== issuerKeypair.publicKey()) {
    throw new Error('XDR inválido: fonte da transação inesperada.');
  }

  tx.sign(issuerKeypair);

  const horizonServer = new Horizon.Server(horizonUrl);
  const response = await horizonServer.submitTransaction(tx);
  return response.hash;
}

/**
 * mint_asset: Emite tokens para o usuário.
 * - Se a conta/trustline já existe: Edge Function assina e submete sozinha.
 * - Se precisar de setup (conta nova): recebe XDR parcial do usuário, co-assina e submete.
 */
async function handleMintAsset(
  payload: MintAssetRequest,
  issuerKeypair: Keypair,
  baseFee: string,
  networkPassphrase: string,
  horizonUrl: string
): Promise<string> {
  if (!validatePublicKey(payload.publicKey)) throw new Error('publicKey inválida.');
  if (!validateAssetCode(payload.assetCode)) throw new Error('assetCode inválido.');
  if (!validateAmount(payload.amount)) throw new Error('amount inválido.');

  const horizonServer = new Horizon.Server(horizonUrl);
  const issuerAccount = await horizonServer.loadAccount(issuerKeypair.publicKey());
  const asset = getAsset(payload.assetCode, issuerKeypair.publicKey());

  // Caso 1: XDR parcial fornecido — conta nova ou sem trustline, requer co-assinatura
  if (payload.partialXdr) {
    const tx = validateAndDeserializeXdr(payload.partialXdr, networkPassphrase);

    // Verificar que a TX inclui operação de payment para o publicKey correto
    const hasPaymentToUser = tx.operations.some(
      op => op.type === 'payment' &&
        (op as any).destination === payload.publicKey &&
        (op as any).asset?.code === payload.assetCode
    );
    if (!hasPaymentToUser) {
      throw new Error('XDR não contém operação de payment válida para o usuário.');
    }

    tx.sign(issuerKeypair);
    const response = await horizonServer.submitTransaction(tx);
    return response.hash;
  }

  // Caso 2: Mint simples — conta e trustline já existem
  // Verificar que a trustline existe
  const userAccount = await horizonServer.loadAccount(payload.publicKey);
  const hasTrustline = userAccount.balances.some(
    (b: any) => b.asset_code === payload.assetCode && b.asset_issuer === issuerKeypair.publicKey()
  );

  if (!hasTrustline) {
    throw new Error('Trustline não existe. Forneça partialXdr com setup da trustline.');
  }

  const memoText = payload.correlationId
    ? `X402:${payload.correlationId.slice(0, 22)}`
    : undefined;

  const txBuilder = new TransactionBuilder(issuerAccount, {
    fee: baseFee,
    networkPassphrase,
    ...(memoText ? { memo: Memo.text(memoText) } : {}),
  })
    .addOperation(
      Operation.payment({
        destination: payload.publicKey,
        asset,
        amount: payload.amount,
      })
    )
    .setTimeout(30);

  const tx = txBuilder.build();
  tx.sign(issuerKeypair);

  const response = await horizonServer.submitTransaction(tx);
  return response.hash;
}

/**
 * burn_asset: Co-assina XDR de queima fornecido pelo usuário.
 * O usuário já assinou (dono dos tokens). A EF adiciona assinatura do issuer.
 */
async function handleBurnAsset(
  payload: BurnAssetRequest,
  issuerKeypair: Keypair,
  networkPassphrase: string,
  horizonUrl: string
): Promise<string> {
  if (!validateAmount(payload.amount)) throw new Error('amount inválido.');
  if (!payload.correlationId) throw new Error('correlationId obrigatório.');

  const tx = validateAndDeserializeXdr(payload.partialXdr, networkPassphrase);

  // Verificar que o XDR contém payment de volta para o issuer (padrão de burn)
  const hasBurnOp = tx.operations.some(
    op => op.type === 'payment' &&
      (op as any).destination === issuerKeypair.publicKey()
  );
  if (!hasBurnOp) {
    throw new Error('XDR de burn inválido: não contém payment para o issuer.');
  }

  tx.sign(issuerKeypair);

  const horizonServer = new Horizon.Server(horizonUrl);
  const response = await horizonServer.submitTransaction(tx);
  return response.hash;
}

/**
 * swap_assets: Co-assina XDR de swap (issuer como market maker).
 */
async function handleSwapAssets(
  payload: SwapAssetsRequest,
  issuerKeypair: Keypair,
  networkPassphrase: string,
  horizonUrl: string
): Promise<string> {
  if (!validateAssetCode(payload.fromAssetCode)) throw new Error('fromAssetCode inválido.');
  if (!validateAssetCode(payload.toAssetCode)) throw new Error('toAssetCode inválido.');
  if (!validateAmount(payload.payAmount)) throw new Error('payAmount inválido.');
  if (!validateAmount(payload.receiveAmount)) throw new Error('receiveAmount inválido.');

  const tx = validateAndDeserializeXdr(payload.partialXdr, networkPassphrase);
  tx.sign(issuerKeypair);

  const horizonServer = new Horizon.Server(horizonUrl);
  const response = await horizonServer.submitTransaction(tx);
  return response.hash;
}

/**
 * send_on_chain: Co-assina XDR de envio P2P (issuer paga as fees — gasless).
 */
async function handleSendOnChain(
  payload: SendOnChainRequest,
  issuerKeypair: Keypair,
  networkPassphrase: string,
  horizonUrl: string
): Promise<string> {
  if (!validatePublicKey(payload.destPublicKey)) throw new Error('destPublicKey inválida.');
  if (!validateAssetCode(payload.assetCode)) throw new Error('assetCode inválido.');
  if (!validateAmount(payload.amount)) throw new Error('amount inválido.');

  const tx = validateAndDeserializeXdr(payload.partialXdr, networkPassphrase);

  // Verificar que o destino é o publicKey declarado
  const hasCorrectPayment = tx.operations.some(
    op => op.type === 'payment' && (op as any).destination === payload.destPublicKey
  );
  if (!hasCorrectPayment) {
    throw new Error('XDR não contém payment válido para o destino declarado.');
  }

  tx.sign(issuerKeypair);

  const horizonServer = new Horizon.Server(horizonUrl);
  const response = await horizonServer.submitTransaction(tx);
  return response.hash;
}

/**
 * mint_reputation_zk: Co-assina XDR de mint do NFT KYC.
 */
async function handleMintReputationZk(
  payload: MintReputationZkRequest,
  issuerKeypair: Keypair,
  networkPassphrase: string,
  horizonUrl: string
): Promise<string> {
  if (!validatePublicKey(payload.publicKey)) throw new Error('publicKey inválida.');
  if (!payload.zkHash || payload.zkHash.length !== 64) throw new Error('zkHash inválido (deve ter 64 chars hex).');

  const tx = validateAndDeserializeXdr(payload.partialXdr, networkPassphrase);
  tx.sign(issuerKeypair);

  const horizonServer = new Horizon.Server(horizonUrl);
  const response = await horizonServer.submitTransaction(tx);
  return response.hash;
}

// ─── Supabase Audit Log ───────────────────────────────────────────────────────

async function logAuditEvent(
  supabaseAdmin: ReturnType<typeof createClient>,
  event: {
    event_type: string;
    user_id: string;
    resource_type: string;
    resource_id?: string;
    metadata?: Record<string, unknown>;
    ip_address?: string;
    status: 'success' | 'error';
  }
): Promise<void> {
  try {
    await supabaseAdmin.from('audit_logs').insert({
      event_type: event.event_type,
      user_id: event.user_id,
      resource_type: event.resource_type,
      resource_id: event.resource_id,
      metadata: event.metadata,
      ip_address: event.ip_address,
      status: event.status,
      created_at: new Date().toISOString(),
    });
  } catch (e) {
    // Falha no audit log não deve bloquear a operação — apenas logar
    console.error('[stellar-issuer] Falha ao registrar audit log:', (e as Error).message);
  }
}

// ─── Validação de Titularidade (R-04 / Anti-Abuso Gas Station) ─────────────────

/**
 * [PT-BR] Valida se a chave pública informada pertence ao usuário autenticado.
 * Consulta tanto a tabela moderna `wallet_accounts` quanto o perfil legado `profiles`.
 * Impede que um usuário autenticado solicite fundings ou patrocínios para contas de terceiros.
 */
async function verifyUserOwnsPublicKey(
  supabaseAdmin: any,
  userId: string,
  publicKey: string
): Promise<boolean> {
  try {
    // 1. Consulta em wallet_accounts (Multi-Account Architecture)
    const { data: account, error: accErr } = await supabaseAdmin
      .from('wallet_accounts')
      .select('id')
      .eq('user_id', userId)
      .eq('stellar_public_key', publicKey)
      .maybeSingle();

    if (account && !accErr) return true;

    // 2. Consulta em profiles (compatibilidade com contas legadas de perfil)
    const { data: profile, error: profErr } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .eq('stellar_address', publicKey)
      .maybeSingle();

    if (profile && !profErr) return true;

    return false;
  } catch (err) {
    console.error('[stellar-issuer] Erro ao validar titularidade da chave pública:', (err as Error).message);
    return false;
  }
}

// ─── Handler Principal ────────────────────────────────────────────────────────

serve(async (req: Request) => {
  const requestOrigin = req.headers.get('origin');
  const env = Deno.env.get('APP_ENV') ?? 'dev';

  const corsHeaders = getCorsHeaders(requestOrigin);

  // Preflight CORS EXATAMENTE COMO SOLICITADO
  if (req.method === 'OPTIONS') {
    return new Response('ok', { 
      headers: corsHeaders,
      status: 200 
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ success: false, error: 'Method not allowed', errorCode: 'METHOD_NOT_ALLOWED' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Resposta de erro padronizada
  const errorResponse = (message: string, code: string, status = 400): Response =>
    new Response(JSON.stringify({ success: false, error: message, errorCode: code } as IssuerResponse), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  try {
    // ── 1. Autenticação JWT Supabase ──────────────────────────────────────────
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return errorResponse('Autenticação necessária.', 'UNAUTHORIZED', 401);
    }

    const jwt = authHeader.replace('Bearer ', '');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Verificar o JWT usando o cliente Supabase
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false },
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(jwt);

    if (authError || !user) {
      return errorResponse('Token inválido ou expirado.', 'INVALID_TOKEN', 401);
    }

    const userId = user.id;

    // ── 2. Rate Limiting ──────────────────────────────────────────────────────
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const rateLimitKey = userId; // Rate limit por user_id

    if (!checkRateLimit(rateLimitKey)) {
      return errorResponse(
        'Muitas requisições. Aguarde 1 minuto.',
        'RATE_LIMIT_EXCEEDED',
        429
      );
    }

    // ── 3. Parse e Validação do Body ──────────────────────────────────────────
    let body: IssuerRequest;
    try {
      body = await req.json();
    } catch {
      return errorResponse('Body inválido (JSON malformado).', 'INVALID_BODY');
    }

    if (!body?.action) {
      return errorResponse('Campo "action" obrigatório.', 'MISSING_ACTION');
    }

    const validActions: IssuerAction[] = [
      'fund_wallet', 'sponsor_wallet', 'mint_asset', 'burn_asset',
      'swap_assets', 'send_on_chain', 'mint_reputation_zk',
    ];

    if (!validActions.includes(body.action)) {
      return errorResponse(`Action inválida: ${body.action}`, 'INVALID_ACTION');
    }

    // ── 4. Carregar Secrets do Vault ──────────────────────────────────────────
    const issuerSecret = Deno.env.get('STELLAR_ISSUER_SECRET');
    if (!issuerSecret) {
      console.error('[stellar-issuer] STELLAR_ISSUER_SECRET não configurado no Supabase Vault.');
      return errorResponse('Configuração do servidor incompleta.', 'SERVER_CONFIG_ERROR', 500);
    }

    const network = (Deno.env.get('STELLAR_NETWORK') || 'testnet') as StellarNetworkType;
    const baseFee = Deno.env.get('STELLAR_BASE_FEE') || '100000';
    const networkPassphrase = getNetworkPassphrase(network);
    const horizonUrl = getHorizonUrl(network);

    let issuerKeypair: Keypair;
    try {
      issuerKeypair = Keypair.fromSecret(issuerSecret);
    } catch {
      console.error('[stellar-issuer] STELLAR_ISSUER_SECRET inválida.');
      return errorResponse('Configuração do servidor inválida.', 'SERVER_CONFIG_ERROR', 500);
    }

    // ── 5. Supabase Admin para Audit Log ──────────────────────────────────────
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    // ── 6. Validação de Titularidade (R-04: Anti-Drenagem de Recursos Patrocinados) ─
    // Garante que o usuário autenticado só pode executar operações sobre suas próprias contas
    const actionsRequiringOwnership: IssuerAction[] = ['fund_wallet', 'sponsor_wallet', 'mint_reputation_zk'];
    if (actionsRequiringOwnership.includes(body.action) && 'publicKey' in body) {
      const targetKey = (body as any).publicKey;
      const isOwner = await verifyUserOwnsPublicKey(supabaseAdmin, userId, targetKey);
      if (!isOwner) {
        console.warn(`[stellar-issuer] ⚠️ Acesso negado: chave ${targetKey?.slice(0, 8)}... não pertence ao usuário ${userId}`);
        return errorResponse(
          'Operação não autorizada para a chave informada. A chave pública deve pertencer à sua conta autenticada.',
          'FORBIDDEN_KEY_OWNERSHIP',
          403
        );
      }
    }

    // ── 7. Despacho da Action ─────────────────────────────────────────────────
    console.log(`[stellar-issuer] action=${body.action} userId=${userId.slice(0, 8)}... network=${network}`);

    let txHash: string;

    try {
      switch (body.action) {
        case 'fund_wallet':
          txHash = await handleFundWallet(body, issuerKeypair, baseFee, networkPassphrase, horizonUrl);
          break;

        case 'sponsor_wallet':
          txHash = await handleSponsorWallet(body, issuerKeypair, networkPassphrase, horizonUrl);
          break;

        case 'mint_asset':
          txHash = await handleMintAsset(body, issuerKeypair, baseFee, networkPassphrase, horizonUrl);
          break;

        case 'burn_asset':
          txHash = await handleBurnAsset(body, issuerKeypair, networkPassphrase, horizonUrl);
          break;

        case 'swap_assets':
          txHash = await handleSwapAssets(body, issuerKeypair, networkPassphrase, horizonUrl);
          break;

        case 'send_on_chain':
          txHash = await handleSendOnChain(body, issuerKeypair, networkPassphrase, horizonUrl);
          break;

        case 'mint_reputation_zk':
          txHash = await handleMintReputationZk(body, issuerKeypair, networkPassphrase, horizonUrl);
          break;

        default:
          return errorResponse('Action não implementada.', 'NOT_IMPLEMENTED', 501);
      }

      // ── 7. Audit Log de Sucesso ────────────────────────────────────────────
      await logAuditEvent(supabaseAdmin, {
        event_type: `stellar_${body.action}`,
        user_id: userId,
        resource_type: 'stellar_transaction',
        resource_id: txHash === 'ALREADY_FUNDED' ? undefined : txHash,
        metadata: {
          action: body.action,
          network,
          // Dados não-sensíveis para diagnóstico
          ...('publicKey' in body ? { publicKey_prefix: (body as any).publicKey?.slice(0, 8) } : {}),
          ...('assetCode' in body ? { assetCode: (body as any).assetCode } : {}),
          ...('amount' in body ? { amount: (body as any).amount } : {}),
        },
        ip_address: clientIp,
        status: 'success',
      });

      console.log(`[stellar-issuer] ✅ ${body.action} concluído. Hash: ${txHash?.slice(0, 16)}...`);

      return new Response(
        JSON.stringify({ success: true, txHash } as IssuerResponse),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (opError: any) {
      // Erro na operação Stellar — logar sem dados sensíveis
      const stellarErrorCodes = opError?.response?.data?.extras?.result_codes;
      const errorMessage = opError?.message || 'Erro desconhecido na operação Stellar.';

      console.error(`[stellar-issuer] ❌ Falha em ${body.action}:`, {
        message: errorMessage,
        stellarCodes: stellarErrorCodes,
        // NÃO logar: keys, XDR completo, JWTs
      });

      await logAuditEvent(supabaseAdmin, {
        event_type: `stellar_${body.action}_failed`,
        user_id: userId,
        resource_type: 'stellar_transaction',
        metadata: {
          action: body.action,
          error: errorMessage,
          stellarCodes: stellarErrorCodes,
          network,
        },
        ip_address: clientIp,
        status: 'error',
      });

      return errorResponse(
        errorMessage,
        stellarErrorCodes ? `STELLAR_${stellarErrorCodes.transaction?.toUpperCase() || 'ERROR'}` : 'STELLAR_OPERATION_FAILED',
        200
      );
    }

  } catch (unexpectedError: any) {
    // Erros inesperados — nunca expor detalhes internos
    console.error('[stellar-issuer] Erro inesperado não tratado:', unexpectedError?.message);
    return new Response(
      JSON.stringify({ success: false, error: 'Erro interno do servidor.', errorCode: 'INTERNAL_ERROR' } as IssuerResponse),
      { status: 500, headers: { ...getCorsHeaders(req.headers.get('origin')), 'Content-Type': 'application/json' } }
    );
  }
});
