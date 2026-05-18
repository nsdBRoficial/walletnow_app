# Etherfuse Integration Architecture

## Visão Geral

A integração do Etherfuse posiciona o WalletNow como uma ponte para ativos institucionais do mundo real (RWA - Real World Assets), escalando a proposta de valor além da liquidez imediata (PIX ➔ BRW) para acesso a rendimentos soberanos e tesouraria (Treasury).

Nesta primeira fase (Scaffolding), focamos em preparar a infraestrutura arquitetural e a interface premium do usuário (Stripe x BlackRock x Web3) **sem** invocar APIs em produção ou assinar transações na rede principal.

## Decisões Arquiteturais

### 1. Separação de Responsabilidades (Provider Pattern)
- A lógica de negócio do Etherfuse foi isolada em `src/services/providers/etherfuse/`.
- O modal principal de depósito foi refatorado para suportar `IDepositProvider`. O fluxo de preview não interage com o sandbox validado da Woovi, preservando a estabilidade da v1.

### 2. Ativo: Brazilian Real Treasury (BRT)
- O `assetCode` temporário para a tesouraria é o `BRT`.
- A arquitetura está pronta para renderizar o saldo deste ativo assim que a integração real for estabelecida. A extração de dados já ocorre em tempo real via `WalletFactory.getBalances`.
- Identidade visual dark premium aplicada ao dashboard, separando liquidez (BRW/BRZ) de ativos de tesouraria (BRT).

### 3. Trustline Scaffolding (XDR Builder)
- Implementamos `EtherfuseTrustlineService` que, em fase beta, apenas utiliza o SDK da Stellar para montar uma transação base64 (`changeTrust`), permitindo simulações de assinaturas e integrações futuras com carteiras multi-sig e custody sem risco on-chain.

## Próximos Passos (Fase 2)

- [ ] Implementar integração com a API real de KYC / Onboarding da Etherfuse.
- [ ] Implementar Broadcast de XDR.
- [ ] Tratar webhooks e callbacks em Edge Functions para reconciliação automática.
