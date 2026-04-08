# 💳 WalletNow - The Zero-Knowledge WaaS

*O fim da complexidade na Web3. Agora com Ciclo Completo de Ativos Fin-on-Chain.*

## 📖 Project Description

**WalletNow** é uma plataforma "Wallet-as-a-Service" (WaaS) focada na interoperabilidade financeira com a rede **Stellar**. Nós abstraímos 100% da complexidade técnica de cripto (sementes, chaves, gás) para novos usuários, entregando a agilidade e naturalidade de um banco fiduciário via PIX sem comprometer o DNA da Blockchain.

**Características de Destaque:**
- **Soberania Máxima e Passkeys:** Toda a assinatura de transações e chaves de identidade ocorrem localmente no cliente através de autenticação bio-criptográfica baseada em *Passkeys*. Nenhuma chave privada é transmitida a servidores centrais (arquitetura Não-Custodial baseada no navegador do usuário).
- **On/Off Ramp via PIX Rápido:** Gateways fluidos ligando FIAT ao Digital via `WooviService`.
- **Mint/Burn & ZK-STARKs Integration:** Os fluxos financeiros operam paridade de 1:1, criando Tokens On-chain (**BRW**) instantaneamente e queimando (Burning) mediante saques. Todo esse trâmite valida premissas Zero-Knowledge permitindo Liveness Verification de usuários integrados de ponta a ponta sem expor hashes de privacidade na Mainnet.

## 🛠️ Setup Instructions

Para rodar a plataforma completament offline/local via **Sandbox**:

1. Clone o repositório na sua máquina.
2. Copie o arquivo de exemplo de ambiente correspondente aos placeholders contendo as integrações:
   ```bash
   cp .env.example .env.development
   ```
3. Preencha as chaves no arquivo `.env.development`:
   - `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` (Sua instância Auth).
   - `VITE_STELLAR_ISSUER_SECRET` (A chave geradora de patrocínio Gasless Testnet).
   - `VITE_GEMINI_API_KEY` (Chave Google para Inteligência do Chat/KYC).
   - `VITE_WOOVI_APP_ID` (AppID/Chave do gateway bancário).

4. Instale as dependências usando Node:
   ```bash
   npm install
   ```
5. Inicie em modo desenvolvedor:
   ```bash
   npm run dev
   ```

## 📸 Screenshots Section

Abaixo estão os indicadores visuais que comprovam os fluxos da WalletNow executados com sucesso (Substituir pelos paths finais geradas para sua submission).

| Passo da Aplicação | Descrição do Estado Comprovado | Local da Imagem / Placeholder |
| :--- | :--- | :--- |
| **Carteira Conectada** *(Wallet Connected)* | Mostra estado de conexão passiva via Supabase c/ Wallet local gerada. | `[📸 PLACEHOLDER: /docs/screenshots/wallet_connected.png]` |
| **Saldo no Dashboard** *(Balance Displayed)* | Reflexo da leitura ativa on-chain dos ativos como BRW, BRZ e XLM na Testnet. | `[📸 PLACEHOLDER: /docs/screenshots/balance_dashboard.png]` |
| **Transação na Testnet** *(Successful Tx)* | Histórico da operação na blockchain via painel ou explorador atrelado.| `[📸 PLACEHOLDER: /docs/screenshots/testnet_tx.png]` |
| **Modal de Sucesso** *(StellarExpert Link)* | Link claro da auditoria após Minting/Burning nos modais de operação. | `[📸 PLACEHOLDER: /docs/screenshots/success_modal_explorer.png]` |

---

## 🏗️ Arquitetura Técnica e CAP-33

Nossa arquitetura de abstração de conta é movida por **Sponsored Reserves (CAP-33)** da Stellar. O protocolo elimina a necessidade do usuário comprar XLM para "abrir a carteira". Essa ação é magicamente custeada por um Master Issuer que gerencia Trustlines automaticamente, tornando a UX limpa como um banco Web2.

*   `/src/services/paymentService.ts`: Orquestrador financeiro (*Mint, Burn, Sponsorship*).
*   `/src/services/wooviService.ts`: Integração com gateway PIX.
*   `/src/services/walletFactory.ts`: Gestão soberana Zero-Knowledge no cliente.

---
*Disclaimer: Este projeto submetido para Hackathon roda inteiramente em Stellar Testnet.*
