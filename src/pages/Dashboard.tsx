/**
 * @module src/pages/Dashboard.tsx
 * @description Página principal da aplicação (Dashboard) — orquestração de estado, saldos Stellar e ações do usuário (exporta: Dashboard).
 */
/**
 * @packageDocumentation
 * @module Pages/Dashboard
 *
 * Dashboard Principal — The Money Layer (WalletNow OS)
 *
 * Responsabilidade:
 * Centralizar a experiência operacional do usuário:
 * - Exibição de saldos consolidados on-chain (XLM, USDC, BRZ, BRW e cotas de rendimento).
 * - Histórico em tempo real de transações na Stellar Network e eventos de gateway bancário.
 * - Integração de Ativos do Mundo Real (RWA via Etherfuse BRT).
 * - Modais para Depósito PIX, Envio P2P e Saque com conciliação automática.
 *
 * @updated Setembro de 2026
 * @version 0.4.5-candidate
 */

import { ArrowDownLeft, ArrowUpRight, History, Settings as SettingsIcon, ShieldCheck, Award, Loader2, Globe, Lock } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DepositModal from '../components/modals/DepositModal';
import SendModal from '../components/modals/SendModal';
import SacarModal from '../components/modals/SacarModal';
import WithdrawModal from '../components/modals/WithdrawModal';
import { useAuth } from '../contexts/AuthContext';
import { useWallet } from '../contexts/WalletContext';
import { useNetwork } from '../contexts/NetworkContext';
import { WalletFactory } from '../services/walletFactory';
import { logger } from '../utils/logger';
import { DemoConfig } from '../config/demoMode';
import { EtherfuseActivityService, EfV2Activity } from '../services/providers/etherfuseV2/etherfuseActivityService';
import AccountSwitcher from '../components/wallet/AccountSwitcher';
import NetworkToggle from '../components/wallet/NetworkToggle';
import { MainnetService } from '../services/mainnetService';
import { isCurrentNetworkMainnet } from '../contexts/NetworkContext';
import { StellarNetwork } from '../config/stellarNetwork';

/**
 * Dashboard Principal — The Money Layer
 *
 * Tela central do aplicativo. Exibe o saldo on-chain da conta ativa (XLM nativo como principal),
 * histórico de transações Stellar, seção de Tokenized Treasury (Etherfuse BRT),
 * e botões de ação para depósito PIX, saque e off-ramp via Anchor.
 *
 * A UI usa XLM como ativo de saldo primário e exibe USDC/BRW como ativos secundários,
 * escondendo a complexidade da rede Stellar do usuário final.
 *
 * GUARDS DE RUNTIME:
 * - Aguarda walletLoading=false antes de abortar (evita race condition de provisionamento).
 * - activeAccount vem do WalletContext (suporta conta legada, importada e gerada).
 */
