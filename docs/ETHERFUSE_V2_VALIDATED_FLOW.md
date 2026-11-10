<!-- @module docs\ETHERFUSE_V2_VALIDATED_FLOW.md | WalletNow Protocol - Documentação e especificações de engenharia -->

# Etherfuse V2 — Fluxo Programático Validado: Diferenças e Implementação

> **Versão:** 1.0 — Maio 2026
> **Referência:** [etherfuse-pix-demo](https://github.com/wmendes/etherfuse-pix-demo/)
> **Status:** Sandbox Funcional · Stellar Testnet · Rail PIX Brasil

---

## Resumo Executivo

O **EtherfuseV2** implementa o fluxo **programático validado** para depósito de TESOURO (Tesouro Direto tokenizado) via PIX na Stellar. Difere fundamentalmente do fluxo V1, que estava bloqueado e não validava contas bancárias. O fluxo V2 usa a infraestrutura de PIX sem UI hospedada (iframe), realizando tudo de forma invisível para o usuário final via Edge Functions (Proxy).

---

## Diferenças: V1 vs V2

| Aspecto | V1 (Antigo - Bloqueado) | V2 (Novo - Validado) |
|---------|---------------------|---------------------------|
| **Criação de Conta (Onboarding)** | `POST /ramp/onboarding-url` retornava a presigned_url e parava aí para o usuário acessar o iframe. | `POST /ramp/onboarding-url` retorna `presigned_url`. Usamos para programaticamente validar a conta. |
| **`customerId` e `bankAccountId`** | Gerados e usados para abrir iframe. Tentativa falha de ler via `getFiatAccounts()` depois. | **Gerados localmente (UUIDs) e vinculados programaticamente.** A API aceita UUIDs definidos pelo cliente. |
| **KYC** | Usuário completava no portal Etherfuse (iframe/redirect) | Programático via API: `/kyc`, `/kyc/documents`, e `/agreements/*` (tudo invisível). |
| **Registro PIX** | Não explicitamente necessário, falhava. | Obrigatório chamar `POST /ramp/bank-account` com CPF e os UUIDs gerados. |
| **Status sandbox** | ❌ Bloqueado e não aceitava testar o loop onramp | ✅ End-to-end funcional no sandbox, simulando o PIX. |

---

## Endpoints da API V2 Utilizados (Via Proxy)

### 1. `POST /ramp/onboarding-url`
Vincula os UUIDs gerados localmente e obtém a `presigned_url`.

### 2. KYC Programático (3 endpoints)
```
POST /ramp/customer/{id}/kyc    ← Dados pessoais (nome, CPF, endereço mock)
POST /ramp/customer/{id}/kyc/documents   ← Documentos e selfies (Base64 dummy)
```

### 3. Aceite de Acordos Programáticos
Ao invés de clicar "Eu concordo" no portal da Etherfuse:
```
POST /ramp/agreements/electronic-signature
POST /ramp/agreements/terms-and-conditions
POST /ramp/agreements/customer-agreement
```

### 4. `POST /ramp/bank-account`
Registra a chave PIX (CPF) associando à `presignedUrl` e o `bankAccountId` fornecido.

### 5. Onramp e Cotação
- `GET /ramp/assets` — Assets disponíveis
- `GET /ramp/customer/{id}/kyc/{publicKey}` — Status KYC (polling até 'approved')
- `POST /ramp/quote` — Cotação em BRL
- `POST /ramp/order` — Criar ordem on-ramp
- `POST /ramp/order/fiat_received` — Simular o PIX
- `GET /ramp/order/{id}` — Polling da ordem

---

## Quirks do Sandbox (Demo Reference)

1. **UUIDs Cliente**: `customerId` e `bankAccountId` são UUIDs criados pelo front-end (neste caso, o serviço) e vinculados na chamada `/ramp/onboarding-url`.
2. **KYC auto-aprovado no sandbox**: Após submeter os mocks e aceitar os acordos, o sandbox aprova em segundos. Nenhuma ação manual é necessária.
3. **Registro PIX obrigatório**: O endpoint `/ramp/bank-account` deve ser chamado explicitamente passando a chave PIX.
4. **`simulateFiatReceived` sandbox-only**: Avança a ordem artificialmente para `funded`. Em prod, aguarda-se o PIX.
5. **Aprovação rápida**: Quotes expiram em 2 min, o `createOrder` segue imediatamente.

---

## Identidade e CPF Mock (Sandbox)

**Valores Mocks em `etherfuseV2Types.ts`:**
O sandbox Etherfuse aprova automaticamente desde que o formato dos dados (como CPF, datas, etc) estejam estruturalmente válidos. A imagem enviada pode ser um pixel em Base64.

**IMPORTANTE (Para Produção)**:
- Usar dados do formulário de KYC real do usuário.
- CPF de cadastro deve ser igual ao da chave PIX transferida.
- Não usar `simulateFiatReceived`.
