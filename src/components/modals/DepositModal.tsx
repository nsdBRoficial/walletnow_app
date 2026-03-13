import { X, Copy, QrCode, CheckCircle2, Loader2, Zap } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { PaymentService } from '../../services/paymentService';
import { WalletFactory } from '../../services/walletFactory';
import { WooviService } from '../../services/wooviService';

// Define quais propriedades (props) este componente espera receber.
interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function DepositModal({ isOpen, onClose, onSuccess }: DepositModalProps) {
  const { profile } = useAuth();

  // Estados do Fluxo de Depósito Polling (Sandbox Transfero)
  const [phase, setPhase] = useState<'input' | 'generating' | 'waiting_payment' | 'minting' | 'success'>('input');

  // Dados Inputados e Retornados
  const [amount, setAmount] = useState('');
  const [pixData, setPixData] = useState<{ brCode: string, correlationID: string, amount: number } | null>(null);
  const [copied, setCopied] = useState(false);

  // Zera o modal sempre que ele abrir/fechar
  useEffect(() => {
    if (isOpen) {
      setPhase('input');
      setAmount('');
      setPixData(null);
    }
  }, [isOpen]);

  // Se o modal não estiver aberto (isOpen === false), não renderiza nada na tela.
  if (!isOpen) return null;

  const handleCopy = () => {
    if (!pixData?.brCode) return;
    navigator.clipboard.writeText(pixData.brCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  /**
   * Fase 1: Gerar o PIX Dinâmico via Woovi
   */
  const handleGeneratePix = async () => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0 || !profile?.id) return;

    setPhase('generating');

    try {
      // 1. Chama o Gateway Woovi para gerar a cobrança Pix (QR Code EMV)
      const result = await WooviService.createCharge(Number(amount), profile.id);

      setPixData({ brCode: result.brCode, correlationID: result.correlationID, amount: result.amount });
      setPhase('waiting_payment');

      // 2. Inicia o Observador Assíncrono (Polling) usando o correlationID da Woovi
      startPixObserver(result.correlationID, result.amount);

    } catch (e: any) {
      alert("Falha de Comunicação com Gateway Woovi: " + e.message);
      setPhase('input');
    }
  };

  /**
   * Fase 2: Observador de Pagamento (Polling Woovi) e Fase 3: Mintagem BRW On-Chain
   */
  const startPixObserver = (correlationID: string, depositAmount: number) => {
    let pollingInterval: NodeJS.Timeout;

    // Função que checa o status silenciosamente
    const checkTick = async () => {
      try {
        const status = await WooviService.checkPaymentStatus(correlationID);
        console.log(`📡 Polling PIX Woovi [${correlationID}] -> Status: ${status}`);

        // A Woovi confirma depósitos com status COMPLETED.
        if (status === 'COMPLETED') {
          // O Cliente PAGOU! Parar de perguntar ao gateway.
          clearInterval(pollingInterval);
          triggerMinting(depositAmount, correlationID);
        } else if (status === 'EXPIRED' || status === 'ERROR_ON_CREATE') {
          clearInterval(pollingInterval);
          alert("A transação PIX expirou ou falhou no Gateway Woovi.");
          setPhase('input');
        }
      } catch (err) {
        console.warn("Erro no tick de polling, ignorando...", err);
      }
    };

    // Bater no Endpoint GET status a cada 5 segundos
    pollingInterval = setInterval(checkTick, 5000);

    // Bate agora a primeira vez pra não atrasar
    checkTick();

    // Cleanup: Se o usuário fechar o modal ou desmontar a tela no meio do depósito, para de berrar na API.
    return () => clearInterval(pollingInterval);
  };

  const triggerMinting = async (depositAmount: number, correlationID?: string) => {
    if (!profile?.stellar_address || !profile.id) return;

    setPhase('minting');

    try {
      // Pega a SecretKey local para assinar a TrustLine se a conta for nova na Rede
      const userSecret = WalletFactory.getSecretKey(profile.id);

      // Conversão BRW real: PIX (BRL confirmado pela Woovi) ➔ BRW na Stellar Testnet
      // O correlationID é passado como X402 Memo para rastreabilidade no Ledger
      await PaymentService.mintBRW(
        profile.stellar_address,
        depositAmount.toString(),
        userSecret || undefined,
        correlationID  // X402: correlationID Woovi gravado no Stellar Memo
      );

      setPhase('success');
      if (onSuccess) onSuccess();

      setTimeout(() => {
        onClose();
      }, 3500);
    } catch (e: any) {
      alert("⚠️ PIX Recebido, mas Falha Crítica ao Mintar BRW Onchain: " + e.message);
      setPhase('input');
    }
  };

  return (
    // Fundo escuro semi-transparente (backdrop) que cobre a tela toda.
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="w-full max-w-md bg-[#161616] rounded-t-[32px] sm:rounded-[32px] p-6 border border-white/5 shadow-2xl animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-8 duration-500">

        {/* Cabeçalho */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-white">
            {phase === 'input' ? 'Depositar PIX' : 'Pagamento Gerado'}
          </h2>
          <button
            onClick={onClose}
            disabled={phase === 'minting' || phase === 'generating'}
            className="p-2 bg-white/5 rounded-full text-gray-400 hover:text-white transition-colors disabled:opacity-50">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Phase 1: Input de Valor */}
        {phase === 'input' && (
          <div className="flex flex-col space-y-6">
            <div className="flex flex-col items-center justify-center py-8 bg-black/30 rounded-2xl border border-white/5">
              <span className="text-sm text-gray-500 font-medium mb-2">Valor em Reais</span>
              <div className="flex items-center justify-center text-4xl font-bold text-white">
                <span className="text-gray-500 mr-2 text-2xl">R$</span>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0,00"
                  className="bg-transparent border-none outline-none text-center w-32 placeholder:text-gray-700 focus:ring-0 p-0"
                  autoFocus
                />
              </div>
            </div>

            <p className="text-[10px] text-gray-500 text-center uppercase tracking-wider font-mono">
              Woovi PIX Gateway — Conversão 1:1 BRL ➔ BRW. Fundos bloqueados até recepção na Stellar Testnet.
            </p>

            <button
              onClick={handleGeneratePix}
              disabled={!amount || Number(amount) <= 0}
              className="w-full flex items-center justify-center gap-3 bg-[#00E676] hover:bg-[#00E676]/90 text-black py-4 px-6 rounded-2xl transition-all duration-300 font-bold disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(0,230,118,0.2)]"
            >
              <QrCode className="w-5 h-5" />
              Gerar QR Code Dinâmico
            </button>
          </div>
        )}

        {/* Phase 2: Generating Loading State */}
        {phase === 'generating' && (
          <div className="flex flex-col items-center justify-center py-16 animate-in fade-in">
            <Loader2 className="w-12 h-12 text-[#00E676] animate-spin mb-4" />
            <p className="text-gray-400 font-medium">Conectando ao Sandbox e Banco Central...</p>
            <p className="text-[10px] text-gray-600 mt-2">Criando Cobrança EMV Dinâmica</p>
          </div>
        )}

        {/* Phase 3: Waiting PIX Payment (QR Code Display + Polling) */}
        {phase === 'waiting_payment' && pixData && (
          <div className="flex flex-col items-center space-y-6 animate-in zoom-in duration-300">
            <div className="text-center">
              <p className="text-sm text-gray-400">Escaneie pelo App do seu Banco</p>
              <p className="text-2xl font-bold text-[#00E676] mt-1">R$ {pixData.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>

            {/* QR Code REAL gerado a partir do brCode EMV retornado pela Woovi. */}
            {/* Usamos api.qrserver.com: zero npm extra, zero custo, apenas uma URL de imagem. */}
            <div className="w-52 h-52 bg-white rounded-2xl p-3 flex items-center justify-center shadow-[0_0_30px_rgba(0,230,118,0.15)]">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(pixData.brCode)}&bgcolor=ffffff&color=000000&margin=0&format=png`}
                alt="QR Code PIX — escaneie no app do seu banco"
                width={200}
                height={200}
                className="w-full h-full rounded-xl"
                onError={(e) => {
                  // Fallback: Se a API de QR falhar, mostra texto
                  const target = e.currentTarget;
                  target.style.display = 'none';
                  if (target.parentElement) {
                    target.parentElement.innerHTML = '<p class="text-black text-xs text-center font-mono p-2">⚠️ QR indisponível. Use Copia e Cola abaixo.</p>';
                  }
                }}
              />
            </div>

            <div className="w-full">
              <label className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-2 block">Chave Copia e Cola Oficial (Woovi)</label>
              <button
                onClick={handleCopy}
                className="w-full flex items-center justify-between bg-black/50 border border-[#00E676]/30 p-4 rounded-xl hover:border-[#00E676]/80 transition-colors group"
              >
                <span className="text-xs text-gray-300 truncate mr-4 font-mono select-all">
                  {pixData.brCode}
                </span>
                {copied ? (
                  <CheckCircle2 className="w-5 h-5 text-[#00E676] flex-shrink-0" />
                ) : (
                  <Copy className="w-5 h-5 text-gray-500 group-hover:text-[#00E676] flex-shrink-0 transition-colors" />
                )}
              </button>
            </div>

            <div className="w-full bg-[#00E676]/10 border border-[#00E676]/20 py-3 px-4 rounded-xl flex items-center justify-center gap-3">
              <Loader2 className="w-4 h-4 text-[#00E676] animate-spin" />
              <span className="text-xs font-semibold text-[#00E676] uppercase tracking-wider">Aguardando Pagamento Fiduciário (Polling)</span>
            </div>
          </div>
        )}

        {/* Phase 4: Minting Onchain (After Polling reads "PAID") */}
        {phase === 'minting' && (
          <div className="flex flex-col items-center justify-center py-16 animate-in fade-in">
            <Zap className="w-12 h-12 text-[#F27D26] animate-bounce mb-4 fill-[#F27D26]/20" />
            <p className="text-white text-lg font-bold">PIX Sincronizado!</p>
            <p className="text-gray-400 font-medium text-sm mt-1">Emitindo BRW na Rede Stellar...</p>
            <p className="text-[10px] text-gray-600 mt-2 uppercase tracking-widest font-mono">Mintando BRW On-Chain</p>
          </div>
        )}

        {/* Phase 5: Success Finalization */}
        {phase === 'success' && (
          <div className="flex flex-col items-center justify-center py-12 animate-in zoom-in duration-300">
            <div className="w-20 h-20 bg-[#00E676]/20 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="w-10 h-10 text-[#00E676]" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">Depósito Liquidado!</h3>
            <p className="text-gray-400 text-center text-sm">Transferência Bancária recebida.<br />Saldo refletido On-Chain com Sucesso.</p>
          </div>
        )}

      </div>
    </div>
  );
}
