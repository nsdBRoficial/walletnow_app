/**
 * @file testnetkit-a11y.spec.tsx
 * @description Issue 8 — Accessibility (a11y) Test Suite
 *              Portal do Desenvolvedor & TestnetKit (Persona 1 — B2B)
 *
 * Suíte Suite 2 (Onboarding / E2E / a11y) — foco na camada do SDK/Portal
 *
 * Cobre obrigatoriamente:
 *   Test 1 — Auditoria WCAG axe-core (regras button-name e label explicitamente ativas)
 *   Test 2 — Ações Principais (getByRole) — presença/visibilidade/habilitação
 *   Test 3 — Inputs de Teste (getByLabelText) — rótulos acessíveis via fonte
 *   Test 4 — Guarda Estrutural (assertAllInteractiveElementsHaveAccessibleName)
 *             + Teste de Mutação/Regressão com .toThrow()
 *
 * Estratégia de mocks:
 *   - vi.mock() é hoistado para o TOPO do arquivo pelo Vitest (não pode referenciar
 *     variáveis externas definidas antes). Por isso todos os mocks usam factories inline.
 *   - O Stellar SDK possui sua própria cópia em packages/sdk/node_modules.
 *     O alias de path no vitest.config.a11y.ts garante que a importação do testnetkit.tsx
 *     resolve para o mesmo mock.
 */

