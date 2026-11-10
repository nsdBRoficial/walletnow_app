<!-- @module FUNCTIONAL_REGRESSION_REPORT.md | WalletNow Protocol - Documentação e especificações de engenharia -->

# FUNCTIONAL REGRESSION REPORT — WalletNow RC2
> Gerado em: 2026-06-23 | Sprint: Functional Recovery

---

## LEGENDA DE STATUS

| Símbolo | Significado |
|---------|-------------|
| ✅ OK | Funcionando corretamente |
| ⚠️ PARCIAL | Parcialmente funcional — com limitações |
| ❌ CRÍTICO | Botão/ação fake — não executa nada |
| 🔒 BLOQUEADO | Desabilitado intencionalmente (Mainnet guard) |

---

## 1. DEPOSIT — Modal de Depósito

| Feature | Antes | Agora | Arquivo | Problema | Correção | Status |
|---------|-------|-------|---------|----------|----------|--------|
| Botão "Depositar" abre modal | ✅ | ✅ | `Dashboard.tsx:341` | — | — | ✅ OK |
| Seleção de provider (tela) | ✅ | ✅ | `DepositModal.tsx:822` | — | — | ✅ OK |
| PIX Woovi (gerar cobrança) | ✅ | ✅ | `wooviProvider.ts`, `wooviService.ts` | — | — | ✅ OK |
| PIX → BRZ Mint | ✅ | ✅ | `paymentService.ts:mintBRW` | Nomeia BRW, lógica OK | — | ✅ OK |
| PIX → XLM TestAnchor | ✅ | ✅ | `stellarTestAnchorService.ts` | — | — | ✅ OK |
| Etherfuse V2 (PIX → TESOURO) | ✅ | ✅ | `etherfuseV2ApiService.ts` | — | — | ✅ OK |
| Etherfuse V1 (hospedado) | ✅ | ⚠️ | `etherfuseProvider.ts` | Status `coming_soon` — disabled | Aguardar compliance sandbox | ⚠️ PARCIAL |
| Botão Depositar — MAINNET | ✅ | 🔒 | `Dashboard.tsx:344` | Intencional: Sandbox Only | — | 🔒 INTENCIONAL |

**Veredicto Deposit:** ✅ **Funcional** — 4 providers ativos, 1 em coming_soon intencional.

---

## 2. SOROSWAP — Fluxo de Swap

| Feature | Antes | Agora | Arquivo | Problema | Correção | Status |
|---------|-------|-------|---------|----------|----------|--------|
| Rota `/swap` na Sidebar | ✅ | ✅ | `Sidebar.tsx:244` | Dinâmico via manifesto | — | ✅ OK |
| Manifesto Soroswap registrado | ✅ | ✅ | `IntegrationEngineContext.tsx:165` | — | — | ✅ OK |
| SwapPage renderiza | ✅ | ✅ | `SwapPage.tsx` | — | — | ✅ OK |
| **Botão "Swap" CTA na SwapPage** | ✅ | ❌ | `SwapPage.tsx:284` | `<button>` SEM onClick — apenas disabled | Conectar ao SwapModal ou SwapWidget handler | ❌ CRÍTICO |
| SwapModal (modal antigo) | ✅ | ✅ | `SwapModal.tsx` | Existe mas não está sendo usado na SwapPage | Integrar SwapModal no SwapPage | ⚠️ PARCIAL |
| SwapWidget flip button | ✅ | ✅ | `SwapPage.tsx:135` | `handleFlip` OK | — | ✅ OK |
| Quick Action "Swap" na Home | ✅ | ✅ | `Home.tsx:44` | Navega para `/swap` | — | ✅ OK |
| Oportunidade Soroswap no OpportunityEngine | ✅ | ✅ | `OpportunityEngine.tsx:226` | Navega para `/swap` | — | ✅ OK |
| Slippage settings | ✅ | ✅ | `SwapPage.tsx:132` | — | — | ✅ OK |

**Veredicto Soroswap:** ❌ **Regressão Crítica** — botão "Swap [TOKEN → TOKEN]" na SwapPage não executa ação alguma (sem onClick).

---

## 3. DEFINDEX — Fluxo Yield/Vault

