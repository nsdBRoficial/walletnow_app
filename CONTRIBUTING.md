<!-- @module CONTRIBUTING.md | WalletNow Protocol - Documentação e especificações de engenharia -->

# Como Contribuir para o WalletNow

Bem-vindo ao protocolo WalletNow! Apreciamos o seu interesse em contribuir.

## Regras de Ouro
1. **Nunca quebre o ADR-000**: As Invariantes Arquiteturais são leis rígidas. Qualquer PR que introduzir dependência circular, acoplamento de bibliotecas externas no Core, ou vazamento de estado será sumariamente rejeitado.
2. **Build Verde Obrigatório**: Nenhum código é mesclado se `npm run build`, `npm run typecheck` ou `npm run lint` falharem.
3. **Mantenha o Código Limpo**: Remova logs, comentários desnecessários, arquivos mortos e imports não utilizados.

## Padrões de Commits
Usamos Conventional Commits:
- `feat:` Nova funcionalidade
- `fix:` Correção de bug
- `docs:` Alterações na documentação
- `refactor:` Mudanças no código que não adicionam feature nem consertam bug
- `chore:` Atualizações de dependências, builds, etc.

## Processo de PR
1. Faça o fork do repositório
2. Crie uma branch com o prefixo apropriado (`feat/`, `fix/`, `chore/`)
3. Adicione testes se aplicável
4. Atualize o CHANGELOG.md (na seção `[Unreleased]`)
5. Abra o PR e aguarde o review dos mantenedores.
