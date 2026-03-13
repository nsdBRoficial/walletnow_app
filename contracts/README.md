# Contratos Inteligentes Soroban (Stellar)

Esta pasta é reservada para os contratos inteligentes futuros do protocolo WalletNow.

## Stack

- **Linguagem**: Rust
- **Framework**: Soroban SDK
- **Rede Alvo**: Stellar Testnet → Mainnet

## Contratos Planejados

| Contrato | Descrição | Status |
|---|---|---|
| `brw_anchor.rs` | Lógica de Mint/Burn do ativo BRW atrelada ao PIX confirmado | `PLANEJADO` |
| `kyc_attestation.rs` | ZK-Stark Attestation On-Chain da Identidade do Usuário | `PLANEJADO` |
| `gasless_sponsor.rs` | Patrocinador Automático de Reservas e Trustlines (CAP-33) | `PLANEJADO` |

## Como Desenvolver

```bash
# Instalar o Soroban CLI
cargo install --locked soroban-cli

# Compilar um contrato
soroban contract build --package brw_anchor

# Deploy na Testnet
soroban contract deploy --wasm target/wasm32-unknown-unknown/release/brw_anchor.wasm --network testnet
```

## Referências

- [Soroban Docs](https://developers.stellar.org/docs/smart-contracts)
- [Stellar SDK Rust](https://github.com/stellar/rs-stellar-xdr)
