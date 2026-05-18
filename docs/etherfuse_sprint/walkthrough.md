# Walkthrough — KYC Programático & Conta Bancária (Etherfuse)

Este documento resume a fase final do Sprint de Infraestrutura Institucional focado na aprovação automática do KYC via **Sandbox da Etherfuse** e a investigação sobre o vínculo de contas bancárias (Proxy Accounts).

## 1. Arquitetura & Observabilidade

1. **Proxy Supabase (`etherfuse-proxy`)**
   - Monitoramento ativo de tráfego dos endpoints de KYC, Quotes e Orders.
   - Logs estruturados que protegem dados sensíveis como `taxId` enquanto evidenciam a comunicação com a API da Etherfuse.

2. **Categorização de Logs**
   - Melhorias no `logger.ts` para separar as interações de compliance `[WalletNow][KYC]` e as operações financeiras `[WalletNow][Treasury]`.

## 2. KYC Programático (`etherfuseKycService.ts`)

- Substituímos o fluxo web de redirecionamento para um serviço REST (`POST /ramp/customer/{id}/kyc`) que envia a identidade formatada diretamente.
- O payload requer envelopamento obrigatório no objeto `"identity"`, garantindo a leitura pela Etherfuse.
- O polling no frontend foi ajustado para aguardar e lidar corretamente com o status `approved`.

## 3. Comportamento do Sandbox e Aprendizados Técnicos

### 3.1. Diferença de Ambientes (UI vs Programático)
Descobrimos uma grande divergência de comportamento no Sandbox:
- **Fluxo Web (Hosted):** Ao abrir a URL web, o usuário cadastra identidade *e também sua conta bancária*.
- **Fluxo Programático (API):** Apenas aprova a identidade. A busca por contas via `getFiatAccounts()` retornará um array vazio `[]` mesmo com o KYC concluído.

### 3.2. A Hipótese da Conta "Proxy" (BankAccountId Inicial)
A API exige um `bankAccountId` previamente cadastrado para aprovar ordens no endpoint `POST /ramp/order`. A tentativa de forçar um novo `bankAccountId` falha com `400 Proxy account not found`. 
Ao investigar como registrar uma conta (`POST /ramp/bank-account`), recebemos o erro `untagged enum AccountRegistration` para todas as tentativas PIX locais, evidenciando uma tipagem estrita não documentada.

Para resolver o impasse na ausência de documentação do enum, implementamos uma hipótese arquitetural: 
**Aproveitar o UUID de banco enviado na primeiríssima requisição do `onboarding-url`.** Esse UUID foi persistido no componente `DepositModal` sob o estado `efInitialBankAccountId`.

### 3.3. Comportamento de Clientes Previamente Registrados
Se a Wallet (Stellar Address) do usuário já existe na base da Etherfuse (erro 409), não podemos gerar e reaproveitar um novo UUID de banco, pois esse UUID local nunca chegará à plataforma. Portanto, a testabilidade dessa hipótese requer uma carteira (Wallet) **completamente nova** (ou não registrada).

---

## 4. NEXT STEPS (Próximas Sessões)

Para dar continuidade e estabilizar a fundação na Etherfuse, os próximos passos do projeto deverão focar em:

1. **Testar fluxo com Freighter Connect**
   - Ao conectar wallets limpas via Freighter nativamente, teremos o ambiente livre da poluição de customers em estado de conflito (`409`).
2. **Testar wallet totalmente nova (Gerada Localmente)**
   - Deslogar, gerar novo auth Supabase e realizar um teste do fluxo E2E utilizando a estratégia do `efInitialBankAccountId`.
3. **Investigar Bootstrap de Proxy Account**
   - Se o fallback inicial não for aceito e as ordens continuarem devolvendo `Proxy account not found`, será imperativo contatar o suporte da Etherfuse para obter o schema JSON exato do objeto PIX de `AccountRegistration`.
4. **Avaliar Fluxo Anchor/BRZ/Stellar como Fallback Estratégico**
   - Caso a integração On-Ramp da Etherfuse se prove excessivamente rígida para MVP, a arquitetura deve ser capaz de ativar um fallback via Anchor BRL/BRZ nativa na rede Stellar + Swap na rede descentralizada.
5. **Avaliar Stellar Wallet Authentication**
   - Preparar a integração institucional baseando a identidade diretamente na chave pública e sessão criptográfica, diminuindo o ruído de emails.
