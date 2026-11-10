/**
 * @module src\components\modals\SwapModal.tsx
 * @description WalletNow Protocol - Arquitetura de carteira inteligente e pagamentos Stellar.
 */
import { X, ArrowDownUp, Info, CheckCircle2, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useWallet } from '../../contexts/WalletContext';
import { WalletFactory } from '../../services/walletFactory';
import { PaymentService } from '../../services/paymentService';
import { OracleService } from '../../services/oracleService';
import { useIntegrationEngine } from '../../contexts/IntegrationEngineContext';
import { TransactionBuilder, Horizon, Keypair } from '@stellar/stellar-sdk';
import { logger } from '../../utils/logger';
import { StellarNetwork } from '../../config/stellarNetwork';

interface SwapModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
    useSoroswap?: boolean;
}

const ASSETS = [
    { code: 'BRZ', name: 'Brazilian Digital Token', icon: '🇧🇷' },
    { code: 'XLM', name: 'Stellar Lumens', icon: '🚀' },
    { code: 'USDC', name: 'USD Coin (Estável)', icon: '💵' },
    { code: 'BTC', name: 'Bitcoin (Wrapped Stellar)', icon: '₿' },
    { code: 'XRP', name: 'Ripple Testnet', icon: '💧' }
];

export default function SwapModal({ isOpen, onClose, onSuccess, useSoroswap = false }: SwapModalProps) {
    const { profile } = useAuth();
    const { refreshAccounts, activeAccount } = useWallet();
    const engine = useIntegrationEngine();
    const [payAmount, setPayAmount] = useState('');
    const [payAsset, setPayAsset] = useState(ASSETS[0]);
    const [receiveAsset, setReceiveAsset] = useState(ASSETS[1]);
    const [status, setStatus] = useState<'idle' | 'swapping' | 'success'>('idle');
    const [prices, setPrices] = useState<{ xlm: number, usdc: number, btc: number } | null>(null);
    const [balances, setBalances] = useState<Record<string, string>>({});
    const [currentQuote, setCurrentQuote] = useState<any>(null);

    useEffect(() => {
        if (activeAccount?.stellar_public_key) {
            WalletFactory.getBalances(activeAccount.stellar_public_key).then((b) => {
                if (b) setBalances(b as unknown as Record<string, string>);
            });
        }
    }, [activeAccount]);

    useEffect(() => {
        let active = true;
        if (!useSoroswap || !payAmount || parseFloat(payAmount) <= 0) {
            setCurrentQuote(null);
            return;
        }
        const fetchQuote = async () => {
            try {
                const swapCap = engine.getCapability('swap');
                if (swapCap?.provider) {
                    const mapAsset = (code: string) => {
                        if (code === 'XLM') return 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC';
                        if (code === 'USDC') return 'CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA';
                        if (code === 'XRP') return 'CDDIA6HYANLPMDKBVQRIIXY3NA6S3TMHZFJUNPMBEJGZ5JSHN3E2TAUI';
                        throw new Error(`Sem SAC`);
                    };
                    const quoteParams = {
                        assetIn: mapAsset(payAsset.code),
                        assetOut: mapAsset(receiveAsset.code),
                        amount: Math.floor(parseFloat(payAmount) * 1e7).toString(),
                        tradeType: 'EXACT_IN',
                        protocols: ['soroswap']
                    };
                    const quote = await swapCap.provider.getQuote(quoteParams);
                    if (active) setCurrentQuote(quote);
                }
            } catch (err) {
                if (active) setCurrentQuote(null);
            }
        };
        const timer = setTimeout(fetchQuote, 500);
        return () => { active = false; clearTimeout(timer); };
    }, [payAmount, payAsset, receiveAsset, useSoroswap, engine]);

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

    const getEstimatedReceive = () => {
        if (!payAmount || parseFloat(payAmount) <= 0) return 0;
        
        if (useSoroswap && currentQuote?.amountOut) {
            return parseFloat(currentQuote.amountOut) / 1e7;
        }

        const fromPrice = getAssetPriceInBrl(payAsset.code);
        const toPrice = getAssetPriceInBrl(receiveAsset.code);
        
        if (toPrice === 0) return 0;
        
        const valueInBrl = parseFloat(payAmount) * fromPrice;
        let amountReceive = valueInBrl / toPrice;
        
        // Simula Spread Nativo de 1%
        return amountReceive * 0.99;
    };

    const estimatedReceive = getEstimatedReceive();

    const handleSwapAssets = () => {
        const temp = payAsset;
        setPayAsset(receiveAsset);
        setReceiveAsset(temp);
    };

    const handleConfirmSwap = async () => {
        if (!payAmount || !profile?.id) return;
        setStatus('swapping');

        try {
            if (useSoroswap) {
                logger.info('[WalletNow][Soroswap]', `Iniciando swap de ${payAmount} ${payAsset.code} para ${receiveAsset.code}`);
                
                const secretKeyStr = WalletFactory.getSecretKey(profile.id);
                if (!secretKeyStr) throw new Error("Credencial secreta indisponível. Cadastre Passkey.");
                const keypair = Keypair.fromSecret(secretKeyStr);
                const publicKey = keypair.publicKey();

                const swapCap = engine.getCapability('swap');
                if (!swapCap?.provider) throw new Error("Serviço de Swap (Soroswap) indisponível");

                logger.info('[WalletNow][Soroswap]', 'Obtendo Quote da Soroswap API');
                
                const mapAsset = (code: string) => {
                    if (code === 'XLM') return 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC';
                    if (code === 'USDC') return 'CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA';
                    if (code === 'XRP') return 'CDDIA6HYANLPMDKBVQRIIXY3NA6S3TMHZFJUNPMBEJGZ5JSHN3E2TAUI';
                    throw new Error(`O token ${code} ainda não possui um Contract ID (SAC) configurado para a Soroswap no ambiente Testnet. Tente o Swap Nativo.`);
                };
                
                const quoteParams: any = {
                    assetIn: mapAsset(payAsset.code),
                    assetOut: mapAsset(receiveAsset.code),
                    amount: Math.floor(parseFloat(payAmount) * 1e7).toString(),
                    tradeType: 'EXACT_IN',
                    protocols: ['soroswap']
                };

                const quote = await swapCap.provider.getQuote(quoteParams);
                logger.info('[WalletNow][Soroswap]', 'Quote obtido com sucesso', quote);

                logger.info('[WalletNow][Soroswap]', 'Construindo Transação XDR');
                const buildPayload = {
                    quote,
                    source: publicKey,
                    slippage: 0.01 // 1%
                };
                const buildResponse = await swapCap.provider.buildTransaction(buildPayload);
                logger.info('[WalletNow][Soroswap]', 'Transação XDR construída');

                logger.info('[WalletNow][Soroswap]', 'Assinando transação');
                const tx = TransactionBuilder.fromXDR(buildResponse.xdr, 'Test SDF Network ; September 2015');
                tx.sign(keypair);
                const signedXdr = tx.toXDR();
                logger.info('[WalletNow][Soroswap]', 'Transação assinada com sucesso');

                logger.info('[WalletNow][Soroswap]', 'Submetendo transação para o Ledger');
                const server = StellarNetwork.createServer();
                const result = await server.submitTransaction(tx as any);
                logger.info('[WalletNow][Soroswap]', 'Transação confirmada no Ledger', result.hash);
            } else {
                logger.info('[WalletNow][Payment]', `Iniciando swap NATIVO de ${payAmount} ${payAsset.code} para ${receiveAsset.code}`);
                const secretKey = WalletFactory.getSecretKey(profile.id);
                if (!secretKey) throw new Error("Credencial secreta indisponível. Cadastre Passkey.");

                await PaymentService.swapAssets(
                    secretKey,
                    payAsset.code,
                    receiveAsset.code,
                    payAmount,
                    estimatedReceive.toFixed(7)
                );

                logger.info('[WalletNow][Payment]', 'Swap nativo success');
            }

            setStatus('success');
            await refreshAccounts(); // Refresh global sem F5
            if (onSuccess) onSuccess();

            setTimeout(() => {
                setStatus('idle');
                setPayAmount('');
                onClose();
            }, 3000);
        } catch (error: any) {
            logger.error('[WalletNow][Swap]', 'Erro Swap', error);
            
            let errorMsg = error.message || String(error);
            const isSoroswapError = errorMsg.includes('Soroswap') || errorMsg.includes('Path') || (error.details && error.details.title);
            
            if (isSoroswapError) {
                logger.warn('[WalletNow][Swap]', 'Soroswap falhou durante o swap modal.');
            }
            alert(`Falha no Swap (${useSoroswap ? 'Soroswap' : 'Nativo'}): ` + errorMsg);
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
                            <div className="flex justify-between items-center mb-2">
                                <label className="text-xs text-gray-500 block">Você Paga</label>
                                <div className="text-xs text-gray-400 cursor-pointer hover:text-white" onClick={() => setPayAmount(balances[payAsset.code.toLowerCase()] || '0')}>
                                    Saldo: {balances[payAsset.code.toLowerCase()] || '0.00'} MAX
                                </div>
                            </div>
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
                                    <Loader2 size={16} className="animate-spin" />
                                    Processando...
                                </>
                            ) : (
                                useSoroswap ? 'Confirmar Câmbio via Soroswap' : 'Confirmar Câmbio Nativo'
                            )}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
