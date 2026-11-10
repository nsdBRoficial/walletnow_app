/**
 * @module packages\core\src\public\types\integration.types.ts
 * @description WalletNow Protocol - Arquitetura de carteira inteligente e pagamentos Stellar.
 */
import type { NetworkType } from './network.types';
import type { Permission, CapabilityDescriptor } from './plugin.types';

/**
 * Categorias de protocolos no ecossistema WalletNow OS
 */
export type IntegrationCategory =
  | 'wallet'
  | 'swap'
  | 'yield'
  | 'rwa'
  | 'payments'
  | 'bridge'
  | 'identity'
  | 'analytics'
  | 'ai'
  | 'developer'
  | 'utility';


/**
 * Status de Saúde da Integração (HealthStatus)
 */
export enum HealthStatus {
  ONLINE = 'ONLINE',
  DEGRADED = 'DEGRADED',
  OFFLINE = 'OFFLINE',
  UNKNOWN = 'UNKNOWN',
  MAINTENANCE = 'MAINTENANCE',
}

/**
 * Requisitos de compatibilidade do plugin.
 * A WalletNow usa isso para esconder integrações incompatíveis com o perfil do usuário.
 */
export interface ProtocolRequirements {
  /** Requer KYC aprovado para funcionar */
  kyc?: boolean;
  /** Requer conta Stellar criada */
  wallet?: boolean;
  /** Requer rede específica (ex: 'testnet', 'mainnet') */
  network?: NetworkType[];
  /** Disponível apenas em sandbox */
  sandbox?: boolean;
  /** Requer trustline do ativo nativo do protocolo */
  trustline?: boolean;
  /** Disponível apenas nos países listados (ISO 3166-1 alpha-2) */
  country?: string[];
}

/**
 * Metadados de exibição para montagem dinâmica da UI.
 * Permite que o Dashboard organize integrações sem conhecê-las individualmente.
 */
export interface ProtocolDisplay {
  /** Seção da UI onde aparece: 'invest', 'savings', 'payments', 'defi' */
  section: 'invest' | 'savings' | 'payments' | 'defi' | 'other';
  /** Prioridade dentro da seção (maior = aparece primeiro) */
  priority: number;
  /** Destaque na tela inicial */
  featured?: boolean;
  /** Cor primária do protocolo (hex) */
  color?: string;
  /** Rótulo curto para botões de ação (ex: 'Investir', 'Comprar') */
  actionLabel?: string;
  /** Ícone alternativo para exibição em listagens */
  listIcon?: string;
}

/**
 * O Manifesto Universal do Plugin (ProtocolManifest).
 * Todo plugin deve declarar isso.
 */
export interface ProtocolManifest {
  /** Identificador único do protocolo (ex: @walletnow/plugin-soroswap) */
  readonly id: string;
  
  /** Nome amigável para UI */
  readonly name: string;
  
  /** Versão atual do plugin */
  readonly version: string;

  /** Categoria primária na App Store */
  readonly category: IntegrationCategory;

  /** Breve descrição do que o protocolo faz */
  readonly description: string;

  /** Links úteis */
  readonly website: string;
  readonly docs?: string;
  
  /** URL do ícone (SVG recomendado) */
  readonly icon: string;

  /** Redes suportadas pelo protocolo */
  readonly networks: NetworkType[];

  /** Quais capabilities este plugin implementa (ex: ['swap', 'liquidity']) */
  readonly capabilities: CapabilityDescriptor[];

  /** Permissões solicitadas do Core */
  readonly permissions: Permission[];

  /** Autor ou equipe publicadora */
  readonly author: string;

  /** Prioridade de ordenação UI (-1, 0, 1) */
  readonly priority?: number;

  /**
   * Requisitos de compatibilidade — usado pelo Discovery para filtrar integrações.
   * Se ausente, assume-se sem requisitos especiais.
   */
  readonly requirements?: ProtocolRequirements;

  /**
   * Metadados de exibição — usado pelo Dashboard para montar seções dinamicamente.
   */
  readonly display?: ProtocolDisplay;

  /** 
   * Função dinâmica de verificação de integridade (pode pingar a API do protocolo) 
   */
  healthCheck(): Promise<HealthStatus>;
}

