import { X, Copy, QrCode, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';

// Define quais propriedades (props) este componente espera receber.
// isOpen: Controla se o modal está visível ou não.
// onClose: Função chamada quando o usuário quer fechar o modal.
interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Modal de Depósito (Integração PIX)
 * 
 * Esta janela sobreposta aparece quando o usuário clica em "Depositar" no Dashboard.
 * O objetivo é simular a interface onde o usuário escaneia um QR Code ou copia uma
 * chave PIX para enviar Reais. O sistema (via Transfero) converterá esse PIX
 * instantaneamente em saldo BRZ na carteira Stellar.
 */
export default function DepositModal({ isOpen, onClose }: DepositModalProps) {
  // Estado para controlar se o usuário acabou de clicar no botão de copiar a chave PIX.
  const [copied, setCopied] = useState(false);

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

  return (
    // Fundo escuro semi-transparente (backdrop) que cobre a tela toda.
    // 'fixed inset-0 z-50' garante que fique por cima de tudo.
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
      
      {/* Container do Modal em si */}
      <div className="w-full max-w-md bg-[#161616] rounded-t-[32px] sm:rounded-[32px] p-6 border border-white/5 shadow-2xl animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-8 duration-500">
        
        {/* Cabeçalho do Modal */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-white">Depositar via PIX</h2>
          {/* Botão de Fechar (Chama a função onClose passada pelo Dashboard) */}
          <button onClick={onClose} className="p-2 bg-white/5 rounded-full text-gray-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conteúdo do Modal */}
        <div className="flex flex-col items-center space-y-6">
          
          {/* Texto Explicativo */}
          <p className="text-sm text-gray-400 text-center">
            Escaneie o QR Code abaixo ou copie a chave PIX. O saldo será convertido para <span className="text-[#00E676] font-medium">BRZ</span> instantaneamente.
          </p>

          {/* QR Code Falso (Placeholder) */}
          <div className="w-48 h-48 bg-white rounded-2xl p-4 flex items-center justify-center shadow-[0_0_30px_rgba(0,230,118,0.1)]">
            <QrCode className="w-full h-full text-black" strokeWidth={1} />
          </div>

          {/* Área do Botão "Copia e Cola" */}
          <div className="w-full">
            <label className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-2 block">Chave PIX Copia e Cola</label>
            
            {/* Botão que aciona a função handleCopy */}
            <button 
              onClick={handleCopy}
              className="w-full flex items-center justify-between bg-black/50 border border-white/10 p-4 rounded-xl hover:border-[#00E676]/50 transition-colors group"
            >
              {/* Texto da chave PIX truncado (com reticências no final) */}
              <span className="text-sm text-gray-300 truncate mr-4 font-mono">
                00020126580014br.gov.bcb.pix0136...
              </span>
              
              {/* Renderização Condicional do Ícone: 
                  Se 'copied' for true, mostra o Check verde. Senão, mostra o ícone de Copiar. */}
              {copied ? (
                <CheckCircle2 className="w-5 h-5 text-[#00E676] flex-shrink-0" />
              ) : (
                <Copy className="w-5 h-5 text-gray-500 group-hover:text-[#00E676] flex-shrink-0 transition-colors" />
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
