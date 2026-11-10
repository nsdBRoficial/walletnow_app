/**
 * @module supabase/functions/keepalive/index.ts
 * @description Supabase Edge Function (Deno Runtime) 'keepalive' — processamento serverless autenticado e integração segura.
 */
/**
 * Edge Function: keepalive
 * ========================
 * Endpoint de health-check que mantém o runtime Deno aquecido
 * e registra o ping no banco via keepalive_log.
 *
 * GET /functions/v1/keepalive
 * → 200 { status: "ok", timestamp, env, db: "ok" | "error" }
 *
 * Usado por:
 *  - GitHub Actions (externa — a cada 10 min)
 *  - Monitoramento externo (UptimeRobot, BetterStack, etc.)
 */

import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
} as const;

Deno.serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  // Apenas GET aceito
  if (req.method !== "GET") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }

  const startedAt = Date.now();
  const timestamp = new Date().toISOString();

  // Detectar a origem do ping (query param ?source=github_actions)
  const url = new URL(req.url);
  const source = url.searchParams.get("source") ?? "edge_function";

  let dbStatus: "ok" | "error" = "ok";
  let dbError: string | undefined;

  try {
    // Conectar ao banco usando service_role (variáveis injetadas automaticamente pelo Supabase)
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    const latencyMs = Date.now() - startedAt;

    // Registrar o ping na tabela keepalive_log
    const { error } = await supabase
      .from("keepalive_log")
      .insert({
        source,
        latency_ms: latencyMs,
        note: `ping via Edge Function — ${req.headers.get("user-agent") ?? "unknown"}`,
      });

    if (error) {
      dbStatus = "error";
      dbError = error.message;
      console.error("[keepalive] Erro ao inserir no banco:", error.message);
    } else {
      console.log(`[keepalive] ✅ ping registrado — source: ${source}, latency: ${latencyMs}ms`);
    }
  } catch (err) {
    dbStatus = "error";
    dbError = err instanceof Error ? err.message : String(err);
    console.error("[keepalive] Exceção:", dbError);
  }

  const totalMs = Date.now() - startedAt;

  const body = {
    status: dbStatus === "ok" ? "ok" : "degraded",
    timestamp,
    env: Deno.env.get("SUPABASE_URL")?.includes("vjvljpjzusgjsxnoihau") ? "dev" : "prod",
    db: dbStatus,
    latency_ms: totalMs,
    source,
    ...(dbError ? { db_error: dbError } : {}),
  };

  return new Response(JSON.stringify(body, null, 2), {
    status: dbStatus === "ok" ? 200 : 207,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "application/json",
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
});