| Feature | Antes | Agora | Arquivo | Problema | Correção | Status |
|---------|-------|-------|---------|----------|----------|--------|
| Rota `/yield` na Sidebar | ✅ | ✅ | `Sidebar.tsx:244` | Dinâmico via manifesto | — | ✅ OK |
| Manifesto Defindex registrado | ✅ | ✅ | `IntegrationEngineContext.tsx:166` | — | — | ✅ OK |
| YieldPage renderiza vaults | ✅ | ✅ | `YieldPage.tsx` | — | — | ✅ OK |
| **Botão "Depositar" no VaultCard** | ✅ | ❌ | `YieldPage.tsx:98-108` | `<button>` SEM onClick — não abre modal, não executa ação | Conectar ao DepositModal ou modal específico Defindex | ❌ CRÍTICO |
| **Botão "Ver no explorer" no VaultCard** | ✅ | ❌ | `YieldPage.tsx:109-111` | `<button>` SEM onClick e SEM href — não faz nada | Passar explorerUrl do vault | ❌ CRÍTICO |
| Quick Action "Investir" na Home | ✅ | ✅ | `Home.tsx:43` | Navega para `/yield` | — | ✅ OK |
| Oportunidade Defindex no OpportunityEngine | ✅ | ✅ | `OpportunityEngine.tsx:185` | Navega para `/yield` | — | ✅ OK |
| getVaults() via capability | ✅ | ⚠️ | `IntegrationEngineContext.tsx:147` | Provider mockado retorna `[]` — sem dados reais | Integrar com DefindexPlugin real | ⚠️ PARCIAL |

**Veredicto Defindex:** ❌ **Regressão Crítica** — botões "Depositar" e "Explorer" no VaultCard são completamente inertes.

---

## 4. ETHERFUSE — Fluxo RWA

| Feature | Antes | Agora | Arquivo | Problema | Correção | Status |
|---------|-------|-------|---------|----------|----------|--------|
| Rota `/rwa` na Sidebar | ✅ | ✅ | `Sidebar.tsx:244` | Dinâmico via manifesto | — | ✅ OK |
| Manifesto Etherfuse registrado | ✅ | ✅ | `IntegrationEngineContext.tsx:167` | — | — | ✅ OK |
| RWAPage renderiza assets | ✅ | ✅ | `RWAPage.tsx` | — | — | ✅ OK |
| **Botão "Investir via PIX" no RWAAssetCard** | ✅ | ❌ | `RWAPage.tsx:150-162` | `onClick={e => { e.stopPropagation(); }}` — não executa ação alguma | Abrir DepositModal com provider Etherfuse pré-selecionado | ❌ CRÍTICO |
| Quick Action "Comprar RWA" na Home | ✅ | ✅ | `Home.tsx:46` | Navega para `/rwa` | — | ✅ OK |
| Oportunidade Etherfuse no OpportunityEngine | ✅ | ✅ | `OpportunityEngine.tsx:110` | Navega para `/rwa` | — | ✅ OK |
| getAvailableAssets() via capability | ✅ | ⚠️ | `IntegrationEngineContext.tsx:149` | Provider mockado retorna `[]` — sem dados reais | Integrar com EtherfusePlugin real | ⚠️ PARCIAL |
| Banner PIX Onramp | ✅ | ✅ | `RWAPage.tsx:241` | Renderiza mas sem botão de ação | Adicionar botão que abre DepositModal | ⚠️ PARCIAL |

**Veredicto Etherfuse:** ❌ **Regressão Crítica** — botão "Investir via PIX" é fake (só faz stopPropagation).

---

## 5. PORTFOLIO — Atualização e Refresh

| Feature | Antes | Agora | Arquivo | Problema | Correção | Status |
|---------|-------|-------|---------|----------|----------|--------|
| Botão "Atualizar" | ✅ | ✅ | `PortfolioPage.tsx:271` | Chama `load()` — funcional | — | ✅ OK |
| Link "Explorer" | ✅ | ✅ | `PortfolioPage.tsx:260` | Link `stellar.expert` — funcional | — | ✅ OK |
| Carregamento de balances | ✅ | ✅ | `PortfolioPage.tsx:162` | `WalletFactory.getBalances()` | — | ✅ OK |
| Assets exibidos (XLM, USDC, TESOURO, BRW) | ✅ | ✅ | `PortfolioPage.tsx:165` | — | — | ✅ OK |
| Protocolos integrados | ✅ | ✅ | `PortfolioPage.tsx:306` | Via manifesto | — | ✅ OK |

