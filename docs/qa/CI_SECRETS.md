<!-- @module docs/qa/CI_SECRETS.md | Especificação de variáveis e segredos para os workflows de CI/CD -->

# Segredos e Variáveis de CI — GitHub Actions

Os pipelines `.github/workflows/ci.yml` e `.github/workflows/onchain-nightly.yml` funcionam sem segredos obrigatórios para `lint`, `test:unit`, `test:integration` e `build` (utilizando valores de fallback seguros para compilação estática).

Para os fluxos que interagem com serviços externos (Noturno / Staging / Keepalive), configure em **Settings → Secrets and variables → Actions**:

| Secret | Uso | Obrigatório em PR? |
|---|---|---|
| `VITE_SUPABASE_URL` | Endpoint do projeto Supabase | Não (usa fallback no build de PR) |
| `VITE_SUPABASE_ANON_KEY` | Chave pública anônima do Supabase | Não (usa fallback no build de PR) |
| `SUPABASE_SERVICE_ROLE_KEY` | Usado apenas pelo workflow `supabase-keepalive.yml` | Não |
| `VITE_WOOVI_APP_ID` | AppID sandbox Woovi (apenas para homologação real) | Não |

## Proteção de Branch Recomendada (`main`)

Em **Settings → Branches → Add branch protection rule** para `main`:
1. Marcar **Require a pull request before merging**.
2. Marcar **Require status checks to pass before merging**.
3. Selecionar o check **`Lint, Test & Build`** (do workflow `WalletNow CI`).
