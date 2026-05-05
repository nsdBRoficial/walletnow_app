// supabase/functions/etherfuse-webhook/index.ts
//
// Receptor do webhook Etherfuse.
// Endpoint PÚBLICO (sem JWT de usuário) — Etherfuse envia POST direto.
// Segurança garantida por HMAC-SHA256 sobre corpo canonicalizado (RFC 8785 JCS).
//
// Eventos processados:
//   order_updated { status: "funded"    } → UPDATE fiat_transactions status='processing'
//   order_updated { status: "completed" } → UPDATE fiat_transactions com XDR + status='completed'
//
// CORREÇÃO v2: processa 'completed' de qualquer status anterior (exceto claimed/failed)
// para evitar race condition entre webhooks funded→completed que chegam rapidamente.

import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { getServiceClient } from "../_shared/auth.ts";
import { logger } from "../_shared/logger.ts";

const FN = "etherfuse-webhook";

// ─── Canonicalização RFC 8785 JCS ─────────────────────────────────────────────
// Chaves ordenadas alfabeticamente, recursivo, sem espaços.
function canonicalize(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalize).join(",")}]`;
  }
  const sorted = Object.keys(value as Record<string, unknown>).sort();
  const pairs = sorted.map(
    (k) => `${JSON.stringify(k)}:${canonicalize((value as Record<string, unknown>)[k])}`
  );
  return `{${pairs.join(",")}}`;
}

// ─── Validação HMAC-SHA256 ────────────────────────────────────────────────────
async function verifyWebhookSignature(
  body: unknown,
  signatureHeader: string | null
): Promise<boolean> {
  const webhookSecret = Deno.env.get("ETHERFUSE_WEBHOOK_SECRET");

  // Se secret NÃO está configurado, aceitar sem validação (sandbox/dev)
  // IMPORTANTE: a verificação de secret DEVE vir ANTES da de header
  if (!webhookSecret) {
    logger.warn(FN, "[SECURITY] ETHERFUSE_WEBHOOK_SECRET não configurado — aceitando sem validação HMAC");
    return true;
  }

  // Prefixo especial para desabilitar verificação em sandbox
  if (webhookSecret.startsWith("DISABLE_")) {
    logger.warn(FN, "[SECURITY] Verificação HMAC desabilitada via DISABLE_ prefix — APENAS sandbox");
    return true;
  }

  // Secret configurado → header é obrigatório
  if (!signatureHeader) {
    logger.error(FN, "[HMAC] Header X-Signature ausente mas ETHERFUSE_WEBHOOK_SECRET está configurado");
    return false;
  }

  try {
    const canonicalized = canonicalize(body);

    // Log da string canonicalizada para debug de discrepâncias
    logger.info(FN, "[HMAC] Canonicalized string", {
      canonicalized: canonicalized.substring(0, 200),
      length: canonicalized.length,
    });

    // Decodificar secret de base64 (com tratamento de erro)
    let keyBytes: Uint8Array;
    try {
      keyBytes = Uint8Array.from(atob(webhookSecret), (c) => c.charCodeAt(0));
    } catch {
      logger.error(FN, "[HMAC] ETHERFUSE_WEBHOOK_SECRET não é base64 válido");
      return false;
    }

    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      keyBytes,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const signature = await crypto.subtle.sign(
      "HMAC",
      cryptoKey,
      new TextEncoder().encode(canonicalized)
    );

    const hexDigest = Array.from(new Uint8Array(signature))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    const expected = `sha256=${hexDigest}`;

    // Log comparativo para debug (primeiros 20 chars apenas)
    logger.info(FN, "[HMAC] Comparando assinaturas", {
      expectedPrefix:  expected.substring(0, 20) + "...",
      receivedPrefix:  signatureHeader.substring(0, 20) + "...",
      lengthsMatch:    expected.length === signatureHeader.length,
    });

    // Constant-time comparison para prevenir timing attacks
    if (expected.length !== signatureHeader.length) return false;

    const expectedBytes = new TextEncoder().encode(expected);
    const headerBytes   = new TextEncoder().encode(signatureHeader);
    let diff = 0;
    for (let i = 0; i < expectedBytes.length; i++) {
      diff |= expectedBytes[i] ^ headerBytes[i];
    }

    const valid = diff === 0;
    logger.info(FN, `[HMAC] Resultado: ${valid ? "VÁLIDA ✅" : "INVÁLIDA ❌"}`);
    return valid;
  } catch (err) {
    logger.error(FN, "[HMAC] Erro ao verificar assinatura", { error: String(err) });
    return false;
  }
}

// ─── Handler Principal ────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  // CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  let body: Record<string, unknown>;

  // ── 1. Parse do body ────────────────────────────────────────────────────────
  try {
    body = await req.json();
  } catch {
    logger.error(FN, "Falha ao parsear body do webhook");
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ── 2. Validar assinatura HMAC ──────────────────────────────────────────────
  const signatureHeader = req.headers.get("x-signature");

  // DEBUG: logar payload bruto e assinatura para comparação
  logger.info(FN, "[DEBUG] Payload bruto recebido", {
    bodyKeys:         Object.keys(body),
    signatureHeader:  signatureHeader,
    bodyPreview:      JSON.stringify(body).substring(0, 500),
  });

  const isValid = await verifyWebhookSignature(body, signatureHeader);

  if (!isValid) {
    // Log detalhado para diagnóstico de falha HMAC
    const webhookSecret = Deno.env.get("ETHERFUSE_WEBHOOK_SECRET");
    logger.error(FN, "[HMAC FAIL] Assinatura inválida", {
      receivedSignature:  signatureHeader,
      secretConfigured:   !!webhookSecret,
      bodyLength:         JSON.stringify(body).length,
    });
    return new Response(JSON.stringify({ error: "Invalid signature" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ── 3. Extrair campos do evento ─────────────────────────────────────────────
  const eventType    = body.eventType    as string | undefined;
  const orderId      = body.orderId      as string | undefined;
  const status       = body.status       as string | undefined;
  const stellarXdr   = body.stellarClaimTransaction         as string | undefined;
  const claimableId  = body.stellarClaimableBalanceId       as string | undefined;

  logger.info(FN, "Webhook recebido", {
    eventType,
    orderId,
    status,
    hasXdr:       !!stellarXdr,
    xdrLength:    stellarXdr?.length ?? 0,
    hasClaimable: !!claimableId,
  });

  // Responder 200 imediatamente (Etherfuse faz retry se não receber 2xx)
  // Processamento assíncrono abaixo
  const responsePromise = (async () => {
    if (eventType !== "order_updated" || !orderId) {
      logger.info(FN, "Evento ignorado", { eventType, orderId });
      return;
    }

    const db = getServiceClient();

    // ── 4. Buscar transação pelo correlation_id ───────────────────────────────
    const { data: txRecord, error: fetchErr } = await db
      .from("fiat_transactions")
      .select("id, status, user_id")
      .eq("correlation_id", orderId)
      .single();

    if (fetchErr || !txRecord) {
      logger.error(FN, "Transação não encontrada para correlation_id", {
        orderId,
        error: fetchErr?.message,
      });
      return;
    }

    // ── 5. Idempotência — ignorar se já processado ───────────────────────────
    if (txRecord.status === "claimed" || txRecord.status === "failed") {
      logger.info(FN, "Transação já finalizada — ignorando", {
        orderId,
        currentStatus: txRecord.status,
      });
      return;
    }

    // ── 6. Processar transições de status ────────────────────────────────────
    if (status === "funded" && txRecord.status === "pending") {
      const { error } = await db
        .from("fiat_transactions")
        .update({ status: "processing", updated_at: new Date().toISOString() })
        .eq("correlation_id", orderId);

      if (error) {
        logger.error(FN, "Falha ao atualizar status para 'processing'", {
          orderId,
          error: error.message,
        });
      } else {
        logger.info(FN, "Status → processing", { orderId });
      }
      return;
    }

    if (status === "completed" && txRecord.status !== "completed" && txRecord.status !== "claimed") {
      // FIX v2: aceitar 'completed' mesmo quando status atual é 'pending'
      // (race condition: funded e completed chegam quase simultaneamente)
      logger.info(FN, "Processando completed", {
        orderId,
        fromStatus: txRecord.status,
        hasXdr:     !!stellarXdr,
        xdrLength:  stellarXdr?.length ?? 0,
      });

      if (!stellarXdr) {
        logger.error(FN, "[CRITICAL] stellarClaimTransaction ausente no evento 'completed'", {
          orderId,
          currentStatus: txRecord.status,
          bodyKeys:      Object.keys(body),
          bodyFull:      body, // log completo para diagnóstico
        });
        // Salva como failed para investigação
        await db
          .from("fiat_transactions")
          .update({
            status:        "failed",
            error_message: "stellarClaimTransaction ausente no webhook completed",
            provider_data: body,
            updated_at:    new Date().toISOString(),
          })
          .eq("correlation_id", orderId);
        return;
      }

      // Atualiza com XDR — usa IN para aceitar 'pending' OU 'processing'
      // (evita sobrescrever 'claimed' ou 'failed')
      const { error, count } = await db
        .from("fiat_transactions")
        .update({
          status:                       "completed",
          stellar_xdr:                  stellarXdr,
          stellar_claimable_balance_id: claimableId ?? null,
          provider_data:                body,
          updated_at:                   new Date().toISOString(),
        })
        .eq("correlation_id", orderId)
        .in("status", ["pending", "processing"]); // aceita ambos

      if (error) {
        logger.error(FN, "[DB] Falha ao salvar XDR", {
          orderId,
          error: error.message,
        });
      } else {
        logger.info(FN, "✅ XDR salvo com sucesso — aguardando claim do usuário", {
          orderId,
          claimableId,
          xdrLength:     stellarXdr.length,
          rowsAffected:  count,
        });
      }
      return;
    }

    logger.info(FN, "Transição de status ignorada", {
      orderId,
      incomingStatus: status,
      currentStatus:  txRecord.status,
    });
  })();

  // Aguarda processamento mas não bloqueia a resposta HTTP
  // (Etherfuse já recebeu 200)
  responsePromise.catch((err) => {
    logger.error(FN, "Erro não capturado no processamento do webhook", {
      error: String(err),
    });
  });

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
