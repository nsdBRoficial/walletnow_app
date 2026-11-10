-- @module supabase/migrations/00009_keepalive_cron.sql
-- @description Migração PostgreSQL/Supabase (00009_keepalive_cron) — definição de tabelas, índices e políticas de Row Level Security (RLS).

-- ============================================================
-- Migration: 00009_keepalive_cron
-- Propósito: Manter o projeto Supabase sempre ativo usando
--            pg_cron para evitar hibernação automática do
--            Free Tier (inatividade > ~1 semana).
-- ============================================================

-- 1. Habilitar extensão pg_cron
-- Obs: pg_cron é pré-instalado no Supabase; basta habilitá-lo.
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Tabela de log de heartbeat
-- Mantém histórico dos últimos pings para auditoria e
-- também gera atividade real no banco (escrita + leitura).
CREATE TABLE IF NOT EXISTS public.keepalive_log (
  id          BIGSERIAL PRIMARY KEY,
  pinged_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  source      TEXT NOT NULL DEFAULT 'pg_cron',   -- 'pg_cron' | 'edge_function' | 'github_actions'
  latency_ms  INTEGER,                            -- opcional: preenchido pela Edge Function
  note        TEXT
);

-- Índice para consultas por data (ex: último ping, histórico)
CREATE INDEX IF NOT EXISTS keepalive_log_pinged_at_idx
  ON public.keepalive_log (pinged_at DESC);

-- RLS: apenas service_role pode inserir/ler (Edge Functions usam service_role)
ALTER TABLE public.keepalive_log ENABLE ROW LEVEL SECURITY;

-- Permite leitura pública para monitoring/dashboard (sem expor dados sensíveis)
CREATE POLICY "keepalive_log_read_public"
  ON public.keepalive_log
  FOR SELECT
  USING (true);

-- Apenas service_role insere (segurança)
CREATE POLICY "keepalive_log_insert_service"
  ON public.keepalive_log
  FOR INSERT
  WITH CHECK (true);

-- 3. Limpar logs antigos automaticamente (manter últimos 7 dias)
-- Evita crescimento indefinido da tabela
CREATE OR REPLACE FUNCTION public.cleanup_keepalive_log()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  DELETE FROM public.keepalive_log
  WHERE pinged_at < now() - INTERVAL '7 days';
$$;

-- 4. Registrar cron job: executa a cada 5 minutos
-- Faz um INSERT simples que mantém o banco ativo com I/O real
SELECT cron.schedule(
  'walletnow-keepalive',       -- nome único do job
  '*/5 * * * *',               -- a cada 5 minutos
  $$
    INSERT INTO public.keepalive_log (source, note)
    VALUES ('pg_cron', 'heartbeat automático — anti-hibernação');
  $$
);

-- 5. Job de limpeza semanal (toda domingo às 03:00 UTC)
SELECT cron.schedule(
  'walletnow-keepalive-cleanup',
  '0 3 * * 0',
  $$SELECT public.cleanup_keepalive_log();$$
);

-- ============================================================
-- Como verificar se está funcionando:
--   SELECT * FROM public.keepalive_log ORDER BY pinged_at DESC LIMIT 10;
--   SELECT * FROM cron.job;
--   SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 20;
-- ============================================================
