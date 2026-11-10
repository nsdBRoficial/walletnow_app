<!-- @module docs\mainnet\PROD_INFRA_PLAN.md | WalletNow Protocol - Documentação e especificações de engenharia -->

# WalletNow — Infrastructure Plan (Vercel + Supabase)

**Versão:** 1.0 | **Data:** 2026-05-27

---

## Arquitetura de Produção

```
                     CDN / Vercel Edge
                          │
              ┌───────────┴───────────┐
         walletnow.app          preview.walletnow.app
         (produção)              (staging)
              │                       │
    ┌─────────▼─────────┐  ┌─────────▼─────────┐
    │   Supabase PROD   │  │  Supabase HOMOLOG  │
    │   (projeto sep.)  │  │   (projeto sep.)   │
    │                   │  │                   │
    │ Auth + DB + Store │  │ Auth + DB + Store │
    │ Edge Functions    │  │ Edge Functions    │
    └────────┬──────────┘  └────────┬──────────┘
             │                      │
    ┌────────▼──────────────────────▼─────────┐
    │              APIs Externas               │
    │   Etherfuse API (prod/sandbox)           │
    │   Stellar Horizon (mainnet/testnet)      │
    │   Woovi/OpenPix (prod/sandbox)           │
    │   Gemini AI (via Edge Function)          │
    └─────────────────────────────────────────┘
```

---

## Configuração Vercel

### vercel.json (Recomendado para Produção)
```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
        { "key": "Permissions-Policy", "value": "camera=(), microphone=(), geolocation=()" },
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' fonts.googleapis.com; font-src fonts.gstatic.com; connect-src 'self' *.supabase.co *.etherfuse.com *.woovi.com horizon.stellar.org; img-src 'self' data: blob:;"
        }
      ]
    }
  ]
}
```

### Variáveis de Ambiente Vercel (Produção)
Configurar via Vercel Dashboard → Settings → Environment Variables:
```
VITE_APP_ENV=production
VITE_STELLAR_NETWORK=mainnet
VITE_SUPABASE_URL=https://[proj-prod].supabase.co
VITE_SUPABASE_ANON_KEY=[anon-key-prod]
VITE_STELLAR_ISSUER_PUBLIC=[public-key-mainnet]
VITE_WOOVI_APP_ID=[woovi-prod-app-id]
# NÃO adicionar: VITE_STELLAR_ISSUER_SECRET (vai no Supabase Vault)
# NÃO adicionar: VITE_GEMINI_API_KEY (vai no Supabase Vault)
```

---

## Projetos Supabase Necessários

| Projeto | Uso | Região |
|---------|-----|--------|
| walletnow-dev | Desenvolvimento local | sa-east-1 (São Paulo) |
| walletnow-homolog | Staging mainnet | sa-east-1 (São Paulo) |
| walletnow-prod | Produção | sa-east-1 (São Paulo) |

**Nota:** Usar região `sa-east-1` (São Paulo) por estar no Brasil e por LGPD.

---

## Edge Functions Planejadas

| Função | Status | Responsabilidade |
|--------|--------|-----------------|
| etherfuse-proxy | ✅ Funcionando | Proxy para API Etherfuse |
| stellar-issuer | 🔴 STUB | Mint/Burn/Sponsor com issuer secret |
| kyc-validator | 🔴 Não criado | KYC via Gemini (server-side) |
| etherfuse-webhook | 🔴 Não criado | Receber notificações de pagamento PIX |

---

## Custos Estimados (Escala Inicial)

| Serviço | Plano | Custo Mensal |
|---------|-------|--------------|
| Vercel | Pro | ~$20/mês |
| Supabase Prod | Pro | ~$25/mês |
| Supabase Homolog | Free/Pro | $0-25/mês |
| Stellar Horizon | Público (SDF) | $0 |
| Etherfuse | % por transação | Variável |
| Sentry | Team | ~$26/mês |
| **Total base** | | **~$70-95/mês** |

---

## Domínios e DNS

- `walletnow.app` → Vercel (produção)
- `staging.walletnow.app` → Vercel (homolog) 
- `supabase.walletnow.app` → Não necessário (usar URL Supabase direta)
- `api.walletnow.app` → Opcional (alias para Edge Functions)

---

## Checklist de Infra

- `[ ]` Projeto Supabase de produção criado em sa-east-1
- `[ ]` Projeto Supabase de homolog criado em sa-east-1
- `[ ]` Migrations executadas em prod e homolog
- `[ ]` Edge Functions deployadas em prod e homolog
- `[ ]` Secrets configurados no Supabase Vault (prod)
- `[ ]` Vercel conectado ao repositório GitHub
- `[ ]` Preview deployments configurados para PRs
- `[ ]` Headers de segurança configurados no vercel.json
- `[ ]` Domínio customizado conectado com SSL
- `[ ]` Monitoramento uptime configurado (UptimeRobot ou similar)
