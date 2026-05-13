import { X, ArrowDownUp, Info, CheckCircle2, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { WalletFactory } from '../../services/walletFactory';
import { PaymentService } from '../../services/paymentService';
import { OracleService } from '../../services/oracleService';
import { logger } from '../../utils/logger';

interface SwapModalProps {
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

export default function SwapModal({ isOpen, onClose, onSuccess }: SwapModalProps) {
    const { profile } = useAuth();
    const [payAmount, setPayAmount] = useState('');
    const [payAsset, setPayAsset] = useState(ASSETS[0]);
    const [receiveAsset, setReceiveAsset] = useState(ASSETS[1]);
    const [status, setStatus] = useState<'idle' | 'swapping' | 'success'>('idle');
    const [prices, setPrices] = useState<{ xlm: number, usdc: number, btc: number } | null>(null);

    // Carrega preços reais assim que o usuário abre o modal
    useEffect(() => {
        let isMounted = true;
        if (isOpen) {
            logger.info('[WalletNow][UI]', 'Loading Oracle Prices for Swap');
            OracleService.getPrices()
                .then(p => {
                    if (isMounted) setPrices(p);
                })
                .catch(err => {
                    logger.error('[WalletNow][System]', 'Failed to load Oracle prices', err);
                    if (isMounted) setPrices({ xlm: 0, usdc: 0, btc: 0 }); // Fallback graceful
                });
        }
        return () => { isMounted = false; };
    }, [isOpen]);

    if (!isOpen) return null;

    const getAssetPriceInBrl = (code: string) => {
        if (code === 'BRZ') return 1.0;
        if (!prices) return 0;
        if (code === 'XLM') return prices.xlm;
        if (code === 'USDC') return prices.usdc;
        if (code === 'BTC') return prices.btc;
        return 0;
    };

    const payPriceBrl = getAssetPriceInBrl(payAsset.code);
    const receivePriceBrl = getAssetPriceInBrl(receiveAsset.code);

    let estimatedReceive = "0.0000";
    if (payAmount && payPriceBrl > 0 && receivePriceBrl > 0) {
        // Desconto de spread DEX de 2% simulado
        const rawAmount = (parseFloat(payAmount) * payPriceBrl) / receivePriceBrl;
        estimatedReceive = (rawAmount * 0.98).toFixed(7);
    }

    const handleSwapAssets = () => {
        const temp = payAsset;
        setPayAsset(receiveAsset);
        setReceiveAsset(temp);
    };

    const handleConfirmSwap = async () => {
        if (!payAmount || !profile?.id) return;
        setStatus('swapping');

        try {
            logger.info('[WalletNow][Payment]', `Iniciando swap de ${payAmount} ${payAsset.code} para ${receiveAsset.code}`);
            const secretKey = WalletFactory.getSecretKey(profile.id);
            if (!secretKey) throw new Error("Credencial secreta indisponível. Cadastre Passkey.");

            await PaymentService.swapAssets(
                secretKey,
                payAsset.code,
                receiveAsset.code,
                payAmount,
                estimatedReceive // Valor real com Spread calculado
            );

            logger.info('[WalletNow][Payment]', 'Swap success');
            setStatus('success');
            if (onSuccess) onSuccess();

            setTimeout(() => {
                setStatus('idle');
                setPayAmount('');
                onClose();
            }, 3000);
        } catch (error: any) {
            logger.error('[WalletNow][Payment]', 'Erro Swap', error);
            alert("Falha no Câmbio Web3: " + error.message);
            setStatus('idle');
        }
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
                                    value={estimatedReceive}
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

                        <div className="flex items-start gap-2 text-xs text-gray-500 mt-2 bg-black/30 p-3 rounded-lg border border-white/5">
                            <Info className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            <div className="flex flex-col gap-1 w-full">
                                <p>Cotação Oficial (Oracle CoinGecko):</p>
                                {prices ? (
                                    <div className="grid grid-cols-2 gap-1 mt-1 text-gray-400">
                                        <span>1 USD = R$ {prices.usdc.toFixed(2)}</span>
                                        <span>1 XLM = R$ {prices.xlm.toFixed(4)}</span>
                                        <span className="col-span-2">1 BTC = R$ {prices.btc.toLocaleString()}</span>
                                    </div>
                                ) : (
                                    <p className="text-[#F27D26] animate-pulse mt-1">Sincronizando oráculos descentralizados...</p>
                                )}
                            </div>
                        </div>

                        <button
                            disabled={!payAmount || status === 'swapping' || !prices || estimatedReceive === "0.0000"}
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
