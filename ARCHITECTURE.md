<!-- @module ARCHITECTURE.md | WalletNow Protocol - Documentação e especificações de engenharia -->

# Arquitetura do Protocolo WalletNow (WalletNow OS)

**Data de Atualização:** Setembro de 2026  
**Versão:** `v0.4.5-candidate`  
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

O protocolo é dividido em 13 pacotes independentes, garantindo manutenibilidade, testabilidade isolada e publicação no NPM sem dependências circulares:

1. **`@walletnow/core`**: Núcleo agnóstico de blockchain. Controla o ciclo de vida da aplicação (`BOOTING`, `READY`, `ERROR`, `SHUTDOWN`), o barramento de eventos (`EventEmitter`) e o armazenamento de contexto central.
2. **`@walletnow/contracts`**: Interfaces canônicas, tipos universais, especificações de transações e a hierarquia de erros do sistema (`WalletNowError`).
3. **`@walletnow/crypto`**: Motor de criptografia cliente-side. Provê derivação de chaves Stellar (`StellarKeypairDeriver`), criptografia autenticada (`WebCryptoEncryptor` via AES-GCM) e compromissos criptográficos SHA3-256.
4. **`@walletnow/domain`**: Entidades de negócio ricas (Saldos, Moedas, Transações, Ativos, Cotações e Ordens de Swap).
5. **`@walletnow/identity`**: Gerenciamento de credenciais e identificação biométrica via WebAuthn/Passkeys, garantindo que o usuário nunca precise memorizar sementes mnemônicas.
6. **`@walletnow/onboarding`**: Fluxo acelerado de criação de conta não-custodial em background com aprovisionamento automático de trustlines.
7. **`@walletnow/providers`**: Adaptadores para serviços externos e de rede (Stellar Horizon, RPC de nós, âncoras SEP-01/10/24, oráculos e gateways bancários).
8. **`@walletnow/plugins`**: Mecanismo de injeção de `Capabilities` sob demanda (ex: assinatura automática, patrocinador de gas, cotas de rendimento).
9. **`@walletnow/nft`**: Gestão e visualização de ativos digitais colecionáveis na Stellar.
10. **`@walletnow/storage`**: Adaptadores de persistência local encriptada (`LocalStorageAdapter`, `IndexedDBAdapter` e adaptadores em memória para testes).
11. **`@walletnow/testing`**: Mocks de primeira classe (`FakeIdentityEngine`, `InMemoryStorageProvider`) para testes de integração rápidos e sem dependência de rede.
12. **`@walletnow/wallet`**: Camada de gerenciamento de chaves, assunção de transações e criação de envelopes Stellar XDR.
13. **`@walletnow/sdk`**: Fachada pública unificada (`WalletNowOS`) que compõe todos os motores para consumo simples por qualquer desenvolvedor Web3.

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

- **Zero-Custody Real**: Nenhuma chave privada é transmitida ou gravada nos servidores. O cofre `DeviceVault` opera exclusivamente na memória local do cliente.
- **Proteção LGPD/GDPR**: Dados de identificação do usuário são transformados em digest criptográfico SHA3-256 com salt de alta entropia.
- **Defesa em Profundidade**: Políticas RLS estritas no banco de dados e sanitização ativa de logs prevenindo vazamento de tokens no console.
