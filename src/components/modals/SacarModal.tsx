import { X, Fingerprint, CheckCircle2, Loader2, ArrowUpRight, ExternalLink } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { WalletFactory } from '../../services/walletFactory';
import { PaymentService } from '../../services/paymentService';
import { WooviService } from '../../services/wooviService';

interface SacarModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  brwBalance: string; // Saldo real de BRW facilitado pelo Dashboard
}

/**
 * Modal de Saque PIX (Off-ramp)
 * "The Exit Layer"
 * 
 * Orquestra duas etapas:
 * 1. Blockchain: Queima (Burn) de tokens BRW do usuário.
 * 2. Gateway: Disparo do PIX via Woovi.
 */
export default function SacarModal({ isOpen, onClose, onSuccess, brwBalance }: SacarModalProps) {
  const { profile } = useAuth();
  const [amount, setAmount] = useState('');
  const [pixKey, setPixKey] = useState('');
  
  // Status granular para informar o usuário de cada backend
  const [status, setStatus] = useState<'idle' | 'authenticating' | 'burning_blockchain' | 'sending_pix' | 'success'>('idle');
  const [txHash, setTxHash] = useState<string | null>(null);

  // Auto-fill do CPF do KYC se disponível
  useEffect(() => {
    if (profile?.kyc_verified && profile?.cpf) {
      setPixKey(profile.cpf);
    }
  }, [profile, isOpen]);

  if (!isOpen) return null;

  const handleWithdraw = async () => {
    if (!amount || !pixKey || !profile?.id) return;
    if (status !== 'idle') return; // Prevenir submissão dupla enquanto carrega

    const numAmount = parseFloat(amount);
    const availableBRW = parseFloat(brwBalance.replace(/\./g, '').replace(',', '.'));

    // 🔒 Segurança: Trava de Saldo
    if (numAmount > availableBRW) {
      alert(`Saldo insuficiente! Você possui R$ ${brwBalance} em BRW.`);
      return;
    }

    try {
      // 1. Biometria (Passkey Mock)
      console.info(`[WalletNow][UI] 🔐 Validando Biometria Passkey Local para o Saque...`);
      setStatus('authenticating');
      await new Promise(resolve => setTimeout(resolve, 1500));

      const secretKey = WalletFactory.getSecretKey(profile.id);
      if (!secretKey) throw new Error("Chave Passkey local não encontrada.");

      // Orquestração Atômica (Blockchain + Woovi + Rollback automático se falhar)
      console.info(`[WalletNow][UI] 🔥 Iniciando Orquestração Atômica de Burn para o Pix: ${pixKey}`);
      setStatus('burning_blockchain');
      const correlationID = `saque-${Date.now()}`;
      
      const { hash } = await PaymentService.executeOffRampWithRollback(
          secretKey, 
          amount, 
          correlationID, 
          pixKey
      );

      setTxHash(hash);

      // Sucesso!
      console.info(`[WalletNow][UI] ✅ Saque finalizado com sucesso! Burn Hash: ${hash}`);
      setStatus('success');
      if (onSuccess) onSuccess();

    } catch (e: any) {
      console.error(`[WalletNow][UI] ❌ Erro durante o fluxo de Saque Atômico: ${e.message}`);
      // Se tiver txHash, significa que a queima ocorreu mas a Woovi falhou (mesmo com rollback se o rollback falhar)
      // Ou a mensagem de erro já contém o hash se veio do executeOffRampWithRollback
      alert("Falha no Saque: " + e.message);
      setStatus('idle');
    }
  };

  const closeModal = () => {
    if (status !== 'idle' && status !== 'success') return;
    setStatus('idle');
    setAmount('');
    setTxHash(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="w-full max-w-md bg-[#161616] rounded-t-[32px] sm:rounded-[32px] p-6 border border-white/5 shadow-2xl animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-8 duration-500">
        
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-white">Sacar para Banco (PIX)</h2>
          <button onClick={closeModal} disabled={status !== 'idle' && status !== 'success'} className="p-2 bg-white/5 rounded-full text-gray-400 hover:text-white transition-colors disabled:opacity-50">
            <X className="w-5 h-5" />
          </button>
        </div>

        {status === 'success' ? (
          <div className="flex flex-col items-center justify-center py-8 animate-in zoom-in duration-300">
            <div className="w-20 h-20 bg-[#00E676]/20 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="w-10 h-10 text-[#00E676]" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">Saque Concluído!</h3>
            <p className="text-gray-400 text-center text-sm mb-6">O valor chegará em instantes na sua conta bancária via PIX (CPF).</p>
            
            {txHash && (
              <a 
                href={`https://stellar.expert/explorer/testnet/tx/${txHash}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-[#00E676] text-xs font-semibold bg-[#00E676]/10 px-4 py-2 rounded-xl border border-[#00E676]/20 hover:bg-[#00E676]/20 transition-all"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Ver Comprovante Blockchain
              </a>
            )}
            
            <button onClick={closeModal} className="mt-8 w-full bg-white/5 hover:bg-white/10 text-white py-3 rounded-2xl font-semibold transition-colors">
              Fechar
            </button>
          </div>
        ) : (
          <div className="flex flex-col space-y-6">
            
            {/* Input de Valor */}
            <div className="flex flex-col items-center justify-center py-6 bg-black/30 rounded-2xl border border-white/5">
              <span className="text-sm text-gray-500 font-medium mb-2">Valor do Saque</span>
              <div className="flex items-center justify-center text-4xl font-bold text-white">
                <span className="text-gray-500 mr-2 text-2xl">R$</span>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0,00"
                  className="bg-transparent border-none outline-none text-center w-32 placeholder:text-gray-700 focus:ring-0 p-0"
                  autoFocus
                  disabled={status !== 'idle'}
                />
              </div>
              <p className="mt-3 text-[10px] text-gray-600 font-bold uppercase tracking-widest">
                Saldo BRW: R$ {brwBalance}
              </p>
            </div>

            {/* Input de Chave PIX - Agora restrito a CPF */}
            <div className="w-full">
              <label className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-2 block">
                Chave PIX (Apenas CPF)
              </label>
              <input
                type="text"
                value={pixKey}
                onChange={(e) => setPixKey(e.target.value.replace(/\D/g, '').slice(0, 11))} // Só números, max 11
                placeholder="Insira seu CPF (Chave PIX)"
                disabled={status !== 'idle' || (profile?.kyc_verified && !!profile?.cpf)}
                className="w-full bg-black/50 border border-white/10 focus:border-[#00E676] text-white p-4 rounded-xl outline-none transition-colors disabled:opacity-50"
              />
              <p className="mt-2 text-[10px] text-gray-500 italic">
                * Por segurança, o saque é permitido apenas para o CPF do titular da conta.
              </p>
            </div>

            {/* Stepper Visual de Processamento */}
            {(status !== 'idle') && (
              <div className="space-y-3 py-2">
                <div className={`flex items-center gap-3 text-sm ${status === 'authenticating' ? 'text-[#00E676]' : 'text-gray-500'}`}>
                  {status === 'authenticating' ? <Loader2 className="w-4 h-4 animate-spin" /> : <div className="w-4 h-4 rounded-full border border-gray-700"></div>}
                  <span>Confirmando Biometria...</span>
                </div>
                <div className={`flex items-center gap-3 text-sm ${status === 'burning_blockchain' ? 'text-[#00E676]' : (status === 'sending_pix' || status === 'success' ? 'text-[#00E676]/60' : 'text-gray-500')}`}>
                  {status === 'burning_blockchain' ? <Loader2 className="w-4 h-4 animate-spin" /> : <div className="w-4 h-4 rounded-full border border-gray-700"></div>}
                  <span>Processando Saque na Blockchain...</span>
                </div>
                <div className={`flex items-center gap-3 text-sm ${status === 'sending_pix' ? 'text-[#00E676]' : (status === 'success' ? 'text-[#00E676]/60' : 'text-gray-500')}`}>
                  {status === 'sending_pix' ? <Loader2 className="w-4 h-4 animate-spin" /> : <div className="w-4 h-4 rounded-full border border-gray-700"></div>}
                  <span>Enviando PIX via Woovi...</span>
                </div>
              </div>
            )}

            <button
              onClick={handleWithdraw}
              disabled={!amount || !pixKey || status !== 'idle'}
              className="w-full flex items-center justify-center gap-3 bg-[#00E676] hover:bg-[#00E676]/90 text-black py-4 px-6 rounded-2xl transition-all duration-300 font-bold disabled:opacity-50 shadow-[0_0_20px_rgba(0,230,118,0.2)]"
            >
              <Fingerprint className="w-5 h-5" />
              Confirmar Saque com Passkey
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
