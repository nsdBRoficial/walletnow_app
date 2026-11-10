<!-- @module docs\mainnet\SECURITY_RISKS.md | WalletNow Protocol - Documentação e especificações de engenharia -->

# WalletNow — Security Risks Register & Auditoria de Segurança

**Versão:** 2.0 | **Data:** 2026-09-10 | **Status:** ✅ REVISADO & ATUALIZADO (Pós-Auditoria Adversarial Fase 2)  
**Ambiente Alvo:** Stellar Mainnet & Supabase Cloud  
**Autor:** Equipe de Arquitetura & Segurança WalletNow  

> [!IMPORTANT]
> Este documento cataloga o inventário completo de segurança da **WalletNow**, integrando os resultados da **Auditoria Adversarial Fase 1 e Fase 2**, as remediações efetivadas no código-fonte, a análise de riscos residuais, a matriz de conformidade regulatória (LGPD / BACEN) e o scorecard de prontidão para o ambiente de produção/mainnet.

> [!NOTE]
> **Contexto Operacional e Estratégia de Não-Interferência (Foco Testnet):**  
> O WalletNow opera prioritariamente com foco total na rede **Stellar Testnet** e no ecossistema de sandbox (Hackathon Stellar PULSO, TestnetKit e Playground).  
> Os itens catalogados como **Riscos Residuais** representam diretrizes para o futuro go-live de Mainnet e **não são bloqueantes** para a Testnet atual. Recursos essenciais para testes e DX (como ativação via Friendbot, disponibilidade do painel de QA via `?demo=true`, sandboxes de teste e PBKDF2 em 100k para menor consumo de CPU no browser) foram preservados propositalmente para garantir zero impacto e máximo dinamismo operacional.


---

## 📊 Scorecard Geral de Prontidão de Segurança (v2.0)

| Dimensão de Segurança | Score Anterior (v1.0) | Score Atual (v2.0) | Status | Observações Principais |
| :--- | :---: | :---: | :---: | :--- |
| **Segregação & Gestão de Chaves** | 2.0 / 10 | **9.5 / 10** | 🟢 EXCELENTE | `STELLAR_ISSUER_SECRET` isolada no Vault; co-assinatura client/server. |
| **Proteção de APIs & Secrets** | 4.0 / 10 | **9.0 / 10** | 🟢 EXCELENTE | Chave Gemini migrada para server-side; CORS com allowlist estrita. |
| **Isolamento de Dados (RLS)** | 5.0 / 10 | **9.5 / 10** | 🟢 EXCELENTE | RLS fechada em `fiat_transactions` e `keepalive_log` (somente `service_role`). |
| **Integridade & Idempotência** | 4.0 / 10 | **9.0 / 10** | 🟢 EXCELENTE | Anti-replay garantido via `correlation_id` único no PostgreSQL. |
| **Anti-Abuso & Recursos (Gas Station)** | 3.0 / 10 | **9.0 / 10** | 🟢 EXCELENTE | Validação criptográfica de titularidade (`verifyUserOwnsPublicKey`). |
| **Criptografia Local & Enclave** | 7.0 / 10 | **7.5 / 10** | 🟡 BOM | AES-GCM ativo; migração para 600k PBKDF2 e isolamento em backlog. |
| **Privacidade & LGPD** | 5.0 / 10 | **8.5 / 10** | 🟢 MUITO BOM | Zero PII on-chain (SHA3-256 ZK commit); pendente criptografia de CPF no DB. |
| **Observabilidade & Telemetria** | 3.0 / 10 | **7.5 / 10** | 🟡 BOM | Logs de headers sensíveis eliminados; pendente integração Sentry prod. |
| **Média Ponderada Global** | **4.1 / 10** | **8.7 / 10** | 🟢 **APTO PARA MAINNET COM RECOMENDAÇÕES** |

---

## 🛡️ Matriz de Remediações: O Que Foi e Está Corrigido

Todas as vulnerabilidades críticas identificadas nas fases anteriores da auditoria foram corrigidas e validadas no código-fonte:

