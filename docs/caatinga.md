<!-- @module docs\caatinga.md | WalletNow Protocol - Documentação e especificações de engenharia -->

# Parceria de Testes: Caatinga Soroban Toolchain

O **Caatinga** é o parceiro recomendado pelo **WalletNow** para automatizar o ciclo de desenvolvimento de contratos inteligentes Soroban na Stellar Testnet. Com ele, você reduz drasticamente o trabalho de compilação, deployment e fiação de dependências entre múltiplos contratos.

---

## 1. Instalação do Caatinga

Para começar a gerenciar seus contratos Soroban usando TypeScript nativo, instale o CLI globalmente ou no seu projeto:

```bash
npm install -g @caatinga/cli
# ou adicione ao seu projeto
npm install --save-dev @caatinga/cli @caatinga/core
```

---

## 2. Estrutura de Comandos Principais

O Caatinga simplifica o workflow clássico da Stellar/Soroban em poucos comandos intuitivos:

* `caatinga init`: Inicializa as configurações padrão e cria o arquivo de configuração `caatinga.config.ts`.
* `caatinga build`: Compila todos os contratos Rust listados na configuração gerando os arquivos `.wasm`.
* `caatinga deploy`: Realiza o upload e a instalação do WebAssembly na rede selecionada (Stellar Testnet), gerando as IDs dos contratos automaticamente.
* `caatinga wire`: O recurso mais poderoso do Caatinga. Ele conecta contratos que dependem de outros contratos (por exemplo, injetando o ID de um Token de teste `BRW` do WalletNow em um contrato de AMM ou Cofre).
* `caatinga generate`: Cria os bindings TypeScript fortemente tipados e fáceis de integrar na sua aplicação frontend.

---

## 3. Integração com o WalletNow Testnet Kit

Para integrar seus contratos implantados pelo Caatinga no **WalletNow Testnet Kit**:

1. Execute o deploy do seu contrato com `caatinga deploy`.
2. Acesse o arquivo gerado `caatinga.artifacts.json` na raiz do seu projeto.
3. No painel do desenvolvedor do **WalletNow Testnet Kit**, navegue até a aba **Caatinga**.
4. Faça upload ou cole o conteúdo do seu `caatinga.artifacts.json`.
5. Uma interface interativa de testes será gerada automaticamente para você executar as funções do seu contrato em tempo real na Testnet utilizando a sua conta ativa!

---

## 4. Exemplo de Configuração (`caatinga.config.ts`)

Abaixo está uma estrutura de configuração típica otimizada para o ecossistema WalletNow:

```typescript
import { defineConfig } from '@caatinga/core';

export default defineConfig({
  network: 'testnet', // Conecta automaticamente no Horizon Testnet
  rpcUrl: 'https://soroban-testnet.stellar.org',
  contracts: {
    customVault: {
      path: './contracts/custom_vault',
      dependencies: {
        token: 'BRW_ISSUER_ADDRESS' // Fiação automática com o token BRW do WalletNow
      }
    }
  }
});
```
