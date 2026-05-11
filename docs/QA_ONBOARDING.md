# QA & Validation: Onboarding Flow

Este documento contém o checklist de Qualidade e Garantia (QA) aplicado ao fluxo de Onboarding da WalletNow (Hackathon Edition).

## 1. Fluxo Esperado (Caminho Feliz)
1. Usuário acessa `/login`.
2. Realiza biometria (Passkeys) ou clica no botão do Google.
3. Sessão é estabelecida e o evento `onAuthStateChange` aciona `AuthContext.tsx`.
4. O `AuthContext` identifica ausência do campo `stellar_address`.
5. Aciona o `WalletFactory.provisionWalletForUser()`.
6. Carteira é gerada e as chaves passam por Hard Validation ('G' e 'S').
7. Public Key é salva no Supabase.
8. Secret Key é salva no `localStorage`.
9. Conta é ativada via Friendbot ou Sponsor.
10. O fluxo conclui, o Contexto libera a tela (`loading: false`), e o usuário vê o Dashboard.

## 2. Casos Extremos (Edge Cases)

| Cenário | Comportamento Esperado | Status |
|---|---|---|
| **Falha de Rede no Supabase** (Public Key Save) | Exceção levantada. Nada é salvo no localStorage. O usuário permanece sem wallet até o próximo login. | ✅ Pass |
| **Persistência Parcial** (DB salvo, mas sem LocalStorage) | A regra Fail-Safe é ativada no `AuthContext`. O usuário é **deslogado imediatamente** para prevenir sobrescrita ou uso parcial da wallet. Um erro amigável é exibido no `/login`. | ✅ Pass |
| **Chaves Geradas Corrompidas** | Falha de validação antes da persistência. Exceção estourada, log emitido, nenhuma camada é alterada. | ✅ Pass |
| **Login com Email Existente** (OAuth auto-link) | O `AuthContext` faz o bind automático do novo UUID gerado para os dados históricos consolidados (Merge Profiling). | ✅ Pass |

## 3. Checklist de Validação Manual
- [ ] Logar via Passkey limpa (Private Window).
- [ ] Observar o Console para os logs `[WalletNow][Onboarding]`.
- [ ] Limpar o `localStorage` simulando perda da chave e fazer um refresh na página para observar a trava de Fail-Safe sendo ativada.
- [ ] Checar se a Public Key foi persistida corretamente no Painel do Supabase.

## 4. Testes Automatizados
- Os testes rodam no vitest: `npm run test:flows` ou executando o arquivo unitário:
  `npx vitest run tests/integration/walletValidation.test.ts`
- Verificam-se prefixos válidos, SDK validation rules e rejeição de strings aleatórias.
