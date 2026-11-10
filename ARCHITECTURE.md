<!-- @module ARCHITECTURE.md | Arquitetura em camadas, 17 pacotes do monorepo, SEPs Stellar e infraestrutura de QA do WalletNow OS -->

# Arquitetura do Protocolo WalletNow (WalletNow OS)

**Data de Atualização:** Novembro de 2026  
**Versão:** `v0.2.0` (Monorepo Root) / `v0.4.5-candidate` (Protocol Spec)  
**Padrão Arquitetural:** Clean Architecture, Dependency Injection (Inversion of Control), CQRS-Like State Machine e Monorepo Modular.

O **WalletNow** é um sistema operacional financeiro descentralizado (*Financial OS*) concebido sobre a rede Stellar. Ele segue princípios rigorosos de modularidade e separação de preocupações, conforme formalizado no `ADR-000`, eliminando qualquer acoplamento de bibliotecas de terceiros no núcleo do sistema.

---

## 1. Visão Geral em Camadas

```
┌────────────────────────────────────────────────────────────────────────┐
│               APLICAÇÕES (dApps, Dashboards, PWA, CLI)                 │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ consome
┌───────────────────────────────────▼────────────────────────────────────┐
│                    SDK UNIFICADO (@walletnow/sdk)                      │
│             WalletNowOS · Engine Registry · Facade API                 │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ orquestra
┌───────────────────────────────────▼────────────────────────────────────┐
│                    DOMÍNIO & CONTRATOS CANÔNICOS                       │
│     @walletnow/contracts · @walletnow/domain · @walletnow/errors       │
└──────────┬────────────────────────┬────────────────────────┬───────────┘
           │                        │                        │
┌──────────▼──────────┐  ┌──────────▼──────────┐  ┌──────────▼──────────┐
│   CORE KERNEL       │  │   SECURITY & CRYPTO │  │  IDENTITY & ONBOARD │
│  @walletnow/core    │  │  @walletnow/crypto  │  │ @walletnow/identity │
│  - State Machine    │  │  - AES-GCM 256-bit  │  │ - WebAuthn/Passkeys │
│  - Event Emitter    │  │  - SHA3-256 Commit. │  │ - Multi-Account     │
│  - Context Store    │  │  - Key Derivation   │  │ - DeviceVault       │
└──────────┬──────────┘  └──────────┬──────────┘  └──────────┬──────────┘
           │                        │                        │
┌──────────▼────────────────────────▼────────────────────────▼──────────┐
│                   PROVIDERS & CAPABILITIES PLUGINS                     │
│  @walletnow/providers · @walletnow/plugins · @walletnow/nft            │
│  - Stellar Horizon & RPC Provider  - Soroswap AMM Aggregator Provider  │
│  - Defindex Yield Vaults Provider  - Stellar SEPs (01, 10, 24) Anchor  │
│  - Etherfuse RWA Treasury Layer    - Gasless Sponsor (CAP-33 Relayer)  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ persiste / comunica
┌───────────────────────────────────▼────────────────────────────────────┐
│                  INFRAESTRUTURA EXTERNA & REDE                         │
│  Stellar Network (Horizon/Soroban RPC) · Supabase (PostgreSQL + RLS)   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Pacotes do Monorepo (`packages/`)

O protocolo é dividido em **17 pacotes independentes** (gerenciados via Turborepo e NPM Workspaces), garantindo manutenibilidade, testabilidade isolada e publicação no NPM sem dependências circulares:

1. **`@walletnow/core`**: Núcleo agnóstico de blockchain (`IntegrationEngine`, `DiscoveryService`, `HealthMonitor`, `ProtocolStore` e hierarquia de erros).
2. **`@walletnow/contracts`**: Interfaces canônicas, tipos universais (`IIdentityEngine`, `IWalletEngine`, `IStorageAdapter`, `IOSEngine`) e especificações de eventos.
3. **`@walletnow/crypto`**: Motor de criptografia client-side (`StellarKeypairDeriver`, `WebCryptoEncryptor` AES-GCM-256 e `InMemoryStellarSigner`).
4. **`@walletnow/domain`**: Entidades de negócio ricas (Saldos, Moedas, Transações, Ativos, Cotações e Ordens de Swap).
5. **`@walletnow/identity`**: Gerenciamento de credenciais e autenticação biométrica WebAuthn/Passkeys (`IdentityEngine`, `KeypairAuthAdapter`).
6. **`@walletnow/onboarding`**: Orquestrador de criação de conta não-custodial em background (`OnboardingOrchestrator`) com provisionamento automático de trustlines e patrocínio Gasless.
7. **`@walletnow/providers`**: Registro central de provedores (`ProviderRegistry`), barramento de eventos e adaptadores de rede.
8. **`@walletnow/provider-etherfuse`**: Provedor dedicado para ativos RWA tokenizados (Tesouro Direto `TESOURO` via PIX, API V2, persistência e trustlines).
9. **`@walletnow/plugin-defindex`**: Plugin de cofres automatizados de rendimento (Yield Vaults) na rede Stellar/Soroban.
10. **`@walletnow/plugin-etherfuse`**: Plugin de capacidade RWA integrando o provedor Etherfuse ao `IntegrationEngine`.
11. **`@walletnow/plugin-portfolio`**: Agregador e consolidador de saldos multi-ativos e histórico on-chain.
12. **`@walletnow/plugin-soroswap`**: Plugin de roteamento de liquidez e swaps AMM no protocolo Soroswap.
13. **`@walletnow/nft`**: Orquestrador (`NftOrchestrator`) para emissão, transferência e visualização de colecionáveis na Stellar.
14. **`@walletnow/storage`**: Adaptadores de persistência local encriptada (`LocalStorageAdapter`, `IndexedDBAdapter` e adaptadores em memória).
15. **`@walletnow/testing`**: Mocks e Fakes determinísticos (`FakeIdentityEngine`, `InMemoryStorageProvider`) para testes sem dependência de rede.
16. **`@walletnow/wallet`**: Motor de contas e carteiras (`WalletEngine`), construção de transações e envelopes Stellar XDR.
17. **`@walletnow/sdk`**: Fachada pública unificada (`WalletNowOS` + `TestnetKit`) que compõe todos os motores para consumo simples por qualquer aplicação Web3.

---

## 3. Abstração de Padrões Stellar (SEPs)

O protocolo implementa clientes integrados para os padrões oficiais do ecossistema Stellar:
- **SEP-01 (`stellar.toml`)**: Resolução dinâmica de metadados institucionais e emissores oficiais de ativos.
- **SEP-10 (Stellar Web Authentication)**: Desafio-resposta criptográfico on-chain para emissão de JWTs e sessões seguras sem senhas.
- **SEP-24 (Interactive Deposit/Withdraw)**: Abertura fluida de janelas interativas de âncoras para depósitos e saques fiat sem sair da experiência do aplicativo.

---

## 4. TestnetKit: Sandbox Interativa de Engenharia

Localizado em `/docs/testnet-kit`, o TestnetKit atua como um laboratório de testes em tempo real:
- **One-Click Ephemeral Wallet**: Criação instantânea de contas na Testnet para validação de código.
- **Automated Faucet**: Injeção de fundos em parceria com o Friendbot.
- **AMM Constant-Product Pool ($X \times Y = K$)**: Simulação de swaps descentralizados com taxas de 0.3% e controle de slippage.
- **Diagnostics de Latência**: Monitoramento contínuo dos tempos de resposta dos nós Horizon da Stellar.

---

## 5. Invariantes de Segurança e Auditoria v2.0

- **Zero-Custody Real**: Nenhuma chave privada é transmitida ou gravada nos servidores. O cofre `DeviceVault` (PBKDF2 100k SHA-256 + AES-GCM-256) e o `MnemonicVault` (BIP39 / SEP-0005 `m/44'/148'/0'`) operam exclusivamente no cliente.
- **Proteção LGPD/GDPR**: Dados de identificação do usuário são transformados em digest criptográfico SHA3-256 com salt de alta entropia.
- **Defesa em Profundidade**: Políticas RLS estritas no banco de dados e sanitização ativa de logs (`logger.ts` e `productionLogger.ts`) prevenindo vazamento de tokens, CPFs e chaves secretas no console.

---

## 6. Engenharia de Qualidade (QA) e Automação de Testes

A suíte de testes (`vitest.config.ts`) é estruturada em **3 projetos isolados** com pipelines automatizados no GitHub Actions (`.github/workflows/ci.yml` e `onchain-nightly.yml`):
- **`unit` (`npm run test:unit`)**: Testes unitários 100% offline para criptografia, cofres locais (`DeviceVault`, `MnemonicVault`, `bip39Wallet`), oráculo de preços com fallback em 4 camadas, provedores, sanitização de logs e motores do monorepo.
- **`integration` (`npm run test:integration`)**: Fluxos integrados determinísticos (SEP-10/SEP-24, validação de carteiras e máquina de estados de pagamento On/Off-Ramp).
- **`onchain` (`npm run test:onchain`)**: Liquidação real na Stellar Testnet e ativação via Friendbot, executada no workflow noturno.
- **Personas e Plano Mestre**: Documentados em [docs/qa/PERSONAS.md](docs/qa/PERSONAS.md) e [docs/qa/TEST_HARDENING_PLAN.md](docs/qa/TEST_HARDENING_PLAN.md).
