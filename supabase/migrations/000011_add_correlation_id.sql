-- @module supabase\migrations\000011_add_correlation_id.sql
-- @description WalletNow Protocol - Esquema e funções de persistência Supabase/PostgreSQL.

-- ==============================================================================
-- MIGRAÇÃO DE INTEGRIDADE: 000011_add_correlation_id.sql
-- Auditoria Adversarial Fase 2 (R-11 / Anti-Replay Idempotência)
-- ==============================================================================
-- OBJETIVO:
-- Adicionar garantia de idempotência no banco de dados para evitar transações
-- duplicadas em caso de retry de rede ou webhooks repetidos.
-- ==============================================================================

-- 1. Adicionar coluna correlation_id caso ainda não exista
ALTER TABLE public.fiat_transactions
  ADD COLUMN IF NOT EXISTS correlation_id TEXT;

-- 2. Criar índice único parcial para garantir que nenhum correlation_id seja processado em duplicidade
CREATE UNIQUE INDEX IF NOT EXISTS idx_fiat_transactions_correlation_id
  ON public.fiat_transactions (correlation_id)
  WHERE correlation_id IS NOT NULL;

COMMENT ON COLUMN public.fiat_transactions.correlation_id IS
  'Identificador único idempotente da transação (ex: Woovi charge ID, Pix E2E ou UUID da operação).';
