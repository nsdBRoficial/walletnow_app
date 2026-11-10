/**
 * @module src\components\modals\ImportWalletModal.tsx
 * @description WalletNow Protocol - Arquitetura de carteira inteligente e pagamentos Stellar.
 */
import React, { useState } from 'react';
import { X, KeyRound, ArrowRight, Loader2, FileText, CheckCircle2 } from 'lucide-react';
import { useWallet } from '../../contexts/WalletContext';

interface ImportWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ImportWalletModal({ isOpen, onClose, onSuccess }: ImportWalletModalProps) {
  const { importMnemonic, importSecretKey } = useWallet();
  const [phase, setPhase] = useState<'select' | 'input' | 'processing' | 'success'>('select');
  const [importType, setImportType] = useState<'mnemonic' | 'secret' | null>(null);
  
  const [inputValue, setInputValue] = useState('');
  const [accountLabel, setAccountLabel] = useState('Minha Conta Importada');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleReset = () => {
    setPhase('select');
    setImportType(null);
    setInputValue('');
    setAccountLabel('Minha Conta Importada');
    setErrorMsg('');
    setIsLoading(false);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleSubmit = async () => {
    if (!inputValue.trim()) {
      setErrorMsg('Por favor, insira o dado solicitado.');
      return;
    }
    setErrorMsg('');
    setIsLoading(true);
    setPhase('processing');

    try {
      if (importType === 'mnemonic') {
        await importMnemonic(inputValue.trim(), accountLabel);
      } else if (importType === 'secret') {
        await importSecretKey(inputValue.trim(), accountLabel);
      }
      setPhase('success');
      setTimeout(() => {
        onSuccess();
        handleClose();
      }, 1500);
    } catch (e: any) {
      console.error('[ImportWalletModal] Erro ao importar:', e);
      setErrorMsg(e.message || 'Falha ao importar a carteira. Verifique os dados.');
      setPhase('input');
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-300 px-4">
      <div className="w-full max-w-md bg-[#161616] rounded-[32px] p-6 border border-white/5 shadow-2xl animate-in zoom-in-95 duration-300">
        
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-white">Importar Carteira</h2>
          <button onClick={handleClose} disabled={isLoading} className="p-2 bg-white/5 rounded-full text-gray-400 hover:text-white transition-colors disabled:opacity-50">
            <X className="w-5 h-5" />
          </button>
        </div>

        {phase === 'select' && (
          <div className="space-y-4">
            <p className="text-sm text-gray-400 mb-4">Escolha o formato da carteira que deseja importar para sua conta WalletNow.</p>
            
            <button 
              onClick={() => { setImportType('mnemonic'); setPhase('input'); }}
              className="w-full flex items-center p-4 bg-[#111] hover:bg-[#1a1a1a] rounded-2xl border border-white/5 transition-all text-left gap-4 group"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 group-hover:bg-blue-500/20 transition-colors">
                <FileText className="w-5 h-5 text-blue-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-white font-medium">Frase de Recuperação</h3>
                <p className="text-[10px] text-gray-500 mt-0.5">Mnemonic BIP39 (12 ou 24 palavras)</p>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-600 group-hover:text-blue-400 transition-colors" />
            </button>

            <button 
              onClick={() => { setImportType('secret'); setPhase('input'); }}
              className="w-full flex items-center p-4 bg-[#111] hover:bg-[#1a1a1a] rounded-2xl border border-white/5 transition-all text-left gap-4 group"
            >
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20 group-hover:bg-purple-500/20 transition-colors">
                <KeyRound className="w-5 h-5 text-purple-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-white font-medium">Chave Secreta Stellar</h3>
                <p className="text-[10px] text-gray-500 mt-0.5">Começa com a letra 'S' (Ex: SXXX...)</p>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-600 group-hover:text-purple-400 transition-colors" />
            </button>
          </div>
        )}

        {phase === 'input' && (
          <div className="space-y-5 animate-in slide-in-from-right-4 duration-300">
            <button onClick={() => setPhase('select')} className="text-xs text-gray-400 hover:text-white mb-2 flex items-center gap-1">
              ← Voltar
            </button>
            
            <div>
              <label className="block text-xs text-gray-400 mb-1 ml-1">Nome para Identificar a Conta</label>
              <input
                type="text"
                value={accountLabel}
                onChange={(e) => setAccountLabel(e.target.value)}
                className="w-full bg-[#111] border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-[#00E676]/50 transition-colors"
                placeholder="Ex: Minha Conta Fria"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1 ml-1">
                {importType === 'mnemonic' ? 'Digite as 12 ou 24 palavras, separadas por espaço' : 'Digite a Chave Secreta (Secret Key)'}
              </label>
              {importType === 'mnemonic' ? (
                <textarea
                  value={inputValue}
                  onChange={(e) => {
                    setInputValue(e.target.value);
                    setErrorMsg('');
                  }}
                  className="w-full h-24 bg-[#111] border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-[#00E676]/50 transition-colors resize-none"
                  placeholder="word1 word2 word3..."
                />
              ) : (
                <input
                  type="password"
                  value={inputValue}
                  onChange={(e) => {
                    setInputValue(e.target.value);
                    setErrorMsg('');
                  }}
                  className="w-full bg-[#111] border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-[#00E676]/50 transition-colors font-mono"
                  placeholder="S..."
                />
              )}
            </div>

            {errorMsg && (
              <p className="text-xs text-red-400 font-mono text-center">{errorMsg}</p>
            )}

            <button
              onClick={handleSubmit}
              disabled={!inputValue || !accountLabel}
              className="w-full bg-[#00E676] hover:bg-[#00E676]/90 text-black font-bold py-3.5 rounded-xl transition-all disabled:opacity-50 disabled:grayscale"
            >
              Importar Conta
            </button>
          </div>
        )}

        {phase === 'processing' && (
          <div className="flex flex-col items-center justify-center py-12 animate-in fade-in">
            <Loader2 className="w-12 h-12 text-[#00E676] animate-spin mb-4" />
            <p className="text-white font-medium">Criptografando e salvando localmente...</p>
            <p className="text-[10px] text-gray-500 mt-2">Os dados nunca saem do seu dispositivo.</p>
          </div>
        )}

        {phase === 'success' && (
          <div className="flex flex-col items-center justify-center py-10 animate-in zoom-in">
            <div className="w-16 h-16 bg-[#00E676]/10 rounded-full flex items-center justify-center mb-4 border border-[#00E676]/20">
              <CheckCircle2 className="w-8 h-8 text-[#00E676]" />
            </div>
            <h3 className="text-xl font-bold text-white">Importação Concluída!</h3>
            <p className="text-sm text-gray-400 mt-2 text-center">
              Você pode alternar entre suas contas no menu do topo a qualquer momento.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
