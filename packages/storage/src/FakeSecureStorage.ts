/**
 * @module packages\storage\src\FakeSecureStorage.ts
 * @description WalletNow Protocol - Arquitetura de carteira inteligente e pagamentos Stellar.
 */
/**
 * @walletnow/storage — FakeSecureStorage
 *
 * Implementação Fake de ISecureStorage para testes e desenvolvimento.
 *
 * ATENÇÃO: NÃO usa criptografia real — dados ficam em plaintext.
 * NUNCA usar em produção.
 *
 * Usos:
 * - Testes unitários e integração
 * - Desenvolvimento local sem setup de crypto
 * - `@walletnow/testing` usa esta implementação internamente
 */

import type { ISecureStorage, StorageItemMetadata } from '@walletnow/contracts';

/**
 * FakeSecureStorage — Implementação stub de ISecureStorage.
 *
 * Armazena bytes em memória sem qualquer encriptação.
 * Simula o comportamento de um SecureStorage real para fins de teste.
 *
 * @example
 * // Em testes:
 * const storage = new FakeSecureStorage();
 * await storage.set('privateKey', new TextEncoder().encode('S...'));
 * const raw = await storage.get('privateKey');
 *
 * // Em produção, substitua por WebCryptoSecureStorage ou KeychainStorage
 */
export class FakeSecureStorage implements ISecureStorage {
  private readonly store = new Map<string, { data: Uint8Array; meta: StorageItemMetadata }>();

  async set(key: string, value: Uint8Array): Promise<void> {
    const now = Date.now();
    const existing = this.store.get(key);
    this.store.set(key, {
      data: new Uint8Array(value), // cópia defensiva
      meta: {
        key,
        createdAt: existing?.meta.createdAt ?? now,
        updatedAt: now,
        sizeBytes: value.byteLength,
      },
    });
  }

  async get(key: string): Promise<Uint8Array | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    return new Uint8Array(entry.data); // cópia defensiva
  }

  async remove(key: string): Promise<void> {
    // Zeroize antes de remover (boas práticas de segurança)
    const entry = this.store.get(key);
    if (entry) {
      entry.data.fill(0);
      this.store.delete(key);
    }
  }

  async has(key: string): Promise<boolean> {
    return this.store.has(key);
  }

  async metadata(key: string): Promise<StorageItemMetadata | null> {
    return this.store.get(key)?.meta ?? null;
  }

  async clear(): Promise<void> {
    // Zeroize todos os dados antes de limpar
    for (const entry of this.store.values()) {
      entry.data.fill(0);
    }
    this.store.clear();
  }

  /** Número de itens no storage fake */
  get size(): number {
    return this.store.size;
  }
}
