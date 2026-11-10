<!-- @module docs/mainnet/INCIDENT_RESPONSE.md | Documentação técnica e especificação: WalletNow — Incident Response Playbook. -->

# WalletNow — Incident Response Playbook

**Versão:** 1.0 | **Data:** 2026-05-27

---

## Classificação de Incidentes

| Severidade | Critério | SLA Resposta | SLA Resolução |
|------------|----------|--------------|---------------|
| P0 — Crítico | Perda de fundos de usuários / chave comprometida | 15 min | 2h |
| P1 — Alto | Serviço indisponível / KYC bloqueado | 30 min | 4h |
| P2 — Médio | Degradação parcial / erro em tx específica | 2h | 24h |
| P3 — Baixo | Bug menor sem impacto financeiro | 24h | 72h |

---

## Playbook P0 — Chave Privada Comprometida

**Sintomas:** Transações não autorizadas, drenagem de treasury, mint excessivo de tokens

### Passos Imediatos (primeiros 15 minutos)
1. **Congelar operações:** Desabilitar mint/burn via feature flag no Supabase
2. **Revogar a chave comprometida:** Mudar saldo da hot wallet para nova keypair
3. **Alertar equipe:** Criar incidente no canal de emergência
4. **Preservar evidências:** Exportar logs do Supabase antes de qualquer alteração
5. **Notificar Etherfuse:** Suspender operações no parceiro

### Passos de Contenção (primeiras 2 horas)
1. Criar nova keypair mainnet segura
2. Mover todos os fundos remanescentes para nova wallet
3. Atualizar o Supabase Vault com nova secret
4. Redeployar Edge Functions com nova secret
5. Verificar se há transações fraudulentas a reverter

### Comunicação com Usuários
- Notificar usuários que fundos estão seguros
- Explicar que operações estão temporariamente suspensas
- Estimar tempo de retorno
- Não revelar detalhes técnicos da vulnerabilidade

---

## Playbook P0 — Perda de Fundos de Usuários

**Sintomas:** Reclamações de saldo incorreto, tx hash sem crédito

### Investigação
1. Verificar hash da transação no Explorer Stellar
2. Checar status da ordem no Etherfuse
3. Verificar tabela `fiat_transactions` no Supabase
4. Comparar saldo on-chain com saldo esperado

### Resolução
1. Recriar o crédito manualmente via mintagem compensatória
2. Registrar o incidente no audit_log
3. Documentar causa raiz
4. Implementar correção para prevenir recorrência

---

## Playbook P1 — Serviço Indisponível

### Checklist de Diagnóstico
- `[ ]` Vercel dashboard — status do deploy?
- `[ ]` Supabase dashboard — database online?
- `[ ]` Edge Functions respondendo?
- `[ ]` Etherfuse API status page
- `[ ]` Horizon Stellar status
- `[ ]` Woovi API status

### Rollback Rápido (Vercel)
```bash
# Via Vercel CLI
vercel rollback [deployment-url]

# Via dashboard: Deployments → selecionar versão anterior → Promote to Production
```

---

## Canais de Comunicação de Emergência

| Canal | Uso |
|-------|-----|
| Slack #incidents | Coordenação interna da equipe |
| Email suporte | Comunicação com usuários |
| Status Page (configurar) | Transparência pública |
| Etherfuse support | Problemas com on/off-ramp |
| Stellar Community | Issues com rede Stellar |

---

## Post-Mortem Template

Após cada incidente P0/P1, preencher:

```markdown
## Post-Mortem: [Título do Incidente]

**Data:** 
**Duração:** 
**Severidade:** 
**Usuários Impactados:** 

### O que aconteceu
[Descrição objetiva]

### Linha do Tempo
- HH:MM - Incidente detectado
- HH:MM - Equipe acionada
- HH:MM - Causa identificada
- HH:MM - Resolução aplicada
- HH:MM - Serviço restaurado

### Causa Raiz
[Causa técnica identificada]

### Lições Aprendidas
[O que mudaria]

### Ações Corretivas
- [ ] Ação 1 (responsável: X, prazo: Y)
- [ ] Ação 2 (responsável: X, prazo: Y)
```
