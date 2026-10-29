# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **TestnetKit — Fluxo Trustline + Swap** (`packages/sdk/src/trustlineSwapFlow.ts`): a trustline é submetida antes do swap; se a rede rejeitar, o swap não é disparado e o status global da operação vai para "Falhou" (exibido no painel de pools).
- **Teste de integração (Suíte 3.1)**: `packages/sdk/src/__tests__/trustlineSwapFlow.integration.test.ts` simula a rejeição da trustline pela rede e garante que o swap não é chamado.

## [0.4.5-candidate] - 2026-09-29

### Added
- **Follow-On InstaAward SOW**: Documento formalizado em `INSTAWARD_WALLETNOW.md` destacando as entregas pós-MVP (Docs, SDK e TestnetKit).
- **Pitch Hackathon 2026**: Roteiro de demonstração atualizado de 5 minutos em `HACKATHON_READINESS.md` com foco em Dev Experience e Abstração Total.
- **TSDoc & Comentários Corporativos**: Documentação rigorosa de arquitetura e tipagem nos pacotes `@walletnow/contracts`, `@walletnow/crypto`, `@walletnow/core`, `@walletnow/identity`, `@walletnow/storage` e serviços do frontend.
- **Suporte Multilíngue (i18n)**: Tabelas completas de tradução em `src/i18n/docsTranslations.ts` para o Developer Portal.

### Changed
- Atualização das referências de datas e marcos temporais em toda a suíte de documentação para Setembro de 2026.
- Reforço de comentários explicativos em fluxos de SEP-01, SEP-10 e SEP-24 em `stellarTestAnchorProvider.ts` e `stellarTestAnchorService.ts`.

## [0.4.0-alpha] - 2026-09-10

### Added
- **Auditoria Adversarial v2.0**: Implementação de todas as remediações de segurança, incluindo:
  - Políticas de Row Level Security (RLS) estritas nas tabelas do Supabase.
  - Esquema de compromisso criptográfico (SHA3-256) para privacidade de usuários (LGPD/GDPR compliance).
  - Sanitização obrigatória de logs em produção (`logger.ts` / `productionLogger.ts`).
  - Proteção contra duplicação de transações via `correlation_id` único em `fiat_transactions`.
- **Supabase Anti-Hibernation Keepalive**: Workflow automatizado no GitHub Actions para manter instâncias ativas.

### Security
- Resolução confiável de emissores oficiais de ativos nas Trustlines (`USDC` da Circle, `BRZ` da Transfero).
- Remoção de exfiltração de chaves privadas em logs de depuração do browser.

## [0.3.5-alpha] - 2026-07-16

### Added
- **Módulo de NFT (`@walletnow/nft`)**: Integração de emissão e gerenciamento de colecionáveis digitais na Stellar.
- **DeFi Shares (Cotas de Vault)**: Implementação matemática de cálculo de rendimento proporcional para cofres Defindex.
- **Stellar SEPs Abstraction**: Integração transparente dos fluxos de SEP-01 (stellar.toml), SEP-10 (WebAuth) e SEP-24 (Interactive Deposit/Withdraw).
- **AI Agent Workspace Skills**: Criação do skill `.agents/skills/walletnow` e integração com ferramentas do protocolo.

## [0.3.0-alpha] - 2026-07-01

### Added
- **TestnetKit Sandbox (`/docs/testnet-kit`)**:
  - Criação de carteiras efêmeras de teste em um clique.
  - Faucet automatizado conectado ao Friendbot da Stellar Testnet.
  - Pools de liquidez AMM de produto constante ($X \times Y = K$) com cálculo de slippage e taxa de 0.3%.
  - Monitor de latência e saúde de nós Horizon / RPC.
- **RWA Integration (Etherfuse V2)**: Camada de integração com títulos de dívida soberana tokenizados na Stellar.

## [0.2.0-alpha-foundation] - 2026-06-22

### Added
- Documentação `ROADMAP.md`, `ARCHITECTURE.md`, `SECURITY.md`, `CONTRIBUTING.md`.
- `CHANGELOG.md` no formato Keep a Changelog.
- Configuração de `npm workspaces` na raiz do monorepo.
- Arquivos base `tsup.config.ts` e `tsconfig.json` para todos os pacotes do protocolo.

### Changed
- Refatoração estrutural completa para remover dependências circulares.
- O contexto foi isolado em `core/src/public/context/index.ts`.
- Padronizados os imports/exports públicos usando ESM strict mode (`type: module`).

### Removed
- Códigos mortos, TODOs sem escopo e arquivos vazios do repositório.

## [0.1.0] - 2026-06-15
### Added
- Blueprint Arquitetural (ADR-000).
- Estruturas base do WalletNow Protocol.
- Definições da State Machine do Kernel e tipos Core.
