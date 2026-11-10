/**
 * @module src/components/modals/WithdrawModal.tsx
 * @description Modal interativo React (WithdrawModal) para jornada financeira do usuário com estados de validação, confirmação e feedback on-chain (exporta: WithdrawModal).
 */
import { X, ArrowRight, Loader2, CheckCircle2, ExternalLink, ShieldCheck, AlertCircle, RefreshCw } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useWallet } from '../../contexts/WalletContext';
import { StellarOfframpService, OfframpSession, OfframpStatus, OfframpInfo } from '../../services/providers/stellarTestAnchor/stellarOfframpService';
import { WalletFactory } from '../../services/walletFactory';
import { logger } from '../../utils/logger';
import { Keypair, TransactionBuilder, Networks, Asset, Operation, Memo, Horizon } from '@stellar/stellar-sdk';
import { StellarNetwork } from '../../config/stellarNetwork';

interface WithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function WithdrawModal({ isOpen, onClose, onSuccess }: WithdrawModalProps) {
  const { profile } = useAuth();
  const { activeAccount, refreshAccounts } = useWallet();
  
  const [phase, setPhase] = useState<'input' | 'generating' | 'interactive' | 'transferring' | 'success'>('input');
  const [amount, setAmount] = useState('');
  const [session, setSession] = useState<OfframpSession | null>(null);
  const [authData, setAuthData] = useState<{ jwt: string, endpoints: any } | null>(null);
  const [txStatus, setTxStatus] = useState<OfframpStatus | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const [anchorInfo, setAnchorInfo] = useState<OfframpInfo | null>(null);
  const [isFetchingInfo, setIsFetchingInfo] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPhase('input');
      setAmount('');
      setSession(null);
      setAuthData(null);
      setTxStatus(null);
      setErrorMsg('');
      setAnchorInfo(null);
      
