import { X, QrCode, Copy, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';

interface ReceiveModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function ReceiveCryptoModal({ isOpen, onClose }: ReceiveModalProps) {
    const { profile } = useAuth();
    const [copied, setCopied] = useState(false);

    if (!isOpen) return null;

    const handleCopy = () => {
        if (profile?.stellar_address) {
            navigator.clipboard.writeText(profile.stellar_address);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="w-full max-w-md bg-[#161616] rounded-t-[32px] sm:rounded-[32px] p-6 border border-white/5 shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-semibold text-white">Receber Cripto (Web3)</h2>
                    <button onClick={onClose} className="p-2 bg-white/5 rounded-full text-gray-400 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex flex-col items-center space-y-6">
                    <p className="text-sm text-gray-400 text-center">
                        Escaneie o QR Code ou copie o endereço abaixo para receber tokens nativos da rede Stellar.
                    </p>

                    <div className="w-48 h-48 bg-white rounded-2xl p-4 flex items-center justify-center border-4 border-white">
                        <QrCode className="w-full h-full text-black" strokeWidth={1.5} />
                    </div>

                    <div className="w-full">
                        <label className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-2 block">Seu Endereço de Recebimento</label>
                        <button
                            onClick={handleCopy}
                            className="w-full flex items-center justify-between bg-black/50 border border-white/10 p-4 rounded-xl hover:border-white/20 transition-colors group"
                        >
                            <span className="text-xs sm:text-sm text-gray-300 truncate mr-4 font-mono">
                                {profile?.stellar_address}
                            </span>
                            {copied ? (
                                <CheckCircle2 className="w-5 h-5 text-[#00E676] flex-shrink-0" />
                            ) : (
                                <Copy className="w-5 h-5 text-gray-500 group-hover:text-white flex-shrink-0 transition-colors" />
                            )}
                        </button>
                    </div>

                    <p className="text-[10px] text-gray-600 text-center mt-2 leading-tight">
                        Aviso: Envie apenas moedas pareadas com a Stellar Network (XLM). Tokens enviados em outras redes (Ethereum, Binance) serão perdidos.
                    </p>
                </div>
            </div>
        </div>
    );
}
