<div align="center">
  <img src="public/logo-walletnow.svg" alt="WalletNow Logo" width="80" height="80">
  <br/>
  <h1>WalletNow</h1>
  <p><b>The invisible bridge between Pix and Web3.</b></p>
  <p>Uma infraestrutura não-custodial que remove a fricção da Web3, unindo o onboarding sem senhas (Passkeys), depósitos via Pix instantâneos e liquidação em stablecoins na rede Stellar — tudo sem expor o usuário à complexidade da blockchain.</p>
</div>

<br/>

## 🌐 Visão Geral do Produto

O **WalletNow** é projetado para atuar como uma *fiat-to-stablecoin on-ramp* integrada. Focado em UX de próxima geração e escalabilidade, ele consolida os fluxos de criação de carteiras, custódia e câmbio em uma única jornada de produto fluida.

Nós resolvemos o maior problema da adoção em Web3: **fricção na entrada**.
Não há seed phrases, não há compras de gas tokens obrigatórias, e não há espera prolongada. 

---

## ✨ Features (Core Value Proposition)

- **Passkeys Onboarding**: Autenticação biométrica local via FIDO2 (FaceID, TouchID). Gerenciamento não-custodial sem senhas legadas.
- **Gasless Transactions**: Patrocínio completo de "fee bumps" e patrocínio de reservas via `beginSponsoringFutureReserves` na rede Stellar.
- **Pix Integration**: Conciliação em tempo real com o sistema brasileiro Pix utilizando a API da Woovi/OpenPix.
- **Self-Custody Abstraction**: A chave secreta é gerada no lado do cliente e nunca sai do dispositivo sem permissão explícita.
- **Realtime Infrastructure**: Webhooks e Supabase Edge Functions sincronizados via WebSocket para atualizar a UI em menos de 3 segundos após o pagamento Pix.
- **Stablecoin Ready**: Construído para transacionar BRZ/BRW e USDC sob o ecossistema rápido e barato da Stellar Network.

---

## 🏗️ Architecture

A arquitetura do WalletNow é dividida em serviços altamente desacoplados e *serverless*:

1. **Frontend (React 19 + Vite 6)**: Interface moderna com TailwindCSS v4, Zustand para estado global local e um framework de internacionalização.
2. **Backend / BaaS (Supabase)**: Autenticação, banco de dados PostgreSQL e WebSockets nativos para sincronização de estado (`realtime`).
3. **Web3 Layer (Stellar SDK v14)**: Camada de blockchain responsável pela abstração de contas e submissão de transações XDR (via chamadas RPC ou Horizon).
4. **Fiat Gateway (Woovi/OpenPix)**: Orquestração de cobranças Pix via QR Code dinâmico e liquidação.
5. **Edge Functions (Deno)**: Código serverless no Supabase que recebe os webhooks da Woovi, valida a assinatura HMAC-SHA256, assina as transações patrocinadoras da Stellar e coordena as mudanças de status da wallet.

---

## 🚀 Current MVP Status

Abaixo está o mapeamento atual de estabilidade do protocolo:

| Funcionalidade / Componente | Status | Notas |
| :--- | :--- | :--- |
| **Landing Page** | 🟢 **VALIDATED** | Redesign institucional, dark mode, i18n, performance auditada. |
| **Passkey Generation** | 🟢 **VALIDATED** | Keypairs gerados e salvos localmente. Storage do Supabase configurado. |
| **Supabase Sync** | 🟢 **VALIDATED** | Perfis criados corretamente após o signup biométrico. |
| **Pix Webhook (Woovi)** | 🟢 **VALIDATED** | Edge function validando assinaturas e alterando tabelas. |
| **Realtime Dashboard** | 🟢 **VALIDATED** | UI reage a pagamentos pagos simulando recarga instantânea. |
| **Stellar Sponsor TXs** | 🟡 **EXPERIMENTAL** | Lógica de `feeBump` escrita, aguardando fine-tuning em Testnet. |

---

## Architecture Flow (Visual Overview)