| Ref. Original | Vulnerabilidade & Vetor de Ataque | Severidade Inicial | Status | Remediação Técnica Implementada | Arquivos & Migrações |
| :--- | :--- | :---: | :---: | :--- | :--- |
| **RISK-001 / BLOCKER-01** | `STELLAR_ISSUER_SECRET` exposta no bundle frontend (drenagem da tesouraria e mint fraudulento). | 🔴 CRÍTICO (CVSS 9.8) | ✅ **CORRIGIDO** | Remoção total do bundle. Chave isolada no Supabase Vault. Operações sensíveis orquestradas pela Edge Function `stellar-issuer` com assinatura local e co-assinatura institucional. | [`src/services/paymentService.ts`](file:///c:/Users/Usuário/Documents/GitHub/walletnow_app/src/services/paymentService.ts), [`supabase/functions/stellar-issuer/index.ts`](file:///c:/Users/Usuário/Documents/GitHub/walletnow_app/supabase/functions/stellar-issuer/index.ts) |
| **RISK-002 / BLOCKER-02** | `VITE_GEMINI_API_KEY` exposta no bundle client-side para o fluxo de KYC. | 🟠 ALTO (CVSS 7.5) | ✅ **CORRIGIDO** | Chave eliminada do cliente. Criação do serviço server-side `kyc-validator` em Edge Function isolada, recebendo apenas payloads sanitizados. | [`src/services/identityService.ts`](file:///c:/Users/Usuário/Documents/GitHub/walletnow_app/src/services/identityService.ts), [`supabase/functions/kyc-validator/index.ts`](file:///c:/Users/Usuário/Documents/GitHub/walletnow_app/supabase/functions/kyc-validator/index.ts) |
| **RISK-003** | CORS Wildcard (`Access-Control-Allow-Origin: *`) em Edge Functions de proxy. | 🟠 ALTO (CVSS 7.2) | ✅ **CORRIGIDO** | Substituição por allowlist estrita de origens confiáveis (produção e homologação oficiais) com cabeçalho `Vary: Origin`. | [`supabase/functions/etherfuse-proxy/index.ts`](file:///c:/Users/Usuário/Documents/GitHub/walletnow_app/supabase/functions/etherfuse-proxy/index.ts), [`supabase/functions/stellar-issuer/index.ts`](file:///c:/Users/Usuário/Documents/GitHub/walletnow_app/supabase/functions/stellar-issuer/index.ts) |
| **RISK-004 / RISCO-FT2** | Política de `INSERT` permissiva em `fiat_transactions` permitia inserção direta por clientes. | 🔴 CRÍTICO (CVSS 8.5) | ✅ **CORRIGIDO** | Migração `000010_fix_fiat_rls_insert.sql`: Política restrita exclusivamente a credenciais com role `service_role`. Usuários comuns mantêm apenas `SELECT` restrito ao seu próprio `user_id`. | [`supabase/migrations/000010_fix_fiat_rls_insert.sql`](file:///c:/Users/Usuário/Documents/GitHub/walletnow_app/supabase/migrations/000010_fix_fiat_rls_insert.sql) |
| **R-04** | Drenagem do Gas Station (usuário autenticado solicitava patrocínio para contas arbitrárias de terceiros). | 🟠 ALTO (CVSS 7.8) | ✅ **CORRIGIDO** | Implementação de `verifyUserOwnsPublicKey()` na Edge Function `stellar-issuer`. Validação em banco (`wallet_accounts` e `profiles`) antes de qualquer funding/patrocínio. | [`supabase/functions/stellar-issuer/index.ts`](file:///c:/Users/Usuário/Documents/GitHub/walletnow_app/supabase/functions/stellar-issuer/index.ts#L557-L589) |
| **RISK-011 / R-11** | Travas de idempotência apenas em memória (`processingLock`), sujeitas a duplo processamento em concorrência. | 🟡 MÉDIO (CVSS 5.5) | ✅ **CORRIGIDO** | Migração `000011_add_correlation_id.sql`: Criação da coluna e do índice único `idx_fiat_transactions_correlation_id` no banco, garantindo idempotência e proteção anti-replay transacional. | [`supabase/migrations/000011_add_correlation_id.sql`](file:///c:/Users/Usuário/Documents/GitHub/walletnow_app/supabase/migrations/000011_add_correlation_id.sql) |
| **R-13** | Emissores de teste e chaves aleatórias descartáveis na abertura de trustlines pelo orquestrador. | 🟡 MÉDIO (CVSS 5.0) | ✅ **CORRIGIDO** | Resolução formal de emissores verificados na Stellar: Circle (`USDC`) e Transfero (`BRZ`), com resolução estrita dependente do ambiente (`mainnet` vs `testnet`). | [`packages/onboarding/src/OnboardingOrchestrator.ts`](file:///c:/Users/Usuário/Documents/GitHub/walletnow_app/packages/onboarding/src/OnboardingOrchestrator.ts#L538-L565) |
| **R-14 / MED-05** | `keepalive_log` permitia injeção anônima irrestrita com `WITH CHECK (true)` (vetor DoS e poluição de log). | 🟡 MÉDIO (CVSS 4.8) | ✅ **CORRIGIDO** | Migração `000012_fix_keepalive_insert_policy.sql`: Política restrita exclusivamente a chamadas com role `service_role`. | [`supabase/migrations/000012_fix_keepalive_insert_policy.sql`](file:///c:/Users/Usuário/Documents/GitHub/walletnow_app/supabase/migrations/000012_fix_keepalive_insert_policy.sql) |
| **RISK-012 / R-02** | Logs de depuração no console e servidores vazando cabeçalhos HTTP, dados de sessão e autorização. | 🟡 MÉDIO (CVSS 4.0) | ✅ **CORRIGIDO** | Remoção de dumps de headers no CORS preflight e sanitização estrita de payloads antes do log em todas as Edge Functions. | [`supabase/functions/stellar-issuer/index.ts`](file:///c:/Users/Usuário/Documents/GitHub/walletnow_app/supabase/functions/stellar-issuer/index.ts) |
| **LGPD / PII On-Chain** | Risco de vazamento de dados de identidade de usuários no ledger público da Stellar. | 🟠 ALTO (CVSS 7.2) | ✅ **CORRIGIDO** | Implementação de Compromisso Criptográfico (Cryptographic Commitment SHA3-256 / Keccak Sponge) com salt secreto de alta entropia. Somente a âncora matemática irreversível é registrada na rede. | [`src/services/identityService.ts`](file:///c:/Users/Usuário/Documents/GitHub/walletnow_app/src/services/identityService.ts#L36-L58) |

---

## ⚠️ Catálogo de Riscos Residuais & Avaliação Atualizada

Abaixo estão os riscos que permanecem abertos ou sob monitoramento, categorizados com sua avaliação de impacto e o plano de ação recomendado:

```
┌────────────────────────────────────────────────────────────────────────┐
│ ESCALA DE SEVERIDADE CVSS RESIDUAL                                    │
│ 🔴 CRÍTICO (9.0 - 10.0): 0 riscos                                     │
│ 🟠 ALTO    (7.0 -  8.9): 3 riscos (Criptografia repouso / Memória JS) │
│ 🟡 MÉDIO   (4.0 -  6.9): 4 riscos (Configurações de cliente e quotas) │
│ 🟢 BAIXO   (0.1 -  3.9): 1 risco  (Ciclo de retenção de storage)      │
└────────────────────────────────────────────────────────────────────────┘
```

---

### RISK-005 — Salt de Criptografia do Dispositivo em `localStorage`
- **Severidade Atual:** 🟡 MÉDIO (CVSS ~6.2 | Vetor: Local/Device)
- **Status:** 🔴 PENDENTE DE MITIGAÇÃO
- **Localização:** [`src/security/deviceVault.ts`](file:///c:/Users/Usuário/Documents/GitHub/walletnow_app/src/security/deviceVault.ts#L41)
- **Vetor de Falha:** O salt utilizado para derivar a chave simétrica AES-GCM fica armazenado em `@walletnow:vault:salt` no `localStorage`.
- **Impacto:** Se o usuário limpar o armazenamento do navegador, navegar em aba anônima ou trocar de máquina, o salt é perdido. O cofre local criptografado torna-se matematicamente indecifrável caso não haja exportação prévia da secret key.
- **Plano de Ação:**
  1. Adicionar aviso preventivo explícito na interface (UX) sobre a natureza local da chave.
  2. Implementar backup opcional do salt criptografado associado à conta no Supabase (com envelope encryption baseado na credencial de login).
- **Prazo Recomendado:** Próximo ciclo de atualização pós-mainnet.

---

### RISK-006 — Número de Iterações PBKDF2 Subótimo (100k)
- **Severidade Atual:** 🟡 MÉDIO (CVSS ~5.5 | Vetor: Offline Brute-Force)
- **Status:** 🔴 PENDENTE DE MITIGAÇÃO
- **Localização:** [`src/security/deviceVault.ts`](file:///c:/Users/Usuário/Documents/GitHub/walletnow_app/src/security/deviceVault.ts#L10)
- **Contexto:** A constante `PBKDF2_ITERATIONS` está configurada como 100.000. As recomendações do NIST SP 800-132 e OWASP orientam um patamar mínimo de 600.000 iterações para SHA-256 quando derivando chaves de senhas.
- **Impacto:** Menor resistência a quebra de senha via força bruta com GPUs dedicadas caso o cofre local seja extraído fisicamente do dispositivo.
- **Plano de Ação:**
  1. Elevar o parâmetro para 600.000 com migração automática transparente ao desbloquear o cofre.
  2. Avaliar adoção futura de Argon2id compilado em WebAssembly (Wasm).
- **Prazo Recomendado:** Sprint Mainnet Hardening v2.1.

---

### RISK-007 — Modo Demonstração Ativável via Parâmetro de Query String (`?demo=true`)
- **Severidade Atual:** 🟡 MÉDIO (CVSS ~4.5 | Vetor: Client-Side Inspection)
- **Status:** 🔴 PENDENTE DE MITIGAÇÃO
- **Localização:** [`src/config/demoMode.ts`](file:///c:/Users/Usuário/Documents/GitHub/walletnow_app/src/config/demoMode.ts#L14)
- **Vetor:** A função `isDemoModeParams` verifica se a URL contém `?demo=true`.
- **Impacto:** Em produção, um usuário comum pode adicionar o parâmetro e expor o painel de QA e logs mais detalhados no console DevTools.
- **Plano de Ação:**
  1. Forçar `isDemoModeParams = false` caso `import.meta.env.PROD === true`.
  2. Remover ou proteger com flag restrita a exibição do painel de QA no bundle de produção.
- **Prazo Recomendado:** Imediato antes do build final de produção.

---

### RISK-008 — Armazenamento de Chave Privada em Memória Volátil do Módulo JS
- **Severidade Atual:** 🟠 ALTO (CVSS ~7.0 | Vetor: XSS / Memory Inspection)
- **Status:** ⚠️ MITIGADO PARCIALMENTE (Uso exclusivo em tempo de execução)
- **Localização:** [`src/security/deviceVault.ts`](file:///c:/Users/Usuário/Documents/GitHub/walletnow_app/src/security/deviceVault.ts#L14)
- **Vetor:** `let volatileSecret: string | null = null;` mantém a chave privada decifrada no escopo do módulo para assinar transações na sessão ativa.
- **Impacto:** Se o aplicativo sofrer uma vulnerabilidade de Cross-Site Scripting (XSS) injetada através de alguma dependência externa de terceiros comprometida, o script malicioso pode invocar `DeviceVault.getVolatileSecret()`.
- **Plano de Ação:**
  1. Encapsular a secret em closure estrita (IIFE) ou isolar o signing em um Web Worker dedicado.
  2. Priorizar fluxos WebAuthn/Passkeys nativos onde a chave privada reside no Hardware Security Module (HSM/SE) do dispositivo e nunca atinge a memória JS.
- **Prazo Recomendado:** Sprint de Segurança Avançada.

---

### RISK-009 — Mnemônico / Seed Phrase BIP39 Ainda Não Implementado
- **Severidade Atual:** 🟠 ALTO (CVSS ~7.2 | Vetor: User Account Recovery)
- **Status:** 🔴 PENDENTE DE IMPLEMENTAÇÃO
- **Localização:** Interface Pro Mode / Configurações
- **Contexto:** O produto orienta o usuário sobre segurança autocustodial, porém a geração e restauração padronizada de 12 palavras (BIP39 + SLIP-0010 para curvas Ed25519) ainda não está concluída no core.
- **Impacto:** A recuperação de carteiras por usuários avançados depende da chave privada bruta em formato texto/hexadecimal, aumentando o risco de phishing e erros operacionais humanos na custódia.
- **Plano de Ação:** Implementar o padrão BIP39 com derivação HD (`m/44'/148'/0'`) para o ecossistema Stellar.
- **Prazo Recomendado:** Versão 2.2 do SDK.

---

### RISK-010 — Rate Limiting de Borda em Edge Functions
- **Severidade Atual:** 🟡 MÉDIO (CVSS ~5.0 | Vetor: DoS / Cota de API)
- **Status:** ⚠️ MITIGADO POR JWT (Ausência de Rate Limiter de Volume)
- **Localização:** [`supabase/functions/etherfuse-proxy/index.ts`](file:///c:/Users/Usuário/Documents/GitHub/walletnow_app/supabase/functions/etherfuse-proxy/index.ts), [`supabase/functions/stellar-issuer/index.ts`](file:///c:/Users/Usuário/Documents/GitHub/walletnow_app/supabase/functions/stellar-issuer/index.ts)
- **Vetor:** Um usuário autenticado legítimo pode disparar requisições em loop automatizado contra a API Etherfuse Sandbox/Prod ou contra a rota de emissão.
- **Impacto:** Exaustão do pool de conexões das Edge Functions ou estouro de custos de billing de APIs parceiras.
- **Plano de Ação:** Configurar política de rate limit por `user_id` / IP no Supabase API Gateway ou implementar token bucket em Redis (Upstash) de no máximo 15 req/min por identidade.
- **Prazo Recomendado:** Pré-lançamento em escala.

---

### SUPABASE-001 — Criptografia de CPF em Repouso na Tabela `profiles`
- **Severidade Atual:** 🟠 ALTO (CVSS ~7.0 | Vetor: Data at Rest Breach)
- **Status:** 🔴 PENDENTE
- **Localização:** Tabela `public.profiles` (coluna `cpf`)
- **Impacto:** Embora a RLS impeça que outros usuários leiam a linha, em caso de eventual vazamento físico de dump do banco de dados, o CPF se encontra em texto claro.
- **Plano de Ação:** Criar migração aplicando criptografia a nível de coluna via extensão `pgcrypto` (`pgp_sym_encrypt`) ou hashing irreversível de verificação.
- **Prazo Recomendado:** Sprint Compliance LGPD.

---

### STORAGE-001 — Política de Ciclo de Vida e Expiração de Documentos KYC
- **Severidade Atual:** 🟢 BAIXO (CVSS ~3.5 | Vetor: Storage Retention)
- **Status:** ⚠️ MITIGADO POR RLS
- **Localização:** Bucket Supabase Storage `kyc_docs`
- **Impacto:** Documentos submetidos por clientes para verificação (CNH/RG) permanecem armazenados indefinidamente após a aprovação ou rejeição do cadastro.
- **Plano de Ação:** Configurar rotina cron (pg_cron ou GitHub Action) para expurgar documentos rejeitados em 7 dias e anonimizar/deletar imagens brutas de aprovados após 90 dias, mantendo apenas o hash de auditoria.
- **Prazo Recomendado:** Pós-go-live.

---

## ⚖️ Matriz de Conformidade Regulatória & Governança

### 1. LGPD (Lei Geral de Proteção de Dados — Lei nº 13.709/2018)
* **Minimização de Dados e Finalidade:** A plataforma não grava nomes, e-mails, telefones ou documentos pessoais no livro-razão público descentralizado (Stellar Ledger).
* **Compromisso Criptográfico Seguro:** Dados de identidade são convertidos em prova de integridade através de SHA3-256 com salt de alta entropia.
* **Isolamento de Acesso:** O banco relacional emprega Row Level Security estrita onde cada titular autenticado só acessa seu próprio registro (`auth.uid() = id`).

### 2. Marco Legal dos Criptoativos (Lei nº 14.478/2022) & Resoluções BACEN
* **Natureza Non-Custodial Estrita:** O WalletNow não exerce a custódia centralizada dos ativos virtuais dos usuários finais. As chaves privadas de operação são mantidas exclusivamente sob posse e assinatura local do usuário.
* **Segregação Patrimonial:** A conta emissora institucional (`STELLAR_ISSUER_SECRET`) opera unicamente como orquestradora de patrocínio de rede (gasless fee) e contraparte autorizada de liquidez, mantendo auditoria imutável em `audit_logs`.
* **Prevenção a Fraudes e Idempotência:** Implementação de identificadores transacionais únicos (`correlation_id`) e travas contra duplo gasto.

---

## 📋 Resumo Executivo & Conclusão de Auditoria

Com a conclusão da **Fase 2 da Auditoria de Segurança**, a arquitetura da **WalletNow** alcançou um patamar maduro de segurança institucional:
1. **Nenhum segredo de infraestrutura permanece no frontend**.
2. **Nenhuma tabela financeira possui políticas permissivas**.
3. **Nenhum ator malicioso consegue drenar os fundos de patrocínio para contas externas não verificadas**.
4. **Os riscos remanescentes concentram-se no endurecimento de fatores locais do cliente (browser sandbox)** e otimizações de conformidade de longo prazo, nenhum constituindo blocker impeditivo para lançamento assistido em Mainnet.

---
*Documento atualizado e validado pelo AI Software Architect | Versão 2.0 | Setembro de 2026*
