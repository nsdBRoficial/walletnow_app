// supabase/functions/etherfuse-create-order/index.ts
//
// Cria quote + order na Etherfuse e registra no banco.
// Retorna CLABE para o usuário depositar e correlationId para rastreamento.

import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { requireAuth, getServiceClient } from "../_shared/auth.ts";
import { createQuote, createOrder } from "../_shared/etherfuse.ts";
import { logger } from "../_shared/logger.ts";

const FN = "etherfuse-create-order";

// Configuração Etherfuse (setar via supabase secrets set)
const ETHERFUSE_CUSTOMER_ID    = Deno.env.get("ETHERFUSE_CUSTOMER_ID")    ?? "";
const ETHERFUSE_BANK_ACCOUNT_ID = Deno.env.get("ETHERFUSE_BANK_ACCOUNT_ID") ?? "";
const ETHERFUSE_WALLET_ID      = Deno.env.get("ETHERFUSE_WALLET_ID")      ?? "";
// Formato CODE:ISSUER para Stellar USDC (Testnet)
const TARGET_ASSET = Deno.env.get("ETHERFUSE_TARGET_ASSET")
  ?? "USDC:GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    // ── 1. Auth ───────────────────────────────────────────────────────────────
    const user = await requireAuth(req);

    // ── 2. Parse body ─────────────────────────────────────────────────────────
    const body = await req.json();
    const { amount, stellarAddress } = body as {
      amount?:         string;
      stellarAddress?: string;
    };

    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      return new Response(
        JSON.stringify({ error: "amount inválido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!stellarAddress) {
      return new Response(
        JSON.stringify({ error: "stellarAddress é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── 3. Verificar que stellarAddress pertence ao usuário logado ───────────
    const db = getServiceClient();
    const { data: profile } = await db
      .from("profiles")
      .select("stellar_address")
      .eq("id", user.id)
      .single();

    if (!profile || profile.stellar_address !== stellarAddress) {
      logger.error(FN, "stellarAddress não bate com perfil do usuário", {
        userId:         user.id,
        providedAddress: stellarAddress,
        profileAddress:  profile?.stellar_address,
      });
      return new Response(
        JSON.stringify({ error: "Endereço Stellar não autorizado" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── 4. Gerar IDs únicos (você gera, não a Etherfuse) ─────────────────────
    const quoteId = crypto.randomUUID();
    const orderId = crypto.randomUUID(); // Este é o correlationId

    logger.info(FN, "Criando quote Etherfuse", {
      userId:   user.id,
      amount,
      quoteId,
      orderId,
    });

    // ── 5. Criar Quote na Etherfuse ───────────────────────────────────────────
    const quote = await createQuote({
      quoteId,
      customerId:    ETHERFUSE_CUSTOMER_ID,
      blockchain:    "stellar",
      sourceAsset:   "MXN",
      targetAsset:   TARGET_ASSET,
      sourceAmount:  amount,
      walletAddress: stellarAddress, // Etherfuse verifica trustline automaticamente
    });

    logger.info(FN, "Quote criada", {
      quoteId,
      exchangeRate:      quote.exchangeRate,
      destinationAmount: quote.destinationAmount,
      feeAmount:         quote.feeAmount,
    });

    // ── 6. Criar Order na Etherfuse ───────────────────────────────────────────
    const order = await createOrder({
      orderId,
      bankAccountId:  ETHERFUSE_BANK_ACCOUNT_ID,
      cryptoWalletId: ETHERFUSE_WALLET_ID,
      quoteId,
    });

    logger.info(FN, "Order criada", {
      orderId,
      status:       order.status,
      depositClabe: order.depositClabe,
    });

    // ── 7. Salvar no banco ────────────────────────────────────────────────────
    const { error: insertErr } = await db
      .from("fiat_transactions")
      .insert({
        user_id:         user.id,
        provider:        "etherfuse",
        correlation_id:  orderId, // orderId Etherfuse = nosso correlationId
        amount_fiat:     parseFloat(amount),
        currency:        "MXN",
        status:          "pending",
        stellar_address: stellarAddress,
        provider_data:   { quote, order },
      });

    if (insertErr) {
      logger.error(FN, "Falha ao inserir fiat_transaction", {
        error: insertErr.message,
        orderId,
      });
      throw new Error(`DB insert failed: ${insertErr.message}`);
    }

    logger.info(FN, "✅ Order registrada no banco", { orderId, userId: user.id });

    // ── 8. Retornar ao frontend ───────────────────────────────────────────────
    return new Response(
      JSON.stringify({
        correlationId:     orderId,
        depositClabe:      order.depositClabe ?? "646180157000000004", // sandbox fallback
        depositBankName:   order.depositBankName ?? "STP (Sandbox)",
        exchangeRate:      quote.exchangeRate,
        feeAmount:         quote.feeAmount,
        destinationAmount: quote.destinationAmount,
        statusPage:        order.statusPage ?? `https://devnet.etherfuse.com/ramp/order/${orderId}`,
      }),
      { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(FN, "Erro não tratado", { error: msg });

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
