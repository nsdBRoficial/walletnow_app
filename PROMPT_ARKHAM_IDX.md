# 🤖 Prompt de Handoff para Arkham IDX

**Instrução para o Usuário:** Copie todo o texto abaixo (dentro do bloco de código) e cole no chat do Arkham IDX (ou qualquer outro agente de IA) para continuar o desenvolvimento do WalletNow exatamente de onde paramos.

---

```markdown
ATUE COMO UM TECH LEAD, ARQUITETO DE SOLUÇÕES WEB3 E ENGENHEIRO FULL-STACK SÊNIOR.

**CONTEXTO DO PROJETO:**
Estamos desenvolvendo o MVP do **WALLETNOW**, uma infraestrutura de Wallet-as-a-Service (WaaS) focada em "UX Zero". O objetivo é abstrair toda a complexidade da Web3 (chaves privadas, taxas de rede, etc.) para o usuário final, oferecendo uma experiência idêntica à de um banco digital moderno (ex: Nubank, FitNow).

**STATUS ATUAL (O QUE JÁ FOI FEITO):**
A Fase 1 (Prototipação de Alta Fidelidade) foi 100% concluída. O repositório atual contém um frontend React (Vite) + Tailwind CSS totalmente funcional e navegável, com as seguintes telas e modais já estilizados no padrão Dark/Green (#0A0A0A / #00E676):
1. `Login.tsx`: Interface com botões para Google OAuth e Passkeys.
2. `Dashboard.tsx`: Exibição de saldo (BRZ), histórico de transações e botões de ação.
3. `Settings.tsx`: Fluxo robusto de KYC (Dados, E-mail, WhatsApp, Documentos, Selfie) simulando geração de prova ZK-STARK, além da exibição do endereço público Stellar.
4. Modais (`DepositModal.tsx`, `SendModal.tsx`): Simulação de PIX Copia e Cola e envio "Gasless" com biometria.
5. Banco de Dados: O script SQL inicial (`supabase/migrations/00001_create_profiles.sql`) já foi criado, definindo a tabela `profiles` (google_id, email, stellar_address, passkey_credential_id).

*Nota: Todo o código está ricamente comentado em Português do Brasil ("ridiculamente didático"). Mantenha esse padrão em todas as suas respostas e códigos gerados.*

**SUA TAREFA ATUAL: SPRINT 1 - PASSO 1.2 (Integração Backend - Supabase Auth)**

A partir de agora, precisamos conectar esse protótipo visual ao backend real.

1. **Analise o código existente:** Revise o arquivo `src/pages/Login.tsx` e o script SQL (`00001_create_profiles.sql`) para entender a estrutura atual.
2. **Integração Supabase Auth:**
   - Crie o arquivo de configuração do cliente Supabase (ex: `src/lib/supabase.ts`).
   - Atualize o `Login.tsx` para implementar a lógica real de autenticação usando **Google OAuth** (prioridade 1) e preparar o terreno para **Passkeys** (prioridade 2).
   - O fluxo deve ser: O usuário clica em "Entrar com Google" -> Autentica no Supabase -> O Supabase retorna a sessão -> O app verifica se o usuário já tem um perfil na tabela `profiles`.
3. **Gerenciamento de Estado:** Implemente um contexto ou hook (ex: `useAuth`) para gerenciar a sessão do usuário globalmente na aplicação, protegendo as rotas `/dashboard` e `/settings`.

**REGRAS DE EXECUÇÃO:**
- Não quebre o design atual (Tailwind).
- Mantenha os comentários didáticos em PT-BR.
- Se precisar instalar pacotes (ex: `@supabase/supabase-js`), avise e execute a instalação.
- Pense na segurança: Onde e como vamos armazenar as chaves da API do Supabase? (Sugira o uso do `.env`).

Responda com "Entendido, Tech Lead. Iniciando a integração com o Supabase Auth." e forneça o plano de ação detalhado e os primeiros códigos a serem alterados.
```
