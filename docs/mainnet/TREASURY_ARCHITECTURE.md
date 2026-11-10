<!-- @module docs/mainnet/TREASURY_ARCHITECTURE.md | Documentação técnica e especificação: WalletNow — Treasury Architecture. -->

# WalletNow — Treasury Architecture

**Versão:** 1.0 | **Data:** 2026-05-27

---

## Modelo Financeiro

### Fee Structure
- **Fee por transação:** 0,49%
- **Moeda de coleta:** XLM
- **Aplicação:** On-ramp, off-ramp, swaps
- **Isenções:** Transferências P2P (a definir)

### Funding Inicial (Subsidiado pela WalletNow)
```
Treasury Inicial: X XLM
├── 40% → Funding de contas de usuários (ativação + trustlines)
├── 30% → Buffer operacional (sponsorships, fees de transação)
├── 20% → Reserve estratégica (emergências, rollbacks)
└── 10% → Fee wallet operacional
```

---

## Fluxo de Capital

```
DEPÓSITO (On-Ramp):
Usuário → PIX → Etherfuse → TESOURO (Stellar Mainnet)
                                  ↘
                              Fee 0,49% → XLM → Fee Collector

SAQUE (Off-Ramp):
Usuário → TESOURO → Burn → Etherfuse → PIX → Banco
               ↘
           Fee 0,49% → XLM → Fee Collector
```

---

## Monitoramento da Treasury

### Alertas Recomendados
| Condição | Ação |
|----------|------|
| Treasury < 1.000 XLM | Alert via email/Slack — reabastecer |
| Treasury < 500 XLM | Pausar onboarding de novas contas |
| Treasury < 100 XLM | Emergência — congelar operações |
| Fee collector > 10.000 XLM | Sweep para treasury cold |

---

## Evolução da Arquitetura

### Fase 1 (Atual — Hot Wallet)
- Uma única wallet cobre issuer + treasury + fee
- Simples, mas alto risco se comprometida
- OK para beta/early stage com volume baixo

### Fase 2 (Target — Multi-Wallet)
- Wallets separadas por função
- Multisig para operações de alto valor
- Sweep automático via job agendado
- Integração com Fireblocks ou similar para custody institucional

### Fase 3 (Futuro — Cold Storage)
- Treasury principal em cold wallet
- Multisig M-of-N (ex: 3 de 5 assinantes)
- HSM para operações críticas
- Segregação completa issuer/treasury/fee

---

## Requisitos de Compliance

- Registros de todas as operações por mínimo 5 anos (BACEN)
- Relatório COAF para transações suspeitas acima de R$50.000
- KYC obrigatório para usuários com volume > R$10.000/mês (verificar limites regulatórios atuais)
- Segregação de fundos: fundos de usuários NUNCA misturados com treasury operacional
