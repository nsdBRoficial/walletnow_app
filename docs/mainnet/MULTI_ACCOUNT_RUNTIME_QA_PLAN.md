<!-- @module docs/mainnet/MULTI_ACCOUNT_RUNTIME_QA_PLAN.md | Documentação técnica e especificação: Multi-Account Runtime QA Plan. -->

# Multi-Account Runtime QA Plan
**Data:** 28 de Maio de 2026
**Fase Atual:** Congelamento Arquitetural & Validação Runtime
**Objetivo:** Homologação humana profunda focada em isolamento de estado, race conditions e integridade transacional antes do cutover definitivo para a nova arquitetura (remoção do `stellar_address` de `profiles`).

---

## 1. Comportamento Runtime e Troca Dinâmica (Active Account Switching)
**Foco:** Garantir que o estado global reage instantaneamente sem manter "lixo" na memória (stale state) ao alternar de conta.

- [ ] **Troca de Conta Básica:** Abrir o `AccountSwitcher`, mudar de "Main Account" para "Minha Conta Importada".
  - **Critério de Sucesso:** A UI atualiza imediatamente o ícone/label. O `localStorage` (`@walletnow:active_account:{user_id}`) reflete o novo ID.
- [ ] **Sincronização Pós-Troca:** Após a troca, verificar os Balanços (Dashboard).
  - **Critério de Sucesso:** Os saldos (XLM, BRW, etc.) exibem exatamente os valores da conta ativa atual. Nenhuma piscada de saldo da conta anterior.
- [ ] **Troca Rápida (Spamming):** Clicar alternadamente entre 3 contas em menos de 2 segundos.
  - **Critério de Sucesso:** A interface não quebra. O estado final reflete com precisão a última conta clicada. As chamadas do banco/RPC pendentes não sobrescrevem a conta mais recente.

## 2. Isolamento Transacional (Transaction Isolation)
**Foco:** Garantir que uma transação utilize estritamente a chave da `activeAccount` corrente.

- [ ] **Assinatura (Send/Withdraw):** Iniciar um envio de BRW/XLM (SendModal). Deixar o modal aberto. Em *outra janela*, trocar de conta. Voltar ao modal original e confirmar o envio.
  - **Critério de Sucesso:** A transação **deve falhar** (Erro de Sequence Number ou Secret Key mismatch) ou respeitar estritamente a conta nova, prevenindo envio de fundos usando a chave da conta A numa transação originada na conta B.
- [ ] **Depósito (Receive):** Abrir o modal de receber (QR Code / Endereço).
  - **Critério de Sucesso:** O endereço exibido deve pertencer à `activeAccount`. Trocar de conta no meio deve atualizar o endereço em tempo real.
- [ ] **Trustlines Automáticas:** Provisionar/Importar uma conta zerada e tentar interagir com um RWA (ex: CETES).
  - **Critério de Sucesso:** A tentativa de Trustline deve submeter a assinatura com o `DeviceVault` da nova conta ativa, não a conta legada.

## 3. Consistência Realtime e Múltiplas Abas (Realtime Consistency)
**Foco:** Validação de LocalStorage e Supabase subscriptions em cenários assíncronos.

- [ ] **Abas Paralelas (Cross-Tab Sync):** Abrir duas abas do WalletNow. Mudar a conta na Aba 1.
  - **Critério de Sucesso:** A Aba 2 não precisa reagir sozinha em tempo real (caso não haja listener), mas ao dar F5 (Refresh) na Aba 2, ela **deve** inicializar na nova conta ativa selecionada pela Aba 1.
- [ ] **Persistência de Refresh (F5):** Trocar para uma conta secundária, navegar para Configurações, dar F5.
  - **Critério de Sucesso:** A conta secundária permanece como `activeAccount`.
- [ ] **Listeners de Histórico:** Realizar um PIX (Send) na conta A. Trocar para conta B.
  - **Critério de Sucesso:** O novo pagamento (se via webhook/SSE) não deve pingar ou atualizar a lista de transações da conta B.

## 4. Race Conditions e Async Requests
**Foco:** Testar as requisições em background durante a troca de conta.

- [ ] **Horizon Fetch Intersection:** Logar na plataforma. Imediatamente após a UI renderizar (durante o *loading* dos saldos da conta A), trocar violentamente para a conta B no dropdown.
  - **Critério de Sucesso:** Quando a requisição Horizon da conta A finalizar, ela **NÃO DEVE** atualizar o state (SetBalance) do Dashboard, pois o `activeAccount` já é o B.
- [ ] **Sponsor Activation Delay:** Adicionar uma conta nova (BIP39 vazia) que aciona o Sponsor de ativação (S...). Trocar de conta antes do delay de 2s concluir.
  - **Critério de Sucesso:** A ativação prossegue no background para a conta nova, mas a UI não embaralha.

## 5. Coexistência (Legacy, Generated, Imported)
**Foco:** Assegurar que as 3 tipologias de chaves processam decriptação corretamente sem crashar a Main Thread.

- [ ] **Conta Legacy (Usuário Antigo):**
  - **Critério de Sucesso:** O `DeviceVault` reconhece o payload antigo (chave do localStorage direta) e extrai a chave bruta, fazendo fall-back com sucesso e executando transações normais.
- [ ] **Conta Generated (BIP39):**
  - **Critério de Sucesso:** `RevealSeedModal` funciona perfeitamente sem erros.
- [ ] **Conta Imported (Secret Key):**
  - **Critério de Sucesso:** A execução on-chain funciona (descriptografia mapeada por `:publicKey`). `ExportSecretKeyModal` abre na tela de Configurações, mas `RevealSeedModal` permanece bloqueado para essa conta.

## 6. Cleanup e Memory Leaks
**Foco:** Mitigar resquícios de carteira após encerramento da sessão.

- [ ] **Logoff Cleanup:** Com a conta secundária ativa, clicar em Sair da Conta. Em seguida, logar com outro usuário OAuth/MagicLink na mesma máquina.
  - **Critério de Sucesso:** O `DeviceVault.getVolatileSecret()` deve retornar null no momento do deslogue. O novo usuário não deve ter acesso nem à conta A nem B do usuário antigo.
- [ ] **Sessão Expirada (Token Expiry):** Forçar expiração do JWT (apagando via DevTools).
  - **Critério de Sucesso:** Ao ser redirecionado para o login, a RAM volátil (onde fica a Secret Key descriptografada) deve ser limpa.

---

**Nota:** 
Execute este checklist em seu ambiente de testes rigorosamente. Só avançaremos para a "Phase 2 - Definite Refactor" (migração hard no `AuthContext` e remoção do suporte do fallback) quando você garantir que todos esses fluxos estão estáveis na versão atual.
