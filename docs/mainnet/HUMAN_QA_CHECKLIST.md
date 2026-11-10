<!-- @module docs\mainnet\HUMAN_QA_CHECKLIST.md | WalletNow Protocol - Documentação e especificações de engenharia -->

# WalletNow — Plano de Testes e QA Humano (UAT)

**Versão da Arquitetura:** Híbrida BIP39/Legacy | **Fase:** UAT (User Acceptance Testing)

Este documento define a malha de testes manuais, cenários de stress e os critérios de aceite rigorosos (GO/NOGO) que devem ser percorridos para declarar a WalletNow como *Mainnet-Ready* do ponto de vista de estabilidade e usabilidade.

---

## 1. Matriz de Severidade de Bugs

Qualquer anomalia descoberta durante os testes deve ser classificada de acordo com a matriz abaixo:

| Nível | Impacto no Negócio / Usuário | Ação Exigida |
| :--- | :--- | :--- |
| 🔴 **CRITICAL** | Perda de fundos, vazamento de mnemonic/secret, sobrescrita acidental de wallet, impossibilidade total de acesso à conta, travamento do onboarding. | **Blocker imediato.** Rollback ou hotfix antes de continuar os testes. |
| 🟠 **HIGH** | Falhas na UI do Pro Mode (blur falhando), erro na ativação de contas, timeout severo sem fallback, quebra do fluxo em conexões instáveis. | Correção mandatória antes do GO para Homolog/Mainnet. |
| 🟡 **MEDIUM** | Inconsistências de UI (textos não alinhados), demora excessiva em transações sem loading state adequado, glitches na cópia da seed phrase. | Deve ser corrigido na Sprint atual, mas permite testes paralelos. |
| 🟢 **LOW** | Typos, pequenos problemas de padding no mobile, cores fora da paleta (Tailwind/CSS issues), tooltips falhando. | Registrado no backlog para polimento futuro. |

---

## 2. Critérios de GO / NOGO

### GO para Homologação Pública (Beta)
- [ ] ZERO bugs `CRITICAL` abertos.
- [ ] ZERO bugs `HIGH` abertos.
- [ ] Onboarding e Recovery devem funcionar 100% das vezes sob condições ideais de rede.
- [ ] Proteções contra *wipe* acidental funcionam conforme projetado.

### GO para Mainnet
- [ ] Critérios de Homolog cumpridos.
- [ ] Migração completa das operações sensíveis (Sponsor) para Edge Functions (`TASK-001/002`).
- [ ] ZERO dependências de chaves privadas (ex: Issuer) no frontend.

---

## 3. Human QA Checklist: Plano de Testes Abrangente

Siga cada cenário abaixo passo a passo, simulando comportamentos reais. Se o comportamento observado divergir do esperado, registre o bug com vídeos/screenshots.

### 3.1. Onboarding e UX Base (Caminho Feliz)
- [ ] **Novo Login (Google):** O processo deve ser invisível. Nenhuma menção a chaves criptográficas. Conta ativada automaticamente no final.
- [ ] **Novo Login (Magic Link):** Fluxo limpo, retornando à aplicação autenticado com uma conta Stellar gerada sem atritos.
- [ ] **Presença do Pro Mode:** Acesse Configurações > Autocustódia. Deve estar visível e marcar "BIP39" ativado.

### 3.2. Cenários de Recovery (O Coração do BIP39)
- [ ] **Recovery Válido:** Use a funcionalidade de recuperar a carteira no login usando 12 palavras e garanta que o endereço gerado é **exatamente igual** ao endereço anterior associado ao seu ID.
- [ ] **Recovery Inválido (Checksum):** Digite 11 palavras ou uma palavra inexistente no dicionário BIP39. A UI deve barrar instantaneamente a submissão com uma mensagem clara ("Frase inválida").
- [ ] **Recovery Mismatch:** Insira uma *seed phrase* válida de 12 palavras, mas que pertence a *outra* carteira Stellar. A UI deve recusar o login ("Mnemonic não corresponde ao endereço desta conta").

