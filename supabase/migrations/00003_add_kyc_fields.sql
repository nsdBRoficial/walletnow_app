-- @module supabase/migrations/00003_add_kyc_fields.sql
-- @description Migração PostgreSQL/Supabase (00003_add_kyc_fields) — definição de tabelas, índices e políticas de Row Level Security (RLS).

-- Migration: Add KYC and ZK-STARK fields to profiles

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS full_name text,
ADD COLUMN IF NOT EXISTS cpf text,
ADD COLUMN IF NOT EXISTS whatsapp text,
ADD COLUMN IF NOT EXISTS birth_date text,
ADD COLUMN IF NOT EXISTS address text,
ADD COLUMN IF NOT EXISTS kyc_verified boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS kyczk_hash text;
