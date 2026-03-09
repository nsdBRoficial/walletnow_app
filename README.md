# 💳 WalletNow - The Zero-Knowledge WaaS (Version 0.7)

*O fim da complexidade na Web3.* 

**WalletNow** é o Protótipo Front-End de uma "Wallet-as-a-Service" (WaaS) projetado para demonstrar uma experiência de usuário (UX) revolucionária e "Zero-Knowledge". O objetivo principal é abstrair a percepção de que o usuário está utilizando uma Blockchain, fornecendo a interface elegante e imediata de um banco digital moderno.

---

## 🎯 Proposta de Valor e MVP v0.7

O aplicativo simula e desenha com altíssima fidelidade a fundação para:
1. **Passkeys Bridge (Em Desenvolvimento - Sprint 8):** Login sem senha verdadeira utilizando Sensores Biométricos do Celular via WebAuthn, garantindo que "A sua digital/rosto é a chave privada".
2. **Ledger Abstraction (Stellar Network):** O usuário enxerga Saldo em `BRZ` (Brazilian Digital Token) e realiza ações de "PIX Copia e Cola", enquanto por debaixo dos panos ocorrem transações de Smart Contracts na Blockchain Stellar.
3. **Identity Layer (Sprint 7 Concluída ✔️):** Um fluxo nativo integrando API de Câmera, OCR Multimodal Inteligente Liveness (via Google Gemini) e Criptografia Híbrida salva no Supabase Storage via RLS. O CPF do usuário vira um "Hash Pós-Quântico" e é persistido via protocolo CAP-33 de *Sponsored Reserves*!
4. **On-Chain Send (Pro Mode):** Aba oculta para transferências descentralizadas em Lumens, USDC, BTC e BRZ para especialistas.

## 🚀 Tecnologias Utilizadas (A Stack do Futuro)
- **React 19 + Vite** (Performance PWA)
- **Tailwind CSS v4** + **Lucide Icons** (Aparência Dark-Mode Premium de Neomorfismo)
- **Google Gemini 1.5 Pro** (Validação Inteligente Biometria/Facial Liveness/OCR)
- **Supabase** (Autenticação E-mail/Phone OTP, Storage RLS e Banco de Dados Serverless)
- **Stellar SDK v12.x** (Conexão Horizon RPC para Transações e Mintagem)

## 📁 Estrutura de Arquivos

A organização do código foi feita seguindo o princípio da responsabilidade única (*"Ridiculamente Didático"*):
*   `/src/pages/`
    *   `Login.tsx` (Entrada via OAuth/Passkeys)
    *   `Dashboard.tsx` (Homepage com gráficos e saldos reais)
    *   `Settings.tsx` (The Trust Layer: Documentação e KYC Zero-Knowledge)
*   `/src/components/modals/` 
    *   `DepositModal.tsx`, `ReceiveCryptoModal.tsx`, `OnChainSendModal.tsx`, `SwapModal.tsx`
*   `/src/services/`
    *   `walletFactory.ts` (Instancia carteiras na Stellar Testnet e embute o Segredo localmente)
    *   `identityService.ts` (Cérebro do Liveness e Hash ZK-STARK com o Gemini)
    *   `storageService.ts` (Persistência segura no Supabase KYC Docs)

## 🛠️ Como rodar o MVP (v0.7) no seu computador

### Pré-requisitos
Ter o [Node.js](https://nodejs.org/) instalado.

```bash
# 1. Instale as dependências (Rápido via Vite)
npm install

# 2. Inicie o Servidor de Desenvolvimento
npm run dev
```

*Nota:* Para os testes da Blockchain (Testnet) e Gemini (IA) funcionarem, você deve criar um arquivo `.env` na raiz e preencher conforme o modelo `.env.example`. Não se esqueça de provisionar as Migrations do Supabase (`/supabase/migrations/`).

---

## 🗺️ Roadmap de Lançamento e Testes Manuais

### Fase Atual: Aprovada (v0.7 Finalizada)
- [x] Sprints 1 a 6: UI, Tailwind, Dashboard, Criação Oculta de Carteiras.
- [x] Sprint 7: Verificação OTP (Twilio e Magic Links), Extração Multimodal e KYC ZK-STARK.
  - **Como Testar:** Acesse `Configurações`, coloque o e-mail, valide-o no seu provedor (via Supabase), tire uma foto visivelmente falsa da ID e do rosto (Gemini irá rejeitar), refaça com sucesso para a Transação de Liveness ser mintada e registrada no Bucket `/kyc_docs` do Supabase!

### Próximos Passos (Sprints Futuras)
- **Sprint 8:** Integração defintiva da *SimpleWebAuthn* no Login (Fim das senhas convencionais).
- **Sprint 9:** Transformar os botões de Enviar e Sacar (Simulados) em despachos transacionais reativos conectados via `PaymentService`.

---
*Disclaimer Técnico: Este repositório foca no Frontend e integrações PaaS. Em "Produção", o gerenciamento das chaves privadas (`localStorage`) precisa ser movido para um enclave TEE criptografado.*
