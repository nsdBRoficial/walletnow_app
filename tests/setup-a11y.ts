/**
 * tests/setup-a11y.ts
 *
 * Setup global para a suíte de acessibilidade (Issue 8).
 * Importa os matchers do @testing-library/jest-dom e configura
 * o ambiente jsdom para os testes de acessibilidade.
 */

import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Limpa o DOM após cada teste (evita vazamentos entre testes)
afterEach(() => {
  cleanup();
});

// Silencia warnings de console que são esperados em ambiente de teste
// (ex: React warnings sobre act(), prop desconhecida, etc.)
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

console.error = (...args: unknown[]) => {
  const msg = String(args[0] ?? '');
  // Silencia warnings conhecidos do ambiente de teste
  if (
    msg.includes('Warning: ReactDOM.render') ||
    msg.includes('Warning: An update to') ||
    msg.includes('Warning: Cannot update') ||
    msg.includes('Error: Not implemented: navigation') ||
    msg.includes('Error: Not implemented: window.computedStyle') ||
    msg.includes('act(')
  ) {
    return;
  }
  originalConsoleError(...args);
};

console.warn = (...args: unknown[]) => {
  const msg = String(args[0] ?? '');
  if (msg.includes('Warning:') || msg.includes('ReactDOM')) return;
  originalConsoleWarn(...args);
};

// Mock do window.matchMedia (não implementado em jsdom)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock do ResizeObserver (não implementado em jsdom)
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock do IntersectionObserver (não implementado em jsdom)
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
  root: null,
  rootMargin: '',
  thresholds: [],
}));

// Mock do import.meta.env para componentes que dependem de variáveis Vite
Object.defineProperty(globalThis, 'import', {
  value: {
    meta: {
      env: {
        BASE_URL: '/',
        MODE: 'test',
        DEV: false,
        PROD: false,
      },
    },
  },
  writable: true,
  configurable: true,
});
