-- @module supabase/migrations/000012_fix_keepalive_insert_policy.sql
-- @description Migração PostgreSQL/Supabase (000012_fix_keepalive_insert_policy) — definição de tabelas, índices e políticas de Row Level Security (RLS).

-- ==============================================================================
-- MIGRAÇÃO DE SEGURANÇA: 000012_fix_keepalive_insert_policy.sql
-- Auditoria Adversarial Fase 2 (R-14 / MED-05)
-- ==============================================================================
-- PROBLEMA CORRIGIDO:
-- A política "keepalive_log_insert_service" em keepalive_log usava WITH CHECK (true),
-- permitindo inserção indiscriminada por clientes anônimos ou usuários comuns.
--
-- SOLUÇÃO:
-- Restringir INSERT estritamente a chamadas com role 'service_role' (ou superuser/pg_cron).
-- ==============================================================================

DROP POLICY IF EXISTS "keepalive_log_insert_service" ON public.keepalive_log;

CREATE POLICY "keepalive_log_insert_service"
  ON public.keepalive_log
  FOR INSERT
  WITH CHECK (
    auth.jwt() ->> 'role' = 'service_role'
  );

COMMENT ON POLICY "keepalive_log_insert_service" ON public.keepalive_log IS
  'Apenas rotinas automatizadas e Edge Functions com credencial service_role podem registrar heartbeats.';
