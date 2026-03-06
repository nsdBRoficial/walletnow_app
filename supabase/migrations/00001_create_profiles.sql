-- supabase/migrations/00001_create_profiles.sql

-- Criação da tabela de perfis (The Access Layer)
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    google_id TEXT UNIQUE,
    email TEXT UNIQUE NOT NULL,
    stellar_address TEXT UNIQUE,
    passkey_credential_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar Row Level Security (RLS) para segurança
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Políticas de Segurança (RLS Policies)
-- 1. O usuário pode visualizar apenas o próprio perfil
CREATE POLICY "Usuários podem visualizar o próprio perfil"
    ON public.profiles FOR SELECT
    USING ( auth.uid() = id );

-- 2. O usuário pode atualizar apenas o próprio perfil
CREATE POLICY "Usuários podem atualizar o próprio perfil"
    ON public.profiles FOR UPDATE
    USING ( auth.uid() = id );

-- 3. Inserção controlada (Geralmente feita via Trigger no Auth)
CREATE POLICY "Usuários podem inserir o próprio perfil"
    ON public.profiles FOR INSERT
    WITH CHECK ( auth.uid() = id );

-- Trigger para atualizar o campo updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
