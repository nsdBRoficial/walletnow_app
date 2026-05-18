# Fluxo de KYC Programático Etherfuse (API)

Este documento descreve a arquitetura atual de integração com o Sandbox da Etherfuse utilizando KYC Programático, bypassing o fluxo Web nativo deles.

## 1. Arquitetura Multi-Provider
Todas as requisições à API da Etherfuse (`api.sand.etherfuse.com`) originadas do frontend passam obrigatoriamente pela Supabase Edge Function `etherfuse-proxy`.
*   **Segurança**: `API_KEY` da Etherfuse nunca é exposta no Frontend.
*   **Headers**: O proxy injeta o header de autorização apropriado e lida com o CORS.

## 2. Passo a Passo do Fluxo de On-Ramp

### Etapa 1: Registro do Customer e Proxy Account
*   **Ação**: `EtherfuseOnRampService.registerCustomer(publicKey)`
*   O sistema gera um `customerId` e um `bankAccountId` (também conhecido como *Proxy Account*).
*   Faz uma requisição `POST /ramp/onboarding-url`.
*   **Nota**: Em caso de falha `409 Conflict: You have already added user`, o sistema recupera o `customerId` antigo, mas é preciso cautela pois o `bankAccountId` gerado não terá sido salvo na Etherfuse.

### Etapa 2: Submissão de KYC
*   **Ação**: `EtherfuseKycService.submitKyc(customerId, payload)`
*   O usuário preenche o formulário local de KYC (com autofill inteligente ativado no Sandbox).
*   Os dados são submetidos via `POST /ramp/customer/{id}/kyc`.
*   **Importante**: A estrutura exige que os dados fiquem aninhados dentro da propriedade `identity`.

### Etapa 3: Polling de Status
*   O sistema local faz chamadas de polling `GET /ramp/customer/{id}/kyc/{publicKey}` a cada 5 segundos.
*   Pode retornar: `not_started`, `proposed`, `needs_work`, `approved`, `approved_chain_deploying`, `rejected`.
*   O fluxo aguarda até receber o status `approved` ou `approved_chain_deploying`.

### Etapa 4: Banco e Quotes
*   **Recuperação de Banco**: Em tese, o `POST /ramp/customer/{id}/bank-accounts` deveria listar os bancos adicionados via web. No modelo programático, esse array volta vazio.
*   **Fallback Sandbox**: Para permitir a continuação no Sandbox, o sistema injeta e reaproveita o `efInitialBankAccountId` (gerado na Etapa 1 e salvo no estado `DepositModal`).
*   **Quote**: O sistema busca `GET /ramp/assets` para resolver o identifier exato da Stablebond e depois solicita `POST /ramp/quote`.

### Etapa 5: Criação da Ordem (Create Order)
*   **Ação**: `EtherfuseOnRampService.createOrder`
*   Requer o `customerId`, `quoteId`, `publicKey` e um `bankAccountId` **válido e previamente registrado** na etapa de onboarding-url.
*   Com a criação bem sucedida, retorna o PIX de pagamento para prosseguir com a simulação do sandbox.