export default function Dashboard() {
  const navigate = useNavigate();
  // Consumindo dados do Usuário Logado e seu Profile (que contem o endereco Stellar e Dados de KYC)
  const { user, profile } = useAuth();
  const { activeAccount, loading: walletLoading } = useWallet();
  const { currentNetwork, isMainnet } = useNetwork();

  // Prioriza o nome validado no KYC, fazendo fallback para o email ou 'Usuário' genérico
  const userFirstName = profile?.full_name
    ? profile.full_name.split(' ')[0]
    : (user?.email ? user.email.split('@')[0] : 'Usuário');

  // Estados (State) para controlar se os modais (janelas sobrepostas) estão abertos ou fechados.
  // 'false' significa que começam fechados.
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [isSendOpen, setIsSendOpen] = useState(false);
  const [isSacarOpen, setIsSacarOpen] = useState(false);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);

  // Toast de bloqueio para botões financeiros em MAINNET
  const [showMainnetBlockToast, setShowMainnetBlockToast] = useState(false);
  const handleMainnetBlocked = () => {
    setShowMainnetBlockToast(true);
    setTimeout(() => setShowMainnetBlockToast(false), 3500);
  };

  // Estados de Saldo (Extraídos do Blockchain via Stellar Horizon)
  const [totalBalance, setTotalBalance] = useState<string>('0.00');
  const [assetDetails, setAssetDetails] = useState<{ brz: string, brw: string, usdc: string, tesouro: string, cetes: string, ustb: string, xlm: string }>({ brz: '0.00', brw: '0.00', usdc: '0.00', tesouro: '0.00', cetes: '0.00', ustb: '0.00', xlm: '0.00' });
  const [isLoadingBalance, setIsLoadingBalance] = useState(true);
  const [isAccountActive, setIsAccountActive] = useState<boolean | null>(null); // null = checking, false = 404
  const [isActivating, setIsActivating] = useState(false);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [ef2Activities, setEf2Activities] = useState<EfV2Activity[]>([]);
  // Anti-loop: impede múltiplas tentativas de funding Mainnet na mesma sessão.
  // A Mainnet Edge Function já tem trava dupla server-side (audit table + Horizon check),
  // mas este flag evita flood de requisições do frontend.
  const [mainnetFundingAttempted, setMainnetFundingAttempted] = useState(false);

  const fetchOnChainBalance = async () => {
    console.log('[Dashboard] fetchOnChainBalance: START. activeAccount:', activeAccount?.stellar_public_key);
    if (!activeAccount?.stellar_public_key) {
      console.log('[Dashboard] fetchOnChainBalance: ABORTED (no activeAccount public key)');
      if (!walletLoading) {
        setIsLoadingBalance(false);
      }
      return;
    }
    setIsLoadingBalance(true);

    try {
      logger.info('[WalletNow][UI]', 'Fetching On-Chain balance and history', { address: activeAccount.stellar_public_key });

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('TIMEOUT')), DemoConfig.hardTimeoutMs)
      );

      // Busca Blockchain (Saldo BRZ & Histórico) com Hard Timeout
      const [balances, history] = await Promise.race([
        Promise.all([
          WalletFactory.getBalances(activeAccount.stellar_public_key),
          WalletFactory.getHistory(activeAccount.stellar_public_key)
        ]),
        timeoutPromise
      ]) as any;

      if (balances) {
        setIsAccountActive(true);
        setAssetDetails({ brz: balances.brz, brw: balances.brw, usdc: balances.usdc || '0.00', tesouro: balances.tesouro, cetes: balances.cetes, ustb: balances.ustb, xlm: balances.xlm || '0.00' });
        // XLM Nativo é o ativo principal agora.
        const totalXlm = parseFloat(balances.xlm || '0');
        setTotalBalance(totalXlm.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 7 }));
        console.log('[Dashboard] fetchOnChainBalance: SUCCESS (balances loaded)');
        if (currentNetwork === 'mainnet') {
            console.log(`[MainnetBalance] Saldos carregados com sucesso usando Horizon Public: ${balances.xlm} XLM.`);
        }
      } else {
        console.log('[Dashboard] fetchOnChainBalance: WARNING (balances null, trying emergency activation)');
        if (currentNetwork === 'mainnet') {
            console.log(`[MainnetBalance] ⚠️ Conta Mainnet ainda não existe (404). Zombificando saldos até o auto-funding.`);
        }
        // Se balances for null (conta não existe no ledger = 404):
        setIsAccountActive(false);
        setTotalBalance('0,00');
        setAssetDetails({ brz: '0.00', brw: '0.00', usdc: '0.00', tesouro: '0.00', cetes: '0.00', ustb: '0.00', xlm: '0.00' });

        const networkIsMainnet = isCurrentNetworkMainnet();
        if (networkIsMainnet) {
          console.log('[MainnetFunding] Horizon 404 detected — conta não existe no ledger Mainnet.');
        } else {
          console.log('[Dashboard] fetchOnChainBalance: WARNING (balances null, trying emergency activation)');
        }

        handleEmergencyActivation();
      }
      if (history) {
        console.log('[Dashboard] fetchOnChainBalance: SUCCESS (history loaded, length:', history.length, ')');
        setTransactions(history);
      }
      setEf2Activities(EtherfuseActivityService.getActivities(activeAccount.stellar_public_key));
    } catch (e: any) {
      if (e.message === 'TIMEOUT') {
        logger.error('[WalletNow][System]', 'Dashboard timeout on fetch balance');
      } else {
        logger.error('[WalletNow][UI]', 'Error fetching balance', e);
      }

      if (e.message?.includes('404')) {
        setIsAccountActive(false);
      }
    } finally {
      setIsLoadingBalance(false);
    }
  };

  /**
   * Polling com retry para esperar Horizon indexar a conta.
   * Implementa backoff exponencial: 2s, 4s, 6s, 8s, 10s (max 30s total)
   */
  const pollHorizonUntilAccountExists = async (publicKey: string, maxRetries: number = 5) => {
    let retryCount = 0;
    const baseDelay = 2000; // 2 segundos

    while (retryCount < maxRetries) {
      try {
        console.log(`[MainnetFunding] POLLING (${retryCount + 1}/${maxRetries}) — esperando Horizon indexar...`);
        
        // Tenta carregar a conta
        const balances = await WalletFactory.getBalances(publicKey);
        
        if (balances) {
          console.log('[MainnetFunding] ✅ POLLING_SUCCESS — conta indexada no Horizon. Carregando saldos...');
          return fetchOnChainBalance();
        }
      } catch (err: any) {
        console.warn(`[MainnetFunding] ⚠️ POLLING_RETRY — Horizon ainda não indexou (${err?.message || 'timeout'})`);
      }

      retryCount++;
      if (retryCount < maxRetries) {
        const delay = baseDelay * retryCount; // 2s, 4s, 6s, 8s, 10s
        console.log(`[MainnetFunding] Aguardando ${delay}ms antes da próxima tentativa...`);
        await new Promise(r => setTimeout(r, delay));
      }
    }

    console.error('[MainnetFunding] ❌ POLLING_FAILED — Horizon não indexou a conta após 30s. Recarregue a página.');
  };

  /**
   * Ativação de Emergência — rede-aware.
   *
   * MAINNET: Aciona MainnetService.requestMainnetFunding() (Edge Function real).
   *   - Trava de sessão: apenas 1 tentativa por sessão de app (mainnetFundingAttempted).
   *   - A Edge Function já possui trava dupla server-side (audit table + Horizon check).
   *   - NUNCA usa Sponsor/IssuerService/fund_wallet na Mainnet.
   *   - Implementa polling com retry até Horizon indexar (máx 30s).
   *
   * TESTNET: Usa WalletFactory.activateAccount() (Sponsor via stellar-issuer).
   *   - Comportamento original preservado intacto.
   */
  const handleEmergencyActivation = async () => {
    if (!activeAccount?.stellar_public_key || isActivating || isAccountActive) return;

    const networkIsMainnet = isCurrentNetworkMainnet();

    if (networkIsMainnet) {
      // ⛔ MAINNET: Nunca usar Sponsor. Usar MainnetService.requestMainnetFunding().
      if (mainnetFundingAttempted) {
        console.log('[MainnetFunding] BLOCKED_LOOP — já houve tentativa de funding nesta sessão. Aguardando Horizon indexar...');
        return;
      }

      console.log('[MainnetFunding] START — conta não encontrada no Horizon Mainnet. Acionando Edge Function...');
      setMainnetFundingAttempted(true);
      setIsActivating(true);

      try {
        console.log('[MainnetFunding] REQUEST_SENT — MainnetService.requestMainnetFunding()');
        const txHash = await MainnetService.requestMainnetFunding(activeAccount.stellar_public_key);
        console.log(`[MainnetFunding] SUCCESS — txHash: ${txHash}. Aguardando Horizon indexar com polling...`);
        setIsAccountActive(true);
        // Polling com retry até Horizon indexar (máx 30 segundos)
        pollHorizonUntilAccountExists(activeAccount.stellar_public_key);
      } catch (err: any) {
        console.error('[MainnetFunding] FAILED — erro no auto-funding Mainnet:', err?.message || err);
        // Não retenta: trava de sessão já definida. O usuário pode recarregar para tentar novamente.
      } finally {
        setIsActivating(false);
      }

    } else {
      // TESTNET: comportamento original via Sponsor (stellar-issuer/fund_wallet)
      setIsActivating(true);
      try {
        logger.info('[WalletNow][Blockchain]', 'Iniciando ativação automática (emergency) — TESTNET');
        const success = await WalletFactory.activateAccount(activeAccount.stellar_public_key);
        if (success) {
          logger.info('[WalletNow][Blockchain]', 'Ativação automática concluída — TESTNET');
          setIsAccountActive(true);
          setTimeout(fetchOnChainBalance, 2000);
        }
      } catch (err: any) {
        logger.error('[WalletNow][Blockchain]', 'Erro na ativação automática — TESTNET', err);
      } finally {
        setIsActivating(false);
      }
    }
  };

  // Efeito Executado na montagem da tela, quando a conta ativa muda, OU quando a rede muda (TESTNET <-> MAINNET)
  useEffect(() => {
    // FASE 10: Invalidate state on network change
    setIsLoadingBalance(true);
    setTotalBalance('0.00');
    setAssetDetails({ brz: '0.00', brw: '0.00', usdc: '0.00', tesouro: '0.00', cetes: '0.00', ustb: '0.00', xlm: '0.00' });
    setTransactions([]);
    setEf2Activities([]);
    // Reset da trava anti-loop: ao trocar de rede ou de conta, uma nova tentativa de funding é legítima.
    setMainnetFundingAttempted(false);
    
    // Pequeno debounce para dar tempo da alteração do localStorage propagar para os services.
    const timerId = setTimeout(() => {
        fetchOnChainBalance();
    }, 100);

    return () => clearTimeout(timerId);
  }, [activeAccount?.stellar_public_key, walletLoading, currentNetwork]);

  // Transações On-Chain alimentam o State `transactions`

  return (
    <div className="min-h-screen flex flex-col bg-[#0A0A0A] animate-in fade-in duration-500">

      {/* Cabeçalho (Header) */}
      <header className="px-6 pt-8 pb-4 flex justify-between items-center relative z-50">
        <div className="flex items-center gap-3">
          {/* Account Switcher + Network Toggle (lado a lado) */}
          <AccountSwitcher />
          <NetworkToggle />
        </div>

        <div className="flex items-center gap-3">
          {/* Saudação ao Usuário */}
          <div className="hidden sm:block text-right mr-2">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">WalletNow</p>
            <p className="text-sm text-white font-semibold capitalize">Olá, {userFirstName}</p>
          </div>

          {/* Botão de Configurações (Leva para a tela de KYC/Settings) */}
          <button
            onClick={() => navigate('/settings')}
            className="p-2.5 bg-[#161616] rounded-full text-gray-400 hover:text-white border border-white/5 transition-colors shadow-lg"
          >
            <SettingsIcon className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Card Principal de Saldo */}
      <div className="px-6 py-4">
        <div className="bg-gradient-to-br from-[#161616] to-[#0A0A0A] rounded-[32px] p-8 border border-white/5 shadow-2xl relative overflow-hidden">

          {/* Efeito visual de brilho (Glow) no canto superior direito do card */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#00E676]/10 rounded-full blur-3xl"></div>

          <p className="text-sm text-gray-400 font-medium mb-2">Saldo Disponível</p>

          {/* Exibição do Saldo (Sempre formatado em R$) */}
          <div className="flex flex-col mb-8">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl text-gray-500 font-semibold">XLM</span>
              {isLoadingBalance ? (
                <div className="flex items-center text-gray-600 gap-2 h-12">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : (
                <div className="flex flex-col">
                  <h2 className="text-5xl font-bold text-white tracking-tight">{totalBalance}</h2>
                  <div className="flex gap-3 mt-2">
                    {parseFloat(assetDetails.usdc) > 0 && (
                      <span className="text-[10px] text-blue-400 uppercase font-bold tracking-wider px-2 py-0.5 bg-blue-500/10 rounded-md border border-blue-500/20">
                        USDC: {parseFloat(assetDetails.usdc).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    )}
                    {parseFloat(assetDetails.brw) > 0 && (
                      <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider px-2 py-0.5 bg-white/5 rounded-md border border-white/5">
                        BRW: {parseFloat(assetDetails.brw).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    )}
                    {parseFloat(assetDetails.brz) > 0 && (
                      <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider px-2 py-0.5 bg-white/5 rounded-md border border-white/5">
                        BRZ: {parseFloat(assetDetails.brz).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Botões de Ação Principais
               - TESTNET: comportamento normal
               - MAINNET: disabled + opacity + cursor-not-allowed + badge Sandbox Only */}
          <div className="flex gap-4">
            {/* Depositar */}
            <button
              onClick={isMainnet ? handleMainnetBlocked : () => setIsDepositOpen(true)}
              disabled={!isMainnet && (isLoadingBalance || isAccountActive === false || isActivating)}
              className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold transition-all ${
                isMainnet
                  ? 'bg-[#00E676]/20 text-black/40 cursor-not-allowed opacity-50 border border-[#00E676]/10'
                  : 'bg-[#00E676] hover:bg-[#00E676]/90 text-black shadow-[0_0_15px_rgba(0,230,118,0.2)] disabled:opacity-50 disabled:grayscale'
              }`}
              title={isMainnet ? 'Sandbox Only — disponível apenas em TESTNET' : undefined}
            >
              {isMainnet ? (
                <Lock className="w-4 h-4" />
              ) : isActivating || (isAccountActive === false && isLoadingBalance) ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <ArrowDownLeft className="w-5 h-5" />
              )}
              <span className="text-sm">
                {isMainnet ? 'Sandbox Only' : isActivating ? 'Ativando...' : (isAccountActive === false ? 'Configurando...' : 'Depositar')}
              </span>
            </button>

            {/* Sacar BRW */}
            <button
              onClick={isMainnet ? handleMainnetBlocked : () => setIsSacarOpen(true)}
              disabled={isMainnet}
              className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl font-semibold transition-colors border ${
                isMainnet
                  ? 'bg-white/5 border-white/5 text-gray-600 cursor-not-allowed opacity-50'
                  : 'bg-white/10 hover:bg-white/15 text-white border-white/5'
              }`}
              title={isMainnet ? 'Sandbox Only — disponível apenas em TESTNET' : undefined}
            >
              {isMainnet ? <Lock className="w-4 h-4" /> : <ArrowUpRight className="w-5 h-5" />}
              <span className="text-sm">{isMainnet ? 'Sandbox Only' : 'Sacar BRW'}</span>
            </button>

            {/* Off-Ramp XLM */}
            <button
              onClick={isMainnet ? handleMainnetBlocked : () => setIsWithdrawOpen(true)}
              disabled={isMainnet}
              className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl font-semibold transition-colors border ${
                isMainnet
                  ? 'bg-blue-600/5 border-blue-500/10 text-blue-900 cursor-not-allowed opacity-50'
                  : 'bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border-blue-500/20'
              }`}
              title={isMainnet ? 'Sandbox Only — disponível apenas em TESTNET' : undefined}
            >
              {isMainnet ? <Lock className="w-4 h-4" /> : <ArrowUpRight className="w-5 h-5" />}
              <span className="text-sm">{isMainnet ? 'Sandbox Only' : 'Off-Ramp XLM'}</span>
            </button>
          </div>
        </div>
      </div>



      {/* Seção Treasury Assets (Etherfuse RWA) */}
      <div className="px-6 py-2">
        <div className="bg-gradient-to-br from-[#0F172A] to-[#020617] rounded-3xl p-6 border border-slate-800 shadow-[0_10px_40px_-15px_rgba(15,23,42,0.8)] relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/5 rounded-full blur-3xl pointer-events-none group-hover:bg-blue-500/10 transition-all duration-700"></div>

          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center border border-slate-700 shadow-inner">
                <Globe className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-blue-400 font-mono tracking-widest uppercase">Tokenized Treasury</p>
                <h3 className="text-white font-bold tracking-tight">Brazilian Real Treasury</h3>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-500 font-mono bg-slate-900 px-2 py-1 rounded border border-slate-800">BRT</span>
              {isMainnet && (
                <span className="text-[9px] text-amber-400 font-mono bg-amber-900/20 px-2 py-1 rounded border border-amber-800/30 flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5" />
                  Mainnet prep
                </span>
              )}
            </div>
          </div>

          <div className="mt-6 flex items-end justify-between">
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1">Treasury Balance</p>
              {isLoadingBalance ? (
                <div className="h-8 flex items-center">
                  <Loader2 className="w-5 h-5 text-slate-600 animate-spin" />
                </div>
              ) : (
                <div className="flex items-baseline gap-1.5">
                  <span className="text-lg text-slate-500 font-semibold">R$</span>
                  <span className={`text-3xl font-bold tracking-tight ${isMainnet ? 'text-slate-600' : 'text-white'}`}>
                    {isMainnet ? '—' : (parseFloat(assetDetails.tesouro || '0') || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}
              {isMainnet && (
                <p className="text-[10px] text-slate-600 mt-1">Mainnet Treasury em preparação</p>
              )}
            </div>
            <div className="text-right">
              <p className="text-[10px] text-blue-400 uppercase tracking-wider font-semibold mb-1">Est. APY</p>
              <span className={`text-sm font-bold ${isMainnet ? 'text-slate-600' : 'text-blue-300'}`}>
                {isMainnet ? '—' : '~ 10.4%'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Seção de On/Off Ramp Activity (Etherfuse V2) */}
      <div className="px-6 py-4">
        <h3 className="text-lg font-semibold text-white mb-4">On/Off Ramp Activity</h3>
        <div className="bg-[#161616] rounded-2xl p-4 border border-white/5 shadow-lg">
          <div className="space-y-4">
            {ef2Activities.length > 0 ? (
              ef2Activities.map((act, idx) => (
                <div key={idx} className="flex justify-between items-center border-b border-white/5 pb-3 last:border-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                      {act.type === 'BUY TESOURO' ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                    </div>
                    <div>
                      <p className="text-sm text-white font-medium">{act.type}</p>
                      <p className="text-[10px] text-gray-500 font-mono mt-0.5">
                        Status: <span className="text-emerald-400 capitalize">{act.status}</span>
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-emerald-400">{parseFloat(act.amountToken).toFixed(6)} {act.asset}</p>
                    <p className="text-[10px] text-slate-400">R$ {parseFloat(act.amountBRL).toFixed(2)}</p>
                    {act.txHash !== 'Pendente' ? (
                      <a href={StellarNetwork.getTxExplorerUrl(act.txHash)} target="_blank" rel="noopener noreferrer" className="text-[10px] text-gray-500 hover:text-white transition-colors mt-1 inline-block">
                        Explorer ↗
                      </a>
                    ) : (
                      <span className="text-[10px] text-gray-600 mt-1 inline-block">Hash Pendente</span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500 text-center py-2">Nenhuma atividade de On/Off Ramp recente.</p>
            )}
          </div>
        </div>
      </div>

      {/* Seção de Histórico de Transações */}
      <div className="flex-1 px-6 pt-6 pb-24 bg-[#0A0A0A]">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white">Histórico Recente</h3>
          <button
            onClick={() => navigate('/activity')}
            className="text-sm text-[#00E676] hover:text-[#00E676]/80 font-medium flex items-center gap-1"
          >
            <History className="w-4 h-4" />
            Ver tudo
          </button>
        </div>

        {/* Lista de Transações (Renderizando o array 'transactions' On-Chain) */}
        <div className="space-y-4">
          {transactions.length > 0 ? (
            transactions.map((tx) => (
              <a
                key={tx.id}
                href={StellarNetwork.getTxExplorerUrl(tx.hash)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-4 bg-[#161616] rounded-2xl border border-white/5 hover:border-white/10 transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-transform group-hover:scale-110 ${tx.type === 'deposit' ? 'bg-[#00E676]/10 text-[#00E676]' : 'bg-white/5 text-white'}`}>
                    {tx.type === 'deposit' ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-white font-medium flex items-center gap-2">
                      {tx.title}
                      <span className="text-[9px] px-1.5 py-0.5 bg-white/10 rounded text-gray-400 font-bold uppercase">{tx.assetCode}</span>
                    </p>
                    <p className="text-xs text-gray-500 flex flex-col">
                      <span>{tx.date}</span>
                      {tx.correlationID && (
                        <span className="text-[10px] text-[#00E676]/60 font-mono mt-0.5">X402: {tx.correlationID}</span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-semibold ${tx.type === 'deposit' ? 'text-[#00E676]' : 'text-white'}`}>
                    {tx.amount}
                  </p>
                  <p className="text-[10px] text-gray-600 font-medium group-hover:text-[#00E676] transition-colors">Ver On-Chain ↗</p>
                </div>
              </a>
            ))
          ) : (
            <div className="text-center py-8">
              {isLoadingBalance ? (
                <Loader2 className="w-5 h-5 text-gray-500 animate-spin mx-auto" />
              ) : (
                <p className="text-sm text-gray-500">Nenhuma transação encontrada na sua carteira.</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Painel QA / Debug Mode */}
      <div className="px-6 py-2">
        <div className="bg-[#111] rounded-2xl p-4 border border-dashed border-[#333] font-mono text-xs text-gray-400">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#222]">
            <span className="text-[#00E676] font-bold">QA / Debug Mode</span>
            <span className="text-gray-500">{new Date().toLocaleTimeString()}</span>
          </div>
          <div className="space-y-1">
            <p><strong>Conta Ativa:</strong> {activeAccount?.label || 'N/A'} ({activeAccount?.account_type || '?'})</p>
            <p><strong>Public Key:</strong> {activeAccount?.stellar_public_key ? `${activeAccount.stellar_public_key.slice(0, 8)}...${activeAccount.stellar_public_key.slice(-4)}` : 'N/A'}</p>
            <p><strong>Horizon:</strong> {isAccountActive ? '✅ Conta Ativa' : 'Verificando...'}</p>
            <p><strong>XLM:</strong> {assetDetails.xlm} | <strong>USDC:</strong> {assetDetails.usdc} | <strong>BRW:</strong> {assetDetails.brw}</p>
            <p><strong>Rede:</strong> <span className={currentNetwork === 'mainnet' ? 'text-blue-400' : 'text-amber-400'}>{currentNetwork.toUpperCase()}</span> {isMainnet ? '🌐 XLM Real' : '⚡ Sandbox'}</p>
          </div>
        </div>
      </div>

      {/* Toast global: clique em botões bloqueados em MAINNET */}
      {showMainnetBlockToast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[300] animate-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center gap-2.5 px-4 py-3 bg-[#1a1a1a] border border-amber-500/30 rounded-2xl shadow-2xl max-w-xs">
            <Lock className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <p className="text-xs text-amber-200">
              <strong className="text-amber-300">On/Off Ramp ainda em homologação sandbox.</strong> Alterne para TESTNET para usar depósitos e saques.
            </p>
          </div>
        </div>
      )}

      {/* Seção de NFTs / Identidade ZK */}
      {profile?.kyc_verified && (
        <div className="px-6 pb-24 bg-[#0A0A0A]">
          <h3 className="text-lg font-semibold text-white mb-6">Ativos Digitais (NFTs)</h3>

          {/* Card Interativo: Leva para o Explorer da Transação na Blockchain */}
          <a
            href={StellarNetwork.getTxExplorerUrl(profile.kyczk_hash)}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-gradient-to-br from-[#161616] to-[#0A0A0A] p-5 rounded-2xl border border-[#00E676]/20 relative overflow-hidden flex items-center gap-4 group hover:border-[#00E676]/40 text-left transition-colors cursor-pointer shadow-lg shadow-[#00E676]/5 block"
          >
            {/* Efeito visual de brilho no card */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#00E676]/10 rounded-full blur-3xl pointer-events-none group-hover:bg-[#00E676]/20 transition-all"></div>

            <div className="w-14 h-14 rounded-xl bg-[#00E676]/10 flex flex-shrink-0 items-center justify-center border border-[#00E676]/30">
              <ShieldCheck className="w-7 h-7 text-[#00E676]" />
            </div>

            <div className="flex-1 w-full overflow-hidden">
              <p className="text-xs text-[#00E676] font-bold tracking-widest uppercase mb-1 flex items-center gap-1.5">
                KYCZK Token <Award className="w-3.5 h-3.5" />
              </p>
              <p className="text-white font-medium text-sm">Selo de Identidade ZK-STARK</p>
              {profile.kyczk_hash && (
                <p className="text-xs text-gray-500 mt-1 truncate" title={`Ver no Explorer: ${profile.kyczk_hash}`}>
                  Hash: {profile.kyczk_hash}
                </p>
              )}
            </div>

            <div className="flex-shrink-0 text-gray-600 group-hover:text-[#00E676] transition-colors">
              <ArrowUpRight className="w-5 h-5 opacity-50 group-hover:opacity-100" />
            </div>
          </a>
        </div>
      )}

      {/* Renderização dos Modais 
          Eles ficam "escondidos" no código e só aparecem quando os estados 
          isDepositOpen ou isSendOpen se tornam 'true'.
          Passamos a função onClose para que o modal saiba como se fechar.
      */}
      <DepositModal isOpen={isDepositOpen} onClose={() => setIsDepositOpen(false)} onSuccess={fetchOnChainBalance} />
      <SacarModal
        isOpen={isSacarOpen}
        onClose={() => setIsSacarOpen(false)}
        onSuccess={fetchOnChainBalance}
        brwBalance={parseFloat(assetDetails.brw).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      />
      <WithdrawModal isOpen={isWithdrawOpen} onClose={() => setIsWithdrawOpen(false)} onSuccess={fetchOnChainBalance} />
      <SendModal isOpen={isSendOpen} onClose={() => setIsSendOpen(false)} onSuccess={fetchOnChainBalance} />

    </div>
  );
}
