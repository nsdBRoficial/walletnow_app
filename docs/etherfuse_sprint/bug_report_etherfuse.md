# Bug Report: Etherfuse Sandbox On-Ramp Integration

## Status Atual
A aprovação do KYC Programático via API foi implementada com sucesso no Sandbox (`status: 'approved'`). No entanto, o fluxo esbarra na criação da ordem (`createOrder`) devido à ausência de uma Conta Bancária (`bankAccountId`) vinculada.

## O Problema Principal
1. O endpoint de busca de contas (`POST /ramp/customer/{id}/bank-accounts`) retorna **vazio** (`items: []`) mesmo após a aprovação do KYC.
2. A criação da ordem (`POST /ramp/order`) **exige** um `bankAccountId` previamente registrado no sistema da Etherfuse.
3. Se enviarmos uma string vazia `""`, recebemos: `invalid length: expected length 32 for simple format, found 0`.
4. Se enviarmos um UUID genérico gerado na hora no frontend (que não foi atrelado ao customer), recebemos o erro: `Etherfuse API 400: Proxy account not found`.

## Investigação do Endpoint de Criação de Conta
Tentamos descobrir o endpoint para criar a conta bancária via código:
- Testamos o endpoint `POST /ramp/bank-account`.
- O endpoint existe e pede a estrutura `{ customerId, presignedUrl, account: {...} }`.
- O objeto `account` usa uma tipagem interna da Etherfuse chamada **`untagged enum AccountRegistration`**.
- Testamos dezenas de variações do payload para o Brasil (PIX) - ex: `pixKey`, `brazilPix`, `currency: BRL`, `pix` - e **todas** foram rejeitadas com o erro `data did not match any variant of untagged enum AccountRegistration`. Como não temos a documentação exata desse enum, não conseguimos registrar a conta via API.

## A Hipótese do `bankAccountId` Inicial (Proxy Account)
Ao criar um customer pela primeira vez, nosso código gera um UUID temporário para o banco e o envia no payload do `POST /ramp/onboarding-url`:
```json
{
  "customerId": "...",
  "bankAccountId": "<UUID-INICIAL>",
  "publicKey": "...",
  "blockchain": "stellar"
}
```
Como a Etherfuse aceita esse payload, é provável que esse `<UUID-INICIAL>` seja salvo como o "Proxy Account" válido para o Sandbox! 

**Por que falhou no teste recente?**
Porque no teste atual, o usuário **já existia** na Etherfuse. O sistema retornou `409 Conflict: You have already added user with this address`. Quando isso acontece, o nosso frontend recupera o ID do usuário antigo, mas gera um **NOVO UUID** local para tentar continuar, que **nunca foi enviado para a Etherfuse** (já que o request deu 409). Quando tentamos usar esse novo UUID no `createOrder`, ele deu `Proxy account not found`.

## Próximos Passos e Solução Proposta
Para contornar isso, eu alterei o `DepositModal.tsx` para **salvar o UUID gerado no momento do registro do customer** e utilizá-lo como fallback na hora da compra.

**Para validarmos se essa teoria funciona, precisamos que o teste seja feito do zero, com uma carteira limpa (novo usuário) na plataforma**, para que o `onboarding-url` retorne sucesso (200) e o UUID inicial seja validado e registrado pela Etherfuse.
