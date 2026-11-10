<!-- @module docs/HYBRID_MULTI_ACCOUNT_ARCHITECTURE.md | Documentação técnica e especificação: Arquitetura Híbrida Multi-Conta (Web3 Pro Mode) — WalletNow. -->

# Arquitetura Híbrida Multi-Conta (Web3 Pro Mode) — WalletNow

Este documento serve como especificação técnica oficial e guia de referência rápida para engenheiros que mantêm a camada híbrida de carteiras do **WalletNow**.

---

## 🗺️ 1. O Desafio Arquitetural

No design inicial do MVP do WalletNow, cada usuário possuía uma única chave pública e privada Stellar associada diretamente ao seu perfil (`profile.stellar_address`). 
Para habilitar o **Web3 Pro Mode** e permitir que os usuários gerassem ou importassem novas contas sem comprometer a estabilidade do sistema legada ou a conformidade com regras regulatórias (KYC), projetamos uma **Arquitetura Híbrida Transitória**.

Esta arquitetura garante a coexistência pacífica e a retrocompatibilidade entre a conta legada vinculada ao perfil Supabase e o novo ecossistema multi-conta de autocustódia.

---

## 🏗️ 2. Mapeamento de Camadas (High-Level Architecture)

```text
                  ┌───────────────────────────────┐
                  │          USER INTERFACE       │
                  │   Dashboard / Settings / KYC  │
                  └───────────────┬───────────────┘
                                  │
                                  ▼
                  ┌───────────────────────────────┐
                  │         WalletContext         │
                  │  (Legacy Account Synthesis)   │
                  └──────┬─────────────────┬──────┘
                         │                 │
                         ▼                 ▼
          ┌───────────────────────┐ ┌───────────────────────┐
          │     Supabase BaaS     │ │    DeviceVault (SK)   │
          │   wallet_accounts     │ │   Local Volatile RAM  │
          └───────────────────────┘ └───────────────────────┘
```

A arquitetura do WalletNow separa de forma limpa as responsabilidades:

1. **Camada de Identidade (Auth Layer)**: Controlada pelo `AuthContext` e Supabase Auth. Mantém dados de KYC do usuário e o `profile.stellar_address` como fallback estático principal.
2. **Camada de Contas (Account Layer)**: Gerenciada pelo `WalletContext`, que gerencia a lista de contas importadas ou geradas pelo usuário.
3. **Camada de Custódia e Assinaturas (Custody & Security Layer)**: Centralizada no `DeviceVault` e `WalletFactory`. Chaves privadas são salvas no dispositivo de forma criptografada usando chaves baseadas no ID do usuário e armazenadas na memória volátil RAM durante a sessão operacional do app.
4. **Camada de Ativos (Asset Layer)**: Oracle descentralizados (CoinGecko) e a Blockchain Stellar Horizon sincronizam e gerenciam balances de stablecoins (USDC/BRW) e do ativo nativo XLM.

---

## 🔄 3. Mecanismo de Síntese de Conta Legada (Legacy Account Synthesis)

Para evitar vazios de estado e "infinite loaders" em clientes que usam carteiras antigas, o `WalletContext` executa uma tática de injeção em memória chamada **Legacy Account Synthesis**:

1. Ao carregar, o `WalletContext` busca na tabela nova `wallet_accounts` todas as chaves associadas ao `user_id`.
2. Se a tabela nova estiver vazia (usuário antigo ou provisionado apenas no `profiles`), mas o campo `profile.stellar_address` existir, o contexto **sintetiza uma conta virtual** em tempo real e insere na lista:
   * **ID**: `'legacy-profile-account'`
   * **Label**: `'Main Account'`
   * **Tipo**: `'legacy'`
   * **Stellar Public Key**: `profile.stellar_address`
3. A conta sintetizada é tratada como a conta ativa padrão e atua perfeitamente no Dashboard, permitindo o carregamento imediato de saldos e transações.

> [!WARNING]
> **Nunca remova a Síntese de Conta Legada.** Ela é a âncora de segurança que impede falhas de sincronização na transição de base de dados sem exigir migrações destrutivas no PostgreSQL de produção.

---

## 🔒 4. Local-First e Gerenciamento de Estado de Sessão (Volatile Memory)

Por questões de segurança e autocustódia estrita:
* **Chaves Privadas (Secret Keys)** são descriptografadas sob demanda e mantidas **exclusivamente em memória volátil JavaScript** (RAM).
* O `DeviceVault` nunca persiste chaves privadas descriptografadas em disco.
* Ao trocar de conta via `AccountSwitcher`, o `WalletContext` busca o envelope criptografado correspondente no `localStorage`, descriptografa usando a chave de biometria local e substitui a chave secreta na memória de forma atômica.
* Em caso de logout, a memória volátil é imediatamente limpa.

---

## 📈 5. Priorização de Ativos (XLM & USDC)

Para otimizar o carregamento e UX:
* **XLM Nativo** é exibido como ativo principal de exibição no Dashboard Pro Mode, representando a moeda de transação da rede global.
* **USDC** é priorizado como a stablecoin global de liquidação primária.
* **BRW/BRZ** atuam como proxies estáveis locais em paridade com o Real Brasileiro (BRL) para fins de facilitação de pagamentos instantâneos PIX.
* As reservas mínimas da Stellar de ativação da conta são patrocinadas de forma atômica pela nossa Hot Wallet por meio da funcionalidade de patrocínio de reservas.

---

## ⚙️ 6. Prevenção a Race Conditions (onboarding & syncing)

O provisionamento da carteira de um novo usuário é um processo assíncrono complexo.
Para garantir que a UI não trave em loading infinito, o `WalletContext` e o `Dashboard.tsx` dependem da flag `walletLoading`.
* O Dashboard **só aborta** a busca de saldos on-chain se `walletLoading === false` E `activeAccount === null`. 
* Isso garante que, se o provisionamento inicial estiver em andamento, o Dashboard aguarde pacientemente o término da criação da conta legada antes de disparar consultas na rede Stellar Horizon.

---

## 🛡️ 7. Guia de Hardening e Qualidade Técnica

Sempre siga estas diretrizes ao alterar fluxos associados a contas:
1. **Não destrua dados**: Mantenha o fallback para `profile.stellar_address` na ausência de `activeAccount.stellar_public_key` nos modais de recebimento e envio.
2. **RESTful e UI**: Retorne mensagens de erro claras traduzidas para português do Brasil em todas as falhas de rede Stellar (Ex: conta inativa, trustline ausente).
3. **DRY**: Evite escrever lógicas repetidas de decodificação de chaves. Use `DeviceVault` e `WalletFactory` de forma centralizada.
