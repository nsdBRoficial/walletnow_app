import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

/**
 * Etherfuse API Proxy — Supabase Edge Function
 *
 * SEGURANÇA: Esta função lê a API key da Etherfuse dos secrets do Supabase (nunca exposta ao browser).
 * O frontend chama esta função via HTTPS e ela faz o proxy das requisições à API da Etherfuse.
 *
 * Para configurar os secrets no Supabase:
 *   supabase secrets set ETHERFUSE_API_KEY="api_sand:..."
 *   supabase secrets set ETHERFUSE_BASE_URL="https://api.sand.etherfuse.com"
 *
 * Endpoints proxy suportados:
 *   POST /etherfuse-proxy  { endpoint: '/ramp/assets', method: 'GET', body?: {...} }
 */
serve(async (req) => {
  // CORS — permite chamadas do frontend da WalletNow
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  // Preflight CORS
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
    // Ler secrets do ambiente Supabase (server-side only)
    const apiKey = Deno.env.get('ETHERFUSE_API_KEY');
    const baseUrl = Deno.env.get('ETHERFUSE_BASE_URL') || 'https://api.sand.etherfuse.com';

    if (!apiKey) {
      console.error('[Etherfuse Proxy] ETHERFUSE_API_KEY não configurado nos secrets do Supabase');
      return new Response(
        JSON.stringify({ error: 'Etherfuse API key not configured on server' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parsear body da requisição do frontend
    const { endpoint, method = 'GET', body } = await req.json() as {
      endpoint: string;
      method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
      body?: unknown;
    };

    if (!endpoint) {
      return new Response(
        JSON.stringify({ error: 'endpoint é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Bloquear endpoints não autorizados (whitelist)
    const allowedPrefixes = ['/ramp/assets', '/ramp/onboarding-url', '/ramp/customer', '/ramp/quote', '/ramp/order'];
    const isAllowed = allowedPrefixes.some(prefix => endpoint.startsWith(prefix));
    if (!isAllowed) {
      return new Response(
        JSON.stringify({ error: 'Endpoint não autorizado' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const targetUrl = `${baseUrl}${endpoint}`;
    console.log(`[Etherfuse Proxy] ${method} ${targetUrl}`);

    // Fazer requisição à API da Etherfuse com a API key (server-side)
    const response = await fetch(targetUrl, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: apiKey, // API key nunca exposta ao browser
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const responseText = await response.text();
    console.log(`[Etherfuse Proxy] Response ${response.status}:`, responseText.substring(0, 200));

    return new Response(responseText, {
      status: response.status,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro interno no proxy';
    console.error('[Etherfuse Proxy] Erro:', message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
