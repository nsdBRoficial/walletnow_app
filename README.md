# 🚀 WalletNow - Web3 Abstraction Layer (MVP)

Bem-vindo ao repositório do **WalletNow**, uma infraestrutura de *Wallet-as-a-Service* (WaaS) projetada para abstrair toda a complexidade da Web3 (chaves privadas, taxas de rede, etc.) e entregar uma experiência de usuário ("UX Zero") idêntica à de um banco digital moderno.

## 📌 Status Atual do Projeto

**Fase:** Prototipação UI/UX e Integração On-Chain Core Web3 Concluídas!
O código atua como um app híbrido Web2 ➔ Web3, onde operações fiduciárias (PIX) são perfeitamente espelhadas na Blockchain Stellar utilizando patrocínios gasless e contratos em background.

### 📱 Módulos Implementados e Arquitetura

1.  **KYC Híbrido com ZK-STARKS (`IdentityService`)**:
    * Verificação visual de ID (IA Gemini OCR) cruzando dados do cliente.
    * Uma prova criptográfica de *"Conhecimento Zero"* (Zero-Knowledge Hash via SHA3) é emitida e gravada eternamente na blockchain como um Memo/NFT atestando a validade do usuário.

2.  **On-Ramp/Off-Ramp Gasless (`PaymentService` & `WalletFactory`)**:
    *   **Lazy Onboarding Mágico**: Usuários recém-chegados não possuem a conta ativada na rede Stellar. O app intercepta o primeiro depósito (PIX), usa o cofre corporativo (Master) para *patrocinar (Sponsor)* a criação da conta na Ledger e abre a *Trustline* de forma invisível. Tudo em uma única transação no Stellar Horizon.
    *   **Abstraction de Gás (Off-Ramp)**: Ao sacar (Enviar Pix), a carteira do usuário envia os fundos com zero XLM em saldo de taxas, pois a co-assinatura do Saque joga as *fees* de bloqueio (Gas) pro banco corporativo.

3.  **Money Layer & Dashboard Automático**:
    *   **Saldo On-chain**: O dashboard exibe instantaneamente o saldo indexado diretamente na Testnet.
    *   **Histórico Descentralizado Real**: As transações não são listas mentirosas; o feed do Dashboard busca as `Payments Operations` autênticas do registro Ledger da conta.
    *   Links dinâmicos levam direto para a auditoria de Hash do **Stellar Expert Explorer**.

4.  **Câmbio Interno Direto (`SwapModal`)**:
    * Sistema emulado de Procura de Rotas (Pathfinding) onde o usuário pode converter `BRZ` (Stablecoin Pareada) em outros ativos (`USDC`, `BTC`, `XLM`) de forma descentralizada pelo painel Pro Mode na configuração - acompanhado por interfaces ricas e Feedback Visual unificado.

## 🛠 Stack Tecnológica

*   **Frontend:** React 19, Vite, Tailwind CSS v4.
*   **Contratos Inteligentes & Redes:** `@stellar/stellar-sdk` (Sponsoring, Keypairs, Payments).
*   **Inteligência Artificial:** `Google GenAI` OCR e Análise de Conformidade Documental.
*   **Iconografia & Componentização:** `Lucide React`
*   **Backend Híbrido (Planejado):** `Supabase` para cache de chaves públicas.
*   **Criptografia:** `js-sha3`.

## 🚀 Como Rodar o Projeto Localmente

1.  **Instale as dependências:**
    ```bash
    npm install
    ```

2.  **Variáveis Obrigatórias no `.env` Ambiental:**
    Para que as transações na Blockchain Stellar operem através do "Cofre" do banco virtual, defina as variáveis na sua raiz:
    ```env
    VITE_STELLAR_ISSUER_PUBLIC="GB7B4NBWHT6N773S4R3Y4BJV3W5EJV6M63Y66GTRT2423UADQO6M44M5"
    VITE_STELLAR_ISSUER_SECRET="[CHAVE-SECRETA-MINT]"
    VITE_GEMINI_API_KEY="[CHAVE-IA-OCR-KYC]"
    ```

3.  **Inicie o servidor de desenvolvimento:**
    ```bash
    npm run dev
    ```

4.  **Acesse no navegador:**
    A aplicação estará em `http://localhost:3000` (ou porta alternativa).

## 🧠 Filosofia de Design e UX

Todo nosso ecossistema foi desenhado sob o dogma: *"O usuário não se importa com a tecnologia do motor; ele só quer dirigir fácil"* (Full Abstraction). Alertas do navegador (`alert()`) foram eliminados e substituídos por modais modulares, com Loader Spinners (Tratamento Async) e CheckMarks de completude, proporcionando um ar Premium a todas as interfaces web3.

Desenvolvido para revolucionar o acesso Financeiro.
