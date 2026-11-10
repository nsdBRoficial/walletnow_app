<!-- @module docs/mainnet/KEY_MANAGEMENT.md | Documentação técnica e especificação: WalletNow — Key Management & Treasury Architecture. -->

# WalletNow — Key Management & Treasury Architecture

**Versão:** 1.0 | **Data:** 2026-05-27

---

## Visão Geral da Arquitetura de Chaves (Fase 1 — Hot Wallet)

```
┌─────────────────────────────────────────────────────────────┐
│                    WALLETS DA WALETNOW                       │
│                                                              │
│  ┌──────────────────┐    ┌──────────────────┐               │
│  │  ISSUER WALLET   │    │  FEE COLLECTOR   │               │
│  │  (Hot — Fase 1)  │    │  (Hot — Fase 1)  │               │
│  │                  │    │                  │               │
│  │ Responsável por: │    │ Recebe 0,49% fee │               │
│  │ - Mint tokens    │    │ em XLM por tx    │               │
│  │ - Burn tokens    │    │                  │               │
│  │ - Sponsor contas │    │ TODO: separar do │               │
│  │ - Setup trustline│    │ issuer na Fase 2 │               │
│  └──────────────────┘    └──────────────────┘               │
│                                                              │
│  ┌──────────────────────────────────────────┐               │
│  │           TREASURY / RESERVE             │               │
│  │           (Hot — Fase 1)                 │               │
│  │                                          │               │
│  │ - Subsídio inicial de XLM para usuários  │               │
│  │ - Funding de contas novas (~1.5 XLM)     │               │
│  │ - Buffer operacional                     │               │
│  │                                          │               │
│  │ Saldo mínimo recomendado: 10.000 XLM     │               │
│  └──────────────────────────────────────────┘               │
└─────────────────────────────────────────────────────────────┘
```

---

## Separação de Wallets (Fase 2 — Arquitetura Target)

```
┌─────────────────────────────────────────────────────────────┐
│                    WALLETS DA WALETNOW (Fase 2)              │
│                                                              │
│  [COLD] MASTER ISSUER                                        │
│  ├── Somente assina transações críticas offline              │
│  └── Nunca conectado à internet diretamente                  │
│                                                              │
│  [HOT] OPERATIONAL ISSUER                                    │
│  ├── Autorizado pelo Master via multisig                     │
│  ├── Mint/Burn/Sponsor diários                               │
│  └── Limite máximo de operação configurado                   │
│                                                              │
│  [HOT] FEE COLLECTOR                                         │
│  ├── Recebe 0,49% de cada tx em XLM                          │
│  └── Sweep automático para treasury semanalmente             │
│                                                              │
│  [COLD] TREASURY                                             │
│  ├── Reserva estratégica de XLM                              │
│  ├── Multisig (M-of-N assinantes)                            │
│  └── Requer aprovação humana para saques                     │
│                                                              │
│  [HOT] SPONSOR WALLET                                        │
│  └── Apenas patrocina reservas de contas novas               │
└─────────────────────────────────────────────────────────────┘
```

---

## Onde as Chaves São Armazenadas

| Wallet | Fase 1 (Atual) | Fase 2 (Target) |
|--------|---------------|-----------------|
| Issuer Secret | Supabase Vault + Edge Function | HSM / Cold Wallet |
| Treasury Secret | Supabase Vault | Multisig Hardware |
| Fee Collector | Mesma que issuer (Fase 1) | Supabase Vault separado |
| Sponsor | Mesma que issuer (Fase 1) | Edge Function dedicada |

---

## Supabase Vault — Comandos de Configuração

```bash
# Configurar secrets na Edge Function (NUNCA commitar no código)
supabase secrets set STELLAR_ISSUER_SECRET="S..." --project-ref PROJ_ID
supabase secrets set STELLAR_ISSUER_PUBLIC="G..." --project-ref PROJ_ID
supabase secrets set STELLAR_NETWORK="mainnet" --project-ref PROJ_ID
supabase secrets set ETHERFUSE_API_KEY="api_prod:..." --project-ref PROJ_ID
supabase secrets set GEMINI_API_KEY="AIza..." --project-ref PROJ_ID

# Verificar que os secrets estão configurados (não exibe os valores)
supabase secrets list --project-ref PROJ_ID
```

---

## Modelo de Funding de Usuários (Fase 1)

### Custo por Novo Usuário
| Operação | Custo XLM | Observação |
|----------|-----------|------------|
| Ativação base da conta | 1.0 XLM | Base reserve (pode mudar com protocolo Stellar) |
| Trustline USDC | 0.5 XLM | 1 entry reserve |
| Trustline BRZ | 0.5 XLM | 1 entry reserve |
| Trustline TESOURO | 0.5 XLM | 1 entry reserve |
| **Total por usuário** | **~2.5 XLM** | **Subsidiado pela WalletNow** |

### Projeção de Funding (Treasury)
| Usuários | XLM necessário | Custo aprox. (XLM = R$1,50) |
|----------|---------------|------------------------------|
| 100 | 250 XLM | R$ 375 |
| 1.000 | 2.500 XLM | R$ 3.750 |
| 10.000 | 25.000 XLM | R$ 37.500 |

---

## Fee Collector — Modelo de 0,49%

```
Fluxo de Fee:
1. Usuário solicita depósito de R$100 (TESOURO)
2. WalletNow cobra 0,49% = R$0,49
3. O saldo líquido do usuário = R$99,51 em TESOURO
4. A fee de 0,49% é convertida e coletada em XLM na Fee Collector Wallet

TODO [FASE 1]: Implementar a coleta real de fee nas transações
TODO [FASE 2]: Dashboard de fees coletadas e sweep para treasury
```

---

## Checklist de Key Management para Go-Live

- `[ ]` Gerar novos keypairs para mainnet (nunca reusar testnet)
- `[ ]` Armazenar issuer secret APENAS no Supabase Vault
- `[ ]` Verificar que nenhum `.env` com secret real está no repositório
- `[ ]` Configurar alert se saldo da treasury cair abaixo de 1.000 XLM
- `[ ]` Documentar procedimento de rotação de chaves
- `[ ]` Testar recovery: simular perda de acesso e restaurar via procedimento documentado
- `[ ]` Configurar multisig para treasury quando saldo ultrapassar 50.000 XLM