**Veredicto Portfolio:** ✅ **Funcional** — sem regressões.

---

## 6. DASHBOARD / HOME — Quick Actions

| Feature | Antes | Agora | Arquivo | Problema | Correção | Status |
|---------|-------|-------|---------|----------|----------|--------|
| Quick Action "Investir" → `/yield` | ✅ | ✅ | `Home.tsx:43` | Navega para `/yield` | — | ✅ OK |
| Quick Action "Swap" → `/swap` | ✅ | ✅ | `Home.tsx:44` | Navega para `/swap` | — | ✅ OK |
| Quick Action "Receber" → `/activity` | ✅ | ⚠️ | `Home.tsx:45` | Navega para `/activity` em vez de abrir modal Receber | Deveria abrir ReceiveCryptoModal | ⚠️ PARCIAL |
| Quick Action "Comprar RWA" → `/rwa` | ✅ | ✅ | `Home.tsx:46` | Navega para `/rwa` | — | ✅ OK |
| Botão "Depositar" na tela Dashboard | ✅ | ✅ | `Dashboard.tsx:341` | Abre DepositModal | — | ✅ OK |
| Botão "Sacar BRW" | ✅ | ✅ | `Dashboard.tsx:364` | Abre SacarModal | — | ✅ OK |
| Botão "Off-Ramp XLM" | ✅ | ✅ | `Dashboard.tsx:378` | Abre WithdrawModal | — | ✅ OK |
| Botão "Ver tudo" no histórico | ✅ | ⚠️ | `Dashboard.tsx:495` | `<button>` SEM onClick — não navega para nada | Adicionar `onClick={() => navigate('/activity')}` | ❌ CRÍTICO |

**Veredicto Dashboard:** ⚠️ **Regressão Parcial** — 1 botão fake identificado.

---

## 7. SIDEBAR — Navegação

| Feature | Antes | Agora | Arquivo | Problema | Correção | Status |
|---------|-------|-------|---------|----------|----------|--------|
| Dashboard (→ `/home`) | ✅ | ✅ | `Sidebar.tsx:230` | NavLink funcional | — | ✅ OK |
| Portfolio (→ `/portfolio`) | ✅ | ✅ | `Sidebar.tsx:235` | NavLink funcional | — | ✅ OK |
| Swap (→ `/swap`) | ✅ | ✅ | `Sidebar.tsx:243` | Dinâmico via manifesto | — | ✅ OK |
| Yield (→ `/yield`) | ✅ | ✅ | `Sidebar.tsx:243` | Dinâmico via manifesto | — | ✅ OK |
| RWA (→ `/rwa`) | ✅ | ✅ | `Sidebar.tsx:243` | Dinâmico via manifesto | — | ✅ OK |
| Atividade (→ `/activity`) | ✅ | ✅ | `Sidebar.tsx:254` | NavLink funcional | — | ✅ OK |
| Configurações (→ `/settings`) | ✅ | ✅ | `Sidebar.tsx:259` | NavLink funcional | — | ✅ OK |
| Wallet AI | ✅ | ⚠️ | `Sidebar.tsx:266` | `comingSoon: true` — desabilitado — sem rota | Aceito como intencional (feature futura) | ⚠️ INTENCIONAL |

**Veredicto Sidebar:** ✅ **Funcional** — todas as rotas navegam corretamente.

---

## 8. WALLET CONNECT — Contexto e Autenticação

| Feature | Antes | Agora | Arquivo | Problema | Correção | Status |
|---------|-------|-------|---------|----------|----------|--------|
| WalletContext — conta ativa | ✅ | ✅ | `WalletContext.tsx` | `activeAccount` funcional | — | ✅ OK |
| AuthContext — user/profile | ✅ | ✅ | `AuthContext.tsx` | — | — | ✅ OK |
| NetworkContext — mainnet/testnet | ✅ | ✅ | `NetworkContext.tsx` | — | — | ✅ OK |
| AccountSwitcher | ✅ | ✅ | `Dashboard.tsx:272` | Componente funcional | — | ✅ OK |
| NetworkToggle | ✅ | ✅ | `Dashboard.tsx:273` | Componente funcional | — | ✅ OK |

