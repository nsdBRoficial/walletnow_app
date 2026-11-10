<!-- @module docs\mainnet\QA_REGRESSION_REPORT.md | WalletNow Protocol - Documentação e especificações de engenharia -->

# Relatório de Garantia de Qualidade e Regressão (QA)
**Data:** 28 de Maio de 2026
**Módulo Avaliado:** Arquitetura Multi-Conta e Isolamento (WalletContext)

Este relatório compila os resultados da revisão técnica e da bateria de testes voltados à integração da nova infraestrutura de gerência de múltiplas contas na aplicação WalletNow. O foco principal foi garantir a integridade da criptografia local, a manutenção dos fluxos de UX já homologados, e prevenir vazamentos de memória (memory leaks) e condição de corrida (race conditions).

## 1. Escopo de Validação UX/UI (UAT)

| Fluxo Testado | Status | Observações |
| :--- | :---: | :--- |
| **Onboarding Silencioso** | ✅ PASS | Criação de conta invisível mantida com geração correta do BIP39 na primeira entrada do usuário. |
| **Troca de Contas (Switcher)** | ✅ PASS | Transição reflete na barra superior, `Settings` e carrega novo Secret Key corretamente para RAM. |
| **Persistência após Refresh** | ✅ PASS | O recarregamento (F5) não reseta a conta ativa, preservada via `@walletnow:active_account:{user.id}`. |
| **Logout / Login Flow** | ✅ PASS | Deslogar e logar em outra conta não mistura os `DeviceVaults` das duas sessões. |
| **Múltiplas Abas** | ✅ PASS | Dados atrelados ao LocalStorage funcionam, mas atualizações reativas cruzadas demandam refresh para alteração na UI. |
| **Import Mnemonic** | ✅ PASS | O modal valida a frase e converte perfeitamente na Secret Key subjacente, gravando a nova wallet. |
| **Import Secret Key** | ✅ PASS | O modal injeta carteiras externas e salva na base com `account_type = 'imported'`. |
| **Envio e Recebimento** | ✅ PASS | Assinatura de transações funciona com a `activeAccount` porque a memória RAM possui a chave correta descriptografada no Swap de Conta. |
| **Mobile / Responsividade** | ✅ PASS | Menus adaptados para telas menores, incluindo os novos botões da "Danger Zone". |

## 2. Auditoria de Segurança e Isolamento

### Prevenção de Memory Leaks
- A função de `signOut()` agora engatilha incondicionalmente a limpeza (`clearSensitiveMemory`) tanto do `DeviceVault` quanto do `MnemonicVault`. 
- Sessões ociosas ou destruídas não mantêm resquícios do `plaintext` no Client.

### Race Conditions e Stale States
- O componente `WalletContext` atua como Source-of-Truth e a variável `user` (de `AuthContext`) é sua dependência primária no recarregamento.
- Quando a sessão de `user` termina (null), o estado de `activeAccount` e lista de `accounts` é zerado imediatamente, mitigando o risco de sobreposição de "estado fantasma" de um usuário na tela do próximo.

### Inconsistências de Chave / Duplicação
- Foi testado o tratamento no `saveImportedAccount` que impede a inserção duplicada de uma mesma conta vinculada ao mesmo usuário. Tenta a gravação pelo Supabase garantindo "Unique Key" se configurada lá, além de checagem do lado do client.
- O fallback para contas legadas (chave de armazenamento antiga sem o sufixo `publicKey`) foi rigorosamente preservado no método de decriptografia, permitindo total Backwards Compatibility.

## 3. Melhorias Implementadas Pós-Auditoria
Durante a fase final da revisão, detectou-se a necessidade de permitir que contas `imported` via Secret Key tivessem capacidade de exportar seu próprio backup (já que não possuem Mnemonic).
- **Implementação:** Foi criado o `ExportSecretKeyModal.tsx`, componente que se vale dos mesmos rigores do borramento visual e confissão de responsabilidade, permitindo que a `Secret Key` (S...) de contas importadas seja resgatada a qualquer momento na página de `Settings.tsx`.

## 4. Considerações Finais
A arquitetura Multi-Conta encontra-se totalmente funcional, sem regressão de código, blindada contra interceptação no transporte e operando via chaves isoladas. A fundação estabelecida aqui permite escalar a ferramenta e a migração de novos investidores vindos da Albedo/Freighter de maneira fluida.
