# Fluxo de KYC Programático - Etherfuse API

Este documento descreve o fluxo de integração direto via API para o processo de KYC (Know Your Customer) da Etherfuse, sem dependência do ambiente web hospedado. O fluxo detalhado aqui é desenhado para garantir que o cliente seja criado e aprovado, permitindo o avanço das transações financeiras (BRL → TESOURO) na testnet/sandbox.

## 1. Fluxo Resumido

1. **Criação do Cliente:** `POST /ramp/customer` - O cliente é gerado usando seu endereço Stellar.
2. **Submissão de KYC:** `POST /ramp/customer/:id/kyc` - Envio do payload completo com dados preenchidos.
3. **Aprovação Automática (Sandbox):** O envio de dados válidos resulta em transição de status para `approved`.
4. **Resgate da Conta Bancária:** `GET /ramp/customer/:id/bank-accounts` (após aprovado)
5. **Cotação e Ordem:** Fluxo on-ramp regular (`createOrder`).

## 2. Endpoint de KYC

**Método:** `POST`
**Rota base:** `https://api.sand.etherfuse.com/ramp/customer/:id/kyc` (via proxy Supabase)

### Parâmetros de Rota
* `id` - O UUID do customer retornado na criação.

### Payload Completo (JSON)

Para fins de simulação na sandbox, exigem-se os seguintes campos do cliente:

```json
{
  "firstName": "João",
  "lastName": "Silva",
  "dateOfBirth": "1990-01-01",
  "taxId": "12345678909",
  "occupation": "Software Engineer",
  "phoneNumber": "+5511999999999",
  "address": {
    "street": "Rua Ficticia, 123",
    "city": "São Paulo",
    "state": "SP",
    "postalCode": "01000-000",
    "country": "BR"
  }
}
```

> **Nota sobre o `taxId`**: Em sandbox, a Etherfuse valida CPFs falsos (contudo matematicamente válidos conforme o algoritmo padrão).
> **Nota sobre `country`**: Padrão ISO 3166-1 alpha-2 (`BR`).

## 3. Respostas Esperadas

### 200 OK ou 201 Created
Retorna o objeto do KYC processado ou o status atualizado do cliente. O status esperado para liberação do on-ramp é `approved`.
```json
{
  "status": "approved"
}
```

### Erros Possíveis
* **400 Bad Request:** Payload mal formatado (ex. faltando campos obrigatórios como endereço, ou país inválido).
* **404 Not Found:** CustomerID inexistente.
* **409 Conflict:** KYC já submetido e aprovado anteriormente.

## 4. Integração no WalletNow (Edge Function Proxy)

Como proteção, não chamamos a API da Etherfuse do frontend.
A chamada `POST /ramp/customer/:id/kyc` é roteada por nossa edge function (`etherfuse-proxy`). A function recebe a carga, injeta o cabeçalho `Authorization: <ETHERFUSE_API_KEY>` e repassa para a Etherfuse.

```javascript
// Exemplo de payload a ser enviado para nossa function:
{
  "method": "POST",
  "endpoint": "/ramp/customer/<CUSTOMER_ID>/kyc",
  "payload": {
    "firstName": "...",
    "lastName": "...",
    ...
  }
}
```
