import { X, Copy, QrCode, CheckCircle2, Loader2, Zap } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { PaymentService } from '../../services/paymentService';
import { WalletFactory } from '../../services/walletFactory';

// Define quais propriedades (props) este componente espera receber.
// isOpen: Controla se o modal está visível ou não.
// onClose: Função chamada quando o usuário quer fechar o modal.
interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

/**
 * Modal de Depósito (Integração PIX)
 * 
 * Esta janela sobreposta aparece quando o usuário clica em "Depositar" no Dashboard.
 * O objetivo é simular a interface onde o usuário escaneia um QR Code ou copia uma
 * chave PIX para enviar Reais. O sistema (via Transfero) converterá esse PIX
 * instantaneamente em saldo BRZ na carteira Stellar.
 */
export default function DepositModal({ isOpen, onClose, onSuccess }: DepositModalProps) {
  const { profile } = useAuth();

  // Estado cópia PIX fixa
  const [copied, setCopied] = useState(false);
  // Estado do simulador do Webhook do Banco no Mock de Rampa
  const [status, setStatus] = useState<'idle' | 'processing' | 'success'>('idle');

  // Se o modal não estiver aberto (isOpen === false), não renderiza nada na tela.
  if (!isOpen) return null;

  /**
   * Função para simular a cópia da chave PIX para a área de transferência.
   * Muda o ícone para um "check" verde por 2 segundos e depois volta ao normal.
   */
  const handleCopy = () => {
    setCopied(true);
    // Volta o estado "copied" para falso após 2000 milissegundos (2 segundos)
    setTimeout(() => setCopied(false), 2000);
  };

  /**
   * MOCK ON-RAMP: Dispara a ponte entre Web2 (Banco) e Web3 (Stellar)
   * Mintando instantaneamente os tokens em BRZ de Testnet via nossa Master Key.
   */
  const handlePixSimulation = async (amount: string) => {
    if (!profile?.stellar_address || !profile.id) return;
    setStatus('processing');

    try {
      // Pega a SecretKey local para assinar a TrustLine se a conta for nova na Rede
      const userSecret = WalletFactory.getSecretKey(profile.id);

      await PaymentService.mintPixToBRZ(profile.stellar_address, amount, userSecret || undefined);

      setStatus('success');
      if (onSuccess) onSuccess();

      setTimeout(() => {
        setStatus('idle');
        onClose();
      }, 3500);
    } catch (e: any) {
      alert("Falha no Webhook PIX ➔ BRZ: " + e.message);
      setStatus('idle');
    }
  };

  return (
    // Fundo escuro semi-transparente (backdrop) que cobre a tela toda.
    // 'fixed inset-0 z-50' garante que fique por cima de tudo.
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">

      {/* Container do Modal em si */}
      <div className="w-full max-w-md bg-[#161616] rounded-t-[32px] sm:rounded-[32px] p-6 border border-white/5 shadow-2xl animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-8 duration-500">

        {/* Cabeçalho do Modal */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-white">Depositar via PIX</h2>
          {/* Botão de Fechar */}
          <button onClick={onClose} disabled={status === 'processing'} className="p-2 bg-white/5 rounded-full text-gray-400 hover:text-white transition-colors disabled:opacity-50">
            <X className="w-5 h-5" />
          </button>
        </div>

        {status === 'success' ? (
          // Tela de Sucesso (Transação Concluída)
          <div className="flex flex-col items-center justify-center py-12 animate-in zoom-in duration-300">
            <div className="w-20 h-20 bg-[#00E676]/20 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="w-10 h-10 text-[#00E676]" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">Depósito Confirmado!</h3>
            <p className="text-gray-400 text-center text-sm">BRZ creditados instântaneamente<br />na sua carteira On-Chain.</p>
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-6">
            <p className="text-sm text-gray-400 text-center">
              Escaneie o QR Code abaixo ou copie a chave PIX. O saldo será convertido para <span className="text-[#00E676] font-medium">BRZ</span> instantaneamente.
            </p>

            <div className="w-48 h-48 bg-white rounded-2xl p-4 flex items-center justify-center shadow-[0_0_30px_rgba(0,230,118,0.1)]">
              <QrCode className="w-full h-full text-black" strokeWidth={1} />
            </div>

            <div className="w-full">
              <label className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-2 block">Chave PIX Copia e Cola</label>
              <button
                onClick={handleCopy}
                className="w-full flex items-center justify-between bg-black/50 border border-white/10 p-4 rounded-xl hover:border-[#00E676]/50 transition-colors group"
              >
                <span className="text-sm text-gray-300 truncate mr-4 font-mono">
                  00020126580014br.gov.bcb.pix0136...
                </span>
                {copied ? (
                  <CheckCircle2 className="w-5 h-5 text-[#00E676] flex-shrink-0" />
                ) : (
                  <Copy className="w-5 h-5 text-gray-500 group-hover:text-[#00E676] flex-shrink-0 transition-colors" />
                )}
              </button>
            </div>

            <div className="w-full border-t border-white/10 pt-6 mt-2">
              <p className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-3 text-center flex items-center justify-center gap-1">
                <Zap className="w-3.5 h-3.5 text-[#F27D26]" />
                Simulador Sandbox de Injeção
              </p>
              <div className="grid grid-cols-3 gap-2">
                {['10.00', '50.00', '150.00'].map(val => (
                  <button
                    key={val}
                    disabled={status === 'processing'}
                    onClick={() => handlePixSimulation(val)}
                    className="bg-white/5 hover:bg-[#00E676]/20 border border-white/5 hover:border-[#00E676]/30 py-2.5 rounded-xl text-xs font-semibold text-white transition-colors disabled:opacity-50"
                  >
                    {status === 'processing' ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : `+ R$ ${parseInt(val)}`}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-gray-600 mt-2 text-center leading-tight">Ao clicar, nosso nó Master atuará como gateway Transfero, recebendo o PIX e emitindo BRZ On-Chain na sua chave pública em ~3 segundos.</p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
