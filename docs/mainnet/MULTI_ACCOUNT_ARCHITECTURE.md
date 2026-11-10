<!-- @module docs/mainnet/MULTI_ACCOUNT_ARCHITECTURE.md | Documentação técnica e especificação: Relatório de Arquitetura Multi-Conta e Isolamento (WalletNow). -->

# Relatório de Arquitetura Multi-Conta e Isolamento (WalletNow)
**Data:** 28 de Maio de 2026
**Status:** Implementado e Homologado

## 1. Visão Geral da Arquitetura

A introdução da arquitetura Multi-Conta alterou fundamentalmente o fluxo de gerência de identidades e chaves criptográficas da WalletNow, separando as responsabilidades estritas entre a camada de Autenticação (`AuthContext`) e a camada Web3/Criptográfica (`WalletContext`).

Essa refatoração garantiu o suporte a três tipos coexistentes de carteiras para o mesmo usuário sem causar regressão na base de usuários já ativa:
- **Legacy:** Carteiras antigas geradas antes da introdução da semente BIP39. (Possuem apenas Secret Key na nuvem atrelada ao Auth).
- **Generated (BIP39):** O padrão atual gerado no Onboarding Silencioso (Possuem 12 palavras, derivadas via SLIP-0010/SEP-0005 no path `m/44'/148'/0'`).
- **Imported:** Carteiras de terceiros ou externas (Albedo, Freighter, Lobstr) trazidas pelo usuário via Mnemonic ou Secret Key direta.

## 2. Princípios Zero-Knowledge & Local-First

A arquitetura foi rigidamente projetada sob os pilares Local-First e Zero-Knowledge:
- A base de dados principal (`Supabase`) serve **apenas** para indexar a *existence* (existência) das contas (`wallet_accounts` armazena `user_id`, `stellar_public_key`, `is_active`, `label`, `account_type`), mas **nunca** suas chaves privadas.
- O material criptográfico (`Secret Key` e `Mnemonic`) é cifrado localmente no dispositivo pelo `DeviceVault` utilizando `AES-GCM` via `WebCrypto API`, cuja chave de criptografia é gerada localmente atrelada ao `user.id`.
- Chaves privadas importadas (`Secret Key` ou `Mnemonic`) **nunca** deixam o dispositivo. O transporte não existe.
- A sincronização na nuvem destas chaves não foi implementada de forma proposital (reservada para uma possível Fase 2) visando máxima segurança e limitação da superfície de ataque.

## 3. Gestão de Estado e Isolamento (Contextos)

### 3.1 O Fim do "Deus Ex Machina" (AuthContext)
O `AuthContext` teve seu escopo reduzido e agora opera exclusivamente no domínio da Sessão do Usuário e na orquestração do Onboarding Silencioso:
1. Controle de Autenticação (OAuth, Magic Link).
2. Gerência do JWT com Supabase.
3. Deflagrar o WaaS (Wallet as a Service) no primeiro login usando a `WalletFactory` para o provisionamento (criação).
4. Limpeza incondicional da memória em cascata após o `signOut()`.

### 3.2 O "Source of Truth" Web3 (WalletContext)
O `WalletContext` agora reina sobre o domínio criptográfico. Suas responsabilidades são:
1. Listar todas as carteiras de um usuário via `refreshAccounts()`.
2. Identificar a `activeAccount` primária.
3. Efetuar a transição fluída (Phantom-like) entre contas.
4. Descriptografar on-the-fly (sob demanda) a chave privada da conta selecionada jogando-a na memória volátil do `DeviceVault`.
5. Fornecer os adaptadores para injeção de novas chaves (`importMnemonic` e `importSecretKey`).

## 4. O Fluxo de Transição ("Account Switcher")

A troca de contas ativa foi concebida para não exigir recarregamento da aplicação (SPA flow).
Quando o usuário seleciona uma nova conta:
1. Atualiza `activeAccount` e persiste o ID no `localStorage` sob a chave `@walletnow:active_account:{user.id}`.
2. Identifica a rota de armazenagem correta da Secret Key local:
   - Contas Default/Legacy continuam acessando: `@walletnow:secret:{user.id}`
   - Novas contas Importadas acessam o modelo composto: `@walletnow:secret:{user.id}:{stellar_public_key}`
3. Extrai o ciphertext, descriptografa com o cofre (`DeviceVault.decryptSecret`), e popula a RAM (`DeviceVault.setVolatileSecret(plaintext)`).
4. Notifica silenciosamente o Supabase via atualização de `is_active = true` (permitindo experiências omni-channel no futuro e consistência entre abas caso implementado listener em Realtime).

## 5. Zonas Críticas (Exportação e Perdas de Conta)

Para prover segurança perante vetores de "Shoulder Surfing" (Alguém olhando a tela) ou engenharia social, as janelas de exportação possuem:
1. **RevealSeedModal:** Acesso às 12 palavras protegido por borramento visual, anti-print, avisos ostensivos de Danger Zone e desativação em contas Legadas ou Importadas via chave.
2. **ExportSecretKeyModal:** Interface restrita à contas do tipo "imported". Traz o material bruto (S...) também sob pesados filtros de ofuscação (CSS Blur) e copy seguro.

## 6. Perspectivas de Evolução (Fase 2)

- **Cloud Sync Seguro (E2EE):** Oferecer sincronização encriptada do cofre entre dispositivos do mesmo usuário (Cifrar com uma Master Password de Derivação PBKDF2).
- **HD Wallet Total:** Ao invés de carteiras individuais sem relação, utilizar derivações subsequentes (`m/44'/148'/1'`, `m/44'/148'/2'`) para criação de múltiplas contas a partir de um mesmo Mnemonic primário.
- **Assinatura por Hardware:** Acoplar Ledger e Trezor (Transportadores WebUSB) como opções no `AccountSwitcher`.
