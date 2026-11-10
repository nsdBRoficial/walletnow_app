<!-- @module docs/mainnet/SECURITY_CHECKLIST.md | Documentação técnica e especificação: WalletNow — Security Checklist (Pré Go-Live Mainnet). -->

# WalletNow — Security Checklist (Pré Go-Live Mainnet)

**Versão:** 1.0 | **Data:** 2026-05-27

> [!IMPORTANT]
> Este checklist deve ser completado 100% antes de qualquer deploy em mainnet com usuários reais. Itens marcados como BLOCKER não podem ser pulados.

---

## Seção 1 — Secrets & Key Management

- `[x]` **[BLOCKER]** `VITE_STELLAR_ISSUER_SECRET` removida do bundle frontend
- `[x]` **[BLOCKER]** Issuer Secret movida para Supabase Vault (`supabase secrets set`)
- `[x]` **[BLOCKER]** Edge Function `stellar-issuer` implementada e testada
- `[x]` **[BLOCKER]** `VITE_GEMINI_API_KEY` removida do bundle frontend
- `[x]` **[BLOCKER]** Gemini Key movida para Supabase Vault
- `[x]` **[BLOCKER]** Edge Function `kyc-validator` implementada e testada
- `[x]` Nenhum arquivo `.env-prod` com secrets reais commitado no repositório
- `[x]` `.gitignore` verificado: `.env*` exceto `.env.example`, `.env-dev`, `.env-homolog`, `.env-prod` (templates)
- `[ ]` Vercel Environment Variables configuradas para produção
- `[ ]` Supabase secrets configurados para a Edge Function de produção

## Seção 2 — Rede Stellar

- `[x]` Hardcodes `horizon-testnet.stellar.org` removidos dos serviços
- `[x]` Hardcodes `Networks.TESTNET` removidos dos serviços
- `[x]` Chamadas ao Friendbot protegidas (só executam em testnet)
- `[x]` `StellarNetwork` abstraction criada e utilizada
- `[ ]` `VITE_STELLAR_NETWORK=mainnet` configurado nos envs de produção
- `[x]` Issuers mainnet configurados para USDC (Circle) e BRZ (Transfero)
- `[ ]` TESOURO identifier testado com API Etherfuse produção
- `[ ]` Fee estimation dinâmica via `/fee_stats` implementada
- `[ ]` Retry strategy com exponential backoff implementada
- `[ ]` Fallback Horizon provider configurado (ex: Lobstr)

## Seção 3 — Database & Supabase

- `[x]` RLS habilitada em todas as tabelas (`profiles`, `fiat_transactions`)
- `[x]` Policy permissiva `USING (true)` removida de `fiat_transactions`
- `[x]` Policies granulares criadas (SELECT/INSERT/UPDATE por role)
- `[x]` Audit log table criada
- `[x]` RLS auditada em todas as tabelas (migrações 000010, 000011, 000012)
- `[ ]` Storage policies auditadas (bucket `kyc-docs`)
- `[ ]` Supabase Auth: "Link Identities" habilitado (evitar contas duplicadas OAuth)
- `[ ]` Email templates customizados com branding WalletNow
- `[ ]` Rate limiting no Supabase Auth configurado
- `[ ]` Backup automático do banco configurado

## Seção 4 — Edge Functions

- `[x]` CORS wildcard `*` removido do `etherfuse-proxy`
- `[x]` CORS com allowlist de origens configurado
- `[x]` Stub `stellar-issuer` criado e documentado
- `[x]` **[BLOCKER]** `stellar-issuer` implementado e deployado
- `[x]` **[BLOCKER]** `kyc-validator` implementado e deployado
- `[ ]` Rate limiting por user_id no `etherfuse-proxy`
- `[ ]` JWT validation no `etherfuse-proxy`
- `[x]` Logging de audit para operações críticas nas Edge Functions
- `[ ]` Testes automatizados das Edge Functions

## Seção 5 — Wallet & Criptografia

- `[ ]` PBKDF2 aumentado para 600.000 iterações (migração silenciosa)
- `[ ]` Seed phrase BIP39 implementada
- `[ ]` Fluxo de revelação de 12 palavras em Config > ProMode implementado
- `[ ]` `volatileSecret` protegido contra acesso externo (closure/IIFE)
- `[ ]` Aviso de perda de acesso ao usuário quando localStorage é limpo
- `[ ]` Backup opcional do salt criptografado no Supabase

## Seção 6 — CORS & HTTP Security

- `[x]` CORS da Edge Function principal corrigido
- `[ ]` Headers de segurança no Vercel: `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`
- `[ ]` Content Security Policy (CSP) configurado no Vercel
- `[ ]` HTTPS enforçado em todos os endpoints
- `[ ]` HSTS configurado

## Seção 7 — Observabilidade

- `[ ]` Sentry configurado para erros do frontend
- `[ ]` Sentry configurado para erros das Edge Functions
- `[ ]` Logs de produção sem dados sensíveis (chaves, CPF, documentos)
- `[ ]` Alertas configurados para erros críticos (mint/burn fail)
- `[ ]` Dashboard de métricas básicas (uptime, tx success rate)
- `[ ]` `DemoConfig.verboseLogs` = false em produção
- `[ ]` `?demo=true` desabilitado em produção

## Seção 8 — CI/CD & Deploy

- `[ ]` Pipeline CI configurado (GitHub Actions ou similar)
- `[ ]` Audit de dependências npm automatizado (`npm audit`)
- `[ ]` Build de produção testado localmente
- `[ ]` Preview deployment na Vercel funcionando
- `[ ]` Rollback strategy documentado e testado
- `[ ]` Zero-downtime deployment configurado

## Seção 9 — Compliance & Legal

- `[ ]` Termos de Uso redigidos e aprovados juridicamente
- `[ ]` Política de Privacidade (LGPD) redigida
- `[ ]` Disclaimer Non-Custodial claro na UI
- `[ ]` Risk Disclosure para RWAs (TESOURO, etc.)
- `[ ]` KYC adequado para valores operados (verificar limites BACEN/COAF)
- `[ ]` Parceria formal com Etherfuse documentada
- `[ ]` Parceria com Transfero (BRZ) formalizada

## Seção 10 — Testes de Integração Mainnet

- `[ ]` Provisionamento de wallet em mainnet testado
- `[ ]` Depósito PIX → TESOURO testado end-to-end em homolog
- `[ ]` Saque TESOURO → PIX testado end-to-end em homolog
- `[ ]` KYC flow testado em produção Etherfuse
- `[ ]` Trustlines configuradas corretamente em mainnet
- `[ ]` Fee de 0,49% coletada corretamente em XLM
- `[ ]` Explorer links funcionando em mainnet

---

## Assinatura de Aprovação

| Responsável | Área | Data | Assinatura |
|-------------|------|------|------------|
| | Engenharia | | |
| | Segurança | | |
| | Produto | | |
| | Jurídico | | |

*Checklist completado: ___/38 itens | Branch: mainnet-ready-infra*
