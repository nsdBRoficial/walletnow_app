# INSTAWARDS SOW — WALLETNOW (FOLLOW-ON GRANT)

**[en]**
## 1. Project & Team Information
**Project Name:** WalletNow Protocol & SDK — The Financial Operating System for Stellar.  
**Team:** NSD Team (Solo Developer / Architect).  
**Primary Contacts:**  
- Douglas Alexandre (Founder / Core Developer) [nsd.douglas@gmail.com].  

**Ambassador Chapter:** Rio de Janeiro.  
**Application Type:** Follow-On InstaAward (Expansion, Developer Tooling & SDK Stabilization).  
**Submission Date:** 29/09/2026.  
**Live Production URL:** [https://nsdbr.com/walletnow/](https://nsdbr.com/walletnow/)  
**Interactive Developer Portal:** [https://nsdbr.com/walletnow/docs](https://nsdbr.com/walletnow/docs)  
**Public Repository:** [https://github.com/nsdBRoficial/walletnow_app](https://github.com/nsdBRoficial/walletnow_app)  

---

## 2. Executive Summary & Context of the Follow-On Request

In our initial InstaAward grant, WalletNow successfully delivered and validated its core MVP: zero-gas biometric onboarding via Passkeys (WebAuthn), sponsored Stellar reserve management, and instant Pix fiat-to-stablecoin settlement.

Following the success of that first phase, we have significantly expanded the protocol's architecture into a **full-fledged Financial Operating System (WalletNow OS)** and an open developer ecosystem for Stellar builders. 

This **Follow-On InstaAward** request focuses exclusively on the major milestones that have been engineered and are now ready, which were **not** part of the original MVP grant:
1. **Interactive Developer Portal & Documentation Engine** (`/docs`): Full multilingual (EN/PT) interactive documentation with live sandbox components, architecture blueprints, and AI agent integration guides.
2. **Decoupled Modular SDK (`@walletnow/sdk`)**: A monorepo architecture featuring 13 independent packages (`@walletnow/core`, `@walletnow/crypto`, `@walletnow/contracts`, `@walletnow/identity`, `@walletnow/onboarding`, `@walletnow/providers`, `@walletnow/nft`, `@walletnow/storage`, etc.), eliminating circular dependencies and isolating the core blockchain logic.
3. **TestnetKit (Live Sandbox Infrastructure)**: A developer playground featuring one-click ephemeral wallet creation, an automated testnet faucet, constant-product AMM liquidity pools ($X \times Y = K$), real-time latency diagnostics, and live SEP-01, SEP-10, and SEP-24 test anchor integration.
4. **Adversarial Security Audit v2.0 & Hardening**: Complete security refactoring, zero-regression test harness (Vitest + strict TypeScript), SHA3-256 cryptographic commitments for user privacy (LGPD/GDPR), and Supabase enterprise RLS policies.

---

## 3. Comparative Matrix: Initial Grant vs. Follow-On Material

| Feature / Dimension | Initial InstaAward (Delivered) | Follow-On Scope (New Material Ready) |
|---|---|---|
| **Scope Type** | Consumer MVP Application | Modular Open-Source Protocol & Developer SDK |
| **Architecture** | Single-app monolithic scaffolding | 13-Package Monorepo with strict clean architecture |
| **Documentation** | Basic README and deployment notes | Interactive Developer Portal (`/docs`), i18n, runnable examples |
| **Testing Sandbox** | Manual testnet operations | **TestnetKit**: Automated 1-Click Faucet, AMM DEX & Latency Suite |
| **Stellar SEPs** | Basic asset trustlines | Invisible client abstraction for **SEP-01**, **SEP-10**, and **SEP-24** |
| **DeFi & RWA** | Static asset display | Soroswap AMM integration, Defindex Yield Vaults, and Etherfuse RWA |
| **Security Status** | Initial prototype | Remediated through Adversarial Security Audit v2.0 |
| **AI Integration** | None | Native Workspace Skills (`.agents/skills/walletnow`) and Agent prompt kit |

---

## 4. Scope of Work & Deliverables for Follow-On

The requested Follow-On support will fund the stabilization, documentation completion, and official public package distribution:

1. **Deliverable 1 — SDK Stabilization & Multi-Target NPM Distribution**:
   - Finalize build pipelines (`tsup`, ESM/CJS dual export, strict `.d.ts` type declarations) for `@walletnow/sdk` and its sub-packages.
   - Comprehensive test suite expansion (>80% unit test coverage across `@walletnow/core`, `@walletnow/crypto`, and `@walletnow/identity`).
2. **Deliverable 2 — TestnetKit Developer Tooling Expansion**:
   - Public release and enhancement of the interactive sandbox at `/docs/testnet-kit`.
   - Native simulation tools for Stellar builders to test SEP-24 interactive deposits and anchor transactions in a zero-risk sandbox.
3. **Deliverable 3 — Developer Portal & OSS Integration Guides**:
   - Interactive SDK Playground with code snippets for React, Next.js, and Node.js.
   - In-depth documentation of Soroban smart contract bindings and Soroswap liquidity aggregation.
4. **Deliverable 4 — Production Hardening & Security Audit Documentation**:
   - Maintenance of zero-regression CI/CD workflows.
   - Public documentation of security controls, cryptographic key derivation, and rate-limiting safeguards.

---

## 5. Execution Plan & Timeline (30 Days)

- **Week 1 (SDK Finalization & Packaging)**:
  - Harmonize TSDoc across all 13 packages.
  - Finalize `@walletnow/sdk` exports and automated type checking.
  - Package integrity validation via automated CI test workflows.
- **Week 2 (TestnetKit Sandbox & SEP Tooling)**:
  - Polish the interactive TestnetKit UI (`src/pages/docs/pages/TestnetKit.tsx`).
  - Implement expanded SEP-24 interactive anchor mock flows and transaction latency telemetries.
- **Week 3 (Developer Documentation & Guides)**:
  - Expand the interactive documentation at `/docs` with step-by-step guides for Passkeys, Gasless sponsorship, and AMM swaps.
  - Complete the Portuguese and English localization tables (`src/i18n/docsTranslations.ts`).
- **Week 4 (Public Community Release & Verification)**:
  - Deploy the updated portal and TestnetKit to production.
  - Publish public npm package candidates and verify real-world dApp onboarding in example projects (`examples/basic/`).
  - Submit the final verification report to the Stellar Community Fund / InstaAward committee.

---

## 6. Verifiable Evidence of Completion

- **Evidence 1 (Repository & Code Quality)**: Clean monorepo build passing `tsc --noEmit` and Vitest test suites with extensive TSDoc annotations.
- **Evidence 2 (Live Sandbox Demo)**: Functional TestnetKit accessible at [https://nsdbr.com/walletnow/docs/testnet-kit](https://nsdbr.com/walletnow/docs/testnet-kit) with working Stellar Testnet transactions, AMM swaps, and real-time explorer links.
- **Evidence 3 (Developer Portal)**: Fully operational documentation system covering SDK installation, quickstarts, and architectural principles.
- **Evidence 4 (On-Chain Proof)**: Verified testnet transaction hashes showing automated account creation, sponsored trustlines, and SEP-24 deposit simulations on [Stellar.expert](https://stellar.expert).

---

## 7. Budget & Rationale

**Requested Amount:** $5,000 USD (Follow-On Grant).  
**Rationale:** Dedicated engineering hours for open-source developer tooling, maintenance of the TestnetKit sandbox, stabilization of the 13 monorepo packages for npm release, and technical documentation creation for the global Stellar developer community.  
**Commitment:** 100% focused delivery within 30 days, backed by a proven track record of execution from our initial grant.




















---
---

**[pt-br]**
## 1. Informações do Projeto e Equipe
**Nome do Projeto:** Protocolo e SDK WalletNow — O Sistema Operacional Financeiro para Stellar.  
**Equipe:** Equipe NSD (Desenvolvedor Solo / Arquiteto).  
**Contatos Principais:**  
- Douglas Alexandre (Fundador / Desenvolvedor Principal) [nsd.douglas@gmail.com].  

**Capítulo de Embaixadores:** Rio de Janeiro.  
**Tipo de Inscrição:** InstaAward Follow-On (Expansão, Ferramentas para Desenvolvedores e Estabilização do SDK).  
**Data de Envio:** 29/09/2026.  
**URL de Produção ao Vivo:** [https://nsdbr.com/walletnow/](https://nsdbr.com/walletnow/)  
**Portal Interativo do Desenvolvedor:** [https://nsdbr.com/walletnow/docs](https://nsdbr.com/walletnow/docs)  
**Repositório Público:** [https://github.com/nsdBRoficial/walletnow_app](https://github.com/nsdBRoficial/walletnow_app)  

---

## 2. Resumo Executivo e Contexto da Solicitação Follow-On

Em nosso subsídio inicial do InstaAward, a WalletNow entregou e validou com sucesso seu MVP principal: integração biométrica sem taxa de gás (gasless) via Passkeys (WebAuthn), gerenciamento de reserva Stellar patrocinada e liquidação instantânea de Pix fiduciário para stablecoin.

Após o sucesso dessa primeira fase, expandimos significativamente a arquitetura do protocolo para um **Sistema Operacional Financeiro completo (WalletNow OS)** e um ecossistema de desenvolvimento aberto para construtores Stellar.

Esta solicitação de **InstaAward Follow-On** concentra-se exclusivamente nos principais marcos que foram projetados e agora estão prontos, os quais **não** faziam parte do subsídio do MVP original:
1. **Portal Interativo do Desenvolvedor e Motor de Documentação** (`/docs`): Documentação interativa completa e multilíngue (EN/PT) com componentes sandbox ao vivo, esquemas de arquitetura e guias de integração de agentes de IA.
2. **SDK Modular Desacoplado (`@walletnow/sdk`)**: Uma arquitetura monorepo com 13 pacotes independentes (`@walletnow/core`, `@walletnow/crypto`, `@walletnow/contracts`, `@walletnow/identity`, `@walletnow/onboarding`, `@walletnow/providers`, `@walletnow/nft`, `@walletnow/storage`, etc.), eliminando dependências circulares e isolando a lógica principal da blockchain.
3. **TestnetKit (Infraestrutura Sandbox ao Vivo)**: Um playground para desenvolvedores com criação de carteira efêmera com um clique, um faucet automatizado da testnet, pools de liquidez AMM de produto constante ($X \times Y = K$), diagnósticos de latência em tempo real e integração de âncora de teste ao vivo SEP-01, SEP-10 e SEP-24.
4. **Auditoria de Segurança Adversária v2.0 e Fortalecimento**: Refatoração completa de segurança, ambiente de teste de zero regressão (Vitest + TypeScript estrito), compromissos criptográficos SHA3-256 para privacidade do usuário (LGPD/GDPR) e políticas empresariais RLS do Supabase.

---

## 3. Matriz Comparativa: Subsídio Inicial vs. Material Follow-On

| Recurso / Dimensão | InstaAward Inicial (Entregue) | Escopo Follow-On (Novo Material Pronto) |
|---|---|---|
| **Tipo de Escopo** | Aplicativo MVP para o Consumidor | Protocolo de Código Aberto Modular e SDK para Desenvolvedores |
| **Arquitetura** | Estrutura monolítica de aplicativo único | Monorepo de 13 pacotes com arquitetura limpa estrita |
| **Documentação** | README básico e notas de implantação | Portal Interativo do Desenvolvedor (`/docs`), i18n, exemplos executáveis |
| **Sandbox de Testes** | Operações manuais na testnet | **TestnetKit**: Faucet Automatizado de 1 Clique, AMM DEX e Suíte de Latência |
| **SEPs Stellar** | Trustlines de ativos básicos | Abstração invisível do cliente para **SEP-01**, **SEP-10** e **SEP-24** |
| **DeFi e RWA** | Exibição estática de ativos | Integração AMM Soroswap, Defindex Yield Vaults e Etherfuse RWA |
| **Status de Segurança** | Protótipo inicial | Remediado através da Auditoria de Segurança Adversária v2.0 |
| **Integração de IA** | Nenhuma | Skills Nativos do Workspace (`.agents/skills/walletnow`) e kit de prompts para Agentes |

---

## 4. Escopo de Trabalho e Entregáveis para Follow-On

O suporte Follow-On solicitado financiará a estabilização, a conclusão da documentação e a distribuição oficial de pacotes públicos:

1. **Entregável 1 — Estabilização do SDK e Distribuição NPM Multi-Target**:
   - Finalizar os pipelines de construção (`tsup`, exportação dupla ESM/CJS, declarações de tipo estritas `.d.ts`) para `@walletnow/sdk` e seus subpacotes.
   - Expansão abrangente do conjunto de testes (>80% de cobertura de testes unitários em `@walletnow/core`, `@walletnow/crypto` e `@walletnow/identity`).
2. **Entregável 2 — Expansão de Ferramentas para Desenvolvedores do TestnetKit**:
   - Lançamento público e aprimoramento do sandbox interativo em `/docs/testnet-kit`.
   - Ferramentas nativas de simulação para construtores Stellar testarem depósitos interativos SEP-24 e transações de âncora em um sandbox de risco zero.
3. **Entregável 3 — Portal do Desenvolvedor e Guias de Integração OSS**:
   - Playground interativo do SDK com trechos de código para React, Next.js e Node.js.
   - Documentação detalhada das ligações de contratos inteligentes Soroban e agregação de liquidez Soroswap.
4. **Entregável 4 — Fortalecimento de Produção e Documentação de Auditoria de Segurança**:
   - Manutenção de fluxos de trabalho CI/CD de zero regressão.
   - Documentação pública de controles de segurança, derivação de chave criptográfica e salvaguardas de limitação de taxa (rate-limiting).

---

## 5. Plano de Execução e Cronograma (30 Dias)

- **Semana 1 (Finalização do SDK e Empacotamento)**:
  - Harmonizar o TSDoc em todos os 13 pacotes.
  - Finalizar exportações do `@walletnow/sdk` e verificação automatizada de tipos.
  - Validação de integridade do pacote via fluxos de trabalho de teste de CI automatizados.
- **Semana 2 (Sandbox TestnetKit e Ferramentas SEP)**:
  - Refinar a interface do TestnetKit interativo (`src/pages/docs/pages/TestnetKit.tsx`).
  - Implementar fluxos expandidos de simulação de âncora interativa SEP-24 e telemetrias de latência de transação.
- **Semana 3 (Documentação e Guias do Desenvolvedor)**:
  - Expandir a documentação interativa em `/docs` com guias passo a passo para Passkeys, Patrocínio Gasless e swaps AMM.
  - Concluir as tabelas de localização em Português e Inglês (`src/i18n/docsTranslations.ts`).
- **Semana 4 (Lançamento Comunitário Público e Verificação)**:
  - Implantar o portal atualizado e o TestnetKit em produção.
  - Publicar pacotes candidatos npm públicos e verificar a integração de dApps do mundo real em projetos de exemplo (`examples/basic/`).
  - Enviar o relatório final de verificação para o Stellar Community Fund / comitê do InstaAward.

---

## 6. Evidência Verificável de Conclusão

- **Evidência 1 (Repositório e Qualidade de Código)**: Build de monorepo limpo passando `tsc --noEmit` e suítes de teste Vitest com extensas anotações TSDoc.
- **Evidência 2 (Demonstração do Sandbox ao Vivo)**: TestnetKit funcional acessível em [https://nsdbr.com/walletnow/docs/testnet-kit](https://nsdbr.com/walletnow/docs/testnet-kit) com transações reais na Stellar Testnet, swaps AMM e links de explorador em tempo real.
- **Evidência 3 (Portal do Desenvolvedor)**: Sistema de documentação totalmente operacional cobrindo a instalação do SDK, guias de início rápido (quickstarts) e princípios arquitetônicos.
- **Evidência 4 (Prova On-Chain)**: Hashes de transações verificadas na testnet mostrando criação de contas automatizada, trustlines patrocinadas e simulações de depósitos SEP-24 no [Stellar.expert](https://stellar.expert).

---

## 7. Orçamento e Justificativa

**Valor Solicitado:** $5.000 USD (Subsídio Follow-On).  
**Justificativa:** Horas dedicadas de engenharia para ferramentas de código aberto para desenvolvedores, manutenção do sandbox TestnetKit, estabilização dos 13 pacotes do monorepo para lançamento no npm e criação de documentação técnica para a comunidade global de desenvolvedores Stellar.  
**Compromisso:** 100% focado na entrega em 30 dias, apoiado por um histórico comprovado de execução do nosso subsídio inicial.
