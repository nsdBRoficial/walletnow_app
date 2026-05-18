# Walkthrough — KYC Programático (Etherfuse)

A fase final do Sprint de Infraestrutura Institucional focado na aprovação automática do KYC via **Sandbox da Etherfuse** foi concluída com sucesso.

Aqui está um resumo abrangente de todas as mudanças efetuadas:

## Arquitetura & Observabilidade

1. **Proxy Supabase (`etherfuse-proxy`)**
   - O proxy foi aprimorado para monitorar ativamente o tráfego do endpoint `POST /ramp/customer/:id/kyc`.
   - Adicionamos logs estruturados que mascaram parcialmente o `taxId` para simular as proteções necessárias em produção (LGPD), assegurando que estamos enviando os dados estruturais completos sem vazamentos.
   - Logs na categoria `[WalletNow][EtherfuseProxy]`.

2. **Categorização de Logs**
   - O `logger.ts` ganhou o nível hierárquico isolado `[WalletNow][KYC]`. Isso separa as interações demográficas e de compliance dos fluxos de trading `[Treasury]` e transações blockchain em si.

## Serviços (`etherfuseKycService.ts`)

- Substituímos completamente o uso estático do site hospedado da Etherfuse e as dependências obscuras por um serviço REST limpo via fetch.
- Criamos interfaces claras e tipadas como `KycPayload` e `KycAddress` ditando exatamente as chaves `firstName`, `lastName`, `dateOfBirth`, `taxId`, `occupation`, `phoneNumber`, e `address`.
- Agora o `submitKyc` bate de frente com nosso proxy, garantindo a mesma blindagem de API KEYS usada na geração de Quotes.

## Interface Gráfica — KYC Programático

> [!TIP]
> **Modelo Híbrido**
> Implementamos um design condicional (utilizando `isSandbox`). O auto-fill de dados preenche um mock perfeito (com CPF válido) apenas em ambiente local/testnet.

- **`etherfuse_kyc_form`**: Nova UI no `DepositModal.tsx` acionada imediatamente caso o status KYC capturado retorne `not_started`.
- Formulário institucional e com *badge* de "Sandbox Autofill" no ambiente de desenvolvimento, agilizando drasticamente os testes de On-Ramp.
- **Botão de Ação Bloqueante**: Impede cliques múltiplos protegendo contra o envio concorrente com um feedback visual `Enviando e Aprovando...` (spinner).

## Auto-Continuação e Polling

Ao clicar no Enviar KYC, o payload é despachado via Proxy. Após receber uma resposta "OK", o `DepositModal` migra de volta para a fase `etherfuse_kyc` original. Nessa fase, nosso _polling interval_ (existente e robusto) já pega a mudança para `approved` e dispara as verificações automáticas sequenciais:
1. Pega `bankAccountId`
2. Cria Quote
3. Cria `createOrder()`

> [!SUCCESS]
> **QA Results**
> - Rodamos `npm run type-check` (tsc --noEmit)
> - Rodamos `npm run lint`
> - Nenhum erro reportado.
> - Nenhum conflito impeditivo com os fluxos do Woovi.

O fluxo PIX real via Sandbox agora é integral, rodando de BRL à liquidação do ativo de Tesouro na Stellar, com o cliente e a conta bancária completamente reais dentro das permissões do ambiente *testnet*.