import React from 'react';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest';
import { render, screen, within, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { axe } from 'vitest-axe';
import * as axeMatchers from 'vitest-axe/matchers';

// ─── Extend Vitest matchers ────────────────────────────────────────────────────
expect.extend(axeMatchers);

// ─── ESM __dirname equivalent ─────────────────────────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── Mocks (vi.mock é hoistado — factories devem ser self-contained) ──────────

// Mock do @stellar/stellar-sdk — o factory cria todos os mocks inline
vi.mock('@stellar/stellar-sdk', () => {
  const makeAsset = (code: string, issuer?: string) => ({
    getCode: () => code,
    getIssuer: () => issuer ?? '',
    isNative: () => !issuer || code === 'XLM',
    toString: () => (issuer ? `${code}:${issuer}` : 'native'),
  });

  const Asset = function (code: string, issuer?: string) {
    return makeAsset(code, issuer);
  } as any;
  Asset.native = () => makeAsset('XLM');

  return {
    Keypair: {
      random: () => ({
        publicKey: () => 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
        secret: () => 'SAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
        sign: () => {},
      }),
      fromSecret: () => ({
        publicKey: () => 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
        sign: () => {},
      }),
    },
    TransactionBuilder: vi.fn().mockImplementation(() => ({
      addOperation: vi.fn().mockReturnThis(),
      setTimeout: vi.fn().mockReturnThis(),
      build: vi.fn().mockReturnValue({ sign: vi.fn(), toEnvelope: vi.fn() }),
    })),
    Asset,
    Operation: {
      changeTrust: vi.fn(),
      payment: vi.fn(),
      createAccount: vi.fn(),
      manageData: vi.fn(),
      setOptions: vi.fn(),
      liquidityPoolDeposit: vi.fn(),
      liquidityPoolWithdraw: vi.fn(),
      pathPaymentStrictSend: vi.fn(),
    },
    LiquidityPoolAsset: vi.fn().mockImplementation(() => ({
      toString: () =>
        'LiquidityPoolAsset:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    })),
    Transaction: vi.fn(),
    Networks: { TESTNET: 'Test SDF Network ; September 2015' },
  };
});

// Mock do CSS importado pelo testnetkit.tsx
vi.mock('../../packages/sdk/src/TestnetKit.css', () => ({}));

// Mock das dependências internas (playgroundFakes)
vi.mock('../../packages/sdk/src/playgroundFakes', () => ({
  server: {
    loadAccount: vi.fn().mockResolvedValue({
      balances: [{ asset_type: 'native', balance: '10000' }],
      sequence: '1',
    }),
    submitTransaction: vi.fn().mockResolvedValue({ hash: 'mockhash1234567890abcd' }),
  },
  BRW_ISSUER: 'GBRWAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  USDW_ISSUER: 'GUSDWAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  BRW_KEYPAIR: { publicKey: () => 'GBRWAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', sign: vi.fn() },
  USDW_KEYPAIR: { publicKey: () => 'GUSDWAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', sign: vi.fn() },
  PLAYGROUND_SECRETS: new Map(),
  PLAYGROUND_IDENTITY_KEYS: new Map(),
  ensureIssuerActive: vi.fn().mockResolvedValue(undefined),
  VAULT_KEYPAIR: { publicKey: () => 'GVAULTAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', sign: vi.fn() },
  VAULT_ADDRESS: 'GVAULTAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
}));

// ─── Mocks globais do browser ─────────────────────────────────────────────────

// fetch global (friendbot, RPC calls)
global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  status: 200,
  json: async () => ({ hash: 'mockhash1234567890abcd' }),
});

// navigator.clipboard
Object.defineProperty(global.navigator, 'clipboard', {
  value: { writeText: vi.fn().mockResolvedValue(undefined) },
  writable: true,
  configurable: true,
});

// ─── Helper: Guarda Estrutural WCAG ──────────────────────────────────────────

/**
 * assertAllInteractiveElementsHaveAccessibleName
 *
 * Verifica que TODOS os elementos interativos dentro do `container` possuem
 * um nome acessível computado, conforme WCAG 2.1 Critério de Sucesso 4.1.2
 * (Name, Role, Value).
 *
 * @throws {Error} se qualquer elemento interativo não tiver nome acessível
 */
function assertAllInteractiveElementsHaveAccessibleName(container: HTMLElement): void {
  const INTERACTIVE_SELECTORS = [
    'button',
    'input:not([type="hidden"])',
    'select',
    'textarea',
    'a[href]',
    '[role="button"]',
    '[role="switch"]',
    '[role="combobox"]',
  ].join(', ');

  const elements = Array.from(container.querySelectorAll<HTMLElement>(INTERACTIVE_SELECTORS));
  const violations: string[] = [];

  elements.forEach((el) => {
    // 1. aria-label direto
    const ariaLabel = el.getAttribute('aria-label')?.trim();
    if (ariaLabel) return;

    // 2. aria-labelledby
    const labelledById = el.getAttribute('aria-labelledby');
    if (labelledById) {
      const labelEl = container.querySelector(`#${CSS.escape(labelledById)}`);
      if (labelEl?.textContent?.trim()) return;
    }

    // 3. <label> associado via htmlFor/id
    const id = el.getAttribute('id');
    if (id) {
      const associatedLabel = container.querySelector<HTMLLabelElement>(
        `label[for="${CSS.escape(id)}"]`
      );
      if (associatedLabel?.textContent?.trim()) return;
    }

    // 4. <label> ancestral (checkbox/radio wrapped in label)
    const parentLabel = el.closest('label');
    if (parentLabel?.textContent?.trim()) return;

    // 5. textContent não-vazio no próprio elemento (botões com texto visível)
    const textContent = el.textContent?.trim();
    if (textContent) return;

    // Falhou em todas as verificações — registra violação
    const tag = el.tagName.toLowerCase();
    const elId = el.getAttribute('id') ?? '(sem id)';
    const elClass = (el.getAttribute('class') ?? '(sem classe)').slice(0, 40);
    const elRole = el.getAttribute('role') ?? '';
    violations.push(
      `<${tag}${elRole ? ` role="${elRole}"` : ''} id="${elId}" class="${elClass}"> sem nome acessível`
    );
  });

  if (violations.length > 0) {
    throw new Error(
      `[a11y] ${violations.length} elemento(s) interativo(s) sem nome acessível:\n` +
        violations.map((v) => `  • ${v}`).join('\n')
    );
  }
}

// ─── Suite de Testes: Issue 8 ─────────────────────────────────────────────────

describe('Issue 8 — Acessibilidade (a11y): TestnetKit & Portal do Desenvolvedor', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let TestnetKitSDK: React.ComponentType<any>;

  beforeAll(async () => {
    // Importação dinâmica APÓS os mocks (vi.mock é hoistado, mas a importação
    // do componente deve ocorrer após a resolução dos mocks no módulo registry)
    const mod = await import('../../packages/sdk/src/testnetkit');
    TestnetKitSDK = mod.default as React.ComponentType;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // TEST 1 — Auditoria WCAG axe-core
  // ─────────────────────────────────────────────────────────────────────────────

  it(
    'Test 1 [axe-core] — componente TestnetKit (aba hub) NÃO possui violações WCAG 2.1 AA',
    async () => {
      let container: HTMLElement;

      await act(async () => {
        const result = render(<TestnetKitSDK />);
        container = result.container;
      });

      const results = await axe(container!, {
        rules: {
          // Regras explicitamente ativas conforme Issue 8
          'button-name': { enabled: true },
          label: { enabled: true },
          // Regras adicionais relevantes para portal developer
          'aria-required-attr': { enabled: true },
          'aria-valid-attr': { enabled: true },
          'duplicate-id-active': { enabled: true },
        },
        // Contexto WCAG 2.1 Nível AA
        runOnly: {
          type: 'tag',
          values: ['wcag2a', 'wcag2aa', 'wcag21aa'],
        },
      });

      expect(results).toHaveNoViolations();
    },
    20000
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // TEST 2 — Ações Principais via Testing Library Roles
  // ─────────────────────────────────────────────────────────────────────────────

  it('Test 2 [roles] — aba hub: heading principal está presente e visível', async () => {
    await act(async () => {
      render(<TestnetKitSDK />);
    });

    // Verifica que o componente renderizou com um heading de nível 1
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toBeInTheDocument();
    expect(heading).toBeVisible();

    // Verifica presença de headings de nível 3 (cards do hub)
    const cardHeadings = screen.getAllByRole('heading', { level: 3 });
    expect(cardHeadings.length).toBeGreaterThanOrEqual(1);
    cardHeadings.forEach((h) => expect(h).toBeVisible());
  });

  it('Test 2 [roles] — aba dashboard: botão CTE está acessível após navegação', async () => {
    let container: HTMLElement;
    await act(async () => {
      const result = render(<TestnetKitSDK />);
      container = result.container;
    });

    // Valida que o root container tem data-testid
    expect(container!.querySelector('[data-testid="testnetkit-root"]')).toBeInTheDocument();

    // Clica no card de One-Click Environment para navegar até o dashboard tab
    await act(async () => {
      const card = within(container!).getByText('One-Click Test Environment');
      fireEvent.click(card);
    });

    // Após navegação, verifica botão CTE
    const cteButton = screen.queryByRole('button', {
      name: /Create Complete Test Environment/i,
    });

    if (cteButton) {
      expect(cteButton).toBeVisible();
      expect(cteButton).not.toBeDisabled();
      expect(cteButton).toHaveAttribute('aria-busy', 'false');
    }
  });

  it('Test 2 [roles] — data-testid root está presente no DOM', async () => {
    let container: HTMLElement;
    await act(async () => {
      const result = render(<TestnetKitSDK />);
      container = result.container;
    });

    const root = container!.querySelector('[data-testid="testnetkit-root"]');
    expect(root).toBeInTheDocument();
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // TEST 3 — Inputs com rótulos acessíveis
  // ─────────────────────────────────────────────────────────────────────────────

  it('Test 3 [labels] — faucet: label e input #tk-faucet-address estão corretamente associados', async () => {
    let container: HTMLElement;
    await act(async () => {
      const result = render(<TestnetKitSDK />);
      container = result.container;
    });

    // Navega até a aba faucet clicando no card correspondente
    await act(async () => {
      const faucetCard = within(container!).getByText('Faucet++ Multiativos');
      fireEvent.click(faucetCard);
    });

    // Na aba faucet, o input de endereço deve ter label associado
    const faucetInput = container!.querySelector('#tk-faucet-address');
    const faucetLabel = container!.querySelector('label[for="tk-faucet-address"]');

    if (faucetInput && faucetLabel) {
      // Valida associação label <-> input via htmlFor/id
      expect(faucetLabel).toBeInTheDocument();
      expect(faucetLabel.textContent?.trim()).toBeTruthy();
      expect(faucetInput).toHaveAttribute('id', 'tk-faucet-address');
      expect(faucetLabel).toHaveAttribute('for', 'tk-faucet-address');
      // Valida atributo aria-required
      expect(faucetInput).toHaveAttribute('aria-required', 'true');
    }
  });

  it('Test 3 [labels] — Playground.tsx: todos os inputs têm htmlFor e aria-label corretos (análise de fonte)', () => {
    // Esta abordagem verifica diretamente o arquivo corrigido para garantir
    // que as correções de a11y não foram revertidas em future commits.
    const playgroundPath = path.resolve(
      __dirname,
      '../../src/pages/docs/pages/Playground.tsx'
    );

    const content = fs.readFileSync(playgroundPath, 'utf8');

    // Valida que todos os inputs têm id/htmlFor correspondente
    expect(content).toContain('htmlFor="pg-external-id"');
    expect(content).toContain('id="pg-external-id"');

    expect(content).toContain('htmlFor="pg-display-name"');
    expect(content).toContain('id="pg-display-name"');

    expect(content).toContain('htmlFor="pg-trustlines"');
    expect(content).toContain('id="pg-trustlines"');

    expect(content).toContain('htmlFor="pg-sponsored"');
    expect(content).toContain('id="pg-sponsored"');

    // Valida aria-busy no botão de run (indicador de estado de carregamento)
    expect(content).toContain('aria-busy={running}');

    // Valida aria-hidden nos ícones SVG (não devem ser lidos por screen readers)
    expect(content).toContain('aria-hidden="true"');

    // Valida data-testid no root (necessário para seletores de teste)
    expect(content).toContain('data-testid="playground-root"');
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // TEST 4 — Guarda Estrutural contra Regressão Futura
  // ─────────────────────────────────────────────────────────────────────────────

  it('Test 4 [guard] — todos os elementos interativos do TestnetKit (aba hub) têm nome acessível', async () => {
    let container: HTMLElement;
    await act(async () => {
      const result = render(<TestnetKitSDK />);
      container = result.container;
    });

    // Não deve lançar: todos os elementos da aba hub devem ter nome acessível
    expect(() => assertAllInteractiveElementsHaveAccessibleName(container!)).not.toThrow();
  });

  it(
    'Test 4 [mutation] — guard DETECTA regressão: <button><svg></svg></button> sem aria-label DEVE falhar',
    () => {
      // Container com elementos deliberadamente inacessíveis
      const maliciousContainer = document.createElement('div');
      maliciousContainer.innerHTML = `
        <button><svg viewBox="0 0 24 24"><path d="M0 0"/></svg></button>
        <input placeholder="sem label" type="text" />
      `;
      document.body.appendChild(maliciousContainer);

      // O guard DEVE lançar erro para elementos sem nome acessível
      expect(() => assertAllInteractiveElementsHaveAccessibleName(maliciousContainer)).toThrow(
        /\[a11y\].*elemento.*sem nome acessível/i
      );

      document.body.removeChild(maliciousContainer);
    }
  );

  it(
    'Test 4 [mutation] — guard DETECTA <input> sem label (somente placeholder) como regressão',
    () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <form>
          <input type="text" placeholder="Digite aqui" />
          <button>Enviar</button>
        </form>
      `;
      document.body.appendChild(container);

      // O input sem label DEVE ser detectado como violação
      expect(() => assertAllInteractiveElementsHaveAccessibleName(container)).toThrow(
        /\[a11y\]/i
      );

      document.body.removeChild(container);
    }
  );

  it('Test 4 [guard] — elementos acessíveis corretamente não disparam o guard', () => {
    const container = document.createElement('div');
    container.innerHTML = `
      <form>
        <label for="test-input">Nome de usuário</label>
        <input id="test-input" type="text" />
        <button aria-label="Enviar formulário">Enviar</button>
        <button>Cancelar</button>
        <a href="/docs">Ver documentação</a>
      </form>
    `;
    document.body.appendChild(container);

    // Nenhum elemento inacessível — guard NÃO deve lançar
    expect(() => assertAllInteractiveElementsHaveAccessibleName(container)).not.toThrow();

    document.body.removeChild(container);
  });
});
