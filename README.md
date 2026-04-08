# 💳 WalletNow - The Zero-Knowledge WaaS (Version 0.9)

*O fim da complexidade na Web3. Agora com Ciclo Completo de Ativos Fin-on-Chain.* 

**WalletNow** é uma plataforma "Wallet-as-a-Service" (WaaS) que redefine a experiência do usuário (UX) em Blockchain. Abstraímos totalmente a complexidade técnica, entregando a agilidade de um banco digital (Pix-speed) com a soberania e segurança da rede Stellar.

---

## 🎯 Proposta de Valor (v0.9 Production-Ready)

1. **Onboarding Mágico (Gasless):** Registro via E-mail/OTP onde a carteira é provisionada e ativada sem que o usuário precise de XLM (nativo da rede) para taxas, graças ao protocolo **CAP-33 (Sponsored Reserves)**.
2. **Ciclo de Ativos Híbrido:**
   - **Depósito (On-ramp):** Gere um PIX QR Code real via Woovi. O sistema detecta o pagamento e realiza a **Mintagem** instantânea de tokens BRW na Stellar.
   - **Saque (Off-ramp):** Converta tokens BRW de volta para Reais via PIX diretamente para seu CPF, com **Queima (Burn)** on-chain garantindo a paridade.
3. **Rastreabilidade Bancária X402:** Cada transação fiduciária é vinculada a uma transação Blockchain através de Memos rastreáveis (`X402:correlationID`), permitindo auditoria total.
4. **Atomicidade e Rollback:** Sistema robusto que garante estorno automático de tokens ao usuário caso o gateway bancário falhe após uma operação on-chain.

---

## 🏗️ Arquitetura de Ativos

O WalletNow utiliza uma estratégia de dois tokens para máxima conformidade e liquidez:
- **BRW (WalletNow Real):** Ativo soberano emitido pela plataforma para representar depósitos fiduciários 1:1. Utilizado para operações de On-ramp/Off-ramp rápidas.
- **BRZ (Digital Real):** Integração com o ecossistema DeFi brasileiro para trocas (Swaps) e interoperabilidade.

---

## 🚀 Tecnologias Utilizadas

- **Frontend:** React 19 + Vite + Tailwind CSS v4 (Glassmorphism UI).
- **Blockchain:** Stellar Network (CAP-33, X402, Trustline Sponsorship).
- **IA:** Google Gemini 1.5 Pro (KYC Multimodal & Liveness).
- **Backend/Auth:** Supabase (Auth OTP, RLS, Database).
- **Gateway:** Woovi (PIX API).
- **Testes:** Vitest (Integration Suite).

---

## 📁 Estrutura do Projeto

*   `/src/services/`
    *   `paymentService.ts`: Orquestrador financeiro (Mint, Burn, Rollback).
    *   `wooviService.ts`: Integração com gateway de pagamentos.
    *   `walletFactory.ts`: Fábrica de chaves ED25519 e Gestão Custodial.
*   `/tests/integration/`
    *   `flow.test.ts`: Testes de stress do ciclo de vida dos ativos na Testnet.

---

## 🛠️ Guia de Instalação e Testes

### Configuração
1. Clone o repositório.
2. Copie `.env.example` para `.env.development`.
3. Preencha as chaves: `VITE_SUPABASE_URL`, `VITE_STELLAR_ISSUER_SECRET`, `VITE_WOOVI_APP_ID`.

### Executando Testes
Para validar o fluxo completo de produção na Stellar Testnet:
```bash
npm run test:flows
```

### Desenvolvimento
```bash
npm run dev
```

---
*Disclaimer: Este projeto em v0.9 utiliza a Stellar Testnet. Versões de produção devem migrar os segredos do LocalStorage para Enclaves TEE/KMS.*
