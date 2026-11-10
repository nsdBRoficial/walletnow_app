/**
 * @module packages/contracts/src/onboarding.ts
 * @description Contratos canônicos, interfaces e tipos universais (onboarding) do pacote @walletnow/contracts (exporta: CreateUserParams, RestoreUserParams, SetupTrustlinesParams, UserOnboardingResult).
 */
/**
 * @walletnow/contracts — Onboarding Contracts
 *
 * Contratos canônicos do domínio Onboarding.
 * Este é o domínio de PRIMEIRA CLASSE do WalletNow.
 *
 * Promessa central: Um builder chama createUser() e recebe um usuário
 * pronto para operar na Stellar — sem precisar conhecer XDR, trustlines
 * ou gerenciamento de contas.
 *
 * Diagrama de responsabilidade:
 *   Builder → wn.onboarding.createUser() → UserOnboardingResult
 *             (identity + keypair + conta patrocinada + trustlines)
 */

import type { StellarNetworkType } from './network.js';
import type { AuthMethod } from './identity.js';

// ─── Parâmetros de Entrada ─────────────────────────────────────────────────────

/**
 * Parâmetros para criar um novo usuário na Stellar via Onboarding.
 *
 * O builder só precisa fornecer um identificador (email, social ID, etc.).
 * Toda a complexidade de keypair, conta e trustlines é resolvida internamente.
 */
export interface CreateUserParams {
  /**
   * Identificador externo do usuário no sistema do builder.
   * Pode ser email, userId do banco de dados, UUID, phone, etc.
   * Não precisa ser único globalmente — é namespaced pela API Key do projeto.
   */
  readonly externalId: string;

  /** Nome de exibição opcional para o usuário */
  readonly displayName?: string;

  /**
   * Método de autenticação preferido.
   * Padrão: 'keypair' (geração automática de par de chaves)
   */
  readonly authMethod?: Extract<AuthMethod, 'keypair' | 'passkeys' | 'magic-link' | 'google'>;

  /**
   * Trustlines a configurar automaticamente após criação da conta.
   * Padrão: [] (nenhuma trustline automática além do XLM nativo)
   *
   * @example ['USDC', 'BRL', 'EURC']
   */
  readonly trustlines?: string[];

  /**
   * Se true, patrocina a criação da conta via Gas Station.
   * O usuário não precisa ter XLM para criar sua conta.
   * Padrão: true (depende do plano e configuração do Gas Station)
   */
  readonly sponsored?: boolean;

  /** Metadados opcionais do builder para rastreamento interno */
  readonly metadata?: Record<string, string | number | boolean>;
}

/**
 * Parâmetros para recuperar (login) um usuário previamente integrado.
 */
export interface RestoreUserParams {
  /**
   * Identificador externo do usuário.
   * Deve ser o mesmo valor usado em createUser().
   */
  readonly externalId: string;

  /**
   * Método de autenticação para reabertura de sessão.
   * Se omitido, usa o mesmo método registrado no momento da criação.
   */
  readonly authMethod?: Extract<AuthMethod, 'keypair' | 'passkeys' | 'magic-link' | 'google'>;
}

/**
 * Parâmetros para configurar trustlines adicionais em uma conta existente.
 */
export interface SetupTrustlinesParams {
  /** Endereço Stellar público da conta (G...) */
  readonly stellarAddress: string;

  /**
   * Códigos dos ativos para configurar trustline.
   * @example ['USDC', 'BRL']
   */
  readonly assets: string[];

  /**
   * Se true, patrocina as taxas de configuração de trustline via Gas Station.
   * Padrão: true
   */
  readonly sponsored?: boolean;
}

// ─── Resultados ───────────────────────────────────────────────────────────────

/**
 * Resultado do onboarding de um usuário.
 * Este é o tipo mais importante do WalletNow SDK.
 *
 * O builder recebe tudo que precisa para identificar e operar com o usuário
 * na Stellar — sem nunca ter visto XDR, Horizon ou trustlines.
 */
export interface UserOnboardingResult {
  /** ID interno único do usuário no WalletNow */
  readonly userId: string;

  /** Identificador externo fornecido pelo builder em createUser() */
  readonly externalId: string;

  /** Endereço público Stellar do usuário (G...) */
  readonly stellarAddress: string;

  /** Rede em que a conta foi criada */
  readonly network: StellarNetworkType;

  /**
   * Se a criação da conta foi patrocinada pelo Gas Station.
   * true = o usuário não precisou de XLM para criar sua conta.
   */
  readonly isSponsored: boolean;

