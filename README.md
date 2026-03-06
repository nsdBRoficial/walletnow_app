# 🚀 WalletNow - Web3 Abstraction Layer (MVP)

Bem-vindo ao repositório do **WalletNow**, uma infraestrutura de *Wallet-as-a-Service* (WaaS) projetada para abstrair toda a complexidade da Web3 (chaves privadas, taxas de rede, etc.) e entregar uma experiência de usuário ("UX Zero") idêntica à de um banco digital moderno.

## 📌 Status Atual do Projeto

**Fase:** Prototipação UI/UX de Alta Fidelidade Concluída.
**Próximo Passo:** Integração com Backend (Supabase) e Web3 (Stellar SDK).

O código atual contém o frontend completo e navegável, simulando todas as interações e fluxos de usuário. O design segue o padrão Dark Mode com acentos verdes (`#00E676`), focado em mobile-first.

### 📱 Telas Implementadas

1.  **Login/Onboarding (`/`)**: Interface limpa com opções de login via Google OAuth e Passkeys (WebAuthn).
2.  **Dashboard (`/dashboard`)**: Visão geral do saldo em Reais (BRZ), histórico de transações com status visuais e botões de ação rápida (Depositar/Sacar).
3.  **Modal de Depósito (PIX)**: Simulação de depósito via PIX Copia e Cola com geração de QR Code.
4.  **Modal de Envio (Gasless)**: Fluxo de envio de saldo com confirmação biométrica simulada, abstraindo o conceito de "Gas Fee".
5.  **Configurações e Identidade (`/settings`)**: Fluxo robusto de KYC (Know Your Customer) com:
    *   Validação visual de dados pessoais (Nome, CPF, Data de Nascimento, Endereço).
    *   Verificação simulada de E-mail e WhatsApp.
    *   Módulo de upload de documentos e captura de Selfie (Liveness).
    *   Simulação de geração de prova criptográfica **ZK-STARK** para validação de identidade na rede.
    *   Exibição segura do endereço público Stellar.

## 🛠 Stack Tecnológica

*   **Frontend:** React 19, Vite, Tailwind CSS v4.
*   **Roteamento:** React Router DOM.
*   **Ícones:** Lucide React.
*   **Backend (Planejado):** Supabase (Auth, Database, Edge Functions).
*   **Web3 (Planejado):** Stellar SDK (Contas, Transações, Trustlines para BRZ).

## 🚀 Como Rodar o Projeto Localmente

1.  **Instale as dependências:**
    ```bash
    npm install
    ```

2.  **Inicie o servidor de desenvolvimento:**
    ```bash
    npm run dev
    ```

3.  **Acesse no navegador:**
    O terminal exibirá a URL local (geralmente `http://localhost:3000` ou `http://localhost:5173`).

## 🧠 Arquitetura e Decisões de Design

*   **Mobile-First:** A interface foi construída pensando primariamente na experiência em dispositivos móveis, utilizando os prefixos responsivos do Tailwind (`sm:`, `md:`) para adaptar a telas maiores.
*   **Componentização:** Modais e layouts foram separados para facilitar a manutenção e reutilização.
*   **Comentários Didáticos:** Todo o código fonte está ricamente comentado em Português do Brasil, explicando não apenas *o que* o código faz, mas *por que* foi feito dessa forma, facilitando o onboarding de novos desenvolvedores e a transição para ferramentas de IA (como o Arkham IDX).

## ⏭ Próximos Passos (Handoff para Arkham IDX)

O próximo passo é iniciar a integração real do backend. Para isso, utilize o arquivo `PROMPT_ARKHAM_IDX.md` incluído neste repositório. Ele contém as instruções exatas para o próximo agente de IA continuar o desenvolvimento a partir deste ponto.
