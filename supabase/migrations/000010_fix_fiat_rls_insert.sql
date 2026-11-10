-- @module supabase/migrations/000010_fix_fiat_rls_insert.sql
-- @description Migração PostgreSQL/Supabase (000010_fix_fiat_rls_insert) — definição de tabelas, índices e políticas de Row Level Security (RLS).

-- ==============================================================================
-- MIGRAÇÃO DE SEGURANÇA: 000010_fix_fiat_rls_insert.sql
-- Auditoria Adversarial Fase 2 (R-09 / RISCO-FT2)
-- ==============================================================================
-- PROBLEMA CORRIGIDO:
-- A política "fiat_tx_insert_service_only" em fiat_transactions continha:
--   WITH CHECK (auth.jwt() ->> 'role' = 'service_role' OR auth.uid() = user_id);
-- Permitindo que qualquer usuário autenticado inserisse registros diretamente
-- na tabela financeira com parâmetros potencialmente forjados.
--
-- SOLUÇÃO:
-- Revogar a possibilidade de inserção direta por usuários autenticados.
-- Apenas chamadas autenticadas com role 'service_role' (webhooks backend, edge functions)
-- têm autorização de escrita na tabela de transações fiduciárias.
-- ==============================================================================

-- 1. Remove a policy de inserção anterior permissiva
DROP POLICY IF EXISTS "fiat_tx_insert_service_only" ON public.fiat_transactions;

-- 2. Cria nova policy estrita: APENAS service_role
CREATE POLICY "fiat_tx_insert_service_only"
ON public.fiat_transactions FOR INSERT
WITH CHECK (
  auth.jwt() ->> 'role' = 'service_role'
);

COMMENT ON POLICY "fiat_tx_insert_service_only" ON public.fiat_transactions IS
  'Garante que apenas o backend institucional (service_role) pode registrar novas transações fiat/crypto.';
