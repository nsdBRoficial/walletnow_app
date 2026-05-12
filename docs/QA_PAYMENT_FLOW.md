# QA Payment Flow - Auditoria da Máquina de Estados (Commit 2)

## 1. Visão Geral
Este documento descreve detalhadamente o ciclo de vida financeiro dentro da WalletNow, focando nas transições de estado para Depósitos (On-Ramp/Mint) e Saques (Off-Ramp/Burn). A arquitetura atual utiliza um modelo de Mock ("Fast-Mock") para o gateway fiduciário (Woovi) e uma integração real com a rede Testnet da Stellar.

## 2. Máquina de Estados: Depósito (PIX -> BRW)

O ciclo de vida de um depósito segue o fluxo abaixo no `DepositModal.tsx`:

1. **`input`**: O usuário digita o valor em BRL.
2. **`generating`**: Chamada assíncrona ao `WooviService.createCharge`. No mock, é gerado um payload falso instantâneo com status `ACTIVE` e um EMV genérico.
3. **`waiting_payment`**: O frontend exibe o QR Code (via url de imagem) e o payload EMV. O frontend também dispara um `setTimeout` de 2 segundos (Fast-Mock) para avançar.
4. **`minting`**: Chamada assíncrona ao `PaymentService.mintBRW`. A operação interage com a testnet da Stellar:
   - Checa/Cria a Trustline.
   - Envia o token BRW.
   - Assina a transação localmente com a keypair do sponsor (Issuer) e a secret key do usuário caso seja o primeiro acesso.
5. **`success`**: Se a transação on-chain for validada, o frontend exibe a chave da transação na Stellar e, via listener da chain/backend, o saldo na UI será atualizado independentemente.

### Edge Cases e Proteções
- **Impedir Mint Duplo**: A flag de estado bloqueia submissões enquanto `phase === 'minting'` ou `phase === 'generating'`. O timer do Fast-Mock agora possui _clearing_ correto.

## 3. Máquina de Estados: Saque (BRW -> PIX)

O ciclo de vida do saque é tratado no `SacarModal.tsx`:

1. **`idle`**: Usuário define quantia a sacar e CPF destino. A UI faz validação hard limitando o input ao saldo atualizado.
2. **`authenticating`**: O sistema valida a biometria simulada (Passkeys no futuro) recuperando a chave local via `WalletFactory.getSecretKey`.
3. **`burning_blockchain`**: Chamada ao método `executeOffRampWithRollback`.
   - **FASE 1**: Queima os BRW na Stellar (transferência para a conta emissora original).
   - Se a queima falhar, cancela a transação e retorna erro.
4. **`sending_pix`**: Se o burn concluir, dispara a chamada mockada para `WooviService.transferPix`.
   - Se o mock da Woovi falhar (simulado por try-catch explícito ou timeouts), entra-se na **FASE 3 (Rollback)**: O token volta pro usuário via novo Mint.
5. **`success`**: Retorna hash de queima, avisa o usuário e exibe no explorador on-chain.

## 4. Registro de Eventos (Logging Auditável)
Para fins de rastreabilidade (especialmente na banca do Hackathon), os seguintes logs padronizados são gerados no console:
- `[WalletNow][Payment]` - Eventos de criação de cobranças e saques fiduciários.
- `[WalletNow][Mint]` - Emissão de BRW.
- `[WalletNow][Burn]` - Queima e estorno de BRW.
- `[WalletNow][Webhook]` - Simulação de retornos assíncronos.
