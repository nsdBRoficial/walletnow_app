# Implementação do Fluxo de KYC Programático (Etherfuse)

Este documento detalha o plano de implementação do fluxo de KYC programático da Etherfuse no WalletNow, substituindo o onboarding manual via URL por uma integração nativa e 100% via API.

## Objetivo
Atingir o status `approved` no KYC do Sandbox de forma automática ou via formulário integrado, permitindo a extração do `bankAccountId` real e a conclusão com sucesso do fluxo `BRL → TESOURO` (sem mocks e sem bloqueios na UI).

## Fases de Implementação

---

### Fase 1 — Auditoria e Documentação
- Criaremos o arquivo `docs/ETHERFUSE_KYC_API_FLOW.md` detalhando os endpoints utilizados (`POST /ramp/customer/:id/kyc`), os payloads (baseados nas propriedades exigidas: `firstName`, `lastName`, `dateOfBirth`, `taxId`, `occupation`, `phoneNumber`, `address`), bem como as transições de status (`not_started` → `proposed` → `approved`).

### Fase 2 — Expansão da Edge Function (`etherfuse-proxy`)
- Atualizaremos o `supabase/functions/etherfuse-proxy/index.ts` adicionando a rota `POST /ramp/customer/:id/kyc` à whitelist de requisições.
- Manteremos a observabilidade rígida: log do payload de entrada (sanitizado, se necessário), endpoint, e log da resposta (incluindo possíveis erros `400 Bad Request`).

### Fase 3 — Criação do Serviço de KYC (`etherfuseKycService.ts`)
- Criaremos o serviço `src/services/providers/etherfuse/etherfuseKycService.ts`.
- Implementaremos o método `submitKyc(customerId, kycData)` que faz o POST via `etherfuse-proxy`.
- O payload será estruturado conforme exigência (com dados aninhados para o endereço).
- O serviço utilizará o `logger.ts` para rastreamento (categoria `[WalletNow][KYC]`).

### Fase 4 — Nova Fase na UI (`DepositModal.tsx`)
- Modificaremos o `DepositModal.tsx` para apresentar um formulário na fase `etherfuse_kyc_form` quando o status do KYC for `not_started` ou `proposed` pendente.
- O formulário terá os campos necessários, mas podemos pré-preencher com dados fictícios (para acelerar o teste no sandbox).
- Ao enviar, o modal chamará `submitKyc()`.

### Fase 5 — Auto-Continuação e Polling
- Após a submissão, iniciaremos o polling do status via `getKycStatus`.
- Uma vez `approved`, o fluxo retomará automaticamente, buscando o `bankAccountId`, cotando e criando a `createOrder()`.

### Fase 6 — Observabilidade
- Garantiremos a aplicação rigorosa das categorias de log: `[WalletNow][KYC]`, `[WalletNow][Treasury]` e `[WalletNow][EtherfuseProxy]`.
- Nenhuma exceção será silenciada com bloco `catch` vazio.

### Fase 7 — QA
- Validaremos tudo via `npm run lint` e `npm run type-check` (ou `tsc --noEmit`).
- Realizaremos a build do frontend e confirmaremos que não houve impacto nos provedores existentes (Woovi e Stellar puro).

---

> [!IMPORTANT]  
> **Revisão Necessária**
> - Para a interface (`etherfuse_kyc_form`), você prefere que o formulário apareça em branco para preenchimento manual, ou pré-preenchido com dados "mock de sandbox" (ex: CPF válido aleatório, nome genérico) para que você apenas clique em "Enviar KYC"?
> - Confirme se podemos prosseguir para iniciar a Fase 1 (criação da documentação) e Fase 2 (Edge Function).
