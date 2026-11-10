<!-- @module docs\mainnet\SUPABASE_AUDIT.md | WalletNow Protocol - Documentação e especificações de engenharia -->

# WalletNow — Supabase Audit Report

**Versão:** 1.0 | **Data:** 2026-05-27

---

## Tabelas Existentes

### `public.profiles`
| Campo | Tipo | Sensível? | Observação |
|-------|------|-----------|------------|
| id | UUID | Não | PK, referencia auth.users |
| google_id | TEXT | Sim | Identificador OAuth |
| email | TEXT | Sim | Unique — risco de enumeração |
| stellar_address | TEXT | Não | Chave pública (segura) |
| passkey_credential_id | TEXT | Sim | ID da passkey |
| cpf | TEXT | 🔴 CRÍTICO | Dado pessoal sensível — deve ser criptografado |
| kyczk_hash | TEXT | Não | Hash ZK (seguro) |
| kyc_verified | BOOLEAN | Não | Flag de aprovação |
| created_at | TIMESTAMPTZ | Não | — |

**⚠️ RISCO:** O campo `cpf` armazena CPF em texto plano. Deve ser criptografado em repouso.

### `public.fiat_transactions`
| Status RLS | Antes | Depois (migração 00005) |
|------------|-------|-------------------------|
| SELECT | Usuário vê as próprias | ✅ Mantido |
| INSERT | Qualquer usuário | ✅ Restrito a service_role |
| UPDATE | Qualquer usuário | ✅ Restrito a service_role |
| DELETE | Qualquer usuário | ✅ Bloqueado |

### `public.audit_logs` (NOVA)
- Criada na migração `00005_fix_rls_fiat_transactions.sql`
- Imutável (sem DELETE policy)
- Escrita apenas via service_role
- Índices criados para performance

---

## Políticas RLS — Estado Atual

| Tabela | SELECT | INSERT | UPDATE | DELETE |
|--------|--------|--------|--------|--------|
| profiles | ✅ Próprio usuário | ✅ Próprio usuário | ✅ Próprio usuário | ❌ Bloqueado |
| fiat_transactions | ✅ Próprio usuário | ✅ service_role only | ✅ service_role only | ❌ Bloqueado |
| audit_logs | ✅ Próprio usuário | ✅ service_role only | ❌ Bloqueado | ❌ Bloqueado |

---

## Issues Identificados

### SUPABASE-001 — CPF em Texto Plano 🔴 ALTO
- **Tabela:** `profiles`
- **Campo:** `cpf`
- **Risco:** Vazamento de dado pessoal sensível em caso de breach do banco
- **Solução:** Usar `pgcrypto` para criptografia em repouso ou coluna `bytea` com chave AES

### SUPABASE-002 — Sem Audit Log de Mudanças em profiles 🟡 MÉDIO
- Não há registro de quem alterou campos como `stellar_address`, `kyc_verified`
- **Solução:** Trigger de audit na tabela `profiles`

### SUPABASE-003 — Storage KYC Docs sem Verificação de Expiração 🟡 MÉDIO
- Documentos de KYC (CNH/RG) ficam em storage indefinidamente
- **Solução:** Política de retenção de 90 dias para documentos aprovados, 7 dias para rejeitados

### SUPABASE-004 — Auto-linking de identidades OAuth precisa ser validado 🟡 MÉDIO
- O `AuthContext.tsx` faz merge manual de perfis por email
- Pode resultar em dois perfis associados ao mesmo CPF
- **Solução:** Habilitar "Link Identities" nativo do Supabase + verificação de unicidade de CPF

---

## Configurações Auth Recomendadas

```sql
-- Verificar configurações no Supabase Dashboard > Authentication > Settings
-- Email confirmação: HABILITADO
-- Magic Link expiry: 1 hora (default 1 hora)
-- JWT expiry: 3600s (1 hora) para produção
-- Refresh token rotation: HABILITADO
-- Rate limiting: configurar via Supabase Dashboard
```

---

## Próximas Migrations Necessárias

| Migration | Prioridade | Descrição |
|-----------|------------|-----------|
| 00006_encrypt_cpf_field | 🔴 ALTO | Criptografar CPF em repouso |
| 00007_profiles_audit_trigger | 🟡 MÉDIO | Trigger de audit em profiles |
| 00008_kyc_docs_retention | 🟡 MÉDIO | Política de retenção de documentos |
| 00009_add_rate_limiting | 🟡 MÉDIO | Rate limiting via tabela de controle |