### 3.3. Cenários de Wallet Legacy (Compatibilidade Padrão)
- [ ] **Acesso Conta Antiga:** Logar com uma conta criada *antes* da atualização BIP39.
- [ ] **Migração Silenciosa:** A carteira deve destrancar normalmente, realizar operações on-chain e os fundos devem estar intactos.
- [ ] **Bloqueio do Pro Mode:** Na tela de configurações, a seção "Autocustódia" deve apresentar a mensagem *"Sua carteira foi criada antes da atualização"* (UX Amber/Amarela), sem botão para gerar Mnemonic.

### 3.4. Cenários Mobile e Responsividade
- [ ] **RevealSeedModal no Mobile:** Garantir que o modal não quebra em telas de 320px (iPhone SE). O blur deve funcionar, e os passos devem fluir sem scroll horizontal indesejado.
- [ ] **Cópia de Seed (Clipboard):** No Mobile, os navegadores (Safari/Chrome) têm permissões estritas de clipboard. O botão "Copiar" deve funcionar ou apresentar a falha corretamente.
- [ ] **Anti-screenshot Blur:** O efeito CSS não deve apresentar glitches estranhos no iOS Safari.

### 3.5. Cenários de "Wipe" do LocalStorage (Caos Local)
- [ ] **Wipe Acidental:** Logar em uma conta BIP39 com saldo. Apagar manualmente todo o LocalStorage (F12 > Application). Tentar dar refresh (F5).
- [ ] **Bloqueio do Supabase (Fail-Safe):** A aplicação **NÃO PODE** sobrescrever a carteira no banco gerando uma nova aleatória. Ela deve bloquear o acesso informando que *"A Identidade Local não foi encontrada"* e deslogar a sessão ativa do usuário.

### 3.6. Cenários de Stress em Multi-User (Compartilhamento de Máquina)
- [ ] **Logout Hygiene:** O Usuário A loga, acessa o Pro Mode. Faz logout. O Usuário B entra em seguida *na mesma aba*.
- [ ] **Isolamento de RAM:** O Usuário B **NÃO PODE** visualizar ou acessar a seed phrase do Usuário A na aba de configurações.
- [ ] **Sobrescrita Local:** O provisionamento de chaves do Usuário B deve criar seu próprio prefixo no LocalStorage sem corromper ou deletar a chave criptografada do Usuário A, caso este queira logar de novo depois.

### 3.7. Cenários de Múltiplas Abas (Concorrência Browser)
- [ ] **Aba A desloga, Aba B ativa:** Com a WalletNow aberta em duas abas, faça logout na Aba A. Retorne à Aba B e tente solicitar a Seed Phrase no Pro Mode. A ação **deve falhar e deslogar** ou impedir a exibição, pois o `AuthContext` ouviu o evento de logout do Supabase globalmente.
- [ ] **Recuperação Dupla:** Tentar ativar a mesma conta simultaneamente em duas abas em fase de Onboarding (clique duplo/race condition simulada).

### 3.8. Cenários de Falhas de Rede (Resiliência)
- [ ] **Queda de Conexão na Criação:** Iniciar login e simular queda do WiFi na exata tela de carregamento do Onboarding. Ao retomar a conexão, a UI deve tentar de novo sem perder o cofre gerado na RAM temporária.
- [ ] **Timeout de Sponsor:** O serviço de patrocínio (Friendbot/Treasury) demora +15s para responder. O Loader não pode travar infinitamente. Deve existir um Fallback visual.

---

## 4. Instruções para o QA Humano

Durante a execução da malha de testes:
1. Abra os **Developer Tools (F12)** > Aba `Console` para monitorar Warnings do sistema de Criptografia (`[WalletNow][DeviceVault]`).
2. Abra a aba `Application` > `Local Storage` e monitore ativamente como as chaves do formato `@walletnow:secret:{ID}` e `@walletnow:mnemonic:{ID}` são geradas e alteradas. **Jamais devem aparecer em texto puro**.
3. Siga o fluxo instintivamente como se você fosse o usuário final — ignore que você sabe que é React e tente quebrar clicando rápido ou em padrões inesperados.

***
**Bom QA!** Assim que as anomalias forem documentadas, revisaremos as categorias e aplicaremos patches baseados na Matriz de Severidade.