**Veredicto Wallet Connect:** ✅ **Funcional** — sem regressões.

---

## 9. INTEGRATION ENGINE — Discovery/Capabilities/Providers

| Feature | Antes | Agora | Arquivo | Problema | Correção | Status |
|---------|-------|-------|---------|----------|----------|--------|
| Registro Soroswap Manifest | ✅ | ✅ | `IntegrationEngineContext.tsx:165` | — | — | ✅ OK |
| Registro Defindex Manifest | ✅ | ✅ | `IntegrationEngineContext.tsx:166` | — | — | ✅ OK |
| Registro Etherfuse Manifest | ✅ | ✅ | `IntegrationEngineContext.tsx:167` | — | — | ✅ OK |
| DiscoveryService.getDiscoveredManifests() | ✅ | ✅ | `IntegrationEngineContext.tsx:172` | — | — | ✅ OK |
| HealthMonitor subscrição | ✅ | ✅ | `IntegrationEngineContext.tsx:183` | — | — | ✅ OK |
| **getCapability() — providers reais** | ✅ | ❌ | `IntegrationEngineContext.tsx:146` | Retorna provider mockado com `getVaults: async () => []` — dados sempre vazios | Conectar aos plugins reais (Defindex, Etherfuse) | ❌ CRÍTICO |
| Sidebar dinâmica via byCategory | ✅ | ✅ | `Sidebar.tsx:243` | Filtra por categoria do manifesto | — | ✅ OK |

**Veredicto Integration Engine:** ❌ **Regressão Crítica** — `getCapability()` retorna mock vazio. VaultList e RWAAssetList nunca mostram dados reais.

---

## 10. OPPORTUNITY ENGINE — Cards de Oportunidade

| Feature | Antes | Agora | Arquivo | Problema | Correção | Status |
|---------|-------|-------|---------|----------|----------|--------|
| Cards exibem oportunidades | ✅ | ✅ | `OpportunityEngine.tsx:29` | Fallbacks estáticos sempre exibidos | — | ✅ OK |
| Card Defindex → `/yield` | ✅ | ✅ | `OpportunityEngine.tsx:185` | `navigate(opp.route)` funcional | — | ✅ OK |
| Card Etherfuse → `/rwa` | ✅ | ✅ | `OpportunityEngine.tsx:185` | `navigate(opp.route)` funcional | — | ✅ OK |
| Card Soroswap → `/swap` | ✅ | ✅ | `OpportunityEngine.tsx:185` | `navigate(opp.route)` funcional | — | ✅ OK |
| Botão ação em cada card | ✅ | ✅ | `OpportunityEngine.tsx:226` | `e.stopPropagation(); navigate(opp.route)` — funcional | — | ✅ OK |
| Dados reais via capability | ✅ | ⚠️ | `OpportunityEngine.tsx:73` | `getCapability()` retorna mock → fallback estático sempre ativo | Depende da correção do Integration Engine | ⚠️ PARCIAL |

**Veredicto Opportunity Engine:** ✅ **Navegação OK** — cards navegam. Dados são estáticos (fallback), mas ação funciona.

---

## RESUMO EXECUTIVO — REGRESSÕES CRÍTICAS

### ❌ 4 REGRESSÕES CRÍTICAS IDENTIFICADAS

| # | Feature | Arquivo | Linha | Problema |
|---|---------|---------|-------|----------|
| 1 | **Botão Swap CTA** | `SwapPage.tsx` | L284 | `<button>` sem `onClick` — não executa swap |
| 2 | **Botão Depositar no VaultCard** | `YieldPage.tsx` | L98 | `<button>` sem `onClick` — não abre modal |
| 3 | **Botão Investir via PIX no RWAAssetCard** | `RWAPage.tsx` | L150 | `onClick` só faz `stopPropagation()` — fake |
| 4 | **Botão "Ver tudo" no Histórico** | `Dashboard.tsx` | L495 | `<button>` sem `onClick` — não navega |