      // Busca as info do Anchor (limites, enable/disable)
      setIsFetchingInfo(true);
      StellarOfframpService.getAnchorEndpoints()
        .then(endpoints => StellarOfframpService.getAnchorInfo(endpoints.sep24Endpoint, 'native'))
        .then(info => setAnchorInfo(info))
        .catch(err => {
          logger.error('[WalletNow][OffRamp]', 'Falha ao buscar limites do Anchor', err);
          setErrorMsg('Falha ao conectar com o Anchor: ' + err.message);
          setAnchorInfo({ enabled: false, min_amount: 0, max_amount: 0 }); // Fallback graceful
        })
        .finally(() => setIsFetchingInfo(false));
    }
  }, [isOpen]);

  // Polling para acompanhar o status do SEP-24
  useEffect(() => {
    let timer: NodeJS.Timeout;

    if (isOpen && phase === 'interactive' && session && authData) {
      timer = setInterval(async () => {
        try {
          const status = await StellarOfframpService.getTransactionStatus(session.id, authData.jwt, authData.endpoints.sep24Endpoint);
          setTxStatus(status);
          logger.info('[WalletNow][OffRamp]', `Polling status: ${status.status}`, status);

          // Se o usuário preencheu KYC/Bank Info na URL interativa, o anchor vai aguardar o depósito
          if (status.status === 'pending_user_transfer_start') {
            clearInterval(timer);
            setPhase('transferring');
            await executeOnChainTransfer(status);
          }
        } catch (e: any) {
          logger.error('[WalletNow][OffRamp]', 'Erro no polling do status', e);
        }
      }, 5000);
    }

    return () => clearInterval(timer);
  }, [isOpen, phase, session, authData]);

  const handleStartWithdraw = async () => {
    if (!activeAccount?.stellar_public_key || !profile?.id) return;
    const numAmount = Number(amount);
    if (!amount || isNaN(numAmount) || numAmount <= 0) return;

    if (anchorInfo) {
      if (numAmount < anchorInfo.min_amount) {
        setErrorMsg(`O valor mínimo é ${anchorInfo.min_amount} XLM`);
        return;
      }
      if (numAmount > anchorInfo.max_amount) {
        setErrorMsg(`O valor excede o limite máximo de ${anchorInfo.max_amount} XLM`);
        return;
      }
    }

    setPhase('generating');
    setErrorMsg('');

    try {
      const userSecret = WalletFactory.getSecretKey(profile.id);
      if (!userSecret) throw new Error('Secret key não encontrada');

      const endpoints = await StellarOfframpService.getAnchorEndpoints();
      const jwt = await StellarOfframpService.authenticate(activeAccount.stellar_public_key, userSecret, endpoints.authEndpoint);
      
      setAuthData({ jwt, endpoints });

      const newSession = await StellarOfframpService.initInteractiveWithdraw(activeAccount.stellar_public_key, jwt, endpoints.sep24Endpoint, amount);
      setSession(newSession);
      setPhase('interactive');

    } catch (e: any) {
      logger.error('[WalletNow][OffRamp]', 'Falha ao iniciar withdraw', e);
      setErrorMsg(e.message);
      setPhase('input');
    }
  };

  const executeOnChainTransfer = async (status: OfframpStatus) => {
    if (!activeAccount?.stellar_public_key || !profile?.id) return;
    try {
      logger.info('[WalletNow][OffRamp]', 'Iniciando transferência on-chain para o Anchor...', status);
      
      const userSecret = WalletFactory.getSecretKey(profile.id);
      if (!userSecret) throw new Error('Secret key não encontrada');

      const server = StellarNetwork.createServer();
      const userKeypair = Keypair.fromSecret(userSecret);
      const account = await server.loadAccount(userKeypair.publicKey());

      if (!status.withdraw_anchor_account) throw new Error('Anchor account not provided');

      let memo: Memo = Memo.none();
      if (status.withdraw_memo_type === 'text') memo = Memo.text(status.withdraw_memo || '');
      else if (status.withdraw_memo_type === 'id') memo = Memo.id(status.withdraw_memo || '');
      else if (status.withdraw_memo_type === 'hash') memo = Memo.hash(status.withdraw_memo || '');

      const transaction = new TransactionBuilder(account, {
        fee: '100000',
        networkPassphrase: StellarNetwork.passphrase,
        memo,
      })
      .addOperation(Operation.payment({
        destination: status.withdraw_anchor_account,
        asset: Asset.native(),
        amount: Number(amount).toFixed(7), // O Anchor especificou o amount no interactive step
      }))
      .setTimeout(30)
      .build();

      transaction.sign(userKeypair);
      
      logger.info('[WalletNow][OffRamp]', 'Submetendo transação on-chain para o Anchor...');
      const result = await server.submitTransaction(transaction);
      logger.info('[WalletNow][OffRamp]', `Transferência completa! Hash: ${result.hash}`);
      
      setPhase('success');
      await refreshAccounts(); // Atualização global sem F5
      if (onSuccess) onSuccess();

    } catch (e: any) {
      logger.error('[WalletNow][OffRamp]', 'Falha na transferência on-chain', e);
      setErrorMsg('Falha ao transferir XLM para o Anchor: ' + e.message);
      setPhase('input');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="w-full max-w-md bg-[#161616] rounded-t-[32px] sm:rounded-[32px] p-6 border border-white/5 shadow-2xl animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-8 duration-500">

        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-white">Saque / Off-Ramp (TestAnchor)</h2>
          <button onClick={onClose} disabled={phase === 'generating' || phase === 'transferring'} className="p-2 bg-white/5 rounded-full text-gray-400 hover:text-white transition-colors disabled:opacity-50">
            <X className="w-5 h-5" />
          </button>
        </div>

        {phase === 'input' && (
          <div className="flex flex-col space-y-6">
            
            {isFetchingInfo ? (
              <div className="flex flex-col items-center justify-center py-8">
                <Loader2 className="w-8 h-8 text-[#00E676] animate-spin mb-4" />
                <p className="text-sm text-gray-400">Consultando limites do Anchor...</p>
              </div>
            ) : anchorInfo && !anchorInfo.enabled ? (
              <div className="flex flex-col items-center justify-center py-8 text-center px-4">
                <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4">
                  <AlertCircle className="w-8 h-8 text-red-500" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Off-Ramp Indisponível</h3>
                <p className="text-sm text-gray-400">O Anchor oficial da Stellar não suporta off-ramp de XLM native nesta sandbox.</p>
              </div>
            ) : (
              <>
                <div className="flex flex-col items-center justify-center py-8 bg-black/30 rounded-2xl border border-white/5 relative">
                  <span className="text-sm text-gray-500 font-medium mb-2">Valor em XLM</span>
                  <div className="flex items-center justify-center text-4xl font-bold text-white">
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => {
                        setAmount(e.target.value);
                        setErrorMsg('');
                      }}
                      placeholder="0.00"
                      className="bg-transparent border-none outline-none text-center w-32 placeholder:text-gray-700 focus:ring-0 p-0"
                      autoFocus
                    />
                  </div>
                  {anchorInfo && (
                    <div className="absolute bottom-3 text-[10px] font-mono text-gray-500">
                      Limites Anchor: {anchorInfo.min_amount} a {anchorInfo.max_amount} XLM
                    </div>
                  )}
                </div>

                {errorMsg && (
                  <div className="bg-red-950/30 border border-red-800/40 rounded-xl p-3 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-red-300 font-mono">{errorMsg}</p>
                  </div>
                )}

                <button
                  onClick={handleStartWithdraw}
                  disabled={!amount || Number(amount) <= 0 || (anchorInfo && (Number(amount) < anchorInfo.min_amount || Number(amount) > anchorInfo.max_amount))}
                  className="w-full flex items-center justify-center gap-3 bg-[#00E676] hover:bg-[#00E676]/90 text-black py-4 px-6 rounded-2xl transition-all duration-300 font-bold disabled:opacity-50 shadow-[0_0_20px_rgba(0,230,118,0.2)]"
                >
                  <ArrowRight className="w-5 h-5" />
                  Continuar para o Anchor
                </button>
              </>
            )}
          </div>
        )}

        {phase === 'generating' && (
          <div className="flex flex-col items-center justify-center py-16 animate-in fade-in">
            <Loader2 className="w-12 h-12 text-[#00E676] animate-spin mb-4" />
            <p className="text-gray-400 font-medium">Autenticando via SEP-10...</p>
            <p className="text-[10px] text-gray-600 mt-2">Gerando Sessão de Saque SEP-24</p>
          </div>
        )}

        {phase === 'interactive' && session && (
          <div className="flex flex-col items-center justify-center py-8 gap-5 animate-in fade-in">
            <div className="w-16 h-16 bg-[#00E676]/10 rounded-full flex items-center justify-center border border-[#00E676]/30">
              <ShieldCheck className="w-8 h-8 text-[#00E676]" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-bold text-white">Sessão Gerada com Sucesso</h3>
              <p className="text-xs text-gray-400 mt-1 px-4">
                Abra o portal do TestAnchor para confirmar dados de conta e completar o KYC, se necessário.
              </p>
            </div>
            
            <a
              href={session.url}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 bg-[#00E676] text-black py-3 px-5 rounded-xl font-bold hover:bg-[#00E676]/90 transition-all text-sm"
            >
              Abrir Portal do Anchor <ExternalLink className="w-4 h-4" />
            </a>

            <div className="w-full bg-black/30 border border-white/5 rounded-xl p-4 flex flex-col items-center gap-2 mt-2">
              <RefreshCw className="w-5 h-5 text-gray-500 animate-spin" />
              <p className="text-[10px] text-gray-500 font-mono text-center">
                Aguardando você finalizar o processo no Anchor.<br/>
                Status atual: {txStatus?.status || 'incomplete'}
              </p>
            </div>
          </div>
        )}

        {phase === 'transferring' && (
          <div className="flex flex-col items-center justify-center py-16 animate-in fade-in">
            <Loader2 className="w-12 h-12 text-[#00E676] animate-spin mb-4" />
            <p className="text-gray-400 font-medium">Transferindo XLM para o Anchor...</p>
            <p className="text-[10px] text-gray-600 mt-2">Assinando e enviando transação na Stellar Testnet</p>
          </div>
        )}

        {phase === 'success' && (
          <div className="flex flex-col items-center justify-center py-10 gap-4 animate-in zoom-in duration-300">
            <div className="w-20 h-20 bg-[#00E676]/10 rounded-full flex items-center justify-center border border-[#00E676]/30">
              <CheckCircle2 className="w-10 h-10 text-[#00E676]" />
            </div>
            <div className="text-center">
              <h3 className="text-xl font-bold text-white">Saque Solicitado!</h3>
              <p className="text-sm text-gray-400 mt-1">
                Os fundos foram enviados ao Anchor e estarão na sua conta bancária em breve.
              </p>
            </div>
            <button onClick={onClose} className="w-full mt-4 bg-white/10 hover:bg-white/20 text-white py-3 rounded-2xl font-bold transition-all">
              Fechar
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
