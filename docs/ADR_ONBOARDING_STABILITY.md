# ADR: Onboarding Stability & Fail-Safe Keys

**Status:** Accepted
**Date:** 2026-05-11
**Context:** WalletNow Onboarding and Web3 Identity Generation

## 1. Contexto e Problema
A WalletNow preza por uma experiência de usuário (UX) invisível, onde a carteira Stellar é gerada e associada em plano de fundo. 
No fluxo atual, existia a possibilidade de **Persistência Parcial**:
- A Chave Pública era persistida no banco de dados (Supabase).
- Se a gravação da Chave Secreta no `localStorage` falhasse (por limite de cota, restrições do navegador, crash da aba), o Supabase não conseguiria reverter (inexistência de transações distribuídas em chamadas de borda).

Isso resultaria em um usuário possuindo um endereço Stellar na nuvem, mas sem a capacidade de assinar transações (perda irreversível de fundos no longo prazo).

## 2. Decisão Arquitetural (ADR)
Foi decidido implementar um mecanismo estrito de **Fail-Safe** e **Validação Hard** durante o Onboarding, focando em estabilidade:

### 2.1. Hard Validation de Chaves
- Nenhuma chave é persistida (nem no DB, nem no Storage) sem passar por uma validação estrita do `@stellar/stellar-sdk` (`isValidEd25519PublicKey`, `isValidEd25519SecretSeed`).
- Imposto adicionalmente a verificação manual de prefixos ('G' e 'S') para evitar a propagação de chaves malformadas no sistema.

### 2.2. Prevenção de Duplicidade (Fail-Safe na Autenticação)
Em caso de detecção de persistência parcial (Chave Pública existente no Supabase **e** Chave Secreta inexistente localmente):
- **O sistema não irá**: Regenerar a carteira automaticamente, sobrescrever a chave na nuvem ou ignorar o erro.
- **O sistema irá**: 
  1. Registrar um log estruturado `[WalletNow][Onboarding][FAIL-SAFE]`.
  2. Executar o `supabase.auth.signOut()` na mesma hora.
  3. Emitir uma exceção amigável bloqueando a renderização do Dashboard.
  4. Preservar a carteira original na nuvem para potencial intervenção/recuperação futura, evitando a fragmentação de identidades da Blockchain.

### 2.3. Logs Estruturados
Adição do padrão de logs:
`console.log("[WalletNow][Contexto] Mensagem")`.
Isso permite fácil auditoria no console do navegador e facilita exportação para o Sentry ou Datadog no futuro.

## 3. Consequências
- **Positivas:** O usuário nunca prosseguirá com uma identidade quebrada. A integridade da Blockchain no escopo da aplicação é garantida e há rastro detalhado para debug.
- **Negativas:** Se o usuário limpar o cache do navegador após a criação, ele não conseguirá logar pelo fluxo padrão, caindo na trava de segurança (exigindo fluxo de Recovery não abordado aqui).
