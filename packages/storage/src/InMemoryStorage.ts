/**
 * @module packages/storage/src/InMemoryStorage.ts
 * @description Adaptador de armazenamento seguro (@walletnow/storage - InMemoryStorage) com isolamento por namespace (exporta: InMemoryStorage).
 */
/**
 * @walletnow/storage — InMemoryStorage
 *
 * Implementação de IMemoryStorage usando Map em RAM.
 * Dados perdidos ao encerrar a aplicação. Sem persistência.
 *
 * Usos:
 * - Armazenar chaves privadas decriptadas durante a sessão
 * - Cache temporário de dados voláteis
 * - Testes (não requer ambiente de browser/Node)
 */

import type { IMemoryStorage } from '@walletnow/contracts';

/**
 * InMemoryStorage — Armazenamento genérico em RAM.
 *
 * Thread-safe em JS (single-thread), mas não persiste entre recargas.
 * Limpo automaticamente quando o processo é encerrado.
 *
 * @example
 * const memory = new InMemoryStorage();
 * memory.set('activePublicKey', 'GABCDE...');
 * const key = memory.get<string>('activePublicKey'); // 'GABCDE...'
 */
export class InMemoryStorage implements IMemoryStorage {
  private readonly store = new Map<string, unknown>();

  set<T>(key: string, value: T): void {
    this.store.set(key, value);
  }

  get<T>(key: string): T | null {
    const value = this.store.get(key);
    return value === undefined ? null : (value as T);
  }

  remove(key: string): void {
    this.store.delete(key);
  }

  has(key: string): boolean {
    return this.store.has(key);
  }

  clear(): void {
    this.store.clear();
  }

  /** Retorna o número de itens em memória */
  get size(): number {
    return this.store.size;
  }

  /** Lista todas as chaves em memória (para debugging) */
  keys(): string[] {
    return Array.from(this.store.keys());
  }
}
