-- supabase/migrations/002_fiat_transactions.sql
-- Tabela central de rastreamento de transações fiat ↔ crypto via Etherfuse

CREATE TABLE public.fiat_transactions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- Identificação do provider
  provider        TEXT NOT NULL DEFAULT 'etherfuse'
                    CHECK (provider IN ('etherfuse', 'woovi')),
  correlation_id  TEXT UNIQUE NOT NULL, -- orderId do Etherfuse (UUID gerado por nós)

  -- Valores financeiros
  amount_fiat     NUMERIC(12, 2) NOT NULL,
  currency        TEXT NOT NULL DEFAULT 'MXN',

  -- Status do ciclo de vida
  -- pending    → order criada, aguardando fiat
  -- processing → fiat recebido (webhook funded)
  -- completed  → XDR disponível (webhook completed)
  -- claimed    → usuário assinou e submeteu XDR à Stellar
  -- failed     → falha em qualquer etapa
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'processing', 'completed', 'claimed', 'failed')),

  -- Dados Etherfuse
  stellar_address TEXT NOT NULL,               -- endereço destino do usuário
  stellar_xdr     TEXT,                        -- stellarClaimTransaction (XDR base64)
  stellar_claimable_balance_id TEXT,           -- stellarClaimableBalanceId (hex)
  stellar_tx_hash TEXT,                        -- hash final após claim bem-sucedido

  -- Auditoria
  provider_data   JSONB,                       -- payload completo do webhook para debugging
  error_message   TEXT,                        -- mensagem de erro se status = 'failed'

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Índices ──────────────────────────────────────────────────────────────────
CREATE INDEX idx_fiat_tx_user_id     ON public.fiat_transactions(user_id);
CREATE INDEX idx_fiat_tx_status      ON public.fiat_transactions(status);
CREATE INDEX idx_fiat_tx_correlation ON public.fiat_transactions(correlation_id);

-- ─── Updated_at automático ────────────────────────────────────────────────────
CREATE TRIGGER update_fiat_tx_updated_at
  BEFORE UPDATE ON public.fiat_transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── Row Level Security ───────────────────────────────────────────────────────
ALTER TABLE public.fiat_transactions ENABLE ROW LEVEL SECURITY;

-- Usuário autenticado lê apenas suas próprias transações
CREATE POLICY "users_see_own_fiat_transactions"
  ON public.fiat_transactions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Usuário pode inserir apenas para si mesmo
CREATE POLICY "users_insert_own_fiat_transactions"
  ON public.fiat_transactions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Atualização apenas pelo próprio usuário (claim do XDR)
-- Edge Functions usam service_role_key que bypassa RLS automaticamente
CREATE POLICY "users_update_own_fiat_transactions"
  ON public.fiat_transactions
  FOR UPDATE
  USING (auth.uid() = user_id);

-- ─── Habilitar Realtime ───────────────────────────────────────────────────────
-- Adicionar tabela ao publication para Supabase Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.fiat_transactions;
