#!/usr/bin/env node
// scripts/test-etherfuse-flow.mjs
//
// Script de teste end-to-end do fluxo Etherfuse.
// Roda direto no Node.js: node scripts/test-etherfuse-flow.mjs
//
// Pré-requisitos:
//   1. Usuário logado com email/senha no WalletNow
//   2. Tabela fiat_transactions criada no Supabase
//   3. Edge Functions deployadas e ativas

import { createClient } from "@supabase/supabase-js";

// ─── Configuração ─────────────────────────────────────────────────────────────
const SUPABASE_URL       = "https://vjvljpjzusgjsxnoihau.supabase.co";
const SUPABASE_ANON_KEY  = process.env.SUPABASE_ANON_KEY || "";
const TEST_EMAIL         = process.env.TEST_EMAIL         || "";
const TEST_PASSWORD      = process.env.TEST_PASSWORD      || "";
const FUNCTIONS_URL      = `${SUPABASE_URL}/functions/v1`;

if (!SUPABASE_ANON_KEY || !TEST_EMAIL || !TEST_PASSWORD) {
  console.error(`
❌ Variáveis faltando. Rode assim:
   $env:SUPABASE_ANON_KEY="eyJ..."
   $env:TEST_EMAIL="seu@email.com"
   $env:TEST_PASSWORD="suasenha"
   node scripts/test-etherfuse-flow.mjs
  `);
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ─── Helpers ──────────────────────────────────────────────────────────────────
function log(emoji, step, data) {
  console.log(`\n${emoji} [${new Date().toISOString()}] ${step}`);
  if (data) console.log(JSON.stringify(data, null, 2));
}

async function callFunction(fnName, body, token) {
  const res = await fetch(`${FUNCTIONS_URL}/${fnName}`, {
    method: "POST",
    headers: {
      "Content-Type":  "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return { status: res.status, ok: res.ok, data };
}

// ─── TESTE PRINCIPAL ──────────────────────────────────────────────────────────
async function runTest() {
  console.log("\n🚀 WalletNow — Teste End-to-End Etherfuse Flow");
  console.log("=".repeat(55));

  // ── FASE 1: Login ────────────────────────────────────────────────────────────
  log("🔐", "FASE 1: Autenticando usuário de teste...");
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email:    TEST_EMAIL,
    password: TEST_PASSWORD,
  });
  if (authErr || !authData.session) {
    log("❌", "Falha no login", { error: authErr?.message });
    process.exit(1);
  }
  const token       = authData.session.access_token;
  const userId      = authData.user.id;
  log("✅", "Login OK", { userId, email: TEST_EMAIL });

  // ── FASE 2: Verificar perfil e stellar_address ────────────────────────────────
  log("🔍", "FASE 2: Verificando perfil Stellar...");
  const { data: profile } = await supabase
    .from("profiles")
    .select("stellar_address, id")
    .eq("id", userId)
    .single();

  if (!profile?.stellar_address) {
    log("❌", "Perfil sem stellar_address — configure antes de testar");
    process.exit(1);
  }
  log("✅", "Perfil OK", { stellarAddress: profile.stellar_address });

  // ── FASE 3: Criar Order (cria quote + order na Etherfuse + salva no banco) ────
  log("📋", "FASE 3: Criando order via etherfuse-create-order...");
  const orderResult = await callFunction("etherfuse-create-order", {
    amount:         "100",
    stellarAddress: profile.stellar_address,
  }, token);

  log(orderResult.ok ? "✅" : "❌", `etherfuse-create-order → HTTP ${orderResult.status}`, orderResult.data);

  if (!orderResult.ok) {
    log("❌", "FALHA na criação do order. Verificar logs da Edge Function.");
    log("💡", "Dica: acesse https://supabase.com/dashboard/project/vjvljpjzusgjsxnoihau/functions/etherfuse-create-order/logs");
    process.exit(1);
  }

  const { correlationId } = orderResult.data;
  log("📌", "correlationId (orderId Etherfuse)", { correlationId });

  // ── FASE 4: Verificar registro no banco ───────────────────────────────────────
  log("🗄️", "FASE 4: Verificando registro no banco...");
  const { data: txRecord } = await supabase
    .from("fiat_transactions")
    .select("*")
    .eq("correlation_id", correlationId)
    .single();

  if (!txRecord) {
    log("❌", "Registro NÃO encontrado no banco para correlationId:", correlationId);
    process.exit(1);
  }
  log("✅", "Registro criado no banco", {
    id:             txRecord.id,
    status:         txRecord.status,
    amount_fiat:    txRecord.amount_fiat,
    stellar_address: txRecord.stellar_address,
  });

  // ── FASE 5: Subscrever ao Realtime ANTES de simular ───────────────────────────
  log("⚡", "FASE 5: Ativando subscrição Realtime...");
  let realtimeReceived = false;
  let realtimePayload = null;

  const channel = supabase
    .channel(`test_fiat_${correlationId}`)
    .on(
      "postgres_changes",
      {
        event:  "UPDATE",
        schema: "public",
        table:  "fiat_transactions",
        filter: `correlation_id=eq.${correlationId}`,
      },
      (payload) => {
        const newTx = payload.new;
        log("📡", `Realtime recebido! status=${newTx.status}`, {
          status:         newTx.status,
          hasXdr:         !!newTx.stellar_xdr,
          xdrLength:      newTx.stellar_xdr?.length ?? 0,
        });
        realtimeReceived = true;
        realtimePayload = newTx;
      }
    )
    .subscribe((status) => {
      log("📡", `Realtime channel status: ${status}`);
    });

  // Aguarda subscrição ficar ativa
  await new Promise(r => setTimeout(r, 1500));

  // ── FASE 6: Simular fiat (dispara webhooks Etherfuse) ─────────────────────────
  log("💸", "FASE 6: Simulando recebimento fiat via etherfuse-simulate-fiat...");
  const simResult = await callFunction("etherfuse-simulate-fiat", {
    orderId: correlationId,
  }, token);

  log(simResult.ok ? "✅" : "❌", `etherfuse-simulate-fiat → HTTP ${simResult.status}`, simResult.data);

  if (!simResult.ok) {
    log("❌", "FALHA na simulação. Verificar logs:");
    log("💡", "Dica: https://supabase.com/dashboard/project/vjvljpjzusgjsxnoihau/functions/etherfuse-simulate-fiat/logs");
    await supabase.removeChannel(channel);
    process.exit(1);
  }

  // ── FASE 7: Aguardar webhook processar (máx 30s) ──────────────────────────────
  log("⏳", "FASE 7: Aguardando webhook Etherfuse processar (máx 30s)...");

  let attempts = 0;
  let finalTx  = null;

  while (attempts < 30) {
    await new Promise(r => setTimeout(r, 1000));
    attempts++;

    const { data: pollTx } = await supabase
      .from("fiat_transactions")
      .select("status, stellar_xdr, stellar_claimable_balance_id, error_message")
      .eq("correlation_id", correlationId)
      .single();

    process.stdout.write(`\r  ⏱️  ${attempts}s | status: ${pollTx?.status ?? "?"} | hasXdr: ${!!pollTx?.stellar_xdr}   `);

    if (pollTx?.status === "completed" || pollTx?.status === "failed") {
      finalTx = pollTx;
      break;
    }
  }

  console.log("\n");

  if (!finalTx) {
    log("❌", "Timeout: webhook não processou em 30s.");
    log("💡", "Verificar logs do webhook: https://supabase.com/dashboard/project/vjvljpjzusgjsxnoihau/functions/etherfuse-webhook/logs");
    await supabase.removeChannel(channel);
    process.exit(1);
  }

  if (finalTx.status === "failed") {
    log("❌", "Webhook processou mas marcou como FAILED", { error: finalTx.error_message });
    await supabase.removeChannel(channel);
    process.exit(1);
  }

  log("✅", "Webhook OK! Status = completed", {
    hasXdr:      !!finalTx.stellar_xdr,
    xdrLength:   finalTx.stellar_xdr?.length ?? 0,
    claimableId: finalTx.stellar_claimable_balance_id,
  });

  // ── FASE 8: Validar Realtime ──────────────────────────────────────────────────
  log(realtimeReceived ? "✅" : "⚠️", "FASE 8: Realtime", {
    received:  realtimeReceived,
    payload:   realtimePayload ? { status: realtimePayload.status, hasXdr: !!realtimePayload.stellar_xdr } : null,
  });

  if (!realtimeReceived) {
    log("⚠️", "Realtime NÃO disparou. Verificar se tabela está na publicação supabase_realtime.");
  }

  await supabase.removeChannel(channel);

  // ── FASE 9: Validar XDR ───────────────────────────────────────────────────────
  log("🔍", "FASE 9: Validando XDR...");
  if (!finalTx.stellar_xdr) {
    log("❌", "stellar_xdr está vazio — crítico");
    process.exit(1);
  }

  try {
    // Decodificar XDR usando Stellar SDK (se disponível)
    const { TransactionBuilder, Networks } = await import("@stellar/stellar-sdk").catch(() => null) ?? {};
    if (TransactionBuilder) {
      const tx = TransactionBuilder.fromXDR(finalTx.stellar_xdr, Networks.TESTNET);
      const ops = tx.operations;
      log("✅", "XDR decodificado com sucesso", {
        operationCount: ops.length,
        operations:     ops.map(op => ({ type: op.type })),
      });
    } else {
      log("⚠️", "Stellar SDK não disponível no script. XDR existe mas não validado.");
      log("📄", "XDR preview (50 chars)", { xdr: finalTx.stellar_xdr.substring(0, 50) + "..." });
    }
  } catch (xdrErr) {
    log("❌", "XDR inválido:", { error: xdrErr.message });
    process.exit(1);
  }

  // ── RESULTADO FINAL ───────────────────────────────────────────────────────────
  console.log("\n" + "=".repeat(55));
  console.log("🎉 FLUXO VALIDADO COM SUCESSO!");
  console.log("=".repeat(55));
  console.log(`
  ✅ create-order    → correlationId gerado
  ✅ fiat_transactions → registro criado (status: pending)
  ✅ simulate-fiat   → fiat simulado via Etherfuse Sandbox
  ✅ webhook         → processado (funded → completed)
  ✅ stellar_xdr     → salvo no banco (${finalTx.stellar_xdr?.length} chars)
  ${realtimeReceived ? "✅" : "⚠️"} realtime         → ${realtimeReceived ? "evento recebido" : "NÃO disparou (verificar publicação)"}
  
  ➡️  Próximo passo: Abrir o app e clicar "Claim Funds"
  ➡️  correlationId: ${correlationId}
  `);

  process.exit(0);
}

runTest().catch((err) => {
  log("❌", "Erro não tratado no teste:", { error: err.message, stack: err.stack });
  process.exit(1);
});
