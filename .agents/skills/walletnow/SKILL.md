---
name: walletnow-integration
description: Guia de desenvolvimento e referência rápida para integrar o WalletNow SDK (onboarding, biométrica/Passkeys, patrocínio e âncoras Stellar).
---

<!-- @module .agents/skills/walletnow/SKILL.md | Skill de integração do WalletNow SDK para agentes -->

# WalletNow SDK Integration Skill

Esta skill descreve as diretrizes arquiteturais e exemplos práticos para integrar o **WalletNow SDK** (@walletnow/sdk) em qualquer aplicativo Web.

---

## 🚀 Filosofia de Onboarding Invisível

O WalletNow foi desenhado com o princípio de que o usuário final **não deve saber** que está transacionando em blockchain. 
* Sem sementes de recuperação visíveis por padrão.
* Sem necessidade de manter saldo em XLM para transacionar (Gasless).
* Autenticação biométrica (Passkeys) gerando chaves privadas de forma determinística local.
* Depósitos fiduciários via Pix convertidos atômica e silenciosamente em stablecoin (BRW).

---

## 🛠️ Inicialização e Fluxos Principais

### 1. Inicializando o Cliente
O builder só precisa instanciar o `WalletNowClient` fornecendo o ambiente de destino (Testnet ou Mainnet).

```typescript
import { WalletNowClient } from '@walletnow/sdk';

const wn = await WalletNowClient.init({
  network: 'testnet', // ou 'mainnet'
  apiKey: 'sua-api-key-do-portal'
});
```

### 2. Onboarding Invisível de Novo Usuário (Passkeys + Sponsorship)
Cria um par de chaves local, registra biometria e ativa a conta no ledger da Stellar com patrocínio automático de reservas em uma única chamada.

```typescript
const result = await wn.onboarding.createUser({
  externalId: 'user-id-do-seu-banco-de-dados',
  authMethod: 'passkey'
});

console.log('Chave Pública Gerada:', result.publicKey);
console.log('Status da Conta:', result.status); // 'ACTIVE'
```

### 3. Recuperação de Chave Silenciosa (Restore User)
Caso o usuário acesse o app de um dispositivo autorizado, a chave é recuperada descriptografando o cofre local por biometria.

```typescript
const result = await wn.onboarding.restoreUser({
  externalId: 'user-id-do-seu-banco-de-dados'
});
```

---

## 📡 Integração com Padrões Stellar (Anchor Client - SEPs)

O SDK do WalletNow encapsula nativamente a interação com âncoras reguladas (SEP-10 para autenticação e SEP-24 para depósitos interativos de ativos).

### Rampa de Depósito Silenciosa (Pix In / Fiat Ramp)
O código abaixo inicia uma sessão segura via desafio criptográfico (SEP-10) e gera a URL de rampa interativa (SEP-24) sob o capô:

```typescript
// Importação direta de utilitários de Âncora do SDK
import { StellarAnchorService } from '@walletnow/sdk/services';

const userPublicKey = 'GDGD77A34F5T3TLSOOHWRE4KXZ5TMLWZ5EBYUQSCE2AXGWWPL2RXYWRX';
const userSecretKey = 'SDG4Y22RUWD...'; // Assinada silenciosamente pelo DeviceVault

// 1. Obtém a URL da rampa para o ativo SRT na âncora de testes
const depositUrl = await StellarAnchorService.seamlessFund(
  'testanchor.stellar.org',
  userPublicKey,
  userSecretKey,
  'SRT' // Ativo de teste
);

// 2. Renderiza no aplicativo em um Iframe ou abre em nova aba
window.open(depositUrl, '_blank');
```