  /**
   * Trustlines configuradas com sucesso.
   * Subconjunto (ou igual) ao `trustlines` solicitado em CreateUserParams.
   */
  readonly trustlines: string[];

  /**
   * Trustlines que falharam na configuração.
   * Vazio se todas foram configuradas com sucesso.
   */
  readonly failedTrustlines: string[];

  /** Método de autenticação utilizado */
  readonly authMethod: AuthMethod;

  /** Status atual da conta no ledger Stellar */
  readonly accountStatus: OnboardingAccountStatus;

  /** Timestamp de criação do usuário (Unix ms) */
  readonly createdAt: number;

  /**
   * Token de sessão para uso imediato pelo builder.
   * Permite ao builder chamar operações subsequentes sem re-autenticar.
   */
  readonly sessionToken: string;
}

/** Status da conta Stellar após o onboarding */
export type OnboardingAccountStatus =
  | 'active'          // Conta existe e está ativa no ledger
  | 'pending'         // Conta criada localmente, aguardando ativação on-chain
  | 'sponsored'       // Conta ativa via fee sponsorship (min balance mantido pelo Gas Station)
  | 'error';          // Erro na criação da conta on-chain

/**
 * Resultado da configuração de trustlines.
 */
export interface TrustlineSetupResult {
  readonly stellarAddress: string;

  /** Trustlines configuradas com sucesso */
  readonly configured: string[];

  /** Trustlines que falharam */
  readonly failed: Array<{ asset: string; reason: string }>;

  /** Se as taxas foram patrocinadas */
  readonly isSponsored: boolean;

  /** Hash da transação de trustlines (se submetida) */
  readonly txHash?: string;
}

/**
 * Status de onboarding de um usuário existente.
 */
export interface OnboardingUserStatus {
  readonly userId: string;
  readonly externalId: string;
  readonly stellarAddress: string;
  readonly network: StellarNetworkType;
  readonly accountStatus: OnboardingAccountStatus;
  readonly trustlines: string[];
  readonly isSponsored: boolean;
  readonly createdAt: number;
  readonly lastActiveAt: number;
}

// ─── IOnboardingDomain (Contrato Principal) ──────────────────────────────────

/**
 * IOnboardingDomain — Contrato canônico do domínio Onboarding.
 *
 * Este é o CASO DE USO Nº 1 do WalletNow.
 * Todos os outros domínios (Payments, Swap, Yield) são construídos SOBRE este.
 *
 * @example
 * // O builder nunca precisa conhecer Stellar para usar isto:
 * const user = await wn.onboarding.createUser({
 *   externalId: "alice@example.com",
 *   trustlines: ["USDC"],
 *   sponsored: true,
 * });
 * // → user.stellarAddress: "GABC...XYZ" (conta ativa, pronta para uso)
 */
export interface IOnboardingDomain {
  /**
   * Cria um novo usuário na Stellar.
   *
   * Orquestra internamente:
   *   1. Geração de keypair criptográfico
   *   2. Criação da identidade vinculada ao externalId
   *   3. Verificação/criação da conta on-chain (com patrocínio se sponsored=true)
   *   4. Configuração das trustlines solicitadas
   *   5. Registro de evento no Analytics
   *
   * @returns UserOnboardingResult com o endereço Stellar pronto para uso
   */
  createUser(params: CreateUserParams): Promise<UserOnboardingResult>;

  /**
   * Restaura (re-autentica) um usuário previamente integrado.
   *
   * Equivalente ao "login" na Stellar via WalletNow.
   * Retorna o endereço Stellar e um token de sessão renovado.
   */
  restoreUser(params: RestoreUserParams): Promise<UserOnboardingResult>;

  /**
   * Consulta o status de onboarding de um usuário.
   * Útil para verificar se a conta está ativa ou pendente.
   */
  getUserStatus(userId: string): Promise<OnboardingUserStatus>;

  /**
   * Configura trustlines adicionais em uma conta já integrada.
   * Útil quando o produto expande para novos ativos após o onboarding inicial.
   */
  setupTrustlines(params: SetupTrustlinesParams): Promise<TrustlineSetupResult>;

  /**
   * Cria um usuário de teste com conta e tokens pré-carregados.
   * APENAS disponível em redes testnet.
   *
   * Automaticamente:
   *   - Cria conta via friendbot
   *   - Solicita tokens de faucet (XLM, USDC testnet)
   *   - Configura trustlines padrão de desenvolvimento
   *
   * @throws OnboardingError('TESTNET_ONLY') se chamado em mainnet
   */
  createTestUser(params?: Partial<CreateUserParams>): Promise<UserOnboardingResult>;
}
