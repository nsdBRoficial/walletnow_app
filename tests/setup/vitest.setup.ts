/**
 * @module tests/setup/vitest.setup.ts
 * @description Setup global determinístico para projetos Vitest (unit e integration).
 * Fornece implementação em memória de localStorage/sessionStorage para evitar o ExperimentalWarning
 * do Node 22+ e garante isolamento de estado entre cada caso de teste.
 */
import { beforeEach, afterEach, vi } from 'vitest';

class InMemoryStorage implements Storage {
  private store = new Map<string, string>();

  get length(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }
}

const localStorageInstance = new InMemoryStorage();
const sessionStorageInstance = new InMemoryStorage();

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageInstance,
  writable: true,
  configurable: true,
});

Object.defineProperty(globalThis, 'sessionStorage', {
  value: sessionStorageInstance,
  writable: true,
  configurable: true,
});

beforeEach(() => {
  localStorageInstance.clear();
  sessionStorageInstance.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

