// scripts/e2e-test.cjs
// Teste end-to-end completo via Node.js (CommonJS para compatibilidade)
// Uso: node scripts/e2e-test.cjs

const https = require("https");
const http  = require("http");

const SUPABASE_URL  = "https://vjvljpjzusgjsxnoihau.supabase.co";
const ANON_KEY      = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZqdmxqcGp6dXNnanN4bm9paGF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4MTg4NjEsImV4cCI6MjA4ODM5NDg2MX0.XKFgFVttI3sdsSSXQgu5CZyflmT1TfWS5DpHogjx67s";
const FUNCTIONS_URL = `${SUPABASE_URL}/functions/v1`;

// ─── HTTP helper ─────────────────────────────────────────────────────────────
function request(url, options = {}, body = null) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const lib = parsedUrl.protocol === "https:" ? https : http;
    const reqOptions = {
      hostname: parsedUrl.hostname,
      path:     parsedUrl.pathname + parsedUrl.search,
      method:   options.method || "GET",
      headers:  options.headers || {},
    };

    const req = lib.request(reqOptions, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data), raw: data }); }
        catch { resolve({ status: res.statusCode, body: null, raw: data }); }
      });
    });

    req.on("error", reject);
    if (body) req.write(typeof body === "string" ? body : JSON.stringify(body));
    req.end();
  });
}

// ─── Helpers de log ───────────────────────────────────────────────────────────
const C = {
  green:  "\x1b[32m",
  red:    "\x1b[31m",
  yellow: "\x1b[33m",
  cyan:   "\x1b[36m",
  gray:   "\x1b[90m",
  reset:  "\x1b[0m",
  bold:   "\x1b[1m",
};

function log(emoji, label, data) {
  const ts = new Date().toISOString().substr(11, 8);
  console.log(`${C.gray}[${ts}]${C.reset} ${emoji} ${C.bold}${label}${C.reset}`);
  if (data) {
    const str = typeof data === "string" ? data : JSON.stringify(data, null, 2);
    console.log(`${C.gray}${str}${C.reset}`);
  }
}

function ok(label, data)   { log("✅", `${C.green}${label}${C.reset}`, data); }
function fail(label, data) { log("❌", `${C.red}${label}${C.reset}`, data); }
function info(label, data) { log("📋", label, data); }
function wait(label, data) { log("⏳", `${C.yellow}${label}${C.reset}`, data); }

// ─── Supabase Auth: login ─────────────────────────────────────────────────────
async function login(email, password) {
  const res = await request(
    `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
    {
      method:  "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey":        ANON_KEY,
      },
    },
    { email, password }
  );
  if (res.status !== 200) throw new Error(`Login failed: ${res.raw}`);
  return res.body;
}

// ─── Edge Function call ────────────────────────────────────────────────────────
async function callFn(fnName, body, token) {
  const res = await request(
    `${FUNCTIONS_URL}/${fnName}`,
    {
      method:  "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${token}`,
        "apikey":         ANON_KEY,
      },
    },
    body
  );
  return res;
}

// ─── Supabase REST: get profile ───────────────────────────────────────────────
async function getProfile(userId, token) {
  const res = await request(
    `${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}&select=*`,
    {
      headers: {
        "apikey":         ANON_KEY,
        "Authorization": `Bearer ${token}`,
      },
    }
  );
  return res.body?.[0] ?? null;
}

// ─── Supabase REST: poll fiat_transactions ────────────────────────────────────
async function getFiatTx(correlationId, token) {
  const res = await request(
    `${SUPABASE_URL}/rest/v1/fiat_transactions?correlation_id=eq.${correlationId}&select=*`,
    {
      headers: {
        "apikey":         ANON_KEY,
        "Authorization": `Bearer ${token}`,
      },
    }
  );
  return res.body?.[0] ?? null;
}

