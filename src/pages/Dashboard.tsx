import { ArrowDownLeft, ArrowUpRight, History, Settings as SettingsIcon, Wallet, ShieldCheck, Award, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DepositModal from '../components/modals/DepositModal';
import SendModal from '../components/modals/SendModal';
import SacarModal from '../components/modals/SacarModal';
import { useAuth } from '../contexts/AuthContext';
import { WalletFactory } from '../services/walletFactory';

/**
 * Tela do Dashboard Principal (The Money Layer)
 * 
 * Esta é a tela central do aplicativo. Aqui o usuário vê o seu saldo (sempre em Reais/BRZ),
 * o histórico de transações e tem acesso aos botões principais de ação (Depositar e Sacar).
 * A ideia é que pareça um banco digital comum (como Nubank), escondendo toda a complexidade da rede Stellar.
 */
export default function Dashboard() {
  const navigate = useNavigate();
  // Consumindo dados do Usuário Logado e seu Profile (que contem o endereco Stellar e Dados de KYC)
  const { user, profile } = useAuth();

  // Prioriza o nome validado no KYC, fazendo fallback para o email ou 'Usuário' genérico
  const userFirstName = profile?.full_name
    ? profile.full_name.split(' ')[0]
    : (user?.email ? user.email.split('@')[0] : 'Usuário');

  // Estados (State) para controlar se os modais (janelas sobrepostas) estão abertos ou fechados.
  // 'false' significa que começam fechados.
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [isSendOpen, setIsSendOpen] = useState(false);
  const [isSacarOpen, setIsSacarOpen] = useState(false);

  // Estados de Saldo (Extraídos do Blockchain via Stellar Horizon)
  const [totalBalance, setTotalBalance] = useState<string>('0.00');
  const [assetDetails, setAssetDetails] = useState<{brz: string, brw: string}>({brz: '0.00', brw: '0.00'});
  const [isLoadingBalance, setIsLoadingBalance] = useState(true);
  const [isAccountActive, setIsAccountActive] = useState<boolean | null>(null); // null = checking, false = 404
  const [isActivating, setIsActivating] = useState(false);
  const [transactions, setTransactions] = useState<any[]>([]);

  // Função isolada do Efeito para que possamos repassa-la como 'refresh'
  const fetchOnChainBalance = async () => {
    if (!profile?.stellar_address) return;
    setIsLoadingBalance(true);

    try {
      // Busca Blockchain (Saldo BRZ & Histórico)
      const [balances, history] = await Promise.all([
        WalletFactory.getBalances(profile.stellar_address),
        WalletFactory.getHistory(profile.stellar_address)
      ]);

      if (balances) {
        setIsAccountActive(true);
        setAssetDetails({ brz: balances.brz, brw: balances.brw });
        // Soma dos saldos em Real (BRZ + BRW — ambos 1:1)
        const total = parseFloat(balances.brz) + parseFloat(balances.brw);
        setTotalBalance(total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
      } else {
        // Se balances for null (404), tentamos ativar
        setIsAccountActive(false);
        handleEmergencyActivation();
      }
      if (history) {
        setTransactions(history);
      }
    } catch (e: any) {
      console.error(e);
      if (e.message?.includes('404')) {
        setIsAccountActive(false);
      }
    } finally {
      setIsLoadingBalance(false);
    }
  };

  /**
   * Ativação de Emergência via Sponsor
   */
  const handleEmergencyActivation = async () => {
    if (!profile?.stellar_address || isActivating || isAccountActive) return;
    
    setIsActivating(true);
    try {
      const success = await WalletFactory.activateAccount(profile.stellar_address);
      if (success) {
        setIsAccountActive(true);
        // Pequeno delay para o Horizon indexar antes de atualizar saldos
        setTimeout(fetchOnChainBalance, 2000);
      }
    } catch (err) {
      console.error("Erro na ativação automática:", err);
    } finally {
      setIsActivating(false);
    }
  };

  // Efeito Executado na montagem da tela
  useEffect(() => {
    fetchOnChainBalance();
  }, [profile?.stellar_address]);

  // Transações On-Chain alimentam o State `transactions`

  return (
    <div className="min-h-screen flex flex-col bg-[#0A0A0A] animate-in fade-in duration-500">

      {/* Cabeçalho (Header) */}
      <header className="px-6 pt-8 pb-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          {/* Ícone da Carteira */}
          <div className="w-10 h-10 bg-[#161616] rounded-xl flex items-center justify-center border border-white/5 shadow-lg">
            <Wallet className="w-5 h-5 text-[#00E676]" />
          </div>
          {/* Saudação ao Usuário */}
          <div>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">WalletNow</p>
            <p className="text-sm text-white font-semibold capitalize">Olá, {userFirstName}</p>
          </div>
        </div>

        {/* Botão de Configurações (Leva para a tela de KYC/Settings) */}
        <button
          onClick={() => navigate('/settings')}
          className="p-2.5 bg-[#161616] rounded-full text-gray-400 hover:text-white border border-white/5 transition-colors shadow-lg"
        >
          <SettingsIcon className="w-5 h-5" />
        </button>
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
              <span className="text-2xl text-gray-500 font-semibold">R$</span>
              {isLoadingBalance ? (
                <div className="flex items-center text-gray-600 gap-2 h-12">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : (
                <div className="flex flex-col">
                  <h2 className="text-5xl font-bold text-white tracking-tight">{totalBalance}</h2>
                  <div className="flex gap-3 mt-2">
                    <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider px-2 py-0.5 bg-white/5 rounded-md border border-white/5">
                      BRW: {parseFloat(assetDetails.brw).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                    <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider px-2 py-0.5 bg-white/5 rounded-md border border-white/5">
                      BRZ: {parseFloat(assetDetails.brz).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Botões de Ação Principais */}
          <div className="flex gap-4">
            {/* Botão Depositar: Abre o modal de PIX */}
            <button
              onClick={() => setIsDepositOpen(true)}
              disabled={isLoadingBalance || isAccountActive === false || isActivating}
              className="flex-1 flex items-center justify-center gap-2 bg-[#00E676] hover:bg-[#00E676]/90 text-black py-3.5 rounded-2xl font-bold transition-colors shadow-[0_0_15px_rgba(0,230,118,0.2)] disabled:opacity-50 disabled:grayscale transition-all"
            >
              {isActivating || (isAccountActive === false && isLoadingBalance) ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <ArrowDownLeft className="w-5 h-5" />
              )}
              {isActivating ? 'Ativando...' : (isAccountActive === false ? 'Configurando...' : 'Depositar')}
            </button>

            {/* Botão Sacar: Abre o novo modal de Saque PIX via Woovi */}
            <button
              onClick={() => setIsSacarOpen(true)}
              className="flex-1 flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 text-white py-3.5 rounded-2xl font-semibold transition-colors border border-white/5"
            >
              <ArrowUpRight className="w-5 h-5" />
              Sacar para PIX
            </button>
          </div>
        </div>
      </div>

      {/* Seção de Histórico de Transações */}
      <div className="flex-1 px-6 pt-6 pb-24 bg-[#0A0A0A]">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white">Histórico Recente</h3>
          <button className="text-sm text-[#00E676] hover:text-[#00E676]/80 font-medium flex items-center gap-1">
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
                href={`https://stellar.expert/explorer/testnet/tx/${tx.hash}`}
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

      {/* Seção de NFTs / Identidade ZK */}
      {profile?.kyc_verified && (
        <div className="px-6 pb-24 bg-[#0A0A0A]">
          <h3 className="text-lg font-semibold text-white mb-6">Ativos Digitais (NFTs)</h3>

          {/* Card Interativo: Leva para o Explorer da Transação na Blockchain */}
          <a
            href={`https://stellar.expert/explorer/testnet/tx/${profile.kyczk_hash}`}
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
      <SendModal isOpen={isSendOpen} onClose={() => setIsSendOpen(false)} onSuccess={fetchOnChainBalance} />

    </div>
  );
}
