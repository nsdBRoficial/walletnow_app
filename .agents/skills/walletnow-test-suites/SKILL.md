---
name: walletnow-test-suites
description: Orquestra e gera a implementação das 3 Suítes de Teste Core da WalletNow: Suíte 1 (Estabilização e Integração do SDK com Vitest/TS), Suíte 2 (Onboarding Passkeys, Pix/SEP-24 e A11y em E2E/Componentes) e Suíte 3 (Roteamento Atômico Soroban, Meta-transações e Proteção do Relayer).
version: 1.0.0
triggers:
  - "executar suítes walletnow"
  - "gerar suíte 1 sdk"
  - "gerar suíte 2 e2e"
  - "gerar suíte 3 soroban"
  - "testar pacotes monorepo walletnow"
  - "testar roteamento atômico soroswap"
  - "criar testes de estabilização walletnow"
---

# Skill: Suítes de Teste Core do Ecossistema WalletNow

## 1. Contexto e Diretriz Principal

Quando esta skill for acionada no Antigravity, seu objetivo é projetar, implementar ou auditar os testes automatizados da **WalletNow** divididos em **3 Suítes Arquiteturais**. 

Você deve garantir que os testes não apenas verifiquem o "caminho feliz", mas validem rigorosamente a resiliência de rede, a integridade do monorepo de 13 pacotes, a reatividade da interface e a atomicidade dos contratos inteligentes Soroban.

---

## 2. Especificação das 3 Suítes de Teste

### 📦 Suíte 1: Estabilização e Integração do SDK (Vitest / TypeScript)
Focada na robustez dos pacotes base, resiliência de rede e saúde arquitetural do monorepo.

* **1.1. Inicialização e Validação de Configuração (`@walletnow/core` e `@walletnow/crypto`):**
  * **Cenário:** Inicializar os módulos com chaves ausentes, malformadas, redes inexistentes ou parâmetros incompatíveis.
  * **Critério de Aceitação:** O SDK deve falhar rapidamente (*fail-fast*) lançando instâncias tipadas de erro (ex: `WalletNowConfigError`) com mensagens descritivas, amigáveis e sem expor dados sensíveis ou *stack traces* internos obscuros.
* **1.2. Resiliência de Rede e Retentativas (`TestnetKit` + RPC Stellar):**
  * **Cenário:** Automatizar chamadas ao `TestnetKit` injetando falhas simuladas de rede, incluindo *timeouts* de conexão e respostas `HTTP 500 / 502 / 503` do nó RPC da Stellar.
  * **Critério de Aceitação:** Validar que o mecanismo de *retry* (com *exponential backoff* e *jitter*) executa o número exato de tentativas configuradas antes de abortar ou recupera a execução caso o RPC volte a responder na 2ª/3ª tentativa.
* **1.3. Integridade do Monorepo (Zero Dependências Circulares):**
  * **Cenário:** Realizar a importação dinâmica e estática simulada de todos os **13 pacotes do monorepo** em um contexto Node.js limpo e isolado.
  * **Critério de Aceitação:** Nenhum pacote pode apresentar referências `undefined` em tempo de carregamento ou ciclos no grafo de resolução de módulos (`madge` / importação sequencial limpa).

---

### 📱 Suíte 2: Onboarding e Abstração do Usuário (E2E / Componentes)
Focada na experiência do usuário final, fluxos biométricos, rampas fiat (Pix) e acessibilidade móvel.

* **2.1. Criação de Carteira via Passkeys (`@walletnow/identity`):**
  * **Cenário:** Simular a API WebAuthn (`navigator.credentials.create` / `get`) em três estados distintos:
    1. **Sucesso:** Assinatura biométrica concluída e chave pública registrada.
    2. **Cancelamento pelo Usuário (`NotAllowedError`):** Usuário fecha o modal biomivo do sistema operacional.
    3. **Falha de Hardware (`NotSupportedError` / `InvalidStateError`):** Dispositivo sem autenticador compatível ou falha no leitor biométrico.
  * **Critério de Aceitação:** A UI deve exibir estados claros para cada cenário, permitindo nova tentativa imediata após cancelamento e oferecendo *fallback* amigável em caso de falha de hardware.
* **2.2. Reatividade do Simulador de Depósitos (Pix / SEP-24):**
  * **Cenário:** Simular a transição de status do depósito no back-end (`pending_user_transfer_start` $\rightarrow$ `pending_anchor` $\rightarrow$ `completed`).
  * **Critério de Aceitação:** O front-end (via WebSocket, SSE ou *polling* otimizado) deve refletir a mudança de status e atualizar o saldo exibido na carteira imediatamente, sem exigir recarregamento manual da página.
* **2.3. Responsividade e Acessibilidade Mobile (Checkout A11y):**
  * **Cenário:** Renderizar os componentes de checkout em *viewports* mobile (ex: $320\text{px} \times 568\text{px}$ e $390\text{px} \times 844\text{px}$).
  * **Critério de Aceitação:** Zero violações críticas no `axe-core` (WCAG 2.1 AA), áreas de toque mínimas respeitadas, navegação por leitor de tela/foco funcional e ausência de *overflow* horizontal.