### ⚠️ 3 REGRESSÕES PARCIAIS

| # | Feature | Arquivo | Problema |
|---|---------|---------|----------|
| 1 | **Quick Action "Receber"** | `Home.tsx:45` | Navega para `/activity` em vez de abrir modal de recebimento |
| 2 | **Banner PIX no RWAPage** | `RWAPage.tsx:241` | Sem botão de ação concreto |
| 3 | **Integration Engine getCapability()** | `IntegrationEngineContext.tsx:146` | Provider mockado — vaults e assets sempre vazios |

### ❌ BOTÕES EXPLORER INERTES NO YIELDPAGE

| # | Feature | Arquivo | Linha | Problema |
|---|---------|---------|-------|----------|
| 5 | **Botão "Ver no explorer" no VaultCard** | `YieldPage.tsx` | L109 | `<button>` sem `onClick` e sem `href` |

---

## PLANO DE CORREÇÕES (por prioridade)

### PRIORIDADE 1 — BOTÕES CRÍTICOS (executar agora)

#### Correção 1: SwapPage.tsx — Botão Swap CTA
```tsx
// ANTES (linha 284) — sem onClick
<button
  className="btn btn-primary"
  style={{ width: '100%', padding: '13px', fontSize: 14 }}
  disabled={!amount || parseFloat(amount) <= 0}
>

// DEPOIS — com estado de swap e handler
const [isSwapping, setIsSwapping] = useState(false);
const handleSwap = async () => {
  // Conectar ao SwapModal handler ou ao SwapWidget handler
};

<button
  className="btn btn-primary"
  style={{ width: '100%', padding: '13px', fontSize: 14 }}
  disabled={!amount || parseFloat(amount) <= 0 || isSwapping}
  onClick={handleSwap}
>
```

#### Correção 2: YieldPage.tsx — Botão Depositar no VaultCard
```tsx
// ANTES (linha 98) — sem onClick
<button className="btn btn-sm" style={...}>
  Depositar
</button>

// DEPOIS — abre DepositModal ou navega para Deposit
<button
  className="btn btn-sm"
  style={...}
  onClick={() => navigate('/dashboard')} // ou setIsDepositOpen(true)
>
  Depositar
</button>
```

#### Correção 3: RWAPage.tsx — Botão Investir via PIX
```tsx
// ANTES (linha 158) — fake
onClick={e => { e.stopPropagation(); }}

// DEPOIS — abre DepositModal
onClick={e => { e.stopPropagation(); setIsDepositOpen(true); }}
```

#### Correção 4: Dashboard.tsx — Botão "Ver tudo" Histórico
```tsx
// ANTES (linha 495) — sem onClick
<button className="text-sm text-[#00E676] ...">
  <History className="w-4 h-4" />
  Ver tudo
</button>

// DEPOIS
<button
  onClick={() => navigate('/activity')}
  className="text-sm text-[#00E676] ..."
>
  <History className="w-4 h-4" />
  Ver tudo
</button>
```

---

## GATE DE APROVAÇÃO — STATUS ATUAL

| Gate | Status |
|------|--------|
| ✓ Todos os botões executam ações | ❌ Pendente (4 botões críticos) |
| ✓ Nenhum fluxo antigo foi perdido | ✅ Fluxos existem |
| ✓ Deposit voltou a funcionar | ✅ OK |
| ✓ Soroswap voltou a funcionar | ❌ Botão CTA não executa |
| ✓ Defindex voltou a funcionar | ❌ Botão Depositar não executa |
| ✓ Etherfuse voltou a funcionar | ❌ Botão Investir via PIX não executa |
| ✓ TestAnchor voltou | ✅ OK (active no provider list) |
| ✓ PIX Woovi voltou | ✅ OK |
| ✓ Mint BRZ voltou | ✅ OK |
| ✓ Dashboard executa ações | ⚠️ Parcial (1 botão fake) |
| ✓ Sidebar navega corretamente | ✅ OK |
| ✓ Nenhum botão é fake | ❌ Pendente (4+ botões) |
