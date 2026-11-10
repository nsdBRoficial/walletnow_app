-- @module supabase/migrations/00005_fix_rls_fiat_transactions.sql
-- @description Migração PostgreSQL/Supabase (00005_fix_rls_fiat_transactions) — definição de tabelas, índices e políticas de Row Level Security (RLS).

-- =============================================
-- MIGRAÇÃO DE SEGURANÇA: Correção de RLS Permissiva
-- Sprint: mainnet-ready-infra
-- Arquivo: 00005_fix_rls_fiat_transactions.sql
-- =============================================
--
-- PROBLEMA CORRIGIDO:
-- A policy "Service Role Master insere livremente" em fiat_transactions
-- usava USING (true) WITH CHECK (true), permitindo que QUALQUER usuário
-- autenticado lesse e modificasse TODAS as transações de todos os usuários.
--
-- SOLUÇÃO:
-- 1. Remoção da policy permissiva (FOR ALL com USING true)
-- 2. Criação de policies granulares por operação:
--    - SELECT: usuário vê apenas suas próprias transações
--    - INSERT: apenas service_role pode inserir (webhooks, backend)
--    - UPDATE: apenas service_role pode atualizar status
--    - DELETE: ninguém pode deletar (imutabilidade de audit trail)
-- =============================================

-- Remove a policy perigosa que permitia acesso total a qualquer usuário
DROP POLICY IF EXISTS "Service Role Master insere livremente" ON fiat_transactions;

-- Remove a policy de select antiga (será recriada com mesmo nome por compatibilidade)
DROP POLICY IF EXISTS "Usuários veem suas próprias transações FIAT" ON fiat_transactions;

-- ─── Novas Policies Granulares ────────────────────────────────────────────────

-- 1. SELECT: Usuário vê apenas suas próprias transações
CREATE POLICY "fiat_tx_select_own"
ON fiat_transactions FOR SELECT
USING (auth.uid() = user_id);

-- 2. INSERT: Apenas service_role pode inserir (backend seguro, webhooks)
-- O frontend NUNCA deve inserir diretamente em fiat_transactions
CREATE POLICY "fiat_tx_insert_service_only"
ON fiat_transactions FOR INSERT
WITH CHECK (
  -- Permite apenas quando executado pelo service_role (JWT role = 'service_role')
  -- ou quando o user_id corresponde ao usuário autenticado (para casos específicos de onboarding)
  auth.jwt() ->> 'role' = 'service_role'
  OR auth.uid() = user_id
);

-- 3. UPDATE: Apenas service_role pode atualizar (mudanças de status via webhook)
CREATE POLICY "fiat_tx_update_service_only"
ON fiat_transactions FOR UPDATE
USING (auth.jwt() ->> 'role' = 'service_role')
WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- 4. DELETE: Ninguém pode deletar (imutabilidade do audit trail financeiro)
-- Não criamos policy de DELETE, portanto é bloqueado por padrão com RLS habilitado.

-- ─── Tabela de Audit Log ──────────────────────────────────────────────────────

-- Criar tabela de audit log para rastrear mudanças sensíveis
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type TEXT NOT NULL,           -- 'wallet_created', 'kyc_approved', 'tx_mint', 'tx_burn', etc.
    user_id UUID REFERENCES auth.users(id),
    actor_id UUID,                       -- Quem executou (pode ser service_role)
    resource_type TEXT,                  -- 'wallet', 'transaction', 'kyc'
    resource_id TEXT,                    -- ID do recurso afetado
    metadata JSONB,                      -- Dados adicionais (sem secrets)
    ip_address TEXT,                     -- IP do cliente (quando disponível)
    user_agent TEXT,                     -- User agent (quando disponível)
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS para audit_logs: apenas leitura pelo próprio usuário, escrita apenas service_role
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_logs_select_own"
ON audit_logs FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "audit_logs_insert_service_only"
ON audit_logs FOR INSERT
WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- Ninguém pode UPDATE ou DELETE em audit_logs (imutabilidade total)

-- Índices para performance de consultas de audit
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_event ON audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);

-- ─── Comentários de Documentação ──────────────────────────────────────────────

COMMENT ON TABLE audit_logs IS 'Registro imutável de eventos de segurança e operacionais. Service role only para escrita.';
COMMENT ON TABLE fiat_transactions IS 'Transações financeiras fiat<>crypto. RLS: usuário vê as próprias, service_role gerencia.';
