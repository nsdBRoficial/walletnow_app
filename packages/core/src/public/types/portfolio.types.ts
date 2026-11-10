/**
 * @module packages\core\src\public\types\portfolio.types.ts
 * @description WalletNow Protocol - Arquitetura de carteira inteligente e pagamentos Stellar.
 */
/**
 * Arquitetura de Portfólio Unificado do WalletNow
 * 
 * Este arquivo define a abstração do portfólio.
 * Todas as integrações (DeFi, RWA, Yield) devem retornar posições neste formato padronizado.
 */

export type PositionType = 'native' | 'token' | 'lp' | 'yield' | 'rwa';

export interface PortfolioPosition {
  /** Identificador único da posição (ex: contractId, assetCode) */
  id: string;
  
  /** Tipo da posição no protocolo */
  type: PositionType;
  
  /** Protocolo de origem (ex: 'stellar', 'soroswap', 'defindex', 'etherfuse') */
  protocol: string;
  
  /** Nome ou símbolo amigável da posição (ex: 'USDC', 'XLM-USDC LP', 'USDC Defindex Vault') */
  name: string;
  
  /** Quantidade/Balance atual mantido pelo usuário, em unidade do token */
  balance: string;
  
  /** Valor nominal da posição em USD estimado (fiat) */
  valueUsd?: number;
  
  /** Dados específicos adicionais de cada protocolo */
  meta?: Record<string, any>;
}

export interface PortfolioSummary {
  /** Valor total de todas as posições somadas em USD */
  totalValueUsd: number;
  /** Lista de posições unificadas e ordenadas por valor */
  positions: PortfolioPosition[];
}
