<!-- @module docs\mainnet\PRIORITY_TASKS.md | WalletNow Protocol - Documentação e especificações de engenharia -->

# WalletNow — Priority Tasks & Planejamento de Sprints

**Versão:** 2.0 | **Data:** 2026-09-10 | **Foco Primário:** 🚀 **Stellar Testnet & Hackathon PULSO**  
**Diretriz Arquitetural:** Zero regressão e estabilidade total no ambiente de testes/sandbox.  

> [!IMPORTANT]
> **Diretriz de Execução (Foco Testnet):**  
> O produto opera atualmente com **foco total no ecossistema Testnet** (Stellar Horizon Testnet, Friendbot, Sandboxes Woovi e Etherfuse). Todas as tarefas planejadas devem garantir a preservação estrita das funcionalidades que já estão ativas e funcionando, sem introduzir bloqueios prematuros de produção que afetem a experiência de demonstração (DX) e avaliação do Hackathon.

---

## 📊 Status Consolidado das Sprints

```
┌────────────────────────────────────────────────────────────────────────┐
│ SPRINT 1 (Segurança Crítica & Remediações): 100% CONCLUÍDA ✅          │
│ SPRINT ATUAL (Testnet Excellence & Estabilidade): 100% OPERACIONAL 🟢   │
│ SPRINTS FUTURAS (Endurecimento & Transição Mainnet): DESACOPLADAS ⏳   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## ✅ Sprint 1: Remediações de Segurança Fundacional (CONCLUÍDA)

Objetivo: Eliminar blockers de segurança em banco e chaves institucionais sem impactar a operação do frontend.

| ID | Tarefa | Status | Remediação Aplicada | Impacto no Produto Atual |
| :--- | :--- | :---: | :--- | :--- |
| **TASK-001** | Segregação de Chave Institucional (`STELLAR_ISSUER_SECRET`) | ✅ **CONCLUÍDO** | Removida do bundle frontend; isolada no Supabase Vault e operada via Edge Function `stellar-issuer`. | **Zero impacto**: Suporta co-assinatura cliente/servidor transparente. |
| **TASK-002** | Segregação da Gemini API Key (`VITE_GEMINI_API_KEY`) | ✅ **CONCLUÍDO** | Removida do cliente; migrada para a Edge Function `kyc-validator`. | **Zero impacto**: Fluxo de KYC via IA continua idêntico na UI. |
| **TASK-003** | RLS em `fiat_transactions` (RISCO-FT2) | ✅ **CONCLUÍDO** | Migração `000010_fix_fiat_rls_insert.sql` (inserção restrita a `service_role`). | **Zero impacto**: Webhooks e Edge Functions autorizados; leituras próprias mantidas. |
| **TASK-004** | Idempotência e Anti-Replay em Transações | ✅ **CONCLUÍDO** | Migração `000011_add_correlation_id.sql` com índice único parcial no PostgreSQL. | **Zero impacto**: Retries automáticos não geram duplicações. |
| **TASK-005** | RLS em `keepalive_log` (MED-05) | ✅ **CONCLUÍDO** | Migração `000012_fix_keepalive_insert_policy.sql` (escrita restrita a `service_role`). | **Zero impacto**: Heartbeat anti-hibernação opera normalmente. |
| **TASK-006** | Anti-Drenagem do Gas Station (R-04) | ✅ **CONCLUÍDO** | Função `verifyUserOwnsPublicKey()` na Edge Function `stellar-issuer`. | **Zero impacto**: Usuário autenticado subsidia suas próprias carteiras normalmente. |

---

## 🟢 Sprint Atual: Testnet Excellence & Developer Experience (ATIVA)

Objetivo: Maximizar a estabilidade, performance e usabilidade na **Stellar Testnet**, assegurando que os recursos de QA e testes locais permaneçam ágeis e sem atrito.

### Diretrizes Ativas (Manter Funcionando):
1. **Preservação do Friendbot**: Funding automático com 1 clique para novas contas na Testnet (`StellarNetwork.getFriendbotUrl()`).
2. **Preservação do Modo Demonstração (`?demo=true`)**: O parâmetro de query string permanece ativo para permitir testes com o Painel de QA, inspeção de latência simulada e validação de mock payments.
3. **Preservação de Sandboxes de Pagamento**:
   - Woovi Sandbox (Pix Dinâmico com simulação de webhook).
   - Etherfuse Sandbox (`api.sand.etherfuse.com` para on/off-ramp de RWA `TESOURO`).
4. **Desempenho no Browser**:
   - Manutenção de PBKDF2 em 100k iterações para garantir login rápido e responsivo durante as sessões de demonstração e testes contínuos.

### Tarefas da Sprint Testnet:
- `[x]` Testes automatizados passando 100% (57/57 testes no Vitest cobrindo fluxos de onboarding, pagamentos, criptografia e SEP-10/SEP-24).
- `[x]` Painel de AI Agents e MCP tools para Stellar Horizon e contratos Soroban.
- `[x]` Documentação técnica atualizada (`README.md`, `SECURITY.md`, `docs/mainnet/SECURITY_RISKS.md`).
- `[ ]` Refinamento contínuo dos logs de diagnóstico no Testnet Playground.
- `[ ]` Monitoramento do workflow de keepalive do Supabase para prevenção de hibernação.

---

## ⏳ Sprints Futuras: Transição e Endurecimento para Mainnet (DESACOPLADAS)

> [!NOTE]
> Estas tarefas pertencem à fase futura de preparação para Mainnet. Elas **NÃO** são requisitos para a fase atual e **NÃO** devem ser aplicadas de forma a restringir ou quebrar o fluxo da Testnet.

### Sprint Mainnet-A (Polimento de Criptografia & Cliente) — Futuro
- **TASK-M01 — Migração Silenciosa de PBKDF2 para 600k**:
  - *Condição:* Aplicar apenas quando houver migração de cofre em release candidata de produção.
- **TASK-M02 — Restrição Condicional de Demo Mode**:
  - *Condição:* Desativar `?demo=true` apenas quando `VITE_STELLAR_NETWORK === 'mainnet' && import.meta.env.PROD`.
  - *Garantia:* Em ambiente `testnet`, o modo demo continuará 100% funcional.
- **TASK-M03 — Mnemônico BIP39 Completo**:
  - Implementação de exportação/importação de 12 palavras para autocustódia avançada.

### Sprint Mainnet-B (Infraestrutura de Escala & Compliance) — Futuro
- **TASK-M04 — Criptografia de CPF em Repouso**:
  - Aplicação de `pgcrypto` na tabela `profiles` do Supabase.
- **TASK-M05 — Rate Limiting Volumétrico de Borda**:
  - Rate limiting por IP/token no Supabase API Gateway.
- **TASK-M06 — Política de Retenção de Documentos KYC**:
  - Expurgar documentos rejeitados após 7 dias e imagens aprovadas após 90 dias.

---

## 🎯 Critérios de Sucesso da Estratégia Atual

1. **Zero Impacto**: Nenhuma alteração pode quebrar fluxos já estabelecidos na Testnet.
2. **Alta DX**: Avaliadores, desenvolvedores e usuários de teste conseguem navegar, provisionar carteiras e testar transações sem barreiras.
3. **Segurança do Backend Garantida**: O backend já está blindado (Supabase Vault e RLS ativas), permitindo que a Testnet opere com segurança máxima sem comprometer recursos institucionais.
