# Resumo do Sprint: Investigação do Sandbox da Etherfuse

## O Que Foi Implementado
Neste sprint focamos em ativar o fluxo **real** de integração institucional da Etherfuse (On-Ramp) via ambiente de Sandbox, removendo dependências de mocks no frontend e garantindo uma arquitetura robusta.

1. **Proxy Integrado**: Garantimos que todas as chamadas passem pela Supabase Edge Function (`etherfuse-proxy`), mantendo a API Key isolada e a segurança da aplicação intacta.
2. **KYC Programático via API**: Alteramos o fluxo de integração que dependia do usuário abrir o `onboarding-url` na web, passando para a submissão via API `POST /ramp/customer/{id}/kyc`.
3. **Autofill de Sandbox**: Adicionado um fallback inteligente visual para pré-preencher formulários na Sandbox e facilitar os testes e debug.
4. **Polling de KYC Automático**: Após submissão, o front-end verifica ativamente o status da identidade (verificando `not_started`, `proposed`, `approved`, etc.), e retoma o fluxo de compra automaticamente.

## Fluxo Completo Atual
1. **Identificação**: O usuário tenta iniciar um depósito na trustline TESOURO.
2. **Customer Registration**: O sistema detecta a ausência de um ID e chama o `registerCustomer`, gerando um UUID inicial (Proxy Account) e requisitando a `onboarding-url`.
3. **Identity Verification**: O sistema apresenta os dados, submete via KYC programático aninhado (`identity` object) e faz o polling até `approved`.
4. **Bank Account Fallback**: O sistema pesquisa contas fiat. Como retorna vazio, implementamos um fallback que recicla o `initialBankAccountId`.
5. **Ordem de Compra**: O sistema tenta criar uma `createOrder` associando a conta e o profile do usuário à cotação (`quote`) atual.

## Endpoints Integrados
- `POST /ramp/onboarding-url`
- `POST /ramp/customer/{id}/kyc`
- `GET /ramp/customer/{id}/kyc/{publicKey}`
- `POST /ramp/customer/{id}/bank-accounts`
- `GET /ramp/assets`
- `POST /ramp/quote`
- `POST /ramp/order`

## Funcionamento do KYC Programático
O KYC no Sandbox da Etherfuse se mostrou resiliente à auto-aprovação. A partir do envio correto da serialização JSON do objeto `identity`, com os dados formatados do usuário, o endpoint efetiva o status `approved` ou `approved_chain_deploying`.

## Investigação do Bank Account ID
O erro na etapa final revelou um problema oculto: **O KYC programático não cria automaticamente uma conta bancária vinculada ao usuário**. Quando tentamos forçar a criação com `POST /ramp/bank-account`, não obtivemos a documentação para o schema aninhado da API (`untagged enum AccountRegistration` em Rust), resultando em recusas de erro de desserialização JSON em todos os testes locais.

## A Hipótese do Proxy Account
Percebemos que o UUID enviado em conjunto com o `onboarding-url` inicial poderia ser registrado pela Etherfuse. Assim, atualizamos o `DepositModal` para armazenar este ID temporário e encaminhá-lo como a "Proxy Account" no `createOrder` final. No último teste, no entanto, ocorreu um `409 Conflict`, onde o front gerou um UUID não-sincronizado.

## Status Atual do Bug
A aplicação atinge 90% do fluxo do Tesouro na Sandbox de ponta a ponta sem mocks, ficando barrada na `createOrder` com erro `400 Proxy account not found`. 

## Próximos Passos Planejados
Consulte a seção `NEXT STEPS` no arquivo de `walkthrough.md` para os testes do próximo ciclo de desenvolvimento.
