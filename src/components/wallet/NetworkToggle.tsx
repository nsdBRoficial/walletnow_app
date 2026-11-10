/**
 * @module src/components/wallet/NetworkToggle.tsx
 * @description Componente visual React (NetworkToggle) da interface de carteira autocustodial WalletNow (exporta: NetworkToggle).
 */
/**
 * NetworkToggle.tsx
 * =================
 * Badge compacto de alternância TESTNET ↔ MAINNET.
 *
 * Posicionamento: ao lado direito do AccountSwitcher no header do Dashboard.
 * Design: badge pill com indicador colorido + clique para abrir dropdown.
 *
 * REGRAS:
 * - NíO abre modais financeiros.
 * - NíO altera WalletContext ou qualquer serviço de pagamento.
 * - Ao trocar para MAINNET, exibe toast de aviso sobre bloqueio de On/Off Ramp.
 * - O dropdown fecha automaticamente ao clicar fora (useRef + useEffect).
 */

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Zap, Globe, AlertTriangle } from 'lucide-react';
import { useNetwork, NetworkType } from '../../contexts/NetworkContext';

export default function NetworkToggle() {
  const { currentNetwork, isMainnet, switchNetwork } = useNetwork();
  const [isOpen, setIsOpen] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSwitch = (network: NetworkType) => {
    if (network === currentNetwork) {
      setIsOpen(false);
      return;
    }
    switchNetwork(network);
    setIsOpen(false);

    // Toast de aviso ao entrar em MAINNET
    if (network === 'mainnet') {
      setShowToast(true);
      setTimeout(() => setShowToast(false), 4000);
    }
  };

  // ── Estilo do badge ativo ──────────────────────────────────────────────────
  const badgeStyle = isMainnet
    ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
    : 'bg-amber-500/10 border-amber-500/30 text-amber-400';

  const dotStyle = isMainnet ? 'bg-blue-400' : 'bg-amber-400';

  return (
    <div className="relative" ref={dropdownRef}>
      {/* ── Badge Principal ────────────────────────────────────────────────── */}
      <button
        onClick={() => setIsOpen(v => !v)}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-widest transition-all duration-200 hover:opacity-80 ${badgeStyle}`}
        title={`Rede ativa: ${currentNetwork.toUpperCase()} — clique para alternar`}
      >
        {/* Indicador pulsante */}
        <span className="relative flex h-1.5 w-1.5">
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-50 ${dotStyle}`} />
          <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${dotStyle}`} />
        </span>
        {currentNetwork}
        <ChevronDown className={`w-2.5 h-2.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* ── Dropdown ──────────────────────────────────────────────────────── */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 z-[200] w-52 bg-[#161616] border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Header do dropdown */}
          <div className="px-4 py-2.5 border-b border-white/5">
            <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Selecionar Rede</p>
          </div>

          {/* Opção TESTNET */}
          <button
            onClick={() => handleSwitch('testnet')}
            className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/5 transition-colors ${
              currentNetwork === 'testnet' ? 'bg-amber-500/5' : ''
            }`}
          >
            <div className="w-7 h-7 rounded-full bg-amber-500/10 flex items-center justify-center flex-shrink-0">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="flex-1">
              <p className={`text-xs font-bold ${currentNetwork === 'testnet' ? 'text-amber-400' : 'text-white'}`}>
                TESTNET
              </p>
              <p className="text-[10px] text-gray-500">Sandbox · Sem valor real</p>
            </div>
            {currentNetwork === 'testnet' && (
              <div className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
            )}
          </button>

          {/* Opção MAINNET */}
          <button
            onClick={() => handleSwitch('mainnet')}
            className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/5 transition-colors ${
              currentNetwork === 'mainnet' ? 'bg-blue-500/5' : ''
            }`}
          >
            <div className="w-7 h-7 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0">
              <Globe className="w-3.5 h-3.5 text-blue-400" />
            </div>
            <div className="flex-1">
              <p className={`text-xs font-bold ${currentNetwork === 'mainnet' ? 'text-blue-400' : 'text-white'}`}>
                MAINNET
              </p>
              <p className="text-[10px] text-gray-500">Stellar Principal · XLM real</p>
            </div>
            {currentNetwork === 'mainnet' && (
              <div className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
            )}
          </button>

          {/* Aviso de segurança */}
          <div className="px-4 py-2.5 border-t border-white/5 flex items-start gap-2">
            <AlertTriangle className="w-3 h-3 text-gray-600 flex-shrink-0 mt-0.5" />
            <p className="text-[9px] text-gray-600 leading-relaxed">
              On/Off Ramp disponível apenas em TESTNET. Depósitos, saques e treasury permanecem bloqueados em MAINNET.
            </p>
          </div>
        </div>
      )}

      {/* ── Toast de aviso MAINNET ─────────────────────────────────────────── */}
      {showToast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[300] animate-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center gap-2.5 px-4 py-3 bg-blue-950 border border-blue-500/30 rounded-2xl shadow-2xl max-w-xs">
            <Globe className="w-4 h-4 text-blue-400 flex-shrink-0" />
            <p className="text-xs text-blue-200">
              <strong className="text-blue-300">Mainnet ativa.</strong> On/Off Ramp ainda em homologação sandbox.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
