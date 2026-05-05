# scripts/setup-and-test.ps1
# Script PowerShell para:
# 1. Criar tabela fiat_transactions via Supabase Management API
# 2. Testar o webhook diretamente
# 3. Verificar se a tabela foi criada

$SUPABASE_URL = "https://vjvljpjzusgjsxnoihau.supabase.co"
$ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZqdmxqcGp6dXNnanN4bm9paGF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4MTg4NjEsImV4cCI6MjA4ODM5NDg2MX0.XKFgFVttI3sdsSSXQgu5CZyflmT1TfWS5DpHogjx67s"
$FUNCTIONS_URL = "$SUPABASE_URL/functions/v1"
$WEBHOOK_URL = "$FUNCTIONS_URL/etherfuse-webhook"

Write-Host "`n🚀 WalletNow — Setup e Teste do Fluxo Etherfuse" -ForegroundColor Cyan
Write-Host ("=" * 55) -ForegroundColor Cyan

# ─── PASSO 1: Testar webhook diretamente (sem HMAC, pois secret não está setado) ─────
Write-Host "`n📡 TESTE 1: Webhook com payload de teste (funded)" -ForegroundColor Yellow

$webhookPayload = @{
    eventType = "order_updated"
    orderId   = "test-order-00000001"
    status    = "funded"
} | ConvertTo-Json

try {
    $webhookResult = Invoke-RestMethod `
        -Uri $WEBHOOK_URL `
        -Method POST `
        -ContentType "application/json" `
        -Body $webhookPayload `
        -ErrorAction Stop

    Write-Host "✅ Webhook respondeu: $($webhookResult | ConvertTo-Json)" -ForegroundColor Green
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Host "❌ Webhook falhou: HTTP $statusCode - $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   Verificar logs em: https://supabase.com/dashboard/project/vjvljpjzusgjsxnoihau/functions/etherfuse-webhook/logs" -ForegroundColor Gray
}

# ─── PASSO 2: Testar webhook com payload completed + XDR fictício ────────────
Write-Host "`n📡 TESTE 2: Webhook com payload completed + XDR" -ForegroundColor Yellow

$completedPayload = @{
    eventType                 = "order_updated"
    orderId                   = "test-order-00000001"
    status                    = "completed"
    stellarClaimTransaction   = "AAAAAgAAAABk_FAKE_XDR_FOR_TESTING_PURPOSES_ONLY_base64encoded=="
    stellarClaimableBalanceId = "00000000deadbeef1234567890abcdef"
} | ConvertTo-Json

try {
    $webhookResult2 = Invoke-RestMethod `
        -Uri $WEBHOOK_URL `
        -Method POST `
        -ContentType "application/json" `
        -Body $completedPayload `
        -ErrorAction Stop

    Write-Host "✅ Webhook completed respondeu: $($webhookResult2 | ConvertTo-Json)" -ForegroundColor Green
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Host "❌ Webhook completed falhou: HTTP $statusCode" -ForegroundColor Red
}

# ─── PASSO 3: Verificar se tabela existe via REST API ────────────────────────
Write-Host "`n🗄️  VERIFICANDO: tabela fiat_transactions existe?" -ForegroundColor Yellow

try {
    $tableCheck = Invoke-RestMethod `
        -Uri "$SUPABASE_URL/rest/v1/fiat_transactions?limit=1" `
        -Method GET `
        -Headers @{
            "apikey"        = $ANON_KEY
            "Authorization" = "Bearer $ANON_KEY"
        } `
        -ErrorAction Stop

    Write-Host "✅ Tabela fiat_transactions EXISTE" -ForegroundColor Green
    Write-Host "   Registros encontrados: $($tableCheck.Count)" -ForegroundColor Gray
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Host "❌ Tabela NÃO existe (HTTP $statusCode)" -ForegroundColor Red
    Write-Host "" -ForegroundColor White
    Write-Host "🔧 AÇÃO NECESSÁRIA: Execute o SQL abaixo no Supabase Dashboard:" -ForegroundColor Yellow
    Write-Host "   https://supabase.com/dashboard/project/vjvljpjzusgjsxnoihau/sql/new" -ForegroundColor Cyan
    Write-Host "" -ForegroundColor White
    
    # Copiar SQL para clipboard
    $sql = @"
CREATE TABLE IF NOT EXISTS public.fiat_transactions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider        TEXT NOT NULL DEFAULT 'etherfuse' CHECK (provider IN ('etherfuse', 'woovi')),
  correlation_id  TEXT UNIQUE NOT NULL,
  amount_fiat     NUMERIC(12, 2) NOT NULL,
  currency        TEXT NOT NULL DEFAULT 'MXN',
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'claimed', 'failed')),
  stellar_address TEXT NOT NULL,
  stellar_xdr     TEXT,
  stellar_claimable_balance_id TEXT,
  stellar_tx_hash TEXT,
  provider_data   JSONB,
  error_message   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_fiat_tx_user_id     ON public.fiat_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_fiat_tx_status      ON public.fiat_transactions(status);
CREATE INDEX IF NOT EXISTS idx_fiat_tx_correlation ON public.fiat_transactions(correlation_id);
ALTER TABLE public.fiat_transactions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "users_see_own_fiat_transactions" ON public.fiat_transactions FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "users_insert_own_fiat_transactions" ON public.fiat_transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "users_update_own_fiat_transactions" ON public.fiat_transactions FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
ALTER PUBLICATION supabase_realtime ADD TABLE public.fiat_transactions;
"@
    $sql | Set-Clipboard
    Write-Host "📋 SQL copiado para o clipboard! Cole no editor Supabase." -ForegroundColor Green
}

# ─── RESUMO ───────────────────────────────────────────────────────────────────
Write-Host "`n" + ("=" * 55) -ForegroundColor Cyan
Write-Host "📊 RESUMO DOS TESTES" -ForegroundColor Cyan
Write-Host "   Webhook URL: $WEBHOOK_URL" -ForegroundColor Gray
Write-Host "   Logs webhook: https://supabase.com/dashboard/project/vjvljpjzusgjsxnoihau/functions/etherfuse-webhook/logs" -ForegroundColor Gray
Write-Host "   Logs simulate-fiat: https://supabase.com/dashboard/project/vjvljpjzusgjsxnoihau/functions/etherfuse-simulate-fiat/logs" -ForegroundColor Gray
Write-Host "   Logs create-order: https://supabase.com/dashboard/project/vjvljpjzusgjsxnoihau/functions/etherfuse-create-order/logs" -ForegroundColor Gray
