# Deploy na Hostinger (Subpastas ou Raiz)

Este documento descreve os passos oficiais para realizar o deploy do projeto WalletNow (Frontend React + Vite) em uma infraestrutura da Hostinger (hPanel ou FTP).

O build é totalmente compatível com subdiretórios estáticos, como `nsdbr.com/walletnow-new/`, sem quebrar as rotas e sem prejudicar o ambiente de `localhost`.

---

## 1. Configurando o Ambiente (Variáveis)

O projeto usa o Vite configurado dinamicamente para aceitar a variável `VITE_BASE_PATH`.

### Localhost (`.env.local` ou vazio)
Não é necessário definir `VITE_BASE_PATH` para o desenvolvimento local. Ele assume `/` ou `/walletnow/` (se for o default) de forma amigável.

### Hostinger Subpasta (`.env.production`)
Se você for subir na subpasta `/walletnow-new/`:
```env
VITE_BASE_PATH=/walletnow-new/
```
*(Não esqueça as barras no início e no fim).*

Se for subir no diretório raiz do domínio:
```env
VITE_BASE_PATH=/
```

---

## 2. Executando o Build

Com as variáveis configuradas, rode na sua máquina local:

```bash
npm install
npm run build
```

Isso irá gerar a pasta `dist/`. O Vite se encarregará de reescrever o caminho de todos os _assets_ (`src`, CSS, JS) para o `VITE_BASE_PATH` informado.

---

## 3. Como Subir na Hostinger (Upload)

1. Entre no seu painel da Hostinger (**hPanel**).
2. Acesse o **Gerenciador de Arquivos**.
3. Navegue até a pasta correspondente (ex: `public_html/walletnow-new/`). Se ela não existir, crie.
4. Faça o upload do **conteúdo** da pasta `dist/` (gerada no passo 2) para dentro desta pasta na Hostinger.
   *Importante: Suba o conteúdo de `dist/`, não a pasta `dist` inteira. Você deverá ver `index.html` na raiz de `/walletnow-new/`*.

---

## 4. Configuração de Roteamento (SPA) e `.htaccess`

Como o WalletNow é uma Single Page Application (SPA), o servidor precisa redirecionar o tráfego de volta para `index.html` ao acessar rotas diretas (ex: `/walletnow-new/login`).

Crie um arquivo `.htaccess` dentro da sua subpasta (`public_html/walletnow-new/.htaccess`) com o seguinte conteúdo:

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /walletnow-new/
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /walletnow-new/index.html [L]
</IfModule>
```
*(Atenção: substitua `/walletnow-new/` pelo caminho da sua subpasta caso use outro nome).*

---

## 5. Cache Busting

O Vite automaticamente gera *hashes* no final dos nomes dos arquivos JS e CSS a cada build (`index-Abc123x.js`). Isso resolve o cache do navegador.
No entanto, caso tenha atualizado imagens e elas não mudaram de nome, você pode instruir o Cloudflare ou Hostinger a limpar o cache (Purge Cache) direto no painel, se disponível.

---

## 6. Troubleshooting Comum

* **"Tela branca ao abrir" ou "Assets não carregam (Erro 404)"**
  *Causa:* O `VITE_BASE_PATH` estava errado no momento do build. O navegador está tentando buscar `index.js` em `/` em vez de `/walletnow-new/`.
  *Solução:* Garanta que `VITE_BASE_PATH=/walletnow-new/` estava no seu `.env` e rode `npm run build` novamente.

* **"Erro 404 ao atualizar a página (F5)"**
  *Causa:* O servidor (Apache) tentou buscar o arquivo da rota, mas ele não existe. 
  *Solução:* Faltou o arquivo `.htaccess` na raiz da subpasta com o RewriteRule configurado, conforme o Passo 4.

---

## 7. Rollback (Como voltar versão)

Como se trata de HTML/JS/CSS estático, o rollback é instantâneo:
1. Mantenha um arquivo `.zip` ou uma cópia local do `dist/` da versão anterior.
2. Em caso de falha, no Gerenciador de Arquivos da Hostinger, apague os arquivos atuais.
3. Suba e extraia os arquivos do build antigo. Tudo voltará a funcionar imediatamente.
