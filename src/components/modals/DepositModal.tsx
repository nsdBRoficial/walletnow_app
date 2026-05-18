import { X, Copy, QrCode, CheckCircle2, Loader2, Zap, ExternalLink, CreditCard, Globe, ChevronRight, ShieldCheck, AlertCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { PaymentService } from '../../services/paymentService';
import { WalletFactory } from '../../services/walletFactory';
import { WooviService } from '../../services/wooviService';
import { availableProviders, IDepositProvider } from '../../services/providers';
import { logger } from '../../utils/logger';
import { DemoConfig } from '../../config/demoMode';
import { EtherfuseTrustlineService, TrustlineResult } from '../../services/providers/etherfuse/etherfuseTrustlineService';
import { EtherfuseAssetConfig } from '../../services/providers/etherfuse/etherfuseAssetConfig';

// Define quais propriedades (props) este componente espera receber.
interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function DepositModal({ isOpen, onClose, onSuccess }: DepositModalProps) {
  const { profile } = useAuth();

  // Estados do Fluxo de Depósito Polling (Sandbox Transfero)
  const [phase, setPhase] = useState<'provider_selection' | 'etherfuse_preview' | 'input' | 'generating' | 'waiting_payment' | 'minting' | 'success'>('provider_selection');
  const [isSimulating, setIsSimulating] = useState(false);
  const [trustlineResult, setTrustlineResult] = useState<TrustlineResult | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<IDepositProvider | null>(null);

  // Dados Inputados e Retornados
  const [amount, setAmount] = useState('');
  const [pixData, setPixData] = useState<{ brCode: string, correlationID: string, amount: number } | null>(null);
  const [copied, setCopied] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);

  // Zera o modal sempre que ele abrir/fechar
  useEffect(() => {
    if (isOpen) {
      setPhase('provider_selection');
      setSelectedProvider(null);
      setAmount('');
      setPixData(null);
      setTrustlineResult(null);
    }
  }, [isOpen]);

  /**
   * Fase 2: Fast-Mock / Observador de Pagamento (Polling Woovi)
   * Unificando estratégia: Em Sandbox/Dev, confirmamos em 2s sem polling real.
   */
  useEffect(() => {
    let timer: NodeJS.Timeout;

    if (isOpen && phase === 'waiting_payment' && pixData?.correlationID) {
      // Estratégia MVP: Sempre aciona o Fast-Mock para fechar o ciclo sem travar
      logger.info('[WalletNow][Payment]', `🛠️ Depósito Fast-Mock acionado para ID: ${pixData.correlationID}`);
      timer = setTimeout(() => {
        triggerMinting(pixData.amount, pixData.correlationID!);
      }, DemoConfig.mockPaymentDelay);
    }

    return () => {
      if (timer) clearTimeout(timer);
      // Caso seja interval
      if (typeof timer === 'number') clearInterval(timer);
    };
  }, [isOpen, phase, pixData?.correlationID]);

  // Se o modal não estiver aberto (isOpen === false), não renderiza nada na tela.
  // MAS os hooks devem ficar acima disto.
  if (!isOpen) return null;

  const triggerMinting = async (depositAmount: number, correlationID: string) => {
    if (!profile?.stellar_address || !profile.id) return;

    setPhase('minting');

    try {
      // Pega a SecretKey local para assinar a TrustLine se a conta for nova na Rede
      const userSecret = WalletFactory.getSecretKey(profile.id);

      // Conversão BRW real: PIX (BRL confirmado pela Woovi) ➔ BRW na Stellar Testnet
      const hash = await PaymentService.mintBRW(
        profile.stellar_address,
        depositAmount.toString(),
        userSecret || undefined,
        correlationID
      );

      if (hash) {
          setTxHash(hash);
          logger.info('[WalletNow][Blockchain]', `✅ Depósito Liquidado via PIX com sucesso! Hash: ${hash}`);
      }
      setPhase('success');
      if (onSuccess) onSuccess();

      // Fechamento automático solicitado: 3 segundos
      setTimeout(() => {
        onClose();
      }, 3000);
    } catch (e: any) {
      logger.error('[WalletNow][System]', `❌ Falha crítica ao realizar Mint Onchain`, e);
      alert("⚠️ PIX Recebido, mas Falha Crítica ao Mintar BRW Onchain: " + e.message);
      setPhase('input');
    }
  };

  const handleGeneratePix = async () => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0 || !profile?.id) return;

    setPhase('generating');

    try {
      // 1. Chama o Gateway Woovi para gerar a cobrança Pix (QR Code EMV)
      const result = await WooviService.createCharge(Number(amount), profile.id);
      
      logger.info('[WalletNow][Payment]', `⏳ Cobrança PIX gerada: ${result.correlationID}. Exibindo QR Code...`);
      setPixData({ brCode: result.brCode, correlationID: result.correlationID, amount: result.amount });
      setPhase('waiting_payment');

    } catch (e: any) {
      alert("Falha de Comunicação com Gateway Woovi: " + e.message);
      setPhase('input');
    }
  };

  const handleCopy = () => {
    if (!pixData?.brCode) return;
    navigator.clipboard.writeText(pixData.brCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    // Fundo escuro semi-transparente (backdrop) que cobre a tela toda.
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="w-full max-w-md bg-[#161616] rounded-t-[32px] sm:rounded-[32px] p-6 border border-white/5 shadow-2xl animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-8 duration-500">

        {/* Cabeçalho */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-white">
            {phase === 'provider_selection' ? 'Select Provider' : (phase === 'input' ? 'Depositar PIX' : (phase === 'etherfuse_preview' ? 'Treasury Asset' : 'Pagamento Gerado'))}
          </h2>
          <button
            onClick={onClose}
            disabled={phase === 'minting' || phase === 'generating'}
            className="p-2 bg-white/5 rounded-full text-gray-400 hover:text-white transition-colors disabled:opacity-50">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Phase 0: Provider Selection */}
        {phase === 'provider_selection' && (
          <div className="flex flex-col space-y-4">
            {availableProviders.map((provider) => {
              const isActive = provider.status === 'active';
              
              // Helper to map icon names
              const IconComponent = () => {
                switch(provider.iconName) {
                  case 'QrCode': return <QrCode className="w-5 h-5" />;
                  case 'Globe': return <Globe className="w-5 h-5" />;
                  case 'CreditCard': return <CreditCard className="w-5 h-5" />;
                  default: return <Zap className="w-5 h-5" />;
                }
              };

              return (
                <button
                  key={provider.id}
                  disabled={!isActive}
                  onClick={() => {
                    if (isActive) {
                      logger.info('[WalletNow][Provider]', `Selected provider: ${provider.id}`);
                      setSelectedProvider(provider);
                      if (provider.id === 'etherfuse') {
                        setPhase('etherfuse_preview');
                      } else {
                        setPhase('input');
                      }
                    }
                  }}
                  className={`w-full flex items-center justify-between p-4 rounded-2xl border text-left transition-all duration-300 group
                    ${isActive 
                      ? 'bg-black/40 border-[#00E676]/30 hover:border-[#00E676]/80 hover:bg-black/60 shadow-[0_0_15px_rgba(0,230,118,0.05)] hover:shadow-[0_0_20px_rgba(0,230,118,0.15)] cursor-pointer' 
                      : 'bg-black/20 border-white/5 opacity-60 cursor-not-allowed'
                    }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-full ${isActive ? 'bg-[#00E676]/10 text-[#00E676]' : 'bg-white/5 text-gray-500'}`}>
                      <IconComponent />
                    </div>
                    <div>
                      <h3 className={`font-semibold text-base ${isActive ? 'text-white' : 'text-gray-400'}`}>{provider.name}</h3>
                      <p className="text-xs text-gray-500 mt-1">{provider.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    {!isActive ? (
                      <span className="text-[10px] uppercase tracking-wider font-mono bg-white/5 text-gray-400 px-2 py-1 rounded border border-white/10">
                        {provider.buttonLabel}
                      </span>
                    ) : (
                      <ChevronRight className="w-5 h-5 text-gray-600 group-hover:text-[#00E676] transition-colors" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Phase: Etherfuse — Trustline REAL */}
        {phase === 'etherfuse_preview' && (
          <div className="flex flex-col space-y-5 animate-in fade-in duration-300">

            {/* Header informativo do ativo */}
            <div className="bg-gradient-to-br from-[#0F172A] to-black rounded-2xl p-5 border border-slate-800 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center border border-slate-700 shadow-inner">
                  <Globe className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white tracking-tight">{EtherfuseAssetConfig.displayName}</h3>
                  <p className="text-xs text-blue-400 font-mono tracking-widest uppercase">Asset: {EtherfuseAssetConfig.assetCode} · Stellar Testnet</p>
                </div>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed">
                Para receber <strong className="text-blue-300">TESOURO</strong> na sua carteira Stellar, é necessário estabelecer uma <strong className="text-white">Trustline</strong> com o emissor da Etherfuse. Esta operação é real e será confirmada on-chain.
              </p>
              <div className="mt-3 p-2 bg-blue-950/40 border border-blue-900/40 rounded-lg">
                <p className="text-[10px] text-blue-300/70 font-mono text-center">
                  Issuer: {EtherfuseAssetConfig.issuer.substring(0, 14)}...{EtherfuseAssetConfig.issuer.substring(-6)}
                </p>
              </div>
            </div>

            {/* Resultado da trustline se disponível */}
            {trustlineResult && trustlineResult.success && (
              <div className="bg-green-950/30 border border-green-800/40 rounded-2xl p-4 animate-in zoom-in duration-300">
                <div className="flex items-center gap-3 mb-2">
                  <ShieldCheck className="w-5 h-5 text-green-400 flex-shrink-0" />
                  <p className="text-sm font-semibold text-green-300">
                    {trustlineResult.alreadyExists ? 'Trustline já existente!' : 'Trustline criada com sucesso!'}
                  </p>
                </div>
                {trustlineResult.transactionHash && (
                  <a
                    href={trustlineResult.explorerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-[10px] text-green-400 font-mono hover:text-green-300 transition-colors mt-1"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Ver transação on-chain: {trustlineResult.transactionHash.substring(0, 16)}...
                  </a>
                )}
              </div>
            )}

            {/* Erro de trustline */}
            {trustlineResult && !trustlineResult.success && (
              <div className="bg-red-950/30 border border-red-800/40 rounded-2xl p-4">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-red-300">Falha ao criar trustline</p>
                    <p className="text-xs text-red-400/70 mt-0.5 font-mono">{trustlineResult.error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Botão principal de trustline */}
            {!trustlineResult?.success && (
              <button
                onClick={async () => {
                  if (!profile?.stellar_address || !profile?.id) return;
                  setIsSimulating(true);
                  setTrustlineResult(null);

                  try {
                    const secretKey = WalletFactory.getSecretKey(profile.id);
                    if (!secretKey) {
                      setTrustlineResult({ success: false, error: 'Secret key não encontrada no dispositivo. Reconecte sua carteira.' });
                      return;
                    }

                    logger.info('[WalletNow][Treasury]', 'Iniciando criação de trustline TESOURO real...');
                    const result = await EtherfuseTrustlineService.createTrustline(
                      profile.stellar_address,
                      secretKey
                    );
                    setTrustlineResult(result);

                    if (result.success && onSuccess) {
                      setTimeout(() => onSuccess(), 2000);
                    }
                  } catch (err: any) {
                    logger.error('[WalletNow][Treasury]', 'Erro inesperado na criação de trustline', err);
                    setTrustlineResult({ success: false, error: err.message || 'Erro desconhecido' });
                  } finally {
                    setIsSimulating(false);
                  }
                }}
                disabled={isSimulating}
                className="w-full flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-500 text-white py-4 px-6 rounded-2xl transition-all duration-300 font-bold disabled:opacity-60 shadow-[0_0_20px_rgba(37,99,235,0.2)]"
              >
                {isSimulating ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
                {isSimulating ? 'Criando Trustline on-chain...' : 'Create Treasury Trustline'}
              </button>
            )}

            {trustlineResult?.success && (
              <button
                onClick={onClose}
                className="w-full flex items-center justify-center gap-2 bg-green-700 hover:bg-green-600 text-white py-4 px-6 rounded-2xl font-bold transition-all"
              >
                <CheckCircle2 className="w-5 h-5" />
                Concluído — Fechar
              </button>
            )}

            <button
              onClick={() => { setPhase('provider_selection'); setTrustlineResult(null); }}
              className="w-full text-xs text-gray-500 hover:text-white transition-colors"
            >
              Voltar aos Provedores
            </button>
          </div>
        )}

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
              <span className="text-xs font-semibold text-[#00E676] uppercase tracking-wider">Aguardando pagamento PIX...</span>
            </div>
          </div>
        )}

        {/* Phase 4: Minting Onchain (After Fast-Mock or Real Polling) */}
        {phase === 'minting' && (
          <div className="flex flex-col items-center justify-center py-16 animate-in fade-in">
            <Zap className="w-12 h-12 text-[#00E676] animate-bounce mb-4 fill-[#00E676]/20" />
            <p className="text-white text-lg font-bold text-center">PIX Recebido!</p>
            <p className="text-gray-400 font-medium text-sm mt-1 text-center">Emitindo tokens BRW na Blockchain...</p>
            <p className="text-[10px] text-gray-600 mt-4 uppercase tracking-widest font-mono">X402 Minting Service active</p>
          </div>
        )}

        {/* Phase 5: Success Finalization */}
        {phase === 'success' && (
          <div className="flex flex-col items-center justify-center py-12 animate-in zoom-in duration-300">
            <div className="w-20 h-20 bg-[#00E676]/20 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="w-10 h-10 text-[#00E676]" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">Depósito Liquidado!</h3>
            <p className="text-gray-400 text-center text-sm mb-6">Transferência Bancária recebida.<br />Saldo refletido On-Chain com Sucesso.</p>
            
            {txHash && (
              <a 
                href={`https://stellar.expert/explorer/testnet/tx/${txHash}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-[#00E676] text-xs font-semibold bg-[#00E676]/10 px-4 py-2 rounded-xl border border-[#00E676]/20 hover:bg-[#00E676]/20 transition-all"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Ver Comprovante Blockchain
              </a>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
