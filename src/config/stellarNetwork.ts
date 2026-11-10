/**
 * @module src/config/stellarNetwork.ts
 * @description Configuração de ambiente e parâmetros de rede Stellar/Demo (stellarNetwork) (exporta: StellarNetworkConfig, StellarAssetConfig, StellarNetwork).
 */
/**
 * @packageDocumentation
 * @module Config/StellarNetwork
 *
 * stellarNetwork.ts — Abstração e Governança de Rede Stellar (Testnet & Mainnet)
 *
 * Responsabilidade Arquitetural (SRP):
 * Centralizar toda a topologia de conexão à Stellar Network, abstraindo passphrases,
 * endpoints Horizon, Soroban RPC e emissores oficiais de ativos verificados
 * (USDC da Circle, BRZ da Transfero e títulos tokenizados Etherfuse).
 *
 * Princípios de Resiliência:
 * - Eliminação total de hardcodes espalhados pelo código.
 * - Suporte a fallback de Horizon para alta disponibilidade.
 * - Sincronização dinâmica com o estado do `NetworkContext`.
 *
 * @updated Setembro de 2026
 * @version 0.4.5-candidate
 */

import { Networks, Asset, Horizon } from '@stellar/stellar-sdk';
import { AppConfig, StellarNetworkType } from './environment';
import { isCurrentNetworkMainnet, getCurrentNetwork } from '../contexts/NetworkContext';

// ─── Tipos ───────────────────────────────────────────────────────────────────

export interface StellarNetworkConfig {
  /** Passphrase da rede para assinatura de transações */
  networkPassphrase: string;
  /** Endpoint Horizon primário */
  horizonUrl: string;
  /** Endpoint Horizon de fallback (redundância) */
  horizonFallbackUrl: string | null;
  /** URL do Explorer para links de transações */
  explorerUrl: string;
  /** Nome legível da rede */
  networkName: string;
  /** Se esta é a rede principal (produção) */
  isMainnet: boolean;
}

export interface StellarAssetConfig {
  code: string;
  issuer: string | null; // null = nativo (XLM)
  name: string;
  decimals: number;
}

// ─── Configurações de Rede ────────────────────────────────────────────────────

const TESTNET_CONFIG: StellarNetworkConfig = {
  networkPassphrase: Networks.TESTNET,
  horizonUrl: 'https://horizon-testnet.stellar.org',
  horizonFallbackUrl: null,
  explorerUrl: 'https://stellar.expert/explorer/testnet',
  networkName: 'Stellar Testnet',
  isMainnet: false,
};

const MAINNET_CONFIG: StellarNetworkConfig = {
  networkPassphrase: Networks.PUBLIC,
  horizonUrl: 'https://horizon.stellar.org',
  // Fallback SatoshiPay / outras provedoras de Horizon público para redundância
  // TODO [INFRA]: Avaliar Horizon privado via SDF SDK ou Blockdaemon para reduzir rate limit
  horizonFallbackUrl: 'https://horizon.stellar.lobstr.co',
  explorerUrl: 'https://stellar.expert/explorer/public',
  networkName: 'Stellar Mainnet',
  isMainnet: true,
};

// ─── Configurações de Assets ──────────────────────────────────────────────────

/**
 * Issuers dos assets em MAINNET.
 *
 * IMPORTANTE: Estes issuers são os contratos reais verificados na rede principal.
 * NíO use os issuers da testnet em produção — os tokens são diferentes.
 *
 * Fontes:
 * - USDC: https://stellar.expert/explorer/public/asset/USDC-GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN
 * - BRZ:  https://stellar.expert/explorer/public/asset/BRZ-GDVKY2GU2DRXBEUF2WOSEM2BFKBLBHNBKNTXCDBC7525JOOE3SKGHGV
 * - TESOURO: Dinâmico via Etherfuse /ramp/assets — não hardcode
 */
const MAINNET_ASSETS: Record<string, StellarAssetConfig> = {
  XLM: {
    code: 'XLM',
    issuer: null,
    name: 'Stellar Lumens',
    decimals: 7,
  },
  USDC: {
    code: 'USDC',
    issuer: 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN', // Circle — mainnet verificado
    name: 'USD Coin',
    decimals: 7,
  },
  BRZ: {
    code: 'BRZ',
    issuer: 'GDVKY2GU2DRXBEUF2WOSEM2BFKBLBHNBKNTXCDBC7525JOOE3SKGHGV', // Transfero — mainnet verificado
    name: 'Brazilian Digital Token',
    decimals: 7,
  },
  // TODO [ETHERFUSE]: TESOURO issuer é dinâmico — sempre resolver via EtherfuseV2ApiService.resolveTesouroIdentifier()
  // Não adicionar issuer hardcoded aqui. O fallback existe apenas no etherfuseV2ApiService.ts.
};

/**
 * Issuers dos assets em TESTNET.
 * Usados apenas para desenvolvimento local e testes de integração.
 */
const TESTNET_ASSETS: Record<string, StellarAssetConfig> = {
  XLM: {
    code: 'XLM',
    issuer: null,
    name: 'Stellar Lumens (Testnet)',
    decimals: 7,
  },
  USDC: {
    code: 'USDC',
    issuer: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
    name: 'USD Coin (Testnet)',
    decimals: 7,
  },
  BRZ: {
    code: 'BRZ',
    issuer: AppConfig.stellar.issuerPublicKey || null,
    name: 'Brazilian Digital Token (Mock Testnet)',
    decimals: 7,
  },
  BRW: {
    // Token interno de testnet (mock do BRZ antes de integração real)
    code: 'BRW',
    issuer: AppConfig.stellar.issuerPublicKey || null,
    name: 'BRW Token (Testnet Only)',
    decimals: 7,
  },
};

