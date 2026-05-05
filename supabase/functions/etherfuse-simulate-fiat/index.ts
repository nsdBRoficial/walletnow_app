// supabase/functions/etherfuse-simulate-fiat/index.ts
//
// Edge Function para simular recebimento fiat via Etherfuse Sandbox.
// APENAS para ambiente sandbox/demo — nunca em produção.
//
// Fluxo:
//   1. Recebe { orderId } do frontend (JWT obrigatório)
//   2. Verifica que a transação pertence ao usuário logado
//   3. Chama POST /ramp/order/fiat_received na Etherfuse Sandbox
//   4. Etherfuse emite webhooks: funded → completed (automaticamente)
//   5. Retorna { success: true } ao frontend

import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { requireAuth, getServiceClient } from "../_shared/auth.ts";
import { simulateFiatReceived } from "../_shared/etherfuse.ts";
import { logger } from "../_shared/logger.ts";

const FN = "etherfuse-simulate-fiat";

Deno.serve(async (req) => {
  // CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    // ── 1. Autenticação JWT ───────────────────────────────────────────────────
    const user = await requireAuth(req);
    logger.info(FN, "Requisição autenticada", { userId: user.id });

    // ── 2. Parse do body ──────────────────────────────────────────────────────
    const body = await req.json();
    const { orderId } = body as { orderId?: string };

    if (!orderId) {
      return new Response(
        JSON.stringify({ error: "orderId é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── 3. Verificar que o order pertence ao usuário logado ───────────────────
    const db = getServiceClient();
    const { data: txRecord, error: fetchErr } = await db
      .from("fiat_transactions")
      .select("id, status, user_id, amount_fiat")
      .eq("correlation_id", orderId)
      .single();

    if (fetchErr || !txRecord) {
      logger.error(FN, "Transação não encontrada", { orderId, error: fetchErr?.message });
      return new Response(
        JSON.stringify({ error: "Transação não encontrada" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (txRecord.user_id !== user.id) {
      logger.error(FN, "Usuário não autorizado para este order", {
        userId:       user.id,
        txOwner:      txRecord.user_id,
        orderId,
      });
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (txRecord.status !== "pending") {
      logger.warn(FN, "Transação já foi processada", {
        orderId,
        currentStatus: txRecord.status,
      });
      return new Response(
        JSON.stringify({
          error:         "Transação já processada",
          currentStatus: txRecord.status,
        }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── 4. Chamar Etherfuse Sandbox ───────────────────────────────────────────
    logger.info(FN, "Chamando Etherfuse simulate fiat_received", {
      orderId,
      userId:     user.id,
      amountFiat: txRecord.amount_fiat,
    });

    await simulateFiatReceived(orderId);

    logger.info(FN, "✅ Fiat simulado com sucesso — aguardando webhooks Etherfuse", {
      orderId,
    });

    return new Response(
      JSON.stringify({
        success: true,
        orderId,
        message: "Fiat simulado. Aguardando webhooks Etherfuse (funded → completed).",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(FN, "Erro não tratado", { error: msg });

    // Diferenciar erros de autenticação
    if (msg.startsWith("UNAUTHORIZED")) {
      return new Response(
        JSON.stringify({ error: msg }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
