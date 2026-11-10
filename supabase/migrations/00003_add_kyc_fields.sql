-- @module supabase\migrations\00003_add_kyc_fields.sql
-- @description WalletNow Protocol - Esquema e funções de persistência Supabase/PostgreSQL.

-- Migration: Add KYC and ZK-STARK fields to profiles

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS full_name text,
ADD COLUMN IF NOT EXISTS cpf text,
ADD COLUMN IF NOT EXISTS whatsapp text,
ADD COLUMN IF NOT EXISTS birth_date text,
ADD COLUMN IF NOT EXISTS address text,
ADD COLUMN IF NOT EXISTS kyc_verified boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS kyczk_hash text;
