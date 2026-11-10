<!-- @module docs/mainnet/MAINNET_MIGRATION_PLAN.md | Documentação técnica e especificação: WalletNow — Plano de Migração Testnet → Mainnet. -->

# WalletNow — Plano de Migração Testnet → Mainnet

**Versão:** 1.0 | **Data:** 2026-05-27

---

## Visão Geral

Este documento descreve o plano técnico passo a passo para migrar a WalletNow da testnet Stellar para a mainnet pública, sem downtime e sem perda de dados.

---

## Pré-requisitos Obrigatórios (Antes de Começar)

1. **Blockers de segurança resolvidos** (BLOCKER-01 e BLOCKER-02 do MAINNET_READINESS_REPORT)
2. **Wallet treasury mainnet criada** com XLM suficiente para subsidiar:
   - Ativação de contas: ~1.5 XLM/usuário
   - Sponsorship de trustlines: ~0.5 XLM/trustline
   - Fees de transação: ~0.01 XLM/tx
   - Buffer inicial recomendado: 10.000 XLM
3. **Credenciais Etherfuse produção** obtidas e testadas
4. **Credenciais Woovi/Transfero produção** obtidas e testadas
5. **Projeto Supabase de produção separado** criado (não usar o de dev)
6. **Domínio de produção** configurado e SSL ativo

---

## Fase 1 — Preparação de Infraestrutura

### 1.1 Supabase Produção
```bash
# Criar projeto separado no Supabase para produção
# Executar todas as migrations no projeto de produção
supabase db push --project-ref SEU_PROJETO_PROD

# Configurar secrets
supabase secrets set STELLAR_ISSUER_SECRET=S... --project-ref SEU_PROJETO_PROD
supabase secrets set STELLAR_NETWORK=mainnet --project-ref SEU_PROJETO_PROD
supabase secrets set ETHERFUSE_API_KEY=api_prod:... --project-ref SEU_PROJETO_PROD
supabase secrets set GEMINI_API_KEY=... --project-ref SEU_PROJETO_PROD

# Deploy das Edge Functions
supabase functions deploy etherfuse-proxy --project-ref SEU_PROJETO_PROD
supabase functions deploy stellar-issuer --project-ref SEU_PROJETO_PROD
supabase functions deploy kyc-validator --project-ref SEU_PROJETO_PROD
```

### 1.2 Wallet Treasury Mainnet
```
1. Gerar novo keypair ED25519 para o issuer/treasury mainnet
   NUNCA usar a keypair da testnet em mainnet

2. Ativar a conta:
   - Enviar mínimo 1.5 XLM via exchange ou OTC
   - Verificar ativação via: https://stellar.expert/explorer/public/account/GPUBKEY

3. Configurar trustlines necessárias:
   - USDC (issuer: GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN)
   - BRZ (issuer: GDVKY2GU2DRXBEUF2WOSEM2BFKBLBHNBKNTXCDBC7525JOOE3SKGHGV)
   - TESOURO (issuer: resolver via Etherfuse /ramp/assets)

4. Armazenar a secret key APENAS no Supabase Vault
   NUNCA em arquivo .env, código ou qualquer repositório
```

### 1.3 Configuração de Rede
```bash
# Variáveis de ambiente de produção (Vercel)
VITE_APP_ENV=production
VITE_STELLAR_NETWORK=mainnet
VITE_SUPABASE_URL=https://SEU_PROJETO_PROD.supabase.co
VITE_SUPABASE_ANON_KEY=SEU_ANON_KEY_PROD
VITE_STELLAR_ISSUER_PUBLIC=SUA_CHAVE_PUBLICA_MAINNET
# NÃO adicionar VITE_STELLAR_ISSUER_SECRET — deve ir apenas para Supabase Vault
```

---

## Fase 2 — Teste em Homolog (Staging Mainnet)

### 2.1 Configurar Ambiente Homolog
- Criar projeto Supabase separado para homolog (não o de produção)
- Apontar para mainnet com volume controlado
- Usar uma hot wallet de homolog com saldo limitado (máx 500 XLM)

### 2.2 Testes End-to-End Obrigatórios
| Teste | Resultado Esperado | Validado? |
|-------|-------------------|-----------|
| Criar nova conta | Ativação em mainnet real | `[ ]` |
| Trustline USDC | Aberta e verificada no Explorer | `[ ]` |
| Trustline BRZ | Aberta e verificada no Explorer | `[ ]` |
| Depósito PIX → TESOURO | Tokens creditados em mainnet | `[ ]` |
| Saque TESOURO → PIX | BRL recebido em conta bancária | `[ ]` |
| KYC flow | Aprovado via Etherfuse prod | `[ ]` |
| Fee 0,49% | Coletada em XLM na treasury | `[ ]` |
| Rollback de saque | BRZ devolvido em caso de falha | `[ ]` |
| Reveal seed phrase | 12 palavras exibidas corretamente | `[ ]` |

---

## Fase 3 — Diferenças Críticas Testnet vs Mainnet

| Aspecto | Testnet | Mainnet |
|---------|---------|---------|
| Ativação de conta | Friendbot (grátis) | Treasury Sponsor (custo XLM) |
| Network Passphrase | `Test SDF Network ; September 2015` | `Public Global Stellar Network ; September 2015` |
| Horizon URL | `horizon-testnet.stellar.org` | `horizon.stellar.org` |
| USDC Issuer | Mock local | `GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN` (Circle) |
| BRZ Issuer | Mock local | `GDVKY2GU2DRXBEUF2WOSEM2BFKBLBHNBKNTXCDBC7525JOOE3SKGHGV` (Transfero) |
| Etherfuse | `api.sand.etherfuse.com` | `api.etherfuse.com` |
| Woovi | Sandbox | Produção |
| Fees XLM | Negligíveis | Reais (considerar no modelo financeiro) |
| Explorer | `stellar.expert/testnet` | `stellar.expert/public` |
| Reserve mínimo | 1 XLM base + 0.5/entry | Mesmo (verificar atual na documentação Stellar) |

---

## Fase 4 — Plano de Rollback

Se algo der errado após o go-live:

1. **Pausar onboarding:** Desabilitar criação de novas contas via feature flag
2. **Comunicar usuários:** Email + banner na UI informando manutenção
3. **Congelar transações:** Desabilitar mint/burn temporariamente
4. **Investigar:** Checar logs no Sentry + Supabase Dashboard
5. **Reverter deploy:** Vercel permite rollback de 1-click para versão anterior
6. **Reembolsar usuários:** Se houver perda de fundos, usar treasury para reembolso

---

## Assets na Mainnet — Roadmap

| Asset | Fase | Issuer | Status |
|-------|------|--------|--------|
| XLM | 1 | Nativo | ✅ Disponível |
| USDC | 1 | Circle (GA5Z...) | ⚠️ Trustline pendente |
| BRZ | 1 | Transfero (GDVK...) | ⚠️ Parceria pendente |
| TESOURO | 1 | Etherfuse (dinâmico) | ⚠️ Credencial prod pendente |
| BTC (tokenizado) | 2 | A definir | 🔴 Não iniciado |
| CETES | 3 | A definir | 🔴 Não iniciado |
