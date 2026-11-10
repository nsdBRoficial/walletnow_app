---
name: walletnow-qa
description: Guia de Engenharia de Qualidade (QA), convenções de testes (Vitest + Playwright), mocks determinísticos e personas de validação para agentes no monorepo WalletNow.
---

<!-- @module .agents/skills/walletnow-qa/SKILL.md | Skill de QA e Automação de Testes do WalletNow -->

# WalletNow QA & Testing Skill

Use esta skill sempre que precisar **criar, alterar, depurar ou validar testes automatizados** no ecossistema **WalletNow OS**.

---

## 🏗️ Arquitetura de Testes (`vitest.config.ts`)

A suíte é dividida em **3 projetos isolados** para impedir que chamadas reais à Stellar Testnet/Friendbot tornem o CI lento ou instável:

| Projeto | Comando | Escopo | Regras de Rede |
|---|---|---|---|
| **`unit`** | `npm run test:unit` | `src/**/*.test.{ts,tsx}`, `tests/unit/**/*.test.ts`, `packages/**/*.test.ts` | **100% offline**. Proibido acessar Horizon, Friendbot, Supabase ou gateways reais. |
| **`integration`** | `npm run test:integration` | `tests/integration/**/*.test.ts` | **100% determinístico** com mocks/spies de serviços (SEP-10/24, máquinas de estado Woovi/Etherfuse). |
| **`onchain`** | `npm run test:onchain` | `tests/onchain/**/*.test.ts` | Acessa **Stellar Testnet / Friendbot** real. Executado apenas manualmente ou no workflow noturno (`onchain-nightly.yml`). |

> O comando padrão `npm test` executa `unit` + `integration` (sem rede real) em menos de 10 segundos.

---

## 🔒 Regras Inegociáveis para Agentes

1. **Setup Global Automático (`tests/setup/vitest.setup.ts`):**
   - `localStorage` e `sessionStorage` em memória já são injetados e limpos antes de cada teste (`beforeEach`), e `vi.restoreAllMocks()` roda em `afterEach`.
   - Sempre chame `DeviceVault.clearSensitiveMemory()` e `MnemonicVault.clearSensitiveMnemonicMemory()` ao testar cofres criptográficos.
2. **Proibição de Segredos em Texto Claro:**
   - Ao testar `DeviceVault` ou `MnemonicVault`, inclua sempre uma asserção garantindo que o blob salvo em `localStorage` **não** contém a secret key ou mnemônica em texto plano (`expect(raw).not.toContain(secret)`).
3. **Cabeçalhos de Módulo Significativos:**
   - Todo arquivo criado ou editado deve possuir um cabeçalho `@module` e `@description` explicando a responsabilidade real daquele módulo (nunca use um texto genérico repetido).
4. **Checklist antes de Commit/PR:**
   - `npm run lint` (ESLint 0 erros)
   - `npm test` (todos os projetos `unit` e `integration` verdes)
   - `npm run build` (17 pacotes do monorepo + bundle Vite compilando sem erros)

---

## 👥 Personas de QA

Consulte [docs/qa/PERSONAS.md](../../../docs/qa/PERSONAS.md) ao desenhar fluxos de ponta a ponta:
1. **Ana (Novata Pix):** Onboarding invisível → Passkey → Depósito Pix → Saldo BRL.
2. **Bruno (Investidor):** Swap → Yield (Defindex) → RWA (Etherfuse).
3. **Carla (Recorrente):** Login → Saque Pix → Histórico → Logout seguro.
4. **Diego (Recuperação):** Troca de dispositivo → Seed BIP39 SEP-0005 (`m/44'/148'/0'`) → Mesma chave pública `G...`.
5. **Eva (Adversária):** Adulteração de ciphertext AES-GCM, chaves inválidas, valores negativos e isolamento entre usuários.
