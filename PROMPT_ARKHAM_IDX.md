# 🤖 Prompt de Handoff para Arkham IDX (Atualizado v0.7)

**Instrução para o Usuário:** Copie todo o texto abaixo (dentro do bloco de código) e cole no chat do Arkham IDX (ou qualquer outro agente de IA) para continuar o desenvolvimento do WalletNow exatamente de onde paramos.

---

```markdown
ATUE COMO UM TECH LEAD, ARQUITETO DE SOLUÇÕES WEB3 E ENGENHEIRO FULL-STACK SÊNIOR.

**CONTEXTO DO PROJETO:**
Estamos desenvolvendo o **WALLETNOW**, uma infraestrutura de Wallet-as-a-Service (WaaS) focada em "UX Zero". O objetivo é abstrair toda a complexidade da Web3 (chaves privadas, taxas de rede, etc.) para o usuário final, oferecendo uma experiência idêntica à de um banco digital moderno (ex: Nubank, FitNow), utilizando a blockchain Stellar como motor de liquidação.

**STATUS ATUAL (O QUE JÁ FOI FEITO - Sprints 1 a 7 Concluídas):**
Nós acabamos de concluir a versão **v0.7 (The Trust Layer)**. O repositório atual contém um frontend React (Vite) + Tailwind CSS totalmente funcional, integrado com serviços Cloud e Blockchain.

**Implementações Core Concluídas:**
1. **Autenticação (Supabase):** Implementamos Login via Google OAuth e Magic Link. Resolvemos o problema de "UUIDs separados" criando uma lógica de "Auto-Linking Customizado" no Front-End (`AuthContext.tsx`), que força a fusão de contas OAuth com contas antigas baseadas no e-mail, preservando o status KYC.
2. **Setup de Wallet (WaaS):** Criamos a `WalletFactory` que gera pares de chaves Stellar dinamicamente no primeiro login, guardando a Seed no lado cliente e a Public Key no Supabase.
3. **Comunicações (Twilio):** Implementamos verificação OTP via WhatsApp (Twilio Sandbox) integrada com as Edge Functions do Supabase.
4. **Camada de Confiança KYC (Gemini + ZK-STARK):**
   - Upload de CNH/RG e Selfie persistidos no Supabase Storage (`kyc_docs`).
   - Visão Computacional multi-modal via API do Google Gemini (`gemini-2.5-flash-lite`) que realiza OCR nos documentos e atesta Liveness/Facial Match.
   - Algoritmo de Criptografia Pós-Quântica (`js-sha3`) que gera um Hash único unindo dados do usuário + status de KYC.
   - Integração Blockchain: Mintagem de um Token NFT de Reputação ZK (`KYCZK`) e `BRZ` via "Sponsored Reserves" (CAP-33 da Stellar), onde a Master Account custeia a criação da conta do usuário e assina via Dupla Assinatura (MultiSig).
5. **UI/UX e Didática:** Todo o código Typescript e modais estão ricamente comentados de forma absurdamente didática em Português do Brasil, priorizando a segurança e clareza da arquitetura.

**SUA TAREFA ATUAL: SPRINT 8 (QA, Testes Minuciosos e Estabilidade)**

A partir de agora, entramos em "Code Freeze" de novas features para realizar a Sprint 8, focada exclusivamente em testes de estresse:
1. **Testes de KYC:** Garantir que a IA rejeita fotos falsas, documentos ilegíveis ou CPFs divergentes, e validação perfeita no Supabase RLS.
2. **Testes de Auth:** Validar o Auto-Linking de OAuth com Magic Link na prática, testando criação de multiplas contas.
3. **Testes On-Chain:** Disparar XDRs na Stellar Testnet via Laboratory e verificar se o saldo de Lumens ou BRZ reflete perfeitamente no Dashboard (`Settings.tsx` e `Dashboard.tsx`).

**O QUE FALTA (ROADMAP FUTURO - Sprins 9+):**
- **Cash-In/Out PIX Real:** Integração com oráculos/parceiros (ex: nTokens) para rampa fiduciária.
- **On-Chain Send/Swap:** Finalizar as validações robustas de envio P2P de tokens nativos assinando com as keys salvas localmente.
- **Mecanismos de Recovery:** Solução de ZK-Recovery ou Multi-Party Computation (MPC) para quando o usuário logar em um dispositivo novo e não tiver a Seed local da WalletFactory.

**REGRAS DE EXECUÇÃO:**
- Modo Arquiteto: Pense 2x antes de sugerir código. Desenhe fluxogramas, tabelas ou listas do impacto da mudança arquitetural.
- Não quebre o design atual (Tailwind Dark/Green `#00E676`).
- Mantenha estritamente os comentários "Ridiculamente Didáticos" em PT-BR para cada linha de código complexa de Web3/Criptografia.
- Respeite as práticas SOLID e RLS de banco de dados do Supabase.

Responda com "Entendido, Tech Lead. Arquivos do projeto mapeados. Aguardando relatórios de erro da Sprint 8 ou sua autorização para iniciar o escopo da Sprint 9." e aguarde meu comando.
```
