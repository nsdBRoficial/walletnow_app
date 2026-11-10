/**
 * @module src\contexts\NetworkContext.tsx
 * @description WalletNow Protocol - Arquitetura de carteira inteligente e pagamentos Stellar.
 */
/**
 * NetworkContext.tsx
 * ==================
 * Contexto global de alternância de rede Stellar (TESTNET ↔ MAINNET).
 *
 * DESIGN DECISIONS:
 * - NíO altera WalletContext, DeviceVault, walletFactory nem nenhum serviço financeiro.
 * - A rede padrão é SEMPRE testnet (segurança).
 * - A alternância persiste em localStorage sob a chave '@walletnow:network'.
 * - Emite um CustomEvent 'walletnow:network-change' para permitir que serviços
 *   externos (ex: StellarNetwork) reajam sem acoplamento ao React.
 * - A chave do localStorage usada pelos serviços é @walletnow:runtime-network.
 *   Os serviços lêem esta chave para decidir qual endpoint Horizon usar.
 *   O AppConfig/StellarNetwork AINDA usa a env var como base — o NetworkContext
 *   sobrepõe o comportamento APENAS em runtime via helpers exportados.
 *
 * IMPORTANTE:
 * - Fluxos financeiros (DepositModal, SacarModal, WithdrawModal, paymentService,
 *   stellarTestAnchorService) operam EXCLUSIVAMENTE em testnet.
 *   O contexto bloqueia visualmente, mas não modifica esses serviços.
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

// ── Tipos Públicos ─────────────────────────────────────────────────────────────

export type NetworkType = 'testnet' | 'mainnet';

export interface NetworkContextType {
  /** Rede atualmente selecionada pelo usuário */
  currentNetwork: NetworkType;
  /** Atalho para verificar se está em testnet */
  isTestnet: boolean;
  /** Atalho para verificar se está em mainnet */
  isMainnet: boolean;
  /** Alterna a rede ativa e persiste no localStorage */
  switchNetwork: (network: NetworkType) => void;
}

// ── Constantes ────────────────────────────────────────────────────────────────

const STORAGE_KEY = '@walletnow:network';
const DEFAULT_NETWORK: NetworkType = 'testnet';

/**
 * Chave usada pelos helpers abaixo para expor a rede atual fora do contexto React.
 * Serviços que não têm acesso ao contexto podem chamar `getCurrentNetwork()`.
 */
const RUNTIME_KEY = '@walletnow:runtime-network';

// ── Helpers exportados (para uso fora do React, ex: services) ────────────────

/**
 * Retorna a rede ativa atual.
 * Pode ser usada por serviços fora do contexto React.
 */
export function getCurrentNetwork(): NetworkType {
  try {
    const stored = localStorage.getItem(RUNTIME_KEY) as NetworkType | null;
    if (stored === 'mainnet' || stored === 'testnet') return stored;
  } catch {
    // localStorage indisponível (SSR, etc)
  }
  return DEFAULT_NETWORK;
}

export function isCurrentNetworkMainnet(): boolean {
  return getCurrentNetwork() === 'mainnet';
}

export function isCurrentNetworkTestnet(): boolean {
  return getCurrentNetwork() === 'testnet';
}

// ── Context ───────────────────────────────────────────────────────────────────

const NetworkContext = createContext<NetworkContextType>({
  currentNetwork: DEFAULT_NETWORK,
  isTestnet: true,
  isMainnet: false,
  switchNetwork: () => {},
});

// ── Provider ──────────────────────────────────────────────────────────────────

export const NetworkProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentNetwork, setCurrentNetwork] = useState<NetworkType>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as NetworkType | null;
      const valid = stored === 'testnet' || stored === 'mainnet' ? stored : DEFAULT_NETWORK;
      // Sincroniza também a chave de runtime
      localStorage.setItem(RUNTIME_KEY, valid);
      return valid;
    } catch {
      return DEFAULT_NETWORK;
    }
  });

  // Garante que a chave de runtime está sempre sincronizada
  useEffect(() => {
    try {
      localStorage.setItem(RUNTIME_KEY, currentNetwork);
    } catch {
      // silent
    }
  }, [currentNetwork]);

  const switchNetwork = useCallback((network: NetworkType) => {
    setCurrentNetwork(network);
    try {
      localStorage.setItem(STORAGE_KEY, network);
      localStorage.setItem(RUNTIME_KEY, network);
    } catch {
      // silent
    }

    // Emite evento global para serviços externos poderem reagir
    try {
      window.dispatchEvent(new CustomEvent('walletnow:network-change', {
        detail: { network },
        bubbles: false,
      }));
    } catch {
      // silent
    }

    console.log(`[NetworkToggle] Rede alternada para: ${network}. Evento walletnow:network-change despachado.`);
  }, []);

  const value: NetworkContextType = {
    currentNetwork,
    isTestnet: currentNetwork === 'testnet',
    isMainnet: currentNetwork === 'mainnet',
    switchNetwork,
  };

  return (
    <NetworkContext.Provider value={value}>
      {children}
    </NetworkContext.Provider>
  );
};

// ── Hook ──────────────────────────────────────────────────────────────────────

export const useNetwork = (): NetworkContextType => useContext(NetworkContext);
