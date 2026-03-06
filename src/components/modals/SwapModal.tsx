import { X, ArrowDownUp, Info, CheckCircle2, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';

interface SwapModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const ASSETS = [
    { code: 'BRZ', name: 'Brazilian Digital Token', icon: '🇧🇷' },
    { code: 'XLM', name: 'Stellar Lumens', icon: '🚀' },
    { code: 'USDC', name: 'USD Coin (Estável)', icon: '💵' },
    { code: 'BTC', name: 'Bitcoin (Wrapped Stellar)', icon: '₿' }
];

export default function SwapModal({ isOpen, onClose }: SwapModalProps) {
    const { profile } = useAuth();
    const [payAmount, setPayAmount] = useState('');
    const [payAsset, setPayAsset] = useState(ASSETS[0]);
    const [receiveAsset, setReceiveAsset] = useState(ASSETS[1]);
    const [status, setStatus] = useState<'idle' | 'swapping' | 'success'>('idle');

    if (!isOpen) return null;

    const handleSwapAssets = () => {
        const temp = payAsset;
        setPayAsset(receiveAsset);
        setReceiveAsset(temp);
    };

    const handleConfirmSwap = () => {
        if (!payAmount) return;
        setStatus('swapping');
        setTimeout(() => {
            setStatus('success');
            setTimeout(() => {
                setStatus('idle');
                setPayAmount('');
                onClose();
            }, 3000);
        }, 2000);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="w-full max-w-md bg-[#161616] rounded-t-[32px] sm:rounded-[32px] p-6 border border-white/5 shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-semibold text-white">Swap (Câmbio)</h2>
                    <button onClick={onClose} disabled={status === 'swapping'} className="p-2 bg-white/5 rounded-full text-gray-400 hover:text-white transition-colors disabled:opacity-50">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {status === 'success' ? (
                    <div className="flex flex-col items-center justify-center py-12 animate-in zoom-in duration-300">
                        <div className="w-20 h-20 bg-[#F27D26]/20 rounded-full flex items-center justify-center mb-4">
                            <CheckCircle2 className="w-10 h-10 text-[#F27D26]" />
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-2">Swap Concluído!</h3>
                        <p className="text-gray-400 text-center text-sm">Seus tokens foram convertidos<br />direto nas Pools de Liquidez.</p>
                    </div>
                ) : (
                    <div className="flex flex-col space-y-4 relative">

                        {/* Caixa de Pagamento */}
                        <div className="bg-black/30 border border-white/5 p-4 rounded-2xl">
                            <label className="text-xs text-gray-500 mb-2 block">Você Paga</label>
                            <div className="flex justify-between items-center">
                                <input
                                    type="number"
                                    value={payAmount}
                                    placeholder="0.00"
                                    onChange={e => setPayAmount(e.target.value)}
                                    className="bg-transparent text-2xl font-bold text-white w-full outline-none"
                                />
                                <select
                                    value={payAsset.code}
                                    onChange={e => setPayAsset(ASSETS.find(a => a.code === e.target.value) || ASSETS[0])}
                                    className="bg-[#161616] border border-white/10 text-white text-sm rounded-lg px-2 py-1 outline-none"
                                >
                                    {ASSETS.map(asset => <option key={asset.code} value={asset.code}>{asset.icon} {asset.code}</option>)}
                                </select>
                            </div>
                        </div>

                        {/* Botão de Inversão */}
                        <div className="absolute top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                            <button onClick={handleSwapAssets} className="bg-[#161616] p-2 rounded-full border border-white/10 text-gray-400 hover:text-white hover:border-white/20 transition-all">
                                <ArrowDownUp className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Caixa de Recebimento */}
                        <div className="bg-black/30 border border-white/5 p-4 rounded-2xl">
                            <label className="text-xs text-gray-500 mb-2 block">Você Recebe (Estimativa)</label>
                            <div className="flex justify-between items-center">
                                <input
                                    type="text"
                                    value={payAmount ? (parseFloat(payAmount) * 0.98).toFixed(4) : "0.00"}
                                    disabled
                                    className="bg-transparent text-2xl font-bold text-gray-500 w-full outline-none"
                                />
                                <select
                                    value={receiveAsset.code}
                                    onChange={e => setReceiveAsset(ASSETS.find(a => a.code === e.target.value) || ASSETS[1])}
                                    className="bg-[#161616] border border-white/10 text-white text-sm rounded-lg px-2 py-1 outline-none"
                                >
                                    {ASSETS.map(asset => <option key={asset.code} value={asset.code}>{asset.icon} {asset.code}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="flex items-start gap-2 text-xs text-gray-500 mt-2 bg-[#F27D26]/5 p-3 rounded-lg border border-[#F27D26]/20">
                            <Info className="w-4 h-4 text-[#F27D26] flex-shrink-0" />
                            <p>As cotações são providas de pools descentralizadas na rede Stellar (AMM). Liquidez sob demanda.</p>
                        </div>

                        <button
                            disabled={!payAmount || status === 'swapping'}
                            onClick={handleConfirmSwap}
                            className="w-full mt-4 bg-[#F27D26] hover:bg-[#D96B1C] text-white py-4 rounded-2xl font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {status === 'swapping' ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Buscando Rota e Executando...
                                </>
                            ) : (
                                'Confirmar Swap'
                            )}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