// ─── StellarNetwork — API Pública ─────────────────────────────────────────────

/**
 * StellarNetwork
 *
 * Ponto único de acesso a toda configuração de rede Stellar.
 * Todos os serviços devem usar este objeto em vez de hardcodes.
 *
 * @example
 * // Em vez de:
 * const server = new Horizon.Server('https://horizon-testnet.stellar.org');
 * networkPassphrase: Networks.TESTNET
 *
 * // Use:
 * const server = StellarNetwork.createServer();
 * networkPassphrase: StellarNetwork.passphrase
 */
export const StellarNetwork = {

  /**
   * Configuração completa da rede ativa.
   */
  get config(): StellarNetworkConfig {
    return isCurrentNetworkMainnet() ? MAINNET_CONFIG : TESTNET_CONFIG;
  },

  /**
   * Network Passphrase para assinatura de transações.
   * Use SEMPRE este valor em TransactionBuilder.
   */
  get passphrase(): string {
    return this.config.networkPassphrase;
  },

  /**
   * URL primária do Horizon.
   */
  get horizonUrl(): string {
    return this.config.horizonUrl;
  },

  /**
   * URL do Explorer Stellar para links de transações.
   */
  get explorerUrl(): string {
    return this.config.explorerUrl;
  },

  /**
   * Retorna a URL de um hash de transação no Explorer.
   */
  getTxExplorerUrl(txHash: string): string {
    return `${this.explorerUrl}/tx/${txHash}`;
  },

  /**
   * Retorna a URL de uma conta no Explorer.
   */
  getAccountExplorerUrl(publicKey: string): string {
    return `${this.explorerUrl}/account/${publicKey}`;
  },

  /**
   * Cria e retorna uma instância do Horizon.Server para a rede ativa.
   *
   * @example
   * const server = StellarNetwork.createServer();
   * const account = await server.loadAccount(publicKey);
   */
  createServer(): Horizon.Server {
    return new Horizon.Server(this.config.horizonUrl);
  },

  /**
   * Retorna os assets configurados para a rede ativa.
   */
  get assets(): Record<string, StellarAssetConfig> {
    return isCurrentNetworkMainnet() ? MAINNET_ASSETS : TESTNET_ASSETS;
  },

  /**
   * Retorna um objeto Asset do Stellar SDK para o código de ativo solicitado.
   * Retorna null se o asset não estiver configurado para a rede ativa.
   *
   * @example
   * const brz = StellarNetwork.getAsset('BRZ');
   * if (brz) operation.changeTrust({ asset: brz });
   */
  getAsset(assetCode: string): Asset | null {
    if (assetCode === 'XLM') return Asset.native();

    const assetConfig = this.assets[assetCode];
    if (!assetConfig || !assetConfig.issuer) return null;

    return new Asset(assetConfig.issuer === AppConfig.stellar.issuerPublicKey
      ? assetCode
      : assetCode, assetConfig.issuer);
  },

  /**
   * Retorna um Asset usando o issuer da conta mestre local (para tokens internos da WalletNow).
   * Útil para BRW (testnet) onde o issuer é a wallet interna.
   */
  getLocalAsset(assetCode: string): Asset | null {
    const issuer = AppConfig.stellar.issuerPublicKey;
    if (!issuer) {
      console.error('[WalletNow][StellarNetwork] VITE_STELLAR_ISSUER_PUBLIC não configurado.');
      return null;
    }
    return new Asset(assetCode, issuer);
  },

  /**
   * Formata uma quantia para 7 casas decimais (padrão Stellar).
   */
  formatAmount(amount: number | string): string {
    return parseFloat(String(amount)).toFixed(7);
  },

  /**
   * Valida se uma string é uma chave pública Stellar válida.
   */
  isValidPublicKey(key: string): boolean {
    return /^G[A-Z2-7]{55}$/.test(key);
  },

  /**
   * Indica se o Friendbot está disponível (apenas testnet).
   * NUNCA chamar Friendbot em mainnet.
   */
  get friendbotAvailable(): boolean {
    return !isCurrentNetworkMainnet();
  },

  /**
   * Retorna a URL do Friendbot para ativação de conta (apenas testnet).
   * Retorna null em mainnet.
   */
  getFriendbotUrl(publicKey: string): string | null {
    if (!this.friendbotAvailable) return null;
    return `https://horizon-testnet.stellar.org/friendbot?addr=${encodeURIComponent(publicKey)}`;
  },

  /**
   * Tipo de rede ativa para uso em logs e UI.
   */
  get networkType(): StellarNetworkType {
    return getCurrentNetwork();
  },

  /**
   * Fee base para transações (em stroops — 1 XLM = 10.000.000 stroops).
   * 100 stroops = 0.00001 XLM por operação.
   * TODO [MAINNET]: Implementar estimativa dinâmica de fee via Horizon /fee_stats
   */
  get baseFee(): string {
    return '100000'; // 0.01 XLM — conservador para prioridade
  },

} as const;
