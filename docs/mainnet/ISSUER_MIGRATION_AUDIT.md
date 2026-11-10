<!-- @module docs\mainnet\ISSUER_MIGRATION_AUDIT.md | WalletNow Protocol - Documentação e especificações de engenharia -->

# WalletNow — Issuer Migration Audit

**Versão:** 1.0 | **Data:** 2026-05-27 | **Branch:** mainnet-ready-infra

---

## Mapeamento Completo do VITE_STELLAR_ISSUER_SECRET

### Ocorrências por Arquivo

| Arquivo | Linha | Uso | Migrar? |
|---------|-------|-----|---------|
| `paymentService.ts` | L38 | `const ISSUER_SECRET = AppConfig.stellar.issuerSecretKey` (módulo) | ✅ SIM |
| `paymentService.ts` | L78 | `Keypair.fromSecret(ISSUER_SECRET)` — mintBRW | ✅ SIM |
| `paymentService.ts` | L186 | `Keypair.fromSecret(ISSUER_SECRET!)` — executeOffRamp | ✅ SIM |
| `paymentService.ts` | L283 | `Keypair.fromSecret(ISSUER_SECRET!)` — swapAssets | ✅ SIM |
| `paymentService.ts` | L346 | `Keypair.fromSecret(ISSUER_SECRET!)` — sendAssetOnChain | ✅ SIM |
| `walletFactory.ts` | L57 | `AppConfig.stellar.issuerSecretKey` — activateAccount | ✅ SIM |
| `walletFactory.ts` | L151 | `AppConfig.stellar.issuerSecretKey` — trustline setup | ✅ SIM |
| `identityService.ts` | L231 | `import.meta.env.VITE_STELLAR_ISSUER_SECRET` — mintReputationZK | ✅ SIM |
| `oracleService.ts` | L6 | `import.meta.env.VITE_STELLAR_ISSUER_SECRET` — declarado mas NUNCA USADO | 🗑️ REMOVER |
| `config/environment.ts` | L114 | `import.meta.env.VITE_STELLAR_ISSUER_SECRET` — configuração centralizada | ✅ REMOVER |

---

## Operações que Usam a Issuer Secret

### 1. `PaymentService.mintBRW()` — **CRÍTICO**
**Fluxo atual:**
```
Frontend → Keypair.fromSecret(ISSUER_SECRET) → assina TX Stellar → submete direto ao Horizon
```
**O que faz:**
- Verifica se a conta do usuário existe e tem trustline BRW
- Se nova conta: cria via CAP-33 (issuer sponsor)
- Se sem trustline: abre trustline com sponsorship
- Emite tokens BRW da issuer para o usuário (payment)
- Assina com issuerKeypair + userKeypair (se trustline nova)

**Dependência de userSecretKey:**
- REQUER a chave do usuário para assinar o setup da trustline (CAP-33)
- Não requer para mint simples (conta com trustline existente)

**Estratégia de migração:**
- Caso 1 (conta nova/sem trustline): frontend envia XDR parcialmente assinado pelo usuário → Edge Function adiciona assinatura do issuer + submete
- Caso 2 (trustline existente): Edge Function assina e submete sozinha

---

### 2. `PaymentService.executeOffRamp()` — **CRÍTICO**
**Fluxo atual:**
```
Frontend → Keypair.fromSecret(userSecret + ISSUER_SECRET) → assina burn → submete
```
**O que faz:**
- Valida saldo BRW do usuário
- Constrói TX de burn (usuário → issuer)
- Assina com ambas as chaves (user + issuer)
- Submete ao Horizon

**Dependência de userSecretKey:** SIM — o usuário precisa assinar o burn (é o dono dos tokens)

**Estratégia de migração:**
- Frontend constrói XDR e assina com userKey → envia XDR para Edge Function → Edge Function adiciona assinatura do issuer + submete

---

