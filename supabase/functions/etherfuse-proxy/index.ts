import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

/**
 * Etherfuse API Proxy — Supabase Edge Function
 *
 * SEGURANÇA: Esta função lê a API key da Etherfuse dos secrets do Supabase (nunca exposta ao browser).
 *
 * OBSERVABILIDADE: Versão instrumentada para diagnóstico do HTTP 400 em createOrder.
 * - Loga endpoint, method, payload completo (sanitizando API key)
 * - Loga status HTTP e response body integral da Etherfuse
 * - Nunca engole erros silenciosamente
 */
serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const apiKey = Deno.env.get('ETHERFUSE_API_KEY');
    const baseUrl = Deno.env.get('ETHERFUSE_BASE_URL') || 'https://api.sand.etherfuse.com';

    if (!apiKey) {
      console.error('[Etherfuse Proxy] ❌ ETHERFUSE_API_KEY não configurado nos secrets do Supabase');
      return new Response(
        JSON.stringify({ error: 'Etherfuse API key not configured on server' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parsear body da requisição do frontend
    let requestBody: { endpoint: string; method?: string; body?: unknown };
    try {
      requestBody = await req.json();
    } catch {
      console.error('[Etherfuse Proxy] ❌ Body inválido — não é JSON');
      return new Response(
        JSON.stringify({ error: 'Request body must be valid JSON' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { endpoint, method = 'GET', body } = requestBody;

    if (!endpoint) {
      return new Response(
        JSON.stringify({ error: 'endpoint é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Whitelist de endpoints permitidos (proteção contra SSRF)
    const allowedPrefixes = [
      '/ramp/assets',
      '/ramp/onboarding-url',
      '/ramp/customer',
      '/ramp/quote',
      '/ramp/order',
    ];
    const isAllowed = allowedPrefixes.some(prefix => endpoint.startsWith(prefix));
    if (!isAllowed) {
      console.error(`[Etherfuse Proxy] ❌ Endpoint não autorizado: ${endpoint}`);
      return new Response(
        JSON.stringify({ error: 'Endpoint não autorizado' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const targetUrl = `${baseUrl}${endpoint}`;

    // ─── LOG DIAGNÓSTICO COMPLETO ────────────────────────────────────────────
    console.log(`[Etherfuse Proxy] ► ${method} ${targetUrl}`);
    console.log(`[Etherfuse Proxy] API Key prefix: ${apiKey.substring(0, 15)}...`);

    if (body !== undefined) {
      // Serializar payload completo para diagnóstico (sem a API key — ela vai só no header)
      const payloadJson = JSON.stringify(body, null, 2);
      console.log(`[Etherfuse Proxy] Request payload:\n${payloadJson}`);

      // Validações específicas para createOrder (/ramp/order POST)
      if (endpoint === '/ramp/order' && method === 'POST') {
        const orderBody = body as Record<string, unknown>;
        console.log('[Etherfuse Proxy] 🔍 Diagnóstico createOrder:');
        console.log(`  orderId     : ${orderBody.orderId}`);
        console.log(`  bankAccountId: ${orderBody.bankAccountId}`);
        console.log(`  publicKey   : ${orderBody.publicKey}`);
        console.log(`  quoteId     : ${orderBody.quoteId}`);
        console.log(`  memo        : ${orderBody.memo ?? '(não enviado)'}`);

        // Verificar campos faltando (causa comum de 400)
        const required = ['orderId', 'bankAccountId', 'publicKey', 'quoteId'];
        const missing = required.filter(k => !orderBody[k]);
        if (missing.length > 0) {
          console.error(`[Etherfuse Proxy] ⚠️  Campos faltando no payload: ${missing.join(', ')}`);
        }
      }

      // Diagnóstico para /ramp/quote
      if (endpoint === '/ramp/quote' && method === 'POST') {
        const quoteBody = body as Record<string, unknown>;
        const assets = quoteBody.quoteAssets as Record<string, unknown> | undefined;
        console.log('[Etherfuse Proxy] 🔍 Diagnóstico getQuote:');
        console.log(`  quoteId     : ${quoteBody.quoteId}`);
        console.log(`  customerId  : ${quoteBody.customerId}`);
        console.log(`  blockchain  : ${quoteBody.blockchain}`);
        console.log(`  sourceAmount: ${quoteBody.sourceAmount}`);
        console.log(`  quoteAssets.type       : ${assets?.type}`);
        console.log(`  quoteAssets.sourceAsset: ${assets?.sourceAsset}`);
        console.log(`  quoteAssets.targetAsset: ${assets?.targetAsset}`);
      }

      // Diagnóstico para /ramp/customer/:id/kyc
      if (endpoint.includes('/kyc') && method === 'POST') {
        const kycBody = body as Record<string, unknown>;
        console.log('[Etherfuse Proxy] 🔍 Diagnóstico submitKyc:');
        console.log(`  firstName  : ${kycBody.firstName}`);
        console.log(`  lastName   : ${kycBody.lastName}`);
        console.log(`  taxId      : ${kycBody.taxId ? '*** (enviado)' : 'não enviado'}`);
        console.log(`  address    : ${kycBody.address ? 'OK' : 'Faltando'}`);
      }
    } else {
      console.log('[Etherfuse Proxy] Request body: (nenhum)');
    }
    // ────────────────────────────────────────────────────────────────────────

    // Fazer requisição à API da Etherfuse
    const response = await fetch(targetUrl, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: apiKey, // API key nunca exposta ao browser
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    const responseText = await response.text();

    // ─── LOG RESPONSE INTEGRAL ───────────────────────────────────────────────
    const statusIcon = response.ok ? '✅' : '❌';
    console.log(`[Etherfuse Proxy] ${statusIcon} Response status: ${response.status} ${response.statusText}`);
    console.log(`[Etherfuse Proxy] Response body completo:\n${responseText}`);

    if (!response.ok) {
      // Tentar parsear error response para log estruturado
      try {
        const errJson = JSON.parse(responseText) as { error?: { code?: string; message?: string } };
        if (errJson.error) {
          console.error(`[Etherfuse Proxy] Error code   : ${errJson.error.code}`);
          console.error(`[Etherfuse Proxy] Error message: ${errJson.error.message}`);
        }
      } catch {
        // response não é JSON — logado acima como texto puro
      }

      // Para 400 específico no order, adicionar contexto de diagnóstico
      if (response.status === 400 && endpoint === '/ramp/order') {
        console.error('[Etherfuse Proxy] 🔴 HTTP 400 em /ramp/order — prováveis causas:');
        console.error('  1. quoteId expirado (quotes expiram em ~2 min)');
        console.error('  2. bankAccountId não encontrado ou inválido');
        console.error('  3. customerId sem KYC aprovado no sandbox');
        console.error('  4. quoteId não pertence ao customerId');
        console.error('  5. targetAsset incorreto na quote (deve usar identifier, não só código)');
      }
    }
    // ────────────────────────────────────────────────────────────────────────

    return new Response(responseText, {
      status: response.status,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro interno no proxy';
    const stack = error instanceof Error ? error.stack : '';
    console.error('[Etherfuse Proxy] 💥 Erro interno:', message);
    if (stack) console.error('[Etherfuse Proxy] Stack:', stack);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