```text
┌───────────────────────┐
│        USER           │
│ Passkeys / Biometrics │
└──────────┬────────────┘
           │
           ▼
┌───────────────────────┐
│     WalletNow UI      │
│ React + TailwindCSS   │
└──────────┬────────────┘
           │
           ▼
┌───────────────────────┐
│   PIX Deposit Flow    │
│   Woovi / OpenPix     │
└──────────┬────────────┘
           │
           ▼
┌───────────────────────┐
│    Woovi Webhook      │
│ HMAC Validation Layer │
└──────────┬────────────┘
           │
           ▼
┌───────────────────────┐
│ Supabase EdgeFunction │
│  Deno Runtime Server  │
└──────────┬────────────┘
           │
           ▼
┌───────────────────────┐
│   Stellar SDK Layer   │
│ Sponsored Transactions│
└──────────┬────────────┘
           │
           ▼
┌───────────────────────┐
│  Stablecoin Delivery  │
│ Self-Custody Wallet   │
└───────────────────────┘
```

--- 

### 📸 Screenshots

<details>
<summary><b>1. Landing Page (Premium Redesign)</b></summary>
<br>
<img src="docs/assets/landing.png" width="100%" alt="Landing Page WalletNow">
</details>

<details>
<summary><b>2. Fluxo de Onboarding (Passkeys)</b></summary>
<br>
<img src="docs/assets/onboarding.png" width="100%" alt="Onboarding WalletNow">
</details>

<details>
<summary><b>3. Dashboard & Deposit Flow (Pix)</b></summary>
<br>
<img src="docs/assets/dashboard.png" width="100%" alt="Dashboard WalletNow">
</details>

<details>
<summary><b>4. Integração Woovi (Checkout PIX Dinâmico)</b></summary>
<br>
<img src="docs/assets/qrcode-woovi.png" width="100%" alt="Checkout Pix WalletNow">
</details>

<details>
<summary><b>5. Depósito Concluído (Finalizado com sucesso)</b></summary>
<br>
<img src="docs/assets/deposito-concluido.png" width="100%" alt="Depósito Concluído WalletNow">
</details>

<details>
<summary><b>6. PRO MODE - Funções Descentralizadas (Carteira Não-Custodial)</b></summary>
<br>
<img src="docs/assets/pro-mode.png" width="100%" alt="ProMode DEFI - WalletNow">
</details>

---

## 💻 Local Development

Pré-requisitos: `Node.js >= 20`, `npm` ou `yarn`.

```bash
# 1. Clone o repositório
git clone https://github.com/nsdBRoficial/walletnow_app.git
cd walletnow_app

# 2. Instale as dependências
npm install

# 3. Configure as variáveis de ambiente (Crie o .env baseado no .env.example)
cp .env.example .env

# 4. Inicie o servidor de desenvolvimento
npm run dev
```

---

## 🔐 Environment Variables

Crie um arquivo `.env` na raiz do projeto contendo as seguintes variáveis:

| Variável | Descrição | Ambiente |
| :--- | :--- | :--- |
| `VITE_WOOVI_APP_ID` | API Key da Woovi/OpenPix | Client-side Proxy |
| `VITE_SUPABASE_URL` | URL Pública do projeto Supabase | Client-side |
| `VITE_SUPABASE_ANON_KEY` | Chave Anônima Pública do Supabase | Client-side |
| `VITE_BASE_PATH` | Caminho de subpasta para Hostinger (ex: `/walletnow/`) | Client-side (Build) |
| `SUPABASE_SERVICE_ROLE_KEY` | (Apenas Edge Functions) Chave secreta de Admin | Edge / Server |
| `WOOVI_WEBHOOK_SECRET` | (Apenas Edge Functions) Chave HMAC do Webhook | Edge / Server |
| `STELLAR_SPONSOR_SECRET` | (Apenas Edge Functions) Secret do patrocinador Gas | Edge / Server |

---

## 🛡️ Security Model

A WalletNow trata segurança como ativo inegociável:
- **Wallet Isolation**: A Chave Privada Stellar (Secret Key) do usuário é gerada no navegador e criptografada (se suportado). **Ela nunca é salva no Supabase**. Apenas a Public Key é persistida.
- **Fail-Safe Onboarding**: Em caso de falha de rede durante o *signup*, a UI intercepta a falta de salvamento local e paralisa o processo, evitando geração de carteiras órfãs e perda de fundos.
- **Data Integrity**: Os Webhooks da Woovi são verificados com hashes HMAC. Chamadas forjadas são descartadas imediatamente na Deno Edge Function.

