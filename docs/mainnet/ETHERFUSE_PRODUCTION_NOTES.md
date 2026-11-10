<!-- @module docs\mainnet\ETHERFUSE_PRODUCTION_NOTES.md | WalletNow Protocol - Documentação e especificações de engenharia -->

# WalletNow — Etherfuse V2: Notas para Produção

**Versão:** 1.0 | **Data:** 2026-05-27

---

## Diferenças Críticas: Sandbox vs Produção

| Aspecto | Sandbox | Produção |
|---------|---------|----------|
| Base URL | `https://api.sand.etherfuse.com` | `https://api.etherfuse.com` |
| API Key | `api_sand:...` | `api_prod:...` |
| KYC | Auto-aprovado com dados mock | KYC real (CPF/documentos reais) |
| PIX | Simulado (`simulateFiatReceived`) | PIX real (usuário paga via app bancário) |
| TESOURO identifier | Dinâmico via `/ramp/assets` | Dinâmico via `/ramp/assets` |
| Tempo KYC | Segundos (mock) | Minutos a horas (revisão real) |
| Limites de valor | Sem limite (sandbox) | Limites regulatórios reais |

---

## O que Deve ser REMOVIDO antes da Produção

### `simulateFiatReceived()` — SANDBOX ONLY
```typescript
// etherfuseV2ApiService.ts
async simulateFiatReceived(orderId: string): Promise<boolean>
// NUNCA chamar em produção — simula recebimento de PIX que não existe
// Em produção, o usuário paga o PIX real e Etherfuse notifica via webhook
```

### Mock KYC Identity (SANDBOX ONLY)
```typescript
// etherfuseV2Types.ts
export const SANDBOX_KYC_MOCK_IDENTITY = { ... }
export const SANDBOX_PIX_CPF_MOCK = '12345678900'
// Em produção, usar dados REAIS do perfil do usuário
```

### Mock de Documentos KYC (SANDBOX ONLY)
```typescript
// submitKycDocuments() — linha 217
const MOCK_IMAGE_BASE64 = 'data:image/png;base64,iVBORw0KGgo...'
// Em produção, usar documentos reais capturados via câmera
```

---

## Fluxo Produção vs Sandbox

### Sandbox (atual)
```
1. createCustomer → presigned_url
2. submitKycIdentity (dados mock)
3. submitKycDocuments (imagem 1x1px fake)
4. acceptAgreements
5. pollKycUntilApproved → auto-aprovado em segundos
6. registerPixAccount (CPF mock: 12345678900)
7. getQuote
8. createOnRampOrder → retorna dados PIX
9. simulateFiatReceived() ← REMOVER EM PROD
10. pollUntilCompleted → completa automaticamente
```

### Produção
```
1. createCustomer → presigned_url
2. submitKycIdentity (dados reais do perfil Supabase)
3. submitKycDocuments (fotos reais via câmera)
4. acceptAgreements
5. pollKycUntilApproved → aguardar revisão manual (pode demorar horas)
6. registerPixAccount (CPF real do usuário)
7. getQuote
8. createOnRampOrder → retorna QR Code PIX real
9. USUÁRIO FAZ O PIX NO APP BANCÁRIO (sem simulação)
10. Etherfuse notifica via WEBHOOK ← implementar
11. pollUntilCompleted (ou webhook-driven)
```

---

## Webhook Etherfuse (Não Implementado)

Em produção, polling constante é ineficiente. Etherfuse suporta webhooks para notificar status de ordens.

```typescript
// TODO [MAINNET]: Implementar endpoint de webhook
// supabase/functions/etherfuse-webhook/index.ts
// 
// Fluxo:
// 1. Configurar URL do webhook no painel Etherfuse
// 2. Validar assinatura HMAC do payload
// 3. Atualizar fiat_transactions.status_crypto
// 4. Notificar usuário via Supabase Realtime
```

---

## Assets Etherfuse em Produção

| Asset | Identifier (sandbox) | Identifier (produção) |
|-------|---------------------|----------------------|
| TESOURO | `TESOURO:GC3CW7...` | Resolver via `/ramp/assets` |

**IMPORTANTE:** Nunca hardcodar o identifier TESOURO mainnet. Sempre resolver via API.

---

## Persistência do fluxo Etherfuse no Supabase

Dados que devem ser persistidos por usuário:
```typescript
// Adicionar ao perfil ou tabela dedicada:
interface EtherfuseProfile {
  customerId: string;        // ID do customer na Etherfuse
  bankAccountId: string;     // ID da conta bancária PIX
  presignedUrl: string;      // URL de onboarding (expira?)
  kycStatus: string;         // Status atual do KYC
  kycApprovedAt: Date;       // Data de aprovação
}
// TODO [MAINNET]: Criar migration para tabela etherfuse_profiles
```

---

## Compliance Etherfuse

- Acordos que o usuário precisa aceitar:
  - `electronic-signature`
  - `terms-and-conditions`
  - `customer-agreement`
- Registrar timestamp de aceite por usuário (obrigatório para compliance)
- TODO: Adicionar campo `agreements_accepted_at` na migration
