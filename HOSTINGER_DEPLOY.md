<!-- @module HOSTINGER_DEPLOY.md | Documentação técnica e especificação: Guia de Deploy Hostinger — WalletNow em /walletnow. -->

# Guia de Deploy Hostinger — WalletNow em `/walletnow`

**URL Alvo:** https://nsdbr.com/walletnow  
**Stack:** React 18 + Vite + React Router v6 + Supabase  
**Tipo:** SPA (Single Page Application) em subpath Apache  

---

## ✅ PRÉ-REQUISITOS

- [ ] Acesso ao painel do Hostinger (File Manager ou FTP/SFTP)
- [ ] Domínio `nsdbr.com` apontando para o servidor Hostinger
- [ ] `mod_rewrite` ativo no Apache (padrão em todos planos Hostinger)
- [ ] Build gerado localmente com `npm run build`

---

## 1. GERAR A BUILD PARA HOSTINGER

Execute localmente (sem definir `VERCEL=1`):

```bash
npm run build
```

A build usará automaticamente `base: '/walletnow/'` (default para Hostinger).

**Verificar o `dist/index.html` gerado:**  
Os assets DEVEM apontar para `/walletnow/assets/`, exemplo:
```html
<script src="/walletnow/assets/index-XXXXXXXX.js"></script>
<link href="/walletnow/assets/index-XXXXXXXX.css" rel="stylesheet">
```
Se apontar para `/assets/` sem prefixo `/walletnow/` → build foi feita com `VERCEL=1` ou `VITE_BASE_PATH=/`. **Rebuild sem essas variáveis.**

---

## 2. ESTRUTURA DE ARQUIVOS A SUBIR

Após o build, a pasta `dist/` conterá:

```
dist/
├── index.html              ← ponto de entrada da SPA
├── .htaccess               ← fallback SPA + cache + MIME types (vem do public/)
├── assets/
│   ├── index-XXXXXXXX.js   ← bundle principal (hashed)
│   ├── index-XXXXXXXX.css  ← estilos (hashed)
│   ├── vendor-react-XXXX.js
│   ├── vendor-router-XXXX.js
│   ├── vendor-stellar-XXXX.js
│   └── vendor-supabase-XXXX.js
├── logo-walletnow.svg
├── logo.png
├── pix-icon.svg
├── stellar-logo.svg
└── usdc-icon.svg
```

---

## 3. ONDE SUBIR NO HOSTINGER

### Via File Manager (Hostinger hPanel)

1. Acesse **hPanel → File Manager**
2. Navegue até `public_html/`
3. Crie a pasta `walletnow/` (se não existir)
4. **Faça upload de TODO o conteúdo de `dist/`** para dentro de `public_html/walletnow/`

A estrutura final no servidor deve ser:

```
public_html/
└── walletnow/
    ├── index.html
    ├── .htaccess          ← CRÍTICO! Garante que o arquivo seja enviado (pode ser oculto)
    ├── assets/
    │   └── ...
    └── ...
```

> ⚠️ **ATENÇÃO**: O `.htaccess` é um arquivo oculto (começa com `.`). Certifique-se de que o File Manager está mostrando arquivos ocultos antes de verificar o upload.

### Via FTP/SFTP (Filezilla ou similar)

1. Conecte-se ao servidor Hostinger via SFTP
2. Navegue até `/home/u123456789/domains/nsdbr.com/public_html/`
3. Crie/acesse a pasta `walletnow/`
4. Faça upload recursivo de todo o conteúdo de `dist/`
5. Certifique-se de que o Filezilla está configurado para mostrar arquivos ocultos

---

## 4. CONFIGURAÇÃO DO `.htaccess`

O arquivo `.htaccess` incluído no build (originado de `public/.htaccess`) já está configurado corretamente. **Não modifique** sem entender as regras.

Se o `.htaccess` não funcionar (servidor com `AllowOverride None`), entre em contato com o suporte Hostinger para habilitar `AllowOverride All` para o diretório.

---

## 5. VARIÁVEIS DE AMBIENTE NA VERCEL

Se o projeto também estiver deployado na Vercel, adicione a variável:

| Variável | Valor |
|----------|-------|
| `VITE_BASE_PATH` | `/` |

Isso garante que a build da Vercel use `/` como base path, sem depender da detecção automática de `process.env.VERCEL`.

---

## 6. VALIDAÇÃO PÓS-DEPLOY

### Checklist obrigatório após upload:

