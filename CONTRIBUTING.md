<!-- @module CONTRIBUTING.md | Diretrizes de contribuição, padrões de código, suíte de testes e fluxo de Pull Request do WalletNow -->

# Como Contribuir para o WalletNow

Bem-vindo ao protocolo **WalletNow OS**! Apreciamos o seu interesse em contribuir.

## Regras de Ouro
1. **Nunca quebre o ADR-000**: As Invariantes Arquiteturais são leis rígidas. Qualquer PR que introduzir dependência circular, acoplamento indevido no Core ou vazamento de estado/segredos será rejeitado.
2. **Pipeline de Qualidade Verde Obrigatório**: Nenhum código é mesclado na `main` se qualquer um dos comandos abaixo falhar:
   - `npm run lint` (ESLint 10 com 0 erros)
   - `npm test` (suítes `unit` + `integration` 100% determinísticas)
   - `npm run build` (build dos 17 pacotes via Turborepo + bundle web Vite)
3. **Segurança e Sanitização**: Chaves privadas (`S...`), mnemônicas BIP39, CPFs e JWTs jamais devem ser logados em texto claro ou enviados a servidores. Utilize sempre `DeviceVault`, `MnemonicVault` e os utilitários `logger` / `productionLogger`.

## Executando a Suíte de Testes

O projeto utiliza **Vitest 4** dividido em 3 projetos (`vitest.config.ts`):

```bash
# Executa todos os testes determinísticos (unit + integration) em ~3,5s
npm test

# Apenas testes unitários (cofres criptográficos, BIP39, oráculos, provedores, pacotes)
npm run test:unit

# Apenas testes de integração com mocks (SEP-10/24, máquinas de estado Pix/Woovi)
npm run test:integration

# Testes reais on-chain na Stellar Testnet (requer conexão com Friendbot/Horizon)
npm run test:onchain
```

Consulte [docs/qa/TEST_HARDENING_PLAN.md](docs/qa/TEST_HARDENING_PLAN.md), [docs/qa/PERSONAS.md](docs/qa/PERSONAS.md) e a skill `.agents/skills/walletnow-qa/SKILL.md` ao adicionar novos testes.

## Padrões de Commits
Usamos **Conventional Commits**:
- `feat:` Nova funcionalidade
- `fix:` Correção de bug
- `docs:` Alterações na documentação
- `test:` Adição ou refatoração de testes automatizados
- `refactor:` Mudanças no código que não adicionam feature nem consertam bug
- `chore:` Atualizações de dependências, builds e configurações de CI

## Processo de PR
1. Faça o fork do repositório.
2. Crie uma branch com o prefixo apropriado (`feat/`, `fix/`, `chore/`).
3. Adicione testes unitários ou de integração cobrindo a sua alteração.
4. Certifique-se de que `npm run lint && npm test && npm run build` passam localmente.
5. Abra o Pull Request — o workflow **WalletNow CI** (`.github/workflows/ci.yml`) validará automaticamente a sua branch.
