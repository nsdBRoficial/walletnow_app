/**
 * @walletnow/contracts — Crypto Contracts
 *
 * Abstrações canônicas de operações criptográficas.
 * Nenhuma implementação aqui — apenas contratos.
 */

// ─── IKeypairDeriver ─────────────────────────────────────────────────────────

/**
 * IKeypairDeriver — Derivação de par de chaves Stellar.
 *
 * Implementações:
 * - MnemonicDeriver: BIP-39 + BIP-44 para Stellar
 * - SecretKeyDeriver: a partir de uma secret key Stellar (S...)
 * - PasskeyDeriver: a partir do output de um autenticador WebAuthn
 */
export interface IKeypairDeriver {
  /** Deriva uma public key (G...) sem expor a private key */
  derivePublicKey(input: DeriveInput): Promise<string>;

  /**
   * Deriva o keypair completo.
   * ATENÇÃO: a chave privada deve ser usada e descartada imediatamente.
   * Nunca armazenar sem encriptação.
   */
  deriveKeypair(input: DeriveInput): Promise<DerivedKeypair>;
}

export type DeriveInput =
  | { type: 'mnemonic'; mnemonic: string; path?: string }
  | { type: 'secret-key'; secretKey: string }
  | { type: 'raw-seed'; seed: Uint8Array };

export interface DerivedKeypair {
  /** Public key Stellar (G...) */
  readonly publicKey: string;
  /**
   * Secret key Stellar (S...).
   * DEVE ser limpa da memória após uso via `zeroize(secretKey)`.
   */
  readonly secretKey: string;
}

// ─── IStellarSigner ───────────────────────────────────────────────────────────

/**
 * IStellarSigner — Assinatura de transações Stellar.
 *
 * Recebe um XDR não assinado e retorna o XDR assinado.
 * A chave privada usada é interna ao signer — nunca exposta.
 *
 * Implementações:
 * - InMemoryStellarSigner: chave em RAM (limpa após logout)
 * - PasskeyStellarSigner: delega assinatura ao Secure Enclave
 * - FreighterStellarSigner: delega à extensão Freighter
 */
export interface IStellarSigner {
  /** Public key gerenciada por este signer */
  readonly publicKey: string;

  /**
   * Assina um XDR de transação Stellar.
   * @param xdr - Transaction Envelope XDR não assinado
   * @param networkPassphrase - Passphrase da rede para o hash da transação
   * @returns XDR assinado
   */
  signTransaction(xdr: string, networkPassphrase: string): Promise<string>;

  /**
   * Assina bytes arbitrários (não um XDR de transação).
   * Usado para autenticação SEP-10 e assinatura de mensagens.
   */
  signPayload(payload: Uint8Array): Promise<Uint8Array>;

  /**
   * Verifica se a assinatura corresponde ao payload fornecido e à chave do signer.
   */
  verify?(payload: Uint8Array, signature: Uint8Array): Promise<boolean>;

  /**
   * Valida a assinatura do payload ou dispara CryptoError(VERIFICATION_FAILED).
   */
  verifyOrThrow?(payload: Uint8Array, signature: Uint8Array): Promise<void>;

  /** Verifica se o signer está pronto para assinar */
  isReady(): boolean;

  /** Limpa dados sensíveis da memória (chamado no logout) */
  zeroize(): void;
}

// ─── IEncryptor ───────────────────────────────────────────────────────────────

/**
 * IEncryptor — Encriptação/Decriptação de dados.
 *
 * Implementações:
 * - AesGcmEncryptor: AES-256-GCM via Web Crypto API (browser)
 * - NodeCryptoEncryptor: AES-256-GCM via Node.js crypto module
 */
export interface IEncryptor {
  /**
   * Encripta dados com uma chave derivada de uma passphrase.
   * @returns Dados encriptados incluindo IV/salt para decriptação
   */
  encrypt(data: Uint8Array, passphrase: string): Promise<EncryptedData>;

  /**
   * Decripta dados previamente encriptados.
   * @throws CryptoError se a passphrase for incorreta ou dados corrompidos
   */
  decrypt(encrypted: EncryptedData, passphrase: string): Promise<Uint8Array>;
}

/** Payload de dados encriptados, auto-suficiente para decriptação */
export interface EncryptedData {
  /** Dados encriptados */
  readonly ciphertext: Uint8Array;
  /** Initialization Vector (aleatório por operação) */
  readonly iv: Uint8Array;
  /** Salt para derivação da chave (PBKDF2) */
  readonly salt: Uint8Array;
  /** Algoritmo usado */
  readonly algorithm: 'AES-GCM-256';
  /** Iterações PBKDF2 */
  readonly iterations: number;
}

// ─── IHasher ─────────────────────────────────────────────────────────────────

/**
 * IHasher — Funções de hash criptográfico.
 * Usado para derivação de IDs, verificação de integridade e chaves de API.
 */
export interface IHasher {
  sha256(data: Uint8Array): Promise<Uint8Array>;
  sha512(data: Uint8Array): Promise<Uint8Array>;
  /** Hash de uma string (UTF-8) */
  sha256str(data: string): Promise<string>;
}

// ─── IMnemonicGenerator ───────────────────────────────────────────────────────

/**
 * IMnemonicGenerator — Geração de frases mnemônicas BIP-39.
 */
export interface IMnemonicGenerator {
  /** Gera uma frase mnemônica aleatória (padrão: 24 palavras) */
  generate(strength?: 128 | 256): string;

  /** Valida se uma frase mnemônica é válida segundo BIP-39 */
  validate(mnemonic: string): boolean;
}