---

### ⛓️ Suíte 3: Infraestrutura e Contratos Inteligentes Soroban (Lógica de Negócios)
Focada em segurança on-chain, atomicidade transacional e proteção financeira do Relayer.

* **3.1. Roteamento Atômico (Trustline + Swap na Soroswap):**
  * **Cenário:** Construir uma operação composta (criação de *trustline* + *swap* de ativos na Soroswap) e forçar uma falha intencional na primeira etapa ou no meio da execução.
  * **Critério de Aceitação:** A transação inteira deve operar sob semântica *all-or-nothing*. Se a *trustline* falhar, o *swap* na Soroswap deve ser completamente revertido (nenhum estado parcial alterado on-chain).
* **3.2. Rejeição de Meta-Transações Inválidas ou Expiradas:**
  * **Cenário:** Injetar no contrato inteligente Soroban um payload de meta-transação com assinatura criptográfica adulterada, *nonce* repetido ou *timestamp*/*ledger* de expiração vencido.
  * **Critério de Aceitação:** O contrato Soroban deve rejeitar a invocação sumariamente no estágio de validação (`__check_auth` / verificação customizada), retornando o código de erro de contrato esperado.
* **3.3. Proteção contra Esgotamento da Conta Patrocinadora (Relayer Pre-flight Check):**
  * **Cenário:** Simular o estado em que a carteira patrocinadora do Relayer atinge o limite mínimo crítico de saldo de XLM.
  * **Critério de Aceitação:** O motor do Relayer deve barrar novas submissões *off-chain* (retornando erro de serviço controlado e disparando alerta interno) **antes** de assinar ou transmitir o *Fee Bump* para a rede Stellar, evitando falhas on-chain (`txINSUFFICIENT_BALANCE`) e desperdício de recursos.

---

## 3. Fluxo de Execução para o Agente Antigravity

Ao ser solicitado para criar ou atualizar testes usando esta skill:

1. **Identifique a Suíte Alvo:** Verifique se o pedido abrange a Suíte 1 (SDK/Unit/Integration), Suíte 2 (UI/E2E) ou Suíte 3 (Soroban/Relayer), ou todas simultaneamente.
2. **Isolamento de Ambiente:** Utilize mocks determinísticos para WebAuthn, interceptadores HTTP (`msw` ou `vi.spyOn`) para falhas 500/timeout do RPC Stellar, e ambientes locais do `TestnetKit` para contratos Soroban.
3. **Padrão de Código:** Gere arquivos de teste prontos para execução com `vitest` (e `@testing-library` / `playwright` quando na Suíte 2), incluindo asserções explícitas para cada item descrito na especificação.

---

## 4. Templates de Implementação por Suíte

### 🧪 Template — Suíte 1: SDK, Retry e Monorepo (`suite1-sdk.spec.ts`)

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WalletNowCore } from '@walletnow/core';
import { WalletNowCrypto } from '@walletnow/crypto';
import { TestnetKit } from '@walletnow/testnet-kit';

const MONOREPO_PACKAGES = [
  '@walletnow/core',
  '@walletnow/crypto',
  '@walletnow/identity',
  '@walletnow/relayer-client',
  '@walletnow/soroban',
  '@walletnow/sep24',
  '@walletnow/ui',
  '@walletnow/checkout',
  '@walletnow/testnet-kit',
  '@walletnow/types',
  '@walletnow/utils',
  '@walletnow/storage',
  '@walletnow/logger',
];

describe('Suíte 1: Estabilização e Integração do SDK', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('1.1 deve retornar erros descritivos e amigáveis ao inicializar com chaves inválidas', () => {
    expect(() => new WalletNowCore({ apiKey: '', network: 'invalid_net' as any })).toThrowError(
      expect.objectContaining({
        name: 'WalletNowConfigError',
        message: expect.stringMatching(/chave de configuração inválida|rede não suportada/i),
      })
    );

    expect(() => WalletNowCrypto.init({ encryptionKey: 'curta' })).toThrowError(
      expect.objectContaining({
        code: 'INVALID_CRYPTO_CONFIG',
      })
    );
  });

  it('1.2 deve executar retentativas (retry) no TestnetKit diante de timeouts e erros 500 do RPC Stellar', async () => {
    const rpcSpy = vi.fn()
      .mockRejectedValueOnce(new Error('ETIMEDOUT'))
      .mockRejectedValueOnce({ status: 500, message: 'Internal Server Error' })
      .mockResolvedValueOnce({ status: 'SUCCESS', ledger: 1024 });

    const kit = new TestnetKit({ rpcHandler: rpcSpy, maxRetries: 3, retryDelayMs: 10 });
    const result = await kit.pingNetwork();

    expect(rpcSpy).toHaveBeenCalledTimes(3);
    expect(result.status).toBe('SUCCESS');
  });

  it('1.3 deve importar todos os 13 pacotes do monorepo sem dependências circulares', async () => {
    for (const pkgName of MONOREPO_PACKAGES) {
      const moduleExports = await import(pkgName);
      expect(moduleExports).toBeDefined();
      expect(Object.keys(moduleExports).length).toBeGreaterThan(0);
    }
  });
});
```

### 🧪 Template — Suíte 2: Passkeys, Pix SEP-24 e A11y Mobile (`suite2-onboarding.spec.tsx`)

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { PasskeyOnboarding, PixDepositSimulator, CheckoutModal } from '@walletnow/ui';

describe('Suíte 2: Onboarding e Abstração do Usuário', () => {
  it('2.1 deve tratar sucesso, cancelamento do usuário e falha de hardware no fluxo de Passkeys', async () => {
    const createMock = vi.fn();
    Object.defineProperty(window.navigator, 'credentials', {
      value: { create: createMock },
      configurable: true,
    });

    const { rerender } = render(<PasskeyOnboarding />);

    // Cenário A: Cancelamento pelo usuário
    createMock.mockRejectedValueOnce(new DOMException('User cancelled', 'NotAllowedError'));
    fireEvent.click(screen.getByRole('button', { name: /criar carteira/i }));
    expect(await screen.findByText(/autenticação cancelada/i)).toBeInTheDocument();

    // Cenário B: Falha de hardware
    createMock.mockRejectedValueOnce(new DOMException('Hardware error', 'NotSupportedError'));
    fireEvent.click(screen.getByRole('button', { name: /tentar novamente/i }));
    expect(await screen.findByText(/dispositivo não suporta biometria/i)).toBeInTheDocument();

    // Cenário C: Sucesso
    createMock.mockResolvedValueOnce({ id: 'passkey-123', rawId: new ArrayBuffer(8) });
    rerender(<PasskeyOnboarding />);
    fireEvent.click(screen.getByRole('button', { name: /tentar novamente/i }));
    expect(await screen.findByText(/carteira criada com sucesso/i)).toBeInTheDocument();
  });

  it('2.2 deve atualizar o saldo imediatamente na UI quando o status SEP-24/Pix mudar no back-end', async () => {
    const { emitBackendUpdate } = render(<PixDepositSimulator initialBalance={0} />);
    expect(screen.getByTestId('wallet-balance')).toHaveTextContent('R$ 0,00');

    emitBackendUpdate({ status: 'completed', amount: 150.0 });

    await waitFor(() => {
      expect(screen.getByTestId('wallet-balance')).toHaveTextContent('R$ 150,00');
    });
  });

  it('2.3 deve garantir responsividade mobile e conformidade de acessibilidade (a11y) no checkout', async () => {
    window.innerWidth = 375;
    window.innerHeight = 667;
    window.dispatchEvent(new Event('resize'));

    const { container } = render(<CheckoutModal amount={50} asset="BRL" />);
    const a11yResults = await axe(container);

    expect(a11yResults.violations).toHaveLength(0);
  });
});
```

### 🧪 Template — Suíte 3: Soroban Atômico e Relayer (`suite3-soroban-relayer.spec.ts`)

```typescript
import { describe, it, expect } from 'vitest';
import { TestnetKit } from '@walletnow/testnet-kit';
import { AtomicRouter, SorobanAuthError } from '@walletnow/soroban';
import { RelayerEngine } from '@walletnow/relayer-client';

describe('Suíte 3: Infraestrutura e Contratos Inteligentes Soroban', () => {
  it('3.1 deve reverter completamente o swap na Soroswap se a criação da trustline falhar', async () => {
    const kit = await TestnetKit.createIsolatedEnv();
    const router = new AtomicRouter(kit);

    await expect(
      router.executeTrustlineAndSwap({
        asset: 'USDC',
        simulateTrustlineFailure: true,
        swapAmount: 100,
      })
    ).rejects.toThrow(/ATOMIC_EXECUTION_REVERTED/);

    const swapPoolState = await kit.getSoroswapPoolState();
    expect(swapPoolState.lastTxExecuted).toBeNull();
  });

  it('3.2 deve rejeitar sumariamente no contrato Soroban uma meta-transação com assinatura expirada ou inválida', async () => {
    const kit = await TestnetKit.createIsolatedEnv();
    const expiredMetaTx = await kit.buildMetaTransaction({
      signature: '0xdeadbeef_invalid',
      validUntilLedger: kit.currentLedger - 10,
    });

    await expect(kit.invokeContract('wallet_router', expiredMetaTx)).rejects.toThrowError(
      SorobanAuthError
    );
  });

  it('3.3 deve barrar novas submissões off-chain quando a conta patrocinadora do Relayer atingir saldo crítico', async () => {
    const relayer = new RelayerEngine({
      sponsorBalanceXlm: 1.5, // Abaixo do threshold mínimo de segurança (ex: 5 XLM)
      minSafeBalanceXlm: 5.0,
    });

    const onChainSubmitSpy = relayer.spyOnNetworkBroadcast();

    await expect(relayer.sponsorTransaction({ xdr: 'AAAA...' })).rejects.toThrow(
      /RELAYER_SPONSOR_EXHAUSTED_PREFLIGHT/
    );

    // Garante que nenhuma chamada foi enviada à rede Stellar on-chain
    expect(onChainSubmitSpy).not.toHaveBeenCalled();
  });
});
```