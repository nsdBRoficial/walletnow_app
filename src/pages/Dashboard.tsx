import { ArrowDownLeft, ArrowUpRight, History, Settings as SettingsIcon, Wallet, ShieldCheck, Award, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DepositModal from '../components/modals/DepositModal';
import SendModal from '../components/modals/SendModal';
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

  // Pegamos o e-mail do usuário e extraímos apenas a parte antes do "@" para usar de nome
  const userFirstName = user?.email ? user.email.split('@')[0] : 'Usuário';

  // Estados (State) para controlar se os modais (janelas sobrepostas) estão abertos ou fechados.
  // 'false' significa que começam fechados.
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [isSendOpen, setIsSendOpen] = useState(false);

  // Estados de Saldo (Extraídos do Blockchain via Stellar Horizon)
  const [brzBalance, setBrzBalance] = useState<string>('0.00');
  const [isLoadingBalance, setIsLoadingBalance] = useState(true);
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
        setBrzBalance(parseFloat(balances.brz).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
      }
      if (history) {
        setTransactions(history);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingBalance(false);
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
                <h2 className="text-5xl font-bold text-white tracking-tight">{brzBalance}</h2>
              )}
            </div>
          </div>

          {/* Botões de Ação Principais */}
          <div className="flex gap-4">
            {/* Botão Depositar: Abre o modal de PIX */}
            <button
              onClick={() => setIsDepositOpen(true)}
              className="flex-1 flex items-center justify-center gap-2 bg-[#00E676] hover:bg-[#00E676]/90 text-black py-3.5 rounded-2xl font-bold transition-colors shadow-[0_0_15px_rgba(0,230,118,0.2)]"
            >
              <ArrowDownLeft className="w-5 h-5" />
              Depositar
            </button>

            {/* Botão Sacar/Enviar: Abre o modal de envio de pagamento */}
            <button
              onClick={() => setIsSendOpen(true)}
              className="flex-1 flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 text-white py-3.5 rounded-2xl font-semibold transition-colors border border-white/5"
            >
              <ArrowUpRight className="w-5 h-5" />
              Sacar / Enviar
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
                className="flex items-center justify-between p-4 bg-[#161616] rounded-2xl border border-white/5 hover:border-white/10 transition-colors cursor-pointer block"
              >
                <div className="flex items-center gap-4">
                  {/* Ícone dinâmico: Verde para depósito, Branco para envio */}
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${tx.type === 'deposit' ? 'bg-[#00E676]/10 text-[#00E676]' : 'bg-white/5 text-white'}`}>
                    {tx.type === 'deposit' ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                  </div>
                  <div>
                    <p className="text-white font-medium">{tx.title}</p>
                    <p className="text-xs text-gray-500">{tx.date}</p>
                  </div>
                </div>
                <div className="text-right">
                  {/* Cor do valor dinâmica: Verde para entrada, Branco para saída */}
                  <p className={`font-semibold ${tx.type === 'deposit' ? 'text-[#00E676]' : 'text-white'}`}>
                    {tx.amount}
                  </p>
                  <p className="text-xs text-gray-500">{tx.status}</p>
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
      <SendModal isOpen={isSendOpen} onClose={() => setIsSendOpen(false)} onSuccess={fetchOnChainBalance} />

    </div>
  );
}