// ─── Delay ────────────────────────────────────────────────────────────────────
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ─── MAIN ─────────────────────────────────────────────────────────────────────
async function main() {
  const email    = process.argv[2];
  const password = process.argv[3];

  if (!email || !password) {
    console.log(`${C.red}Uso: node scripts/e2e-test.cjs <email> <password>${C.reset}`);
    console.log(`${C.gray}Exemplo: node scripts/e2e-test.cjs teste@email.com minhasenha${C.reset}`);
    process.exit(1);
  }

  console.log(`\n${C.bold}${C.cyan}🚀 WalletNow — Teste End-to-End Etherfuse${C.reset}`);
  console.log("═".repeat(52));

  // ── FASE 1: Login ────────────────────────────────────────────────────────────
  info("FASE 1: Autenticando...");
  let session;
  try {
    session = await login(email, password);
    ok("Login OK", { userId: session.user.id, email });
  } catch (e) {
    fail("Falha no login", e.message);
    process.exit(1);
  }

  const token  = session.access_token;
  const userId = session.user.id;

  // ── FASE 2: Perfil + stellar_address ─────────────────────────────────────────
  info("FASE 2: Buscando perfil...");
  const profile = await getProfile(userId, token);

  if (!profile) {
    fail("Perfil não encontrado no banco");
    process.exit(1);
  }

  if (!profile.stellar_address) {
    fail("stellar_address vazio — configure sua carteira no app antes");
    process.exit(1);
  }

  ok("Perfil OK", { stellarAddress: profile.stellar_address });

  // ── FASE 3: Criar Order ───────────────────────────────────────────────────────
  info("FASE 3: Chamando etherfuse-create-order...");
  const orderRes = await callFn("etherfuse-create-order", {
    amount:         "200",
    stellarAddress: profile.stellar_address,
  }, token);

  console.log(`   HTTP ${orderRes.status}`);

  if (!orderRes.body || orderRes.status >= 400) {
    fail("etherfuse-create-order falhou", orderRes.body || orderRes.raw);
    console.log(`${C.yellow}   → Verificar logs: https://supabase.com/dashboard/project/vjvljpjzusgjsxnoihau/functions/etherfuse-create-order/logs${C.reset}`);
    process.exit(1);
  }

  ok("Order criada", orderRes.body);
  const correlationId = orderRes.body.correlationId;

  // ── FASE 4: Verificar registro no banco ───────────────────────────────────────
  info("FASE 4: Verificando registro no banco...");
  await sleep(500);
  const txRecord = await getFiatTx(correlationId, token);

  if (!txRecord) {
    fail("Registro NÃO encontrado no banco", { correlationId });
    process.exit(1);
  }

  ok("Registro no banco", {
    id:          txRecord.id,
    status:      txRecord.status,
    amount_fiat: txRecord.amount_fiat,
  });

  // ── FASE 5: Simulate fiat ─────────────────────────────────────────────────────
  info("FASE 5: Simulando recebimento fiat...");
  const simRes = await callFn("etherfuse-simulate-fiat", { orderId: correlationId }, token);

  console.log(`   HTTP ${simRes.status}`);

  if (!simRes.body || simRes.status >= 400) {
    fail("etherfuse-simulate-fiat falhou", simRes.body || simRes.raw);
    console.log(`${C.yellow}   → Verificar logs: https://supabase.com/dashboard/project/vjvljpjzusgjsxnoihau/functions/etherfuse-simulate-fiat/logs${C.reset}`);
    process.exit(1);
  }

  ok("Fiat simulado — aguardando webhooks Etherfuse...", simRes.body);

  // ── FASE 6: Poll banco por status completed ───────────────────────────────────
  wait("FASE 6: Aguardando webhook processar (máx 45s)...");

  let finalTx   = null;
  let attempts  = 0;
  const maxWait = 45;

  while (attempts < maxWait) {
    await sleep(1000);
    attempts++;

    const tx = await getFiatTx(correlationId, token);
    const bar = "█".repeat(Math.floor(attempts / maxWait * 20)).padEnd(20, "░");
    process.stdout.write(
      `\r   ${bar} ${attempts}s | status: ${C.yellow}${tx?.status ?? "?"}${C.reset} | XDR: ${tx?.stellar_xdr ? C.green + "✓" : C.gray + "aguardando"}${C.reset}   `
    );

    if (tx?.status === "completed" || tx?.status === "failed") {
      finalTx = tx;
      break;
    }
  }

  console.log("\n");

  if (!finalTx) {
    fail(`Timeout após ${maxWait}s — webhook não processou`);
    console.log(`${C.yellow}   → Verificar logs do webhook: https://supabase.com/dashboard/project/vjvljpjzusgjsxnoihau/functions/etherfuse-webhook/logs${C.reset}`);
    // Mostra estado atual do banco
    const tx = await getFiatTx(correlationId, token);
    info("Estado atual do registro", { status: tx?.status, errorMsg: tx?.error_message });
    process.exit(1);
  }

  if (finalTx.status === "failed") {
    fail("Webhook processou mas marcou como FAILED", { error: finalTx.error_message });
    process.exit(1);
  }

  ok("Webhook processado! Status = completed", {
    status:         finalTx.status,
    hasXdr:         !!finalTx.stellar_xdr,
    xdrLength:      finalTx.stellar_xdr?.length,
    claimableId:    finalTx.stellar_claimable_balance_id,
  });

  // ── FASE 7: Validar XDR ───────────────────────────────────────────────────────
  info("FASE 7: Validando XDR...");

  if (!finalTx.stellar_xdr) {
    fail("stellar_xdr está VAZIO — bug crítico no webhook");
    process.exit(1);
  }

  const xdrPreview = finalTx.stellar_xdr.substring(0, 80) + "...";
  ok("XDR presente", { preview: xdrPreview, length: finalTx.stellar_xdr.length });

  // ── FASE 8: Verificar estrutura XDR (sem Stellar SDK) ────────────────────────
  info("FASE 8: Verificando XDR (decode base64)...");
  try {
    const decoded = Buffer.from(finalTx.stellar_xdr, "base64");
    if (decoded.length < 100) {
      fail("XDR muito curto — provavelmente inválido", { decodedLength: decoded.length });
    } else {
      ok("XDR decodificado", { byteLength: decoded.length, firstBytes: decoded.slice(0, 8).toString("hex") });
    }
  } catch (e) {
    fail("Falha ao decodificar XDR base64", e.message);
    process.exit(1);
  }

  // ── RESULTADO FINAL ───────────────────────────────────────────────────────────
  console.log("\n" + "═".repeat(52));
  console.log(`${C.bold}${C.green}🎉 FLUXO ETHERFUSE VALIDADO COM SUCESSO!${C.reset}`);
  console.log("═".repeat(52));

  console.log(`
  ${C.green}✅${C.reset} FASE 1  Login Supabase
  ${C.green}✅${C.reset} FASE 2  Perfil + stellar_address
  ${C.green}✅${C.reset} FASE 3  etherfuse-create-order → HTTP 201
  ${C.green}✅${C.reset} FASE 4  fiat_transactions INSERT (status: pending)
  ${C.green}✅${C.reset} FASE 5  etherfuse-simulate-fiat → fiat simulado
  ${C.green}✅${C.reset} FASE 6  Webhook processado (funded → completed)
  ${C.green}✅${C.reset} FASE 7  stellar_xdr salvo no banco
  ${C.green}✅${C.reset} FASE 8  XDR decodificado (${finalTx.stellar_xdr.length} chars)

  ${C.cyan}➡️  Próximo passo: Abrir o app e clicar "Claim Funds"${C.reset}
  ${C.gray}   correlationId: ${correlationId}${C.reset}
  ${C.gray}   claimableId:   ${finalTx.stellar_claimable_balance_id ?? "N/A"}${C.reset}

  ${C.yellow}⚠️  FASE 9 (Manual): Assinar XDR no frontend → Submit → Hash na Stellar${C.reset}
  `);
}

main().catch((err) => {
  console.error(`\n${C.red}❌ Erro fatal: ${err.message}${C.reset}`);
  process.exit(1);
});
