/**
 * @module supabase\functions\kyc-validator\index.ts
 * @description WalletNow Protocol - Arquitetura de carteira inteligente e pagamentos Stellar.
 */
/**
 * kyc-validator — Supabase Edge Function
 * =======================================
 *
 * Serviço de validação KYC server-side da WalletNow.
 * Remove a GEMINI_API_KEY do bundle do frontend.
 *
 * SEGURANÇA:
 * - GEMINI_API_KEY vive APENAS em Supabase Vault (nunca no bundle client)
 * - JWT Supabase validado em TODAS as requisições
 * - Rate limiting por user_id (5 req/10min)
 * - CORS allowlist restrita
 * - Logs sanitizados — NUNCA logam imagens base64, keys ou tokens
 * - Timeout de 30s por análise de IA
 * - Sem retorno de erro interno bruto
 *
 * PROVIDERS SUPORTADOS:
 * - 'gemini'     → Google Gemini (dev/sandbox/fallback)
 * - 'etherfuse'  → Etherfuse KYC (preparado para produção)
 * - 'transfero'  → Transfero KYC (preparado para produção)
 *
 * CONFIGURAR SECRETS (antes do deploy):
 *   supabase secrets set GEMINI_API_KEY=AIza...
 *   supabase secrets set KYC_PROVIDER=gemini
 *   supabase secrets set APP_ENV=dev
 *
 * DEPLOY:
 *   supabase functions deploy kyc-validator
 *
 * @see docs/mainnet/PRIORITY_TASKS.md (TASK-002)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ─── Tipos ────────────────────────────────────────────────────────────────────

type KycProvider = 'gemini' | 'etherfuse' | 'transfero';

interface KycRequestPayload {
  documentBase64: string;   // Imagem do documento (base64 com data URI)
  selfieBase64: string;     // Selfie do usuário (base64 com data URI)
  expectedCpf: string;      // CPF declarado pelo usuário
  expectedName: string;     // Nome declarado pelo usuário
  expectedBirthDate: string; // Data de nascimento declarada (DD/MM/AAAA)
}

interface KycResult {
  isApproved: boolean;
  errorDetails: string[];
  provider: KycProvider;
}

interface KycResponse {
  success: boolean;
  result?: KycResult;
  error?: string;
  errorCode?: string;
}

// ─── CORS ─────────────────────────────────────────────────────────────────────

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
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
}

// ─── Rate Limiting ────────────────────────────────────────────────────────────

const rateLimitMap = new Map<string, { count: number; windowStart: number }>();
const RATE_LIMIT_MAX = 5;          // máx 5 requisições de KYC
const RATE_LIMIT_WINDOW = 10 * 60 * 1000; // por 10 minutos (KYC é operação pesada)

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const existing = rateLimitMap.get(userId);

  if (!existing || now - existing.windowStart > RATE_LIMIT_WINDOW) {
    rateLimitMap.set(userId, { count: 1, windowStart: now });
    return true;
  }

  if (existing.count >= RATE_LIMIT_MAX) {
    return false;
  }

  existing.count += 1;
  return true;
}

// ─── Validação de Payload ─────────────────────────────────────────────────────

const CPF_REGEX = /^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/;
const DATE_REGEX = /^\d{2}\/\d{2}\/\d{4}$/;
const MAX_IMAGE_SIZE = 8_000_000; // 8MB em base64

function validatePayload(body: KycRequestPayload): string | null {
  if (!body.documentBase64 || typeof body.documentBase64 !== 'string') {
    return 'documentBase64 obrigatório.';
  }
  if (!body.selfieBase64 || typeof body.selfieBase64 !== 'string') {
    return 'selfieBase64 obrigatório.';
  }
  if (!body.expectedCpf || !CPF_REGEX.test(body.expectedCpf)) {
    return 'expectedCpf inválido (formato: 000.000.000-00).';
  }
  if (!body.expectedName || body.expectedName.trim().length < 3) {
    return 'expectedName obrigatório (mínimo 3 caracteres).';
  }
  if (!body.expectedBirthDate || !DATE_REGEX.test(body.expectedBirthDate)) {
    return 'expectedBirthDate inválida (formato: DD/MM/AAAA).';
  }
  if (body.documentBase64.length > MAX_IMAGE_SIZE) {
    return 'documentBase64 excede 8MB. Reduza a resolução da imagem.';
  }
  if (body.selfieBase64.length > MAX_IMAGE_SIZE) {
    return 'selfieBase64 excede 8MB. Reduza a resolução da imagem.';
  }
  return null; // OK
}

// ─── Interface de Provider (Strategy Pattern) ─────────────────────────────────

interface KycProviderStrategy {
  analyze(payload: KycRequestPayload): Promise<KycResult>;
}

// ─── Provider: Google Gemini (dev/sandbox/fallback) ───────────────────────────

class GeminiKycProvider implements KycProviderStrategy {
  private readonly apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async analyze(payload: KycRequestPayload): Promise<KycResult> {
    const errorDetails: string[] = [];

    const prompt = `Você é um perito criminal digital de KYC (Conheça Seu Cliente).
Foram anexadas duas imagens:
1. Um Documento de Identidade oficial Brasileiro (RG ou CNH).
2. Uma "Selfie" (foto do rosto do usuário).

Tarefas:
1. Identifique o tipo de documento (RG, CNH, ou OUTRO).
2. Leia os campos do documento via OCR: Nome, CPF e Data de Nascimento.
   - ATENÇÃO: Ao ler CNH, NÃO confunda a Data de Nascimento com a data de "1ª Habilitação". A real Data de Nascimento fica na seção "3 DATA, LOCAL E UF DE NASCIMENTO" e deve indicar alguém maior de 18 anos.
3. Verifique se a foto no documento é da mesma pessoa da Selfie (Facial Match).
4. Verifique se a imagem 1 parece um documento autêntico.

Responda ESTRITAMENTE num JSON perfeito (sem Markdown), neste esquema:
{
  "tipo_documento": "RG" ou "CNH" ou "INVALIDO",
  "nome": "NOME LIDO NO DOCUMENTO",
  "cpf": "12345678900",
  "data_nascimento": "DD/MM/AAAA",
  "facial_match": true ou false,
  "is_valid_document": true ou false
}`;

    // Extrai mimeType e dados base64 puros
    const docMimeMatch = payload.documentBase64.match(/data:([a-zA-Z0-9/\-.+]+);base64,/);
    const docMimeType = docMimeMatch ? docMimeMatch[1] : 'image/jpeg';
    const docBase64Data = payload.documentBase64.split(',')[1] || payload.documentBase64;

    const selfieMimeMatch = payload.selfieBase64.match(/data:([a-zA-Z0-9/\-.+]+);base64,/);
    const selfieMimeType = selfieMimeMatch ? selfieMimeMatch[1] : 'image/jpeg';
    const selfieBase64Data = payload.selfieBase64.split(',')[1] || payload.selfieBase64;

    // AbortController para timeout de 30s
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30_000);

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: prompt },
                { inline_data: { mime_type: docMimeType, data: docBase64Data } },
                { inline_data: { mime_type: selfieMimeType, data: selfieBase64Data } },
              ]
            }]
          })
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        const status = response.status;
        if (status === 429) {
          throw new Error('RATE_LIMIT_AI: Limite de requisições da IA excedido. Aguarde alguns minutos.');
        }
        throw new Error(`GEMINI_API_ERROR: Status ${status}`);
      }

      const geminiData = await response.json();
      const responseText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

      // Remove formatações Markdown da resposta
      const cleanJson = responseText.replace(/```json|```/gi, '').trim();
      const extracted = JSON.parse(cleanJson);

      // Validações dos dados extraídos
      const cleanExpectedCpf = payload.expectedCpf.replace(/\D/g, '');
      const readCpf = String(extracted.cpf ?? '').replace(/\D/g, '');
      const cpfMatch = readCpf === cleanExpectedCpf;

      const expectedFirstName = payload.expectedName.split(' ')[0].toLowerCase();
      const extractedNome = (extracted.nome ?? '').toLowerCase();
      const nameMatch = extractedNome.includes(expectedFirstName);

      const cleanExpectedBirth = payload.expectedBirthDate.replace(/\D/g, '');
      const parsedBirth = (extracted.data_nascimento ?? '').replace(/\D/g, '');
      const birthDateMatch = parsedBirth === cleanExpectedBirth;

      // Monta checklist granular para UX
      if (extracted.is_valid_document) {
        errorDetails.push(`✅ Legibilidade: Documento reconhecido como ${extracted.tipo_documento}.`);
      } else {
        errorDetails.push('❌ Legibilidade: O anexo não parece ser um CNH/RG oficial nítido.');
      }

      if (cpfMatch) {
        errorDetails.push('✅ CPF: Autenticado com sucesso.');
      } else {
        errorDetails.push(`❌ CPF: Divergente. Digitado: ${payload.expectedCpf} | Lido: ${extracted.cpf ?? 'Não legível'}`);
      }

      if (nameMatch) {
        errorDetails.push('✅ Titularidade: Nome confere com documento.');
      } else {
        errorDetails.push('❌ Titularidade: Nome divergente. O impresso deve bater com o primeiro nome digitado.');
      }

      if (birthDateMatch) {
        errorDetails.push(`✅ Maioridade: Data de Nascimento confere. (${extracted.data_nascimento})`);
      } else {
        errorDetails.push(`❌ Data de Nascimento: Divergente (Lida: ${extracted.data_nascimento ?? 'Não visível'}). Não confunda com a 1ª Habilitação.`);
      }

      if (extracted.facial_match) {
        errorDetails.push('✅ Biometria Facial: Selfie autêntica (Liveness Match).');
      } else {
        errorDetails.push('❌ Biometria Facial: A pessoa da Selfie tem traços divergentes da foto no Documento.');
      }

      const isApproved = extracted.is_valid_document && cpfMatch && nameMatch && birthDateMatch && extracted.facial_match;

      return {
        isApproved,
        errorDetails: isApproved ? [] : errorDetails,
        provider: 'gemini',
      };

    } catch (err: any) {
      clearTimeout(timeoutId);

      if (err.name === 'AbortError') {
        throw new Error('KYC_TIMEOUT: A análise de IA excedeu o tempo limite (30s).');
      }
      throw err;
    }
  }
}

// ─── Provider: Etherfuse KYC (stub — preparado para integração futura) ─────────

class EtherfuseKycProvider implements KycProviderStrategy {
  async analyze(_payload: KycRequestPayload): Promise<KycResult> {
    // TODO [PROD]: Implementar integração real com Etherfuse KYC API
    // Endpoint esperado: POST https://api.etherfuse.com/kyc/validate
    // Headers: Authorization: Bearer {ETHERFUSE_KYC_SECRET}
    throw new Error('PROVIDER_NOT_CONFIGURED: Etherfuse KYC não implementado ainda.');
  }
}

// ─── Provider: Transfero KYC (stub — preparado para integração futura) ─────────

class TransferoKycProvider implements KycProviderStrategy {
  async analyze(_payload: KycRequestPayload): Promise<KycResult> {
    // TODO [PROD]: Implementar integração real com Transfero KYC API
    // Endpoint esperado: POST https://api.transfero.com/kyc/verify
    // Headers: X-Api-Key: {TRANSFERO_KYC_SECRET}
    throw new Error('PROVIDER_NOT_CONFIGURED: Transfero KYC não implementado ainda.');
  }
}

// ─── Factory de Provider ──────────────────────────────────────────────────────

function createKycProvider(provider: KycProvider): KycProviderStrategy {
  switch (provider) {
    case 'gemini': {
      const apiKey = Deno.env.get('GEMINI_API_KEY');
      if (!apiKey) {
        throw new Error('SERVER_CONFIG_ERROR: GEMINI_API_KEY não configurada no Supabase Vault.');
      }
      return new GeminiKycProvider(apiKey);
    }
    case 'etherfuse':
      return new EtherfuseKycProvider();
    case 'transfero':
      return new TransferoKycProvider();
    default:
      throw new Error(`PROVIDER_UNKNOWN: Provider KYC desconhecido: ${provider}`);
  }
}

// ─── Audit Log ────────────────────────────────────────────────────────────────

async function logAuditEvent(
  supabaseAdmin: ReturnType<typeof createClient>,
  event: {
    event_type: string;
    user_id: string;
    resource_type: string;
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
      metadata: event.metadata,
      ip_address: event.ip_address,
      status: event.status,
      created_at: new Date().toISOString(),
    });
  } catch (e) {
    // Falha no audit log não bloqueia a operação
    console.error('[kyc-validator] Falha ao registrar audit log:', (e as Error).message);
  }
}

// ─── Handler Principal ────────────────────────────────────────────────────────

serve(async (req: Request) => {
  const requestOrigin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(requestOrigin);

  // Preflight CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders, status: 200 });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ success: false, error: 'Method not allowed', errorCode: 'METHOD_NOT_ALLOWED' } as KycResponse),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Helper de resposta de erro padronizada (sem detalhes internos)
  const errorResponse = (message: string, code: string, status = 400): Response =>
    new Response(
      JSON.stringify({ success: false, error: message, errorCode: code } as KycResponse),
      { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  try {
    // ── 1. Autenticação JWT Supabase ─────────────────────────────────────────
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
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';

    // ── 2. Rate Limiting ─────────────────────────────────────────────────────
    if (!checkRateLimit(userId)) {
      return errorResponse(
        'Muitas tentativas de KYC. Aguarde 10 minutos.',
        'RATE_LIMIT_EXCEEDED',
        429
      );
    }

    // ── 3. Parse e Validação do Body ─────────────────────────────────────────
    let body: KycRequestPayload;
    try {
      body = await req.json();
    } catch {
      return errorResponse('Body inválido (JSON malformado).', 'INVALID_BODY');
    }

    const validationError = validatePayload(body);
    if (validationError) {
      return errorResponse(validationError, 'VALIDATION_ERROR');
    }

    // ── 4. Selecionar Provider ───────────────────────────────────────────────
    const providerName = (Deno.env.get('KYC_PROVIDER') ?? 'gemini') as KycProvider;

    let provider: KycProviderStrategy;
    try {
      provider = createKycProvider(providerName);
    } catch (e: any) {
      console.error('[kyc-validator] Falha ao criar provider KYC:', e.message);
      return errorResponse('Configuração do servidor incompleta.', 'SERVER_CONFIG_ERROR', 500);
    }

    // ── 5. Supabase Admin para Audit Log ─────────────────────────────────────
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    console.log(`[kyc-validator] Iniciando KYC. userId=${userId.slice(0, 8)}... provider=${providerName}`);

    // ── 6. Executar Análise KYC ──────────────────────────────────────────────
    let result: KycResult;
    try {
      result = await provider.analyze(body);
    } catch (kycError: any) {
      const errMsg = kycError.message ?? 'Erro desconhecido na análise KYC.';
      const errCode = errMsg.split(':')[0] ?? 'KYC_ANALYSIS_FAILED';

      // Log do erro (sem dados sensíveis — sem imagens base64)
      console.error(`[kyc-validator] Falha na análise KYC (${providerName}):`, errCode);

      await logAuditEvent(supabaseAdmin, {
        event_type: 'kyc_validation_failed',
        user_id: userId,
        resource_type: 'kyc',
        metadata: { provider: providerName, errorCode: errCode },
        ip_address: clientIp,
        status: 'error',
      });

      // Mensagem amigável para o usuário (sem vazar detalhes internos)
      let userMessage = 'Serviço de KYC indisponível. Tente novamente em instantes.';
      if (errCode === 'RATE_LIMIT_AI') {
        userMessage = 'Limite da IA excedido. Aguarde de 1 a 2 minutos e tente novamente.';
      } else if (errCode === 'KYC_TIMEOUT') {
        userMessage = 'A análise demorou mais que o esperado. Tente novamente.';
      } else if (errCode === 'PROVIDER_NOT_CONFIGURED') {
        userMessage = 'Provedor de KYC não disponível no momento.';
      }

      return errorResponse(userMessage, errCode.split(':')[0], 503);
    }

    // ── 7. Audit Log de Sucesso ──────────────────────────────────────────────
    await logAuditEvent(supabaseAdmin, {
      event_type: result.isApproved ? 'kyc_approved' : 'kyc_rejected',
      user_id: userId,
      resource_type: 'kyc',
      metadata: {
        provider: providerName,
        isApproved: result.isApproved,
        // NÃO logar: CPF, nome, imagens base64, data de nascimento
      },
      ip_address: clientIp,
      status: 'success',
    });

    console.log(`[kyc-validator] ✅ Análise concluída. userId=${userId.slice(0, 8)}... isApproved=${result.isApproved}`);

    return new Response(
      JSON.stringify({ success: true, result } as KycResponse),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (unexpectedError: any) {
    // Erros inesperados — nunca expor detalhes internos
    console.error('[kyc-validator] Erro inesperado não tratado:', unexpectedError?.message);
    return new Response(
      JSON.stringify({ success: false, error: 'Erro interno do servidor.', errorCode: 'INTERNAL_ERROR' } as KycResponse),
      { status: 500, headers: { ...getCorsHeaders(req.headers.get('origin')), 'Content-Type': 'application/json' } }
    );
  }
});
