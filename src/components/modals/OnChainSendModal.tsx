import { X, Fingerprint, CheckCircle2, Loader2, Send } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { WalletFactory } from '../../services/walletFactory';
import { PaymentService } from '../../services/paymentService';

interface OnChainSendModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

const ASSETS = [
    { code: 'BRZ', name: 'Brazilian Digital Token', icon: '🇧🇷' },
    { code: 'XLM', name: 'Stellar Lumens', icon: '🚀' },
    { code: 'USDC', name: 'USD Coin (Estável)', icon: '💵' },
    { code: 'BTC', name: 'Bitcoin (Wrapped Stellar)', icon: '₿' }
];

export default function OnChainSendModal({ isOpen, onClose, onSuccess }: OnChainSendModalProps) {
    const { profile } = useAuth();
    const [amount, setAmount] = useState('');
    const [targetAddress, setTargetAddress] = useState('');
    const [selectedAsset, setSelectedAsset] = useState(ASSETS[0]);
    const [status, setStatus] = useState<'idle' | 'authenticating' | 'success'>('idle');

    if (!isOpen) return null;

    const handleSend = async () => {
        if (!amount || !targetAddress || !profile?.id) return;

        setStatus('authenticating');

        try {
            await new Promise(resolve => setTimeout(resolve, 1500));

            const secretKey = WalletFactory.getSecretKey(profile.id);
            if (!secretKey) throw new Error("Chave Passkey local não encontrada. Impossível assinar a saída.");

            await PaymentService.sendAssetOnChain(
                secretKey,
                targetAddress,
                selectedAsset.code,
                amount
            );

            setStatus('success');
            if (onSuccess) onSuccess();

            setTimeout(() => {
                closeModal();
            }, 3000);

        } catch (e: any) {
            alert("Falha no Envio Descentralizado On-Chain: " + e.message);
            setStatus('idle');
        }
    };

    const closeModal = () => {
        if (status === 'authenticating') return;
        setStatus('idle');
        setAmount('');
        setTargetAddress('');
        setSelectedAsset(ASSETS[0]);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="w-full max-w-md bg-[#161616] rounded-t-[32px] sm:rounded-[32px] p-6 border border-white/5 shadow-2xl animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-8 duration-500">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-semibold text-white">Envio Web3 (On-Chain)</h2>
                    <button onClick={closeModal} disabled={status === 'authenticating'} className="p-2 bg-white/5 rounded-full text-gray-400 hover:text-white transition-colors disabled:opacity-50">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {status === 'success' ? (
                    <div className="flex flex-col items-center justify-center py-12 animate-in zoom-in duration-300">
                        <div className="w-20 h-20 bg-[#00E676]/20 rounded-full flex items-center justify-center mb-4">
                            <CheckCircle2 className="w-10 h-10 text-[#00E676]" />
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-2">Ativos Transferidos!</h3>
                        <p className="text-gray-400">Transação confirmada na rede Stellar mundial.</p>
                    </div>
                ) : (
                    <div className="flex flex-col space-y-6">

                        {/* Dropdown e Input de Valor */}
                        <div className="bg-black/30 border border-white/5 p-4 rounded-2xl">
                            <label className="text-xs text-gray-500 mb-2 block">Moeda e Quantidade</label>
                            <div className="flex justify-between items-center">
                                <input
                                    type="number"
                                    value={amount}
                                    placeholder="0.00"
                                    onChange={e => setAmount(e.target.value)}
                                    className="bg-transparent text-3xl font-bold text-white w-full outline-none"
                                />
                                <select
                                    value={selectedAsset.code}
                                    onChange={e => setSelectedAsset(ASSETS.find(a => a.code === e.target.value) || ASSETS[0])}
                                    className="bg-[#161616] border border-white/10 text-white text-sm rounded-lg px-2 py-1 outline-none"
                                >
                                    {ASSETS.map(asset => <option key={asset.code} value={asset.code}>{asset.icon} {asset.code}</option>)}
                                </select>
                            </div>
                        </div>

                        {/* Endereço de Destino */}
                        <div className="w-full">
                            <label className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-2 block">Public Key (G...)</label>
                            <div className="flex items-center bg-black/50 border border-white/10 focus-within:border-[#00E676] transition-colors rounded-xl p-4">
                                <Send className="w-5 h-5 text-gray-500 mr-3 flex-shrink-0" />
                                <input
                                    type="text"
                                    value={targetAddress}
                                    placeholder="Endereço Stellar de destino"
                                    onChange={(e) => setTargetAddress(e.target.value)}
                                    className="w-full bg-transparent text-white outline-none font-mono text-xs"
                                />
                            </div>
                        </div>

                        <p className="text-[10px] text-gray-500 text-center uppercase tracking-wider font-mono px-4">
                            Você está controlando as assinaturas Web3 de forma autônoma. O destino precisa ter capacidade para suportar Tokens Transfero®.
                        </p>

                        <button
                            onClick={handleSend}
                            disabled={!amount || !targetAddress || status === 'authenticating'}
                            className="w-full flex items-center justify-center gap-3 bg-[#00E676] hover:bg-[#00E676]/90 text-black py-4 px-6 rounded-2xl transition-all duration-300 font-bold disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(0,230,118,0.2)]"
                        >
                            {status === 'authenticating' ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Assinando Transação...
                                </>
                            ) : (
                                <>
                                    <Fingerprint className="w-5 h-5" />
                                    Autorizar
                                </>
                            )}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