### 3. `PaymentService.swapAssets()` — ALTO
**Fluxo atual:**
```
Frontend → issuer como market maker → TX multi-operação → assina user+issuer
```
**O que faz:**
- Usuário envia asset A para o issuer
- Issuer envia asset B de volta para o usuário
- Assina com user + issuer

**Estratégia de migração:** Mesma do burn — XDR parcialmente assinado pelo user, Edge Function finaliza.

---

### 4. `PaymentService.sendAssetOnChain()` — MÉDIO
**Fluxo atual:**
```
Frontend → issuer paga as taxas (gasless) → assina user+issuer → submete
```
**Estratégia:** XDR parcial → Edge Function.

---

### 5. `WalletFactory.activateAccount()` — CRÍTICO
**Fluxo atual:** issuer cria conta do usuário com 1.5 XLM
**Estratégia:** Edge Function `fund_wallet` — apenas issuer assina (sem user key necessária)

---

### 6. `WalletFactory.provisionWalletForUser()` — CRÍTICO
**Fluxo atual:** sponsorship de trustline inicial (issuer + user sign)
**Estratégia:** XDR parcial → Edge Function

---

### 7. `IdentityService.mintReputationZK()` — ALTO
**Fluxo atual:** mint de NFT KYC KYCZK + trustlines BRZ (issuer + user sign)
**Estratégia:** XDR parcial → Edge Function

---

## Padrão de Assinatura Híbrida (XDR Parcial)

Para operações que requerem AMBAS as assinaturas (user + issuer):

```
FRONTEND:
1. Constrói a transação (sem submeter)
2. Assina apenas com a chave do usuário
3. Converte para XDR base64
4. Envia XDR + metadados para Edge Function

EDGE FUNCTION:
1. Valida JWT do usuário
2. Recebe XDR
3. Deserializa e valida as operações (whitelist de ops permitidas)
4. Adiciona assinatura do issuer
5. Submete ao Horizon
6. Retorna hash da transação
```

Este padrão é seguro porque:
- O issuer nunca assina uma TX que o usuário não autorizou primeiro
- A Edge Function valida o conteúdo do XDR antes de assinar
- O usuário nunca precisa enviar sua secret key ao servidor

---

## Plano Técnico de Migração

### Arquitetura da Edge Function `stellar-issuer`

```
POST /functions/v1/stellar-issuer
Headers: Authorization: Bearer <supabase-jwt>
Body: {
  action: 'fund_wallet' | 'mint_asset' | 'burn_asset' | 'sponsor_wallet' | 'submit_signed_xdr',
  ...payload
}
```

### Actions e Seus Payloads

| Action | Payload | Requer User XDR? |
|--------|---------|-----------------|
| `fund_wallet` | `{ publicKey }` | Não |
| `sponsor_wallet` | `{ publicKey, partialXdr }` | Sim |
| `mint_asset` | `{ publicKey, assetCode, amount, correlationId, partialXdr? }` | Só se trustline nova |
| `burn_asset` | `{ partialXdr, amount, correlationId }` | Sim |
| `swap_assets` | `{ partialXdr, fromAsset, toAsset, payAmount, receiveAmount }` | Sim |
| `send_on_chain` | `{ partialXdr, destPublicKey, assetCode, amount }` | Sim |
| `mint_reputation_zk` | `{ publicKey, partialXdr, zkHash }` | Sim |

---

## Riscos da Migração

| Risco | Mitigação |
|-------|-----------|
| XDR manipulado pelo usuário | Validação estrita das operações no XDR server-side |
| Replay attacks (XDR reutilizado) | Verificar sequence number + correlationId únicos |
| Race condition no sequence | Retry com exponential backoff |
| Timeout da Edge Function | Supabase EF tem 150s de timeout — suficiente |
| Edge Function offline | Frontend degrada graciosamente com erro claro |
| Usuário envia XDR com operações extras | Allowlist de tipos de Operation na EF |

---

*Criado em: 2026-05-27 | Branch: mainnet-ready-infra*
