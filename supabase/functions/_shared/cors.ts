// supabase/functions/_shared/cors.ts
// Headers CORS padronizados para todas as Edge Functions

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*", // Restringir para domínio em produção
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export function handleCors(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  return null;
}
