/**
 * @module packages/onboarding/src/OnboardingContext.ts
 * @description Módulo de onboarding invisível (@walletnow/onboarding - OnboardingContext) — orquestração de identidade, carteira, patrocínio Gasless e sessão (exporta: IGasStationPort, ITestnetFaucetPort, ISessionPort, IAnalyticsPort).
 */
/**
 * @walletnow/onboarding — OnboardingContext
 *
 * Dependências injetadas no OnboardingOrchestrator.
 *
 * Padrão de injeção de dependência explícita:
 * O OnboardingOrchestrator não instancia nada diretamente.
 * Todas as dependências são fornecidas pelo contexto.
 *
 * Isso garante testabilidade (fakes/mocks fáceis) e
 * desacoplamento total das implementações concretas.
 */

import type {
  IIdentityEngine,
  IAccountEngine,
  IWalletEngine,
  StellarNetworkType,
} from '@walletnow/contracts';

// ─── Contratos Auxiliares ──────────────────────────────────────────────────────

/**
 * IGasStationPort — Interface do Gas Station como vista pelo Onboarding.
 *
 * O Onboarding não sabe como o Gas Station funciona internamente.
 * Ele apenas envia pedidos e recebe confirmações.
 */
export interface IGasStationPort {
  /**
   * Solicita a criação e ativação de uma nova conta Stellar patrocinada.
   *
   * @param publicKey - Chave pública da conta a ser criada
   * @param network - Rede alvo
   * @returns Hash da transação de criação de conta
   */
  sponsorAccountCreation(publicKey: string, network: StellarNetworkType): Promise<string>;

  /**
   * Recebe uma transação interna assinada pelo usuário, e paga as taxas 
   * adicionando-a a uma FeeBumpTransaction assinada pelo Sponsor.
   *
   * @param signedXdr - Transação base64 assinada pelo usuário
   * @param network - Rede alvo
   * @returns Hash da transação submetida na rede
   */
  sponsorTransaction(
    signedXdr: string,
    network: StellarNetworkType,
  ): Promise<{ txHash: string }>;

  /**
   * Verifica se o projeto ainda tem cota de patrocínio disponível.
   */
  hasQuota(network: StellarNetworkType): Promise<boolean>;
}

/**
 * ITestnetFaucetPort — Interface do faucet de testnet como vista pelo Onboarding.
 */
export interface ITestnetFaucetPort {
  /**
   * Ativa uma conta via Stellar Friendbot (cria e funde com XLM).
   * Apenas disponível em testnet.
   */
  activateAccount(publicKey: string): Promise<{ txHash: string }>;

  /**
   * Deposita tokens de teste em uma conta ativa.
   * Apenas disponível em testnet.
   */
  fundTestTokens(publicKey: string, asset: string): Promise<{ txHash: string; amount: string }>;
}

/**
 * ISessionPort — Interface de geração de sessão como vista pelo Onboarding.
 *
 * O Onboarding precisa retornar um token de sessão ao builder.
 * A lógica de JWT/sessão é delegada a este port.
 */
export interface ISessionPort {
  /**
   * Cria um token de sessão para o usuário recém-integrado.
   *
   * @param userId - ID interno do usuário no WalletNow
   * @param publicKey - Endereço público Stellar
   * @returns Token de sessão opaco (JWT ou similar)
   */
  createToken(userId: string, publicKey: string): Promise<string>;
}

/**
 * IAnalyticsPort — Interface de analytics como vista pelo Onboarding.
 *
 * Eventos de negócio emitidos pelo Onboarding para coleta de métricas.
 */
export interface IAnalyticsPort {
  track(event: OnboardingAnalyticsEvent): Promise<void>;
}

export interface OnboardingAnalyticsEvent {
  readonly name:
    | 'onboarding.user_created'
    | 'onboarding.user_restored'
    | 'onboarding.account_sponsored'
    | 'onboarding.trustlines_configured'
    | 'onboarding.test_user_created'
    | 'onboarding.error';
  readonly userId?: string;
  readonly externalId?: string;
  readonly network: StellarNetworkType;
  readonly metadata?: Record<string, string | number | boolean>;
}

// ─── Contexto Principal ────────────────────────────────────────────────────────

/**
 * OnboardingContext — Todas as dependências do OnboardingOrchestrator.
 *
 * Permite substituição total por fakes em testes:
 * @example
 * const ctx = buildOnboardingContext({
 *   identity: new FakeIdentityEngine(),
 *   wallet: new FakeWalletEngine(),
 *   account: new FakeAccountEngine(),
 *   gasStation: new FakeGasStation(),
 *   faucet: new FakeTestnetFaucet(),
 *   session: new FakeSessionPort(),
 *   analytics: new FakeAnalyticsPort(),
 *   network: 'testnet',
 * });
 */
export interface OnboardingContext {
  /** Engine de identidade — cria e autentica usuários */
  readonly identity: IIdentityEngine;

  /** Engine de wallet — cria e gerencia carteiras Stellar */
  readonly wallet: IWalletEngine;

  /** Engine de account — consulta estado on-chain */
  readonly account: IAccountEngine;

  /** Port de Gas Station — patrocina criação de contas e trustlines */
  readonly gasStation: IGasStationPort;

  /** Port de faucet testnet — apenas disponível em redes de teste */
  readonly faucet?: ITestnetFaucetPort;

  /** Port de sessão — gera tokens de sessão para o builder */
  readonly session: ISessionPort;

  /** Port de analytics — rastreia eventos de negócio */
  readonly analytics: IAnalyticsPort;

  /** Rede configurada para este contexto de onboarding */
  readonly network: StellarNetworkType;
}