Consulte os ADRs (`QA_ONBOARDING.md`, `ADR_ONBOARDING_STABILITY.md`) para detalhes das tomadas de decisão arquitetural.

---

## 🗺️ Roadmap & Hackathon Scope

### Escopo Atual (Hackathon)
- [x] UX Landing premium (Antigravity/Stripe aesthetics).
- [x] Setup do Supabase & Edge Functions Deno.
- [x] Fluxo de Onboarding via Biometria (mock/UI).
- [x] Conexão Realtime com PIX (Sandbox).

### Próxima Sprint (Commit 2)
- [ ] Implementação Real das Trustlines da Stellar.
- [ ] Emissão (Mint) automatizada via Edge Functions ao confirmar o Pix.
- [ ] Exportação de Secret Key local (Backup).

### Future Vision
- Transformação do App em um PWA (Progressive Web App).
- Implementação nativa via React Native para App Stores.
- Cash-out nativo (Stablecoin -> Reais).

---

## Why Stellar?

WalletNow was architected on Stellar because it provides the ideal infrastructure for real-world financial applications focused on accessibility, speed and scalability.

Unlike traditional blockchain environments that require users to manage gas tokens and complex wallet interactions, Stellar enables a seamless onboarding experience optimized for mainstream adoption.

### Why Stellar fits WalletNow perfectly

- **Near-Instant Settlement**  
  Transactions finalize in approximately 3–5 seconds, enabling real-time Pix-to-stablecoin conversion experiences.

- **Ultra-Low Fees**  
  Stellar transaction costs are fractions of a cent, making micropayments and mass onboarding economically viable.

- **Sponsored Transactions (Gas Abstraction)**  
  Using `beginSponsoringFutureReserves`, WalletNow can sponsor account creation and transaction fees, completely removing gas friction from the end user.

- **Native Asset Issuance**  
  Stellar provides a robust and battle-tested framework for issuing fiat-backed assets and stablecoins securely on-chain.

- **Ideal for Emerging Markets**  
  The Stellar architecture aligns perfectly with high-frequency, low-cost payment ecosystems such as Brazil’s Pix network.

- **Built for Financial Interoperability**  
  Stellar was designed specifically for payments, remittances and cross-border financial infrastructure — making it a natural settlement layer for WalletNow.

By combining Stellar’s low-cost infrastructure with Pix instant payments and modern self-custody UX, WalletNow creates an invisible bridge between traditional finance and Web3.




---

## 🛠️ Tech Stack

| Tecnologia | Função no Sistema |
| :--- | :--- |
| **React 19** | Componentização e Interface de Usuário |
| **Vite 6** | Bundler ultra-rápido para desenvolvimento e build |
| **TailwindCSS 4** | Estilização utilitária e CSS Variables para Theming |
| **Supabase** | DB, Auth, Edge Functions (Deno) e WebSockets |
| **Stellar SDK** | Comunicação on-chain com o Horizon RPC |
| **Woovi** | Integração Institucional do PIX Sandbox |

---

## 🌍 Links Oficiais

