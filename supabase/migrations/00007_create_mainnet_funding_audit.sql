-- @module supabase\migrations\00007_create_mainnet_funding_audit.sql
-- @description WalletNow Protocol - Esquema e funções de persistência Supabase/PostgreSQL.

-- Migration: 00007_create_mainnet_funding_audit.sql
-- Tabela para auditoria rigorosa de funding na MAINNET (trava dupla anti-spam)

CREATE TABLE IF NOT EXISTS public.mainnet_funding_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    public_key TEXT NOT NULL,
    tx_hash TEXT NOT NULL,
    funded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    amount NUMERIC NOT NULL,
    network TEXT NOT NULL DEFAULT 'mainnet',
    
    -- Constraint única para garantir: 1 funding por user_id e 1 por public_key
    CONSTRAINT unique_user_funding UNIQUE (user_id),
    CONSTRAINT unique_pubkey_funding UNIQUE (public_key)
);

-- RLS: Apenas leitura para o usuário dono (opcional), inserção só via Edge Function (Service Role)
ALTER TABLE public.mainnet_funding_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own funding audit"
    ON public.mainnet_funding_audit FOR SELECT
    USING (auth.uid() = user_id);

-- Para permitir que a Edge Function insira, como ela usa o Service Role Key, 
-- ela bypassa o RLS nativamente. Não precisamos criar policy de INSERT para anon/auth.

-- Comentários para documentação
COMMENT ON TABLE public.mainnet_funding_audit IS 'Tabela de auditoria para o funding automático da Stellar Mainnet.';
COMMENT ON COLUMN public.mainnet_funding_audit.amount IS 'Quantidade de XLM enviada na operação createAccount (ex: 2.0).';
