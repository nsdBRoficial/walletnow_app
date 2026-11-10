<!-- @module docs\mainnet\WALLET_ARCHITECTURE_REVIEW.md | WalletNow Protocol - Documentação e especificações de engenharia -->

# WalletNow — Wallet Architecture Review

**Versão:** 1.0 | **Data:** 2026-05-27

---

## Arquitetura Atual de Custódia

```
                    MODELO NON-CUSTODIAL HÍBRIDO
                    
  ┌─────────────────────────────────────────────────────┐
  │                   USUÁRIO                           │
  │                                                     │
  │   Social Login / Magic Link → Supabase Auth         │
  │                    ↓                                │
  │   Provisão automática de carteira Stellar           │
  │   (ED25519 keypair gerado no browser)               │
  │                    ↓                                │
  │   Secret Key → criptografada AES-GCM                │
  │   com chave derivada PBKDF2(userId, salt, 100k)     │
  │                    ↓                                │
  │   Armazenada em localStorage (cifrada)              │
  │   + Memory (volatileSecret para sessão)             │
  │                                                     │
  │   Public Key → Supabase (profiles.stellar_address)  │
  └─────────────────────────────────────────────────────┘
```

---

## Geração de Carteiras

### Implementação Atual
- **Gerador:** `Keypair.random()` do Stellar SDK
- **Algoritmo:** ED25519 (padrão Stellar)
- **Validação:** `isValidPublicKey()` + `isValidSecretKey()` antes de persistir
- **Formato atual:** Apenas a Stellar Secret Key (S...)
- **Formato futuro:** Seed phrase BIP39 → derivação SLIP-0010 → keypair Stellar

### Gap Identificado: Seed Phrase
O produto promete 12 palavras no ProMode, mas a geração atual usa apenas `Keypair.random()` sem BIP39. Isso significa que:
1. Não há seed phrase para exibir (o produto promete algo não implementado)
2. Se o dispositivo for perdido e o localStorage limpo, os fundos são irrecuperáveis

**Solução:** Implementar BIP39 + SLIP-0010 para derivar o keypair Stellar a partir das 12 palavras.

---

## Criptografia do Cofre Local

### Implementação Atual (DeviceVault)
```
Entrada: userId (string)
Salt: 16 bytes aleatórios (armazenados em localStorage)
KDF: PBKDF2-SHA256 com 100.000 iterações
Saída: CryptoKey AES-GCM 256 bits (não exportável)

Criptografia: AES-GCM com IV de 12 bytes (por operação)
Armazenamento: { ciphertext, iv, version: 1 } em localStorage
```

### Pontos Positivos
- Usa WebCrypto API nativa (sem bibliotecas externas)
- Chave derivada não exportável (`extractable: false`)
- AES-GCM com IV único por operação ✅
- Fallback de migração para chaves legacy ✅

### Pontos de Melhoria
- PBKDF2 com apenas 100k iterações (insuficiente para 2025)
- Salt em localStorage (perde com limpeza do browser)
- `volatileSecret` em variável de módulo global (exposta a XSS)
- Sem versioning do esquema de criptografia (para migração futura)

---

## Fluxo de Onboarding (Non-Custodial Híbrido)

```
1. Usuário faz login (Google/Magic Link)
        ↓
2. AuthContext detecta ausência de stellar_address no perfil
        ↓
3. WalletFactory.provisionWalletForUser(userId)
   - Gera keypair ED25519
   - Valida chaves geradas
   - Salva PUBLIC KEY no Supabase
   - Criptografa SECRET KEY no localStorage
   - Popula volatileSecret na RAM
   - Ativa conta na rede (Friendbot/Sponsor)
   - Setup inicial de trustlines
        ↓
4. DeviceVault Unlock: descriptografa secret para sessão
        ↓
5. FAIL-SAFE: se public key existe no banco mas secret não está no device
   → Logout forçado + mensagem de erro
   → PROTEGE contra logins em dispositivos diferentes
```

---

## Recuperação de Carteira (Estado Atual vs Futuro)

| Cenário | Agora | Com Seed Phrase |
|---------|-------|-----------------|
| Mesmo dispositivo, sessão ativa | ✅ Funciona | ✅ Funciona |
| Mesmo dispositivo, sessionStorage limpa | ✅ Funciona (localStorage) | ✅ Funciona |
| Mesmo dispositivo, localStorage limpo | 🔴 Acesso bloqueado | ✅ Reimportar 12 palavras |
| Novo dispositivo | 🔴 Acesso bloqueado | ✅ Importar 12 palavras |
| Dispositivo perdido | 🔴 Fundos irrecuperáveis | ✅ Recuperar via 12 palavras |

---

## Roadmap de Evolução da Arquitetura

### Fase 1 (Atual)
- AES-GCM + PBKDF2 + localStorage
- Secret key derivada do userId
- Sem seed phrase

### Fase 2 (Próxima)
- BIP39 seed phrase gerada no onboarding
- SLIP-0010 para derivação do keypair Stellar
- PBKDF2 com 600k iterações
- Exibição das 12 palavras em Config > ProMode

### Fase 3 (Futura)
- WebAuthn/Passkeys real (não simulado)
- Derivação de chave atrelada à biometria do dispositivo
- Nunca manter plaintext secret na RAM JS
- Hardware security key opcional (YubiKey/etc)

### Fase 4 (Avançada)
- Social Recovery: N-of-M guardiões conhecidos
- Guardian: contatos de confiança que podem aprovar recuperação
- MPC (Multi-Party Computation) para signing sem expor chave completa
