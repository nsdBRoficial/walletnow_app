-- @module supabase/migrations/00006_create_wallet_accounts.sql
-- @description Migração PostgreSQL/Supabase (00006_create_wallet_accounts) — definição de tabelas, índices e políticas de Row Level Security (RLS).

-- supabase/migrations/00006_create_wallet_accounts.sql

-- Criação da tabela de contas de carteira (Multi-Account Architecture)
CREATE TABLE public.wallet_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  label TEXT NOT NULL DEFAULT 'Account',
  account_type TEXT NOT NULL CHECK (account_type IN ('generated', 'imported', 'legacy')),
  
  stellar_public_key TEXT NOT NULL,
  
  -- Campos para futuro vault sync na nuvem (opcionais na fase atual Local-First)
  -- encrypted_secret JSONB,
  -- encrypted_mnemonic JSONB,
  
  is_active BOOLEAN NOT NULL DEFAULT false,
  is_default BOOLEAN NOT NULL DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Restrições de unicidade
  UNIQUE(user_id, stellar_public_key)
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.wallet_accounts ENABLE ROW LEVEL SECURITY;

-- Políticas de Segurança (RLS Policies)
-- 1. O usuário pode visualizar apenas as próprias carteiras
CREATE POLICY "Usuários podem visualizar próprias carteiras"
  ON public.wallet_accounts FOR SELECT
  USING ( auth.uid() = user_id );

-- 2. O usuário pode atualizar apenas as próprias carteiras (ex: mudar label ou is_active)
CREATE POLICY "Usuários podem atualizar próprias carteiras"
  ON public.wallet_accounts FOR UPDATE
  USING ( auth.uid() = user_id );

-- 3. O usuário pode inserir carteiras para si mesmo
CREATE POLICY "Usuários podem inserir próprias carteiras"
  ON public.wallet_accounts FOR INSERT
  WITH CHECK ( auth.uid() = user_id );

-- 4. O usuário pode excluir próprias carteiras
CREATE POLICY "Usuários podem excluir próprias carteiras"
  ON public.wallet_accounts FOR DELETE
  USING ( auth.uid() = user_id );

-- Criar índice para performance em buscar carteira ativa
CREATE INDEX idx_wallet_accounts_user_id ON public.wallet_accounts(user_id);
CREATE INDEX idx_wallet_accounts_active ON public.wallet_accounts(user_id) WHERE is_active = true;

-- MIGRAÇÃO SILENCIOSA: Mover dados existentes de profiles para wallet_accounts
DO $$
BEGIN
    -- Insere apenas usuários que têm um stellar_address e que ainda não estão na wallet_accounts
    INSERT INTO public.wallet_accounts (user_id, label, account_type, stellar_public_key, is_active, is_default)
    SELECT 
        id as user_id,
        'Main Account' as label,
        'legacy' as account_type,
        stellar_address as stellar_public_key,
        true as is_active,
        true as is_default
    FROM public.profiles
    WHERE stellar_address IS NOT NULL
      AND NOT EXISTS (
          SELECT 1 FROM public.wallet_accounts wa WHERE wa.user_id = profiles.id AND wa.stellar_public_key = profiles.stellar_address
      );
END $$;
