import { X, Fingerprint, ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';
import { useState } from 'react';

// Define quais propriedades (props) este componente espera receber.
interface SendModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Modal de Envio/Pagamento (Gasless Operations)
 * 
 * Esta janela aparece quando o usuário clica em "Sacar / Enviar".
 * Aqui ele digita o valor e confirma a transação usando a biometria (Passkey).
 * O conceito "Gasless" significa que o usuário não paga taxas de rede (XLM),
 * o backend do WalletNow assina a transação como pagador da taxa (Fee Bumper).
 */
export default function SendModal({ isOpen, onClose }: SendModalProps) {
  // Estado para armazenar o valor digitado pelo usuário.
  const [amount, setAmount] = useState('');
  
  // Estado para controlar a fase atual da transação:
  // 'idle' = parado/aguardando digitação
  // 'authenticating' = carregando/esperando biometria
  // 'success' = transação concluída com sucesso
  const [status, setStatus] = useState<'idle' | 'authenticating' | 'success'>('idle');

  // Se o modal não estiver aberto, não renderiza nada.
  if (!isOpen) return null;

  /**
   * Função que simula o fluxo completo de um pagamento Web3.
   */
  const handleSend = () => {
    // Se não tiver valor digitado, não faz nada.
    if (!amount) return;
    
    // Muda o status para mostrar o "spinner" de carregamento.
    setStatus('authenticating');
    
    // Simulação 1: Aguarda 2 segundos (simulando o tempo do usuário colocar o dedo no leitor biométrico)
    setTimeout(() => {
      // Muda o status para sucesso (mostra o check verde animado)
      setStatus('success');
      
      // Simulação 2: Aguarda mais 2 segundos mostrando a tela de sucesso e depois fecha o modal sozinho.
      setTimeout(() => {
        setStatus('idle'); // Reseta o status
        setAmount('');     // Limpa o valor digitado
        onClose();         // Fecha o modal chamando a função do Dashboard
      }, 2000);
    }, 2000);
  };

  /**
   * Função para fechar o modal manualmente pelo botão "X".
   * Impede que o usuário feche o modal no meio de uma transação (quando está 'authenticating').
   */
  const closeModal = () => {
    if (status === 'authenticating') return;
    setStatus('idle');
    setAmount('');
    onClose();
  };

  return (
    // Fundo escuro semi-transparente (backdrop)
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
      
      {/* Container do Modal */}
      <div className="w-full max-w-md bg-[#161616] rounded-t-[32px] sm:rounded-[32px] p-6 border border-white/5 shadow-2xl animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-8 duration-500">
        
        {/* Cabeçalho do Modal */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-white">Enviar Pagamento</h2>
          {/* Botão de Fechar (Desabilitado se estiver autenticando) */}
          <button onClick={closeModal} disabled={status === 'authenticating'} className="p-2 bg-white/5 rounded-full text-gray-400 hover:text-white transition-colors disabled:opacity-50">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Renderização Condicional do Conteúdo:
            Se o status for 'success', mostra a tela de confirmação verde.
            Senão, mostra o formulário de digitação de valor.
        */}
        {status === 'success' ? (
          
          // Tela de Sucesso (Transação Concluída)
          <div className="flex flex-col items-center justify-center py-12 animate-in zoom-in duration-300">
            <div className="w-20 h-20 bg-[#00E676]/20 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="w-10 h-10 text-[#00E676]" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">Enviado!</h3>
            <p className="text-gray-400">Transação confirmada na rede.</p>
          </div>
          
        ) : (
          
          // Formulário de Envio
          <div className="flex flex-col space-y-6">
            
            {/* Campo de Digitação do Valor (Input) */}
            <div className="flex flex-col items-center justify-center py-8 bg-black/30 rounded-2xl border border-white/5">
              <span className="text-sm text-gray-500 font-medium mb-2">Valor em Reais</span>
              <div className="flex items-center justify-center text-4xl font-bold text-white">
                <span className="text-gray-500 mr-2 text-2xl">R$</span>
                <input 
                  type="number" 
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0,00"
                  // Estilização para remover as bordas padrão do input e deixá-lo invisível, mostrando apenas o texto
                  className="bg-transparent border-none outline-none text-center w-32 placeholder:text-gray-700 focus:ring-0 p-0"
                  autoFocus // Já foca no campo assim que o modal abre
                />
              </div>
            </div>

            {/* Botão de Ação (Confirmar com Passkey) */}
            <button 
              onClick={handleSend}
              // O botão fica desabilitado se não tiver valor digitado OU se já estiver autenticando
              disabled={!amount || status === 'authenticating'}
              className="w-full flex items-center justify-center gap-3 bg-[#00E676] hover:bg-[#00E676]/90 text-black py-4 px-6 rounded-2xl transition-all duration-300 font-bold disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(0,230,118,0.2)]"
            >
              {/* Se estiver autenticando, mostra o ícone girando (Loader2). Senão, mostra a digital. */}
              {status === 'authenticating' ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Confirmando Biometria...
                </>
              ) : (
                <>
                  <Fingerprint className="w-5 h-5" />
                  Confirmar com Passkey
                </>
              )}
            </button>

            {/* Texto de aviso que pisca (animate-pulse) enquanto aguarda a biometria */}
            {status === 'authenticating' && (
              <p className="text-xs text-center text-[#00E676] animate-pulse">
                Aguardando aprovação do dispositivo...
              </p>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