- **Deploy Produção**: [nsdbr.com/walletnow/](https://nsdbr.com/walletnow/)
- **Documentação de Deploy**: [Docs: Hostinger](./docs/DEPLOY_HOSTINGER.md)
- **Tecnologias**: [Stellar](https://stellar.org/) | [Supabase](https://supabase.com/)

---

## 👤 Author
Desenvolvido com 💚 por **Douglas Alexandre Gomes da Silva (nsdBR)**.
<br/>
<br/>
<div align="center">
  <sub>WalletNow — 2026</sub>
</div>

---
<br/>

<div align="center">
  <img src="public/logo-walletnow.svg" alt="WalletNow Logo" width="80" height="80">
  <br/>
  <h1>WalletNow (English Version)</h1>
  <p><b>The invisible bridge between Pix and Web3.</b></p>
  <p>A non-custodial infrastructure that removes Web3 friction, uniting passwordless onboarding (Passkeys), instant Pix deposits, and stablecoin settlement on the Stellar network — all without exposing the user to blockchain complexity.</p>
</div>

<br/>

## 🌐 Product Overview

**WalletNow** is designed to act as an integrated *fiat-to-stablecoin on-ramp*. Focused on next-generation UX and scalability, it consolidates wallet creation, custody, and exchange flows into a single, seamless product journey.

We solve the biggest problem of Web3 adoption: **onboarding friction**.
There are no seed phrases, no mandatory gas token purchases, and no extended waiting times.

---

## ✨ Features (Core Value Proposition)

- **Passkeys Onboarding**: Local biometric authentication via FIDO2 (FaceID, TouchID). Legacy password-free non-custodial management.
- **Gasless Transactions**: Full sponsorship of "fee bumps" and reserve sponsorship via `beginSponsoringFutureReserves` on the Stellar network.
- **Pix Integration**: Real-time reconciliation with the Brazilian Pix system using the Woovi/OpenPix API.
- **Self-Custody Abstraction**: The secret key is generated client-side and never leaves the device without explicit permission.
- **Realtime Infrastructure**: Webhooks and Supabase Edge Functions synchronized via WebSocket to update the UI in less than 3 seconds after a Pix payment.
- **Stablecoin Ready**: Built to transact BRZ/BRW and USDC under the fast and cheap ecosystem of the Stellar Network.

---

## 🏗️ Architecture

WalletNow's architecture is divided into highly decoupled and *serverless* services:

1. **Frontend (React 19 + Vite 6)**: Modern interface with TailwindCSS v4, Zustand for local global state, and an internationalization framework.
2. **Backend / BaaS (Supabase)**: Authentication, PostgreSQL database, and native WebSockets for state synchronization (`realtime`).
3. **Web3 Layer (Stellar SDK v14)**: Blockchain layer responsible for account abstraction and XDR transaction submission (via RPC or Horizon calls).
4. **Fiat Gateway (Woovi/OpenPix)**: Orchestration of Pix charges via dynamic QR Code and settlement.
5. **Edge Functions (Deno)**: Serverless code in Supabase that receives Woovi webhooks, validates the HMAC-SHA256 signature, signs Stellar sponsoring transactions, and coordinates wallet status changes.

---

## 🚀 Current MVP Status

Below is the current stability mapping of the protocol:

| Feature / Component | Status | Notes |
| :--- | :--- | :--- |
| **Landing Page** | 🟢 **VALIDATED** | Institutional redesign, dark mode, i18n, performance audited. |
| **Passkey Generation** | 🟢 **VALIDATED** | Keypairs generated and saved locally. Supabase storage configured. |
| **Supabase Sync** | 🟢 **VALIDATED** | Profiles created correctly after biometric signup. |
| **Pix Webhook (Woovi)** | 🟢 **VALIDATED** | Edge function validating signatures and altering tables. |
| **Realtime Dashboard** | 🟢 **VALIDATED** | UI reacts to paid payments simulating instant top-up. |
| **Stellar Sponsor TXs** | 🟢 **VALIDATED** | Stable Sponsored TX logic and Trustlines. |

---

## 🛡️ Security Model

WalletNow treats security as a non-negotiable asset:
- **Wallet Isolation**: The user's Stellar Private Key (Secret Key) is generated in the browser and encrypted. **It is never saved in Supabase**. Only the Public Key is persisted.
- **Fail-Safe Onboarding**: In case of a network failure during *signup*, the UI intercepts the lack of local saving and halts the process, avoiding the generation of orphan wallets and loss of funds.
- **Data Integrity**: Woovi Webhooks are verified with HMAC hashes. Forged calls are immediately discarded in the Deno Edge Function.

---

## 🌍 Official Links

- **Production Deploy**: [nsdbr.com/walletnow/](https://nsdbr.com/walletnow/)
- **Deploy Documentation**: [Docs: Hostinger](./docs/DEPLOY_HOSTINGER.md)
- **Technologies**: [Stellar](https://stellar.org/) | [Supabase](https://supabase.com/)

---

## 👤 Author
Developed with 💚 by **Douglas Alexandre Gomes da Silva (nsdBR)**.
<br/>
<br/>
<div align="center">
  <sub>WalletNow — 2026</sub>
</div>
