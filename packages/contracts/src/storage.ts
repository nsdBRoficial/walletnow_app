/**
 * @module packages\contracts\src\storage.ts
 * @description WalletNow Protocol - Arquitetura de carteira inteligente e pagamentos Stellar.
 */
/**
 * @walletnow/contracts — Storage Contracts
 *
 * Abstrações canônicas de armazenamento.
 * Todo engine e adapter depende APENAS destas interfaces.
 * Nenhuma implementação concreta vive neste pacote.
 */

// ─── IStorage — Armazenamento Básico ──────────────────────────────────────────

/**
 * IStorage — Armazenamento chave-valor genérico.
 *
 * Dados sensíveis NÃO devem ser armazenados via IStorage puro.
 * Use ISecureStorage para chaves privadas e segredos.
 *
 * Implementações: LocalStorage, IndexedDB, SQLite, AsyncStorage (RN)
 */
export interface IStorage {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
  has(key: string): Promise<boolean>;
  clear(): Promise<void>;
  keys(): Promise<string[]>;
}

// ─── ISecureStorage — Armazenamento Criptografado ────────────────────────────

/**
 * ISecureStorage — Armazenamento seguro para dados sensíveis.
 *
 * Encriptação é responsabilidade do storage — quem escreve não precisa
 * encriptar antes. O ISecureStorage garante confidencialidade.
 *
 * Implementações:
 * - Browser: IndexedDB com AES-GCM via Web Crypto API
 * - iOS: Keychain Services
 * - Android: Android Keystore
 * - Node.js: Arquivo encriptado com AES-256
 *
 * Garantia: dados retornados são decriptados automaticamente.
 */
export interface ISecureStorage {
  /** Armazena e encripta um valor. */
  set(key: string, value: Uint8Array): Promise<void>;

  /**
   * Recupera e decripta um valor.
   * @returns null se não encontrado.
   */
  get(key: string): Promise<Uint8Array | null>;

  /** Remove permanentemente um segredo. */
  remove(key: string): Promise<void>;

  /** Verifica se um segredo existe. */
  has(key: string): Promise<boolean>;

  /**
   * Retorna metadados sobre um segredo (sem o valor).
   * Útil para listar identities sem decriptar as chaves.
   */
  metadata(key: string): Promise<StorageItemMetadata | null>;

  /** Limpa todo o armazenamento seguro. Use com extremo cuidado. */
  clear(): Promise<void>;
}

/** Metadados de um item no armazenamento seguro (sem o dado sensível) */
export interface StorageItemMetadata {
  readonly key: string;
  readonly createdAt: number;
  readonly updatedAt: number;
  readonly sizeBytes: number;
}

// ─── IMemoryStorage — Armazenamento em Memória (RAM) ─────────────────────────

/**
 * IMemoryStorage — Armazenamento volátil apenas em RAM.
 *
 * Usado para dados que NÃO devem sobreviver ao fechamento da sessão.
 * Exemplo: chave privada decriptada, tokens de sessão temporários.
 *
 * Garantia: dados são perdidos ao encerrar a aplicação.
 */
export interface IMemoryStorage {
  set<T>(key: string, value: T): void;
  get<T>(key: string): T | null;
  remove(key: string): void;
  has(key: string): boolean;
  clear(): void;
}

// ─── StorageNamespace ─────────────────────────────────────────────────────────

/**
 * Namespaces de armazenamento do WalletNow OS.
 * Cada engine usa seu próprio namespace para evitar colisões de chaves.
 */
export type StorageNamespace =
  | 'identity'     // Identity Engine — metadados de identities
  | 'wallet'       // Wallet Engine — metadados de wallets
  | 'account'      // Account Engine — cache de estado on-chain
  | 'session'      // Session — dados de sessão ativa
  | 'provider'     // Provider Registry — estado de providers
  | 'preferences'; // Preferências do usuário
