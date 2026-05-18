# Etherfuse Real Integration Audit — WalletNow

**Data:** 2026-05-18  
**Branch:** feature/multi-provider-deposit-architecture  
**Auditado por:** AI Architect Agent

---

## Sumário Executivo

A integração real da Etherfuse na WalletNow foi auditada com base no repositório de referência [`ElliotFriend/regional-starter-pack`](https://github.com/ElliotFriend/regional-starter-pack). Este documento registra todos os dados descobertos, decisões arquiteturais tomadas e limitações identificadas.

---

## Assets Reais Descobertos

| Campo | Valor |
|-------|-------|
| **Asset Code (Brasil)** | `TESOURO` |
| **Asset Code (México)** | `CETES` |
| **Issuer (ambos)** | `GC3CW7EDYRTWQ635VDIGY6S4ZUF5L6TQ7AA4MWS7LEQDBLUSZXV7UPS4` |
| **Network** | Stellar Testnet (Sandbox Etherfuse) |
| **Rail Brasil** | PIX (BRL ↔ TESOURO) |
| **Rail México** | SPEI (MXN ↔ CETES) |

> [!IMPORTANT]
> O ativo placeholder `BRT` (Brazilian Real Treasury) criado na fase de scaffolding foi **descontinuado** e substituído pelo asset real `TESOURO`.

---

## Endpoints API Etherfuse (Sandbox)

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `GET /ramp/assets?blockchain=stellar&currency=brl&wallet=<pubkey>` | GET | Lista assets disponíveis com identificadores completos |
| `POST /ramp/onboarding-url` | POST | Registra customer e retorna URL de KYC (presigned) |
| `GET /ramp/customer/:id/kyc/:pubkey` | GET | Status KYC do customer |
| `POST /ramp/quote` | POST | Cotação de conversão (BRL → TESOURO ou TESOURO → BRL) |
| `POST /ramp/order` | POST | Criação de ordem on-ramp ou off-ramp |
| `GET /ramp/order/:id` | GET | Status de uma ordem |
| `POST /ramp/customer/:id/bank-accounts` | POST | Lista contas bancárias (PIX) do customer |

**Base URL Sandbox:** `https://api.sand.etherfuse.com`

---

## Autenticação

- **Mecanismo:** Header `Authorization: <API_KEY>` (sem Bearer)
- **Formato da Key:** `api_sand:<uuid>:<uuid>`
- **Segurança:** A API Key **NUNCA deve ser exposta ao browser** — deve ser utilizada apenas em contexto server-side

---

## Arquitetura de Segurança Implementada

```
Browser (React/Vite)
    │
    │  POST { endpoint, method, body }
    ▼
Supabase Edge Function (etherfuse-proxy)
    │  Lê ETHERFUSE_API_KEY dos Supabase Secrets
    │  Faz forward à API real da Etherfuse
    ▼
https://api.sand.etherfuse.com
```

A Supabase Edge Function atua como proxy server-side, garantindo que a API Key nunca apareça no bundle do frontend. A whitelist de endpoints `/ramp/*` protege contra chamadas não autorizadas.

---

## Fluxo de Trustline Implementado

```
Usuário clica "Create Treasury Trustline"
    │
    ├── 1. checkTrustlineExists(publicKey) via Horizon
    │       └── Se já existe → retorna { success: true, alreadyExists: true }
    │
    ├── 2. Horizon.loadAccount(publicKey) → sequence number
    │
    ├── 3. TransactionBuilder.addOperation(changeTrust({
    │       asset: Asset('TESOURO', 'GC3CW7...'),
    │       // limit: MAX (padrão)
    │   }))
    │
    ├── 4. transaction.sign(Keypair.fromSecret(secretKey))
    │       └── Assinatura LOCALMENTE no browser
    │       └── Secret key NUNCA enviada ao servidor
    │
    └── 5. Horizon.submitTransaction(signedTx)
            └── Retorna hash da transação
            └── Visível no Stellar Expert (Testnet)
```

---

## Estrutura de Arquivos da Integração

```
src/services/providers/etherfuse/
├── etherfuseTypes.ts          — Interfaces de configuração
├── etherfuseAssetConfig.ts    — Asset code, issuer e endpoint constants REAIS
├── etherfuseTrustlineService.ts — Serviço real de trustline (build+sign+submit)
└── etherfuseApiService.ts     — Serviço de API via proxy (getAssets, KYC)

supabase/functions/etherfuse-proxy/
└── index.ts                   — Edge Function proxy seguro para Etherfuse API
```

---

## Riscos e Limitações Identificados

| Risco | Severidade | Mitigação |
|-------|------------|-----------|
| API Key exposta no bundle Vite | **CRÍTICO** | Edge Function proxy implementado. Variável sem prefixo `VITE_` |
| Secret Key do usuário no localStorage | **ALTO** | Padrão atual do projeto (não alterado neste sprint). Não sai do browser |
| Supabase secrets não configurados | **MÉDIO** | Requer `supabase secrets set ETHERFUSE_API_KEY="..."` |
| Issuer pode mudar em produção vs testnet | **BAIXO** | Verificar issuer no endpoint `/ramp/assets` em produção |
| Trustline sem XLM suficiente | **MÉDIO** | `op_low_reserve` — conta precisa de ~0.5 XLM para cada trustline |

---

## Configuração Necessária para Deploy

Para que a Edge Function funcione em produção, configurar os secrets no Supabase:

```bash
supabase secrets set ETHERFUSE_API_KEY="api_sand:8cd52ff5-ae77-41fc-8478-37e08af9ce9f:f027b571-3913-479c-a548-6c76cb314d92"
supabase secrets set ETHERFUSE_BASE_URL="https://api.sand.etherfuse.com"
```

Ou pelo painel do Supabase: **Project Settings → Edge Functions → Secrets**.

---

## Próximos Passos (Fase Real 2)

- [ ] Configurar Supabase secrets e fazer deploy da Edge Function
- [ ] Implementar fluxo completo de KYC (iframe presigned URL)
- [ ] Implementar ordem on-ramp real (BRL → TESOURO via PIX)
- [ ] Verificar issuer real em produção via `GET /ramp/assets`
- [ ] Adicionar polling de status da trustline no Dashboard
- [ ] Implementar off-ramp (TESOURO → BRL via PIX)
