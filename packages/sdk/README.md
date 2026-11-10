<!-- @module packages/sdk/README.md | Documentação técnica e especificação: @walletnow/sdk. -->

# @walletnow/sdk

O **@walletnow/sdk** é o pacote oficial de integração do **WalletNow** na rede Stellar. Ele fornece mecanismos robustos para onboarding de usuários, verificação biométrica (Passkeys), integração com contratos inteligentes (Soroban) e o painel de desenvolvimento interativo **Testnet Infrastructure Kit**.

---

## 1. Instalação

Adicione o SDK e suas dependências necessárias ao seu projeto frontend:

```bash
npm install @walletnow/sdk
# Certifique-se de ter as peer dependencies instaladas
npm install react react-dom lucide-react @stellar/stellar-sdk
```

---

## 2. Importação e Uso

### Testnet Infrastructure Kit

O `TestnetKit` é um painel completo para gerenciar seu ambiente de desenvolvimento on-chain. Ele inclui o Hub de controle de ferramentas (One-Click Env, Faucet++, AMM Pools, DeFi Vault, Explorer, Status e a aba Caatinga).

Para renderizá-lo em uma página de documentação ou portal do desenvolvedor do seu app React:

```tsx
import React from 'react';
import TestnetKit from '@walletnow/sdk/testnetkit';

export default function DeveloperPage() {
  return (
    <div style={{ width: '100%', minHeight: '100vh', padding: '24px' }}>
      <TestnetKit />
    </div>
  );
}
```

---

## 3. Principais Funcionalidades do SDK

* **Onboarding Sem Fricção**: Login e criação de carteiras usando métodos WebAuthn e Passkeys.
* **Testnet Infrastructure Hub**: Interface centralizada que orquestra friendbots, monta trustlines e faz airdrops automáticos on-chain de tokens de teste (`BRW`, `USDW`).
* **Parceria Caatinga**: Suporte e simulação integrada para projetos Soroban usando o toolchain TypeScript-native do Caatinga.

---

## 4. Licença

MIT