- [ ] `https://nsdbr.com/walletnow/` → Landing page carrega (sem tela branca)
- [ ] `https://nsdbr.com/walletnow/login` → Tela de login carrega
- [ ] Refresh direto em `https://nsdbr.com/walletnow/dashboard` → **não** retorna 404 (confirma que .htaccess está funcionando)
- [ ] DevTools → Network → sem erros 404 em arquivos `.js` ou `.css`
- [ ] DevTools → Console → sem erros de MIME type (`application/javascript` esperado)
- [ ] DevTools → Console → sem erros de módulo (`Failed to load module script`)

### Teste de rota com refresh (crítico para SPA):

```
1. Acesse https://nsdbr.com/walletnow/
2. Faça login
3. Navegue para /dashboard
4. Pressione F5 (refresh)
→ Deve recarregar o dashboard, NÃO mostrar 404 do Apache
```

---

## 7. TROUBLESHOOTING — WHITE SCREEN

### Causa 1: `.htaccess` não foi enviado
**Sintoma:** Refresh em `/dashboard` retorna 404 do Apache  
**Solução:** Verificar se o `.htaccess` existe em `public_html/walletnow/.htaccess`. O arquivo começa com `.` e pode não aparecer sem "mostrar arquivos ocultos".

### Causa 2: Assets apontam para caminho errado
**Sintoma:** Console mostra `GET /assets/index-XXXX.js 404`  
**Diagnóstico:** Abrir `dist/index.html` e verificar se os `src` dos scripts apontam para `/walletnow/assets/` e não apenas `/assets/`.  
**Solução:** Rebuildar sem `VERCEL=1` ou `VITE_BASE_PATH=/`.

### Causa 3: MIME type incorreto
**Sintoma:** Console mostra `Failed to load module script: Expected a JavaScript module script but the server responded with a MIME type of "text/html"`  
**Diagnóstico:** O Apache está servindo o `index.html` quando deveria servir o `.js`.  
**Solução:** Verificar se o `.htaccess` tem as regras de `RewriteCond %{REQUEST_FILENAME} -f` antes do fallback.

### Causa 4: `mod_rewrite` desabilitado
**Sintoma:** Refresh em qualquer rota retorna 404  
**Solução:** Entre em contato com suporte Hostinger para confirmar que `mod_rewrite` está ativo e `AllowOverride All` está configurado.

### Causa 5: Cache do browser/CDN
**Sintoma:** Atualização não reflete após novo deploy  
**Solução:**
```
1. Ctrl+Shift+R (hard refresh) no browser
2. DevTools → Application → Storage → Clear site data
3. Se usar CDN na Hostinger: painel → Performance → Flush cache
```

---

## 8. LIMPEZA DE CACHE APÓS DEPLOY

### No Browser (usuário):
- `Ctrl+Shift+R` — Hard refresh (ignora cache)
- DevTools → Application → Clear Storage

### No Hostinger (se usar LiteSpeed Cache ou Cloudflare):
- hPanel → Performance → Flush All Cache
- Se integrado ao Cloudflare: Cloudflare → Caching → Purge Everything

---

## 9. ESTRUTURA DE BASE PATHS — RESUMO

| Ambiente | `VITE_BASE_PATH` | Base usada | URL esperada |
|----------|-------------------|------------|--------------|
| Local dev (`npm run dev`) | não definido | `/` (vite dev padrão) | `http://localhost:5173/` |
| Vercel | `/` | `/` | `https://walletnow.vercel.app/` |
| Hostinger | não definido | `/walletnow/` | `https://nsdbr.com/walletnow/` |

---

## 10. COMO DETECTAR TELA BRANCA PROGRAMATICAMENTE

Ao abrir o DevTools (F12) em uma tela branca:

```
1. Aba Console → procurar por:
   - "Failed to load module script"      → problema de MIME
   - "Cannot GET /walletnow/dashboard"   → .htaccess não funciona
   - "Uncaught SyntaxError"             → chunk corrompido/errado
   - "net::ERR_ABORTED 404"             → asset não encontrado

2. Aba Network → filtrar por "JS" e "CSS":
   - Status 200 → OK
   - Status 404 → asset não enviado ou caminho errado
   - Status 200 com MIME text/html → .htaccess servindo index.html no lugar do .js
```

---

## 11. VERIFICAÇÃO RÁPIDA DO DEPLOY

```bash
# Verificar se o index.html está acessível:
curl -I https://nsdbr.com/walletnow/

# Verificar se o .htaccess está redirecionando corretamente:
curl -I https://nsdbr.com/walletnow/dashboard

# Verificar se assets estão com MIME correto:
curl -I https://nsdbr.com/walletnow/assets/index-XXXXXXXX.js
# → Content-Type: application/javascript ✅
# → Cache-Control: public, max-age=31536000, immutable ✅
```

---

*Gerado automaticamente pelo hardening de deploy do WalletNow — 2026-05-29*
