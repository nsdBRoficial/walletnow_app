import { X, Copy, QrCode, CheckCircle2, Loader2, Zap, ExternalLink, CreditCard, Globe, ChevronRight, ShieldCheck, AlertCircle, TrendingUp, Wallet } from 'lucide-react';
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
import { EtherfuseOnRampService, EtherfuseQuoteResult, EtherfuseOrderResult } from '../../services/providers/etherfuse/etherfuseOnRampService';
import { EtherfuseKycService, KycPayload } from '../../services/providers/etherfuse/etherfuseKycService';

// Define quais propriedades (props) este componente espera receber.
interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function DepositModal({ isOpen, onClose, onSuccess }: DepositModalProps) {
  const { profile } = useAuth();

  const [phase, setPhase] = useState<'provider_selection' | 'etherfuse_preview' | 'etherfuse_amount' | 'etherfuse_kyc' | 'etherfuse_kyc_form' | 'etherfuse_settling' | 'etherfuse_done' | 'input' | 'generating' | 'waiting_payment' | 'minting' | 'success'>('provider_selection');
  const [isSimulating, setIsSimulating] = useState(false);
  const [trustlineResult, setTrustlineResult] = useState<TrustlineResult | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<IDepositProvider | null>(null);
  // Etherfuse on-ramp states
  const [efAmount, setEfAmount] = useState('50');
  const [efStatusLabel, setEfStatusLabel] = useState('');
  const [efQuote, setEfQuote] = useState<EtherfuseQuoteResult | null>(null);
  const [efOrder, setEfOrder] = useState<EtherfuseOrderResult | null>(null);
  const [efCustomerId, setEfCustomerId] = useState('');
  const [efBankAccountId, setEfBankAccountId] = useState('');
  const [efInitialBankAccountId, setEfInitialBankAccountId] = useState('');
  const [efKycUrl, setEfKycUrl] = useState('');
  
  // KYC Form States
  const isSandbox = import.meta.env.DEV; // Para autofill
  const [kycForm, setKycForm] = useState<KycPayload>(isSandbox ? {
    firstName: 'João',
    lastName: 'Silva',
    dateOfBirth: '1990-01-01',
    taxId: '12345678909',
    occupation: 'Software Engineer',
    phoneNumber: '+5511999999999',
    address: {
      street: 'Rua Ficticia, 123',
      city: 'São Paulo',
      state: 'SP',
      postalCode: '01000-000',
      country: 'BR'
    }
  } : {
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    taxId: '',
    occupation: '',
    phoneNumber: '',
    address: { street: '', city: '', state: '', postalCode: '', country: 'BR' }
  });

  // Dados Inputados e Retornados
  const [amount, setAmount] = useState('');
  const [pixData, setPixData] = useState<{ brCode: string, correlationID: string, amount: number } | null>(null);
  const [copied, setCopied] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setPhase('provider_selection');
      setSelectedProvider(null);
      setAmount('');
      setPixData(null);
      setTrustlineResult(null);
      setEfQuote(null);
      setEfOrder(null);
      setEfStatusLabel('');
    }
  }, [isOpen]);

  // Handler principal de compra TESOURO (trustline → customer → kyc_check → bankAccount → quote → order → simulate → poll)
  const handleBuyTesouro = async () => {
    if (!profile?.stellar_address || !profile?.id) return;
    setIsSimulating(true);
    setEfStatusLabel('Verificando Trustline...');
    try {
      // 1. Trustline
      const secretKey = WalletFactory.getSecretKey(profile.id);
      if (!secretKey) { setTrustlineResult({ success: false, error: 'Secret key não encontrada.' }); return; }
      const tr = await EtherfuseTrustlineService.createTrustline(profile.stellar_address, secretKey);
      setTrustlineResult(tr);
      if (!tr.success) return;

      // 2. Customer
      setEfStatusLabel('Registrando na Etherfuse...');
      let custId = efCustomerId;
      let kycUrl = efKycUrl;
      if (!custId || !kycUrl) {
        const cust = await EtherfuseOnRampService.registerCustomer(profile.stellar_address);
        custId = cust.customerId;
        kycUrl = cust.kycUrl;
        setEfCustomerId(custId);
        setEfKycUrl(kycUrl);
        setEfInitialBankAccountId(cust.bankAccountId || '');
      }

      // 3. Verificar KYC (CRÍTICO: sandbox requer KYC antes de createOrder)
      setEfStatusLabel('Verificando status KYC...');
      const kycStatus = await EtherfuseOnRampService.getKycStatus(custId, profile.stellar_address);
      logger.info('[WalletNow][Treasury]', `KYC status: ${kycStatus.status}`, kycStatus);
      if (kycStatus.status === 'not_started') {
        setEfStatusLabel('KYC não iniciado — complete o formulário');
        setPhase('etherfuse_kyc_form');
        setIsSimulating(false);
        return;
      } else if (kycStatus.status === 'proposed') {
        setEfStatusLabel('KYC pendente de aprovação');
        setPhase('etherfuse_kyc');
        setIsSimulating(false);
        return;
      }

      // 4. Buscar bankAccountId REAL (CORREÇÃO CRÍTICA: UUID sintético causa HTTP 400)
      setEfStatusLabel('Buscando conta bancária...');
      let realBankAccountId = efBankAccountId;
      if (!realBankAccountId) {
        const accounts = await EtherfuseOnRampService.getFiatAccounts(custId);
        if (accounts.length > 0) {
          realBankAccountId = accounts[0].bankAccountId;
          setEfBankAccountId(realBankAccountId);
          logger.info('[WalletNow][Treasury]', `✅ bankAccountId REAL encontrado: ${realBankAccountId}`, {});
        } else {
          logger.warn('[WalletNow][Treasury]', 'Nenhum bank account encontrado. Tentando usar o bankAccountId inicial da sessão.', {});
          realBankAccountId = efInitialBankAccountId;
          setEfBankAccountId(realBankAccountId);
        }
      }


      // 5. Quote (expiram em ~2 min — deve ser imediatamente antes do createOrder)
      setEfStatusLabel('Obtendo cotação BRL → TESOURO...');
      const quote = await EtherfuseOnRampService.getQuote(custId, profile.stellar_address, efAmount);
      setEfQuote(quote);

      // 6. Order — usa bankAccountId REAL da Etherfuse
      setEfStatusLabel('Criando ordem de compra...');
      logger.info('[WalletNow][Treasury]', 'Iniciando createOrder com dados:', {
        custId: custId.substring(0, 8) + '...',
        realBankAccountId: realBankAccountId.substring(0, 8) + '...',
        quoteId: quote.quoteId.substring(0, 8) + '...',
        publicKey: profile.stellar_address.substring(0, 8) + '...',
      });
      const order = await EtherfuseOnRampService.createOrder(custId, realBankAccountId, quote.quoteId, profile.stellar_address);
      setEfOrder(order);

      // 7. Sandbox: simular PIX recebido
      setEfStatusLabel('⚡ Sandbox: Simulando pagamento PIX...');
      await EtherfuseOnRampService.simulateFiatReceived(order.orderId);

      // 8. Poll até completed
      setPhase('etherfuse_settling');
      const final = await EtherfuseOnRampService.pollUntilCompleted(
        order.orderId,
        (s) => setEfStatusLabel(`Status: ${s}`),
        90_000
      );
      if (final) { setEfOrder(final); }
      setPhase('etherfuse_done');
      if (onSuccess) setTimeout(onSuccess, 1500);
    } catch (err: any) {
      // NUNCA engolir o erro — expor mensagem completa
      const fullError = err?.message || JSON.stringify(err) || 'falha desconhecida';
      logger.error('[WalletNow][Treasury]', 'Erro no fluxo de compra TESOURO', { error: fullError });
      setEfStatusLabel(`❌ ${fullError}`);
    } finally {
      setIsSimulating(false);
    }
  };
  const handleSubmitKyc = async () => {
    setIsSimulating(true);
    setEfStatusLabel('Enviando dados de KYC...');
    try {
      await EtherfuseKycService.submitKyc(efCustomerId, kycForm);
      setEfStatusLabel('KYC enviado com sucesso. Aguardando aprovação...');
      setPhase('etherfuse_kyc'); // Muda para a fase de polling
    } catch (e: any) {
      const fullError = e?.message || JSON.stringify(e) || 'Erro ao submeter KYC';
      logger.error('[WalletNow][Treasury]', 'Erro no submit KYC', { error: fullError });
      setEfStatusLabel(`❌ ${fullError}`);
    } finally {
      setIsSimulating(false);
    }
  };

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

  // Polling automático KYC
  useEffect(() => {
    let timer: NodeJS.Timeout;

    if (isOpen && phase === 'etherfuse_kyc' && efCustomerId && profile?.stellar_address) {
      timer = setInterval(async () => {
        try {
          const statusResult = await EtherfuseOnRampService.getKycStatus(efCustomerId, profile.stellar_address);
          logger.info('[WalletNow][Treasury]', `[Polling] KYC status: ${statusResult.status}`, statusResult);
          
          if (statusResult.status === 'approved' || statusResult.status === 'approved_chain_deploying') {
            clearInterval(timer);
            setEfStatusLabel('KYC Aprovado! Retomando compra...');
            // Retoma automaticamente o fluxo de compra
            handleBuyTesouro();
          } else if (statusResult.status === 'rejected') {
            clearInterval(timer);
            setEfStatusLabel('❌ KYC Rejeitado');
          } else {
             setEfStatusLabel(statusResult.status === 'not_started' ? 'Aguardando início do KYC...' : 'Aguardando aprovação...');
          }
        } catch(e) {
          logger.error('[WalletNow][Treasury]', 'Erro polling KYC', e);
        }
      }, 5000);
    }

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, phase, efCustomerId, profile?.stellar_address]);

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
        {/* ── ETHERFUSE: KYC Formulario Programático ──────────────────────────── */}
        {phase === 'etherfuse_kyc_form' && (
          <div className="flex flex-col space-y-4 animate-in fade-in duration-300 overflow-y-auto max-h-[80vh] px-1">
            <div className="flex flex-col items-center justify-center pt-2 pb-4 border-b border-white/5">
               <div className="w-12 h-12 bg-blue-900/30 rounded-full flex items-center justify-center border border-blue-500/30 mb-3">
                  <ShieldCheck className="w-6 h-6 text-blue-400" />
               </div>
               <h3 className="text-lg font-bold text-white">Verificação de Identidade</h3>
               <p className="text-xs text-slate-400 mt-1 text-center px-4">
                 Preencha seus dados para habilitar investimentos no TESOURO via Etherfuse.
               </p>
               {isSandbox && (
                 <div className="mt-3 px-3 py-1 bg-yellow-500/10 border border-yellow-500/30 rounded-full">
                   <span className="text-[10px] text-yellow-400 font-mono font-bold tracking-widest uppercase">Sandbox Autofill</span>
                 </div>
               )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-1">
                <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1 block">Nome</label>
                <input type="text" value={kycForm.firstName} onChange={e => setKycForm({...kycForm, firstName: e.target.value})} className="w-full bg-slate-900/60 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-blue-500 transition-colors" />
              </div>
              <div className="col-span-1">
                <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1 block">Sobrenome</label>
                <input type="text" value={kycForm.lastName} onChange={e => setKycForm({...kycForm, lastName: e.target.value})} className="w-full bg-slate-900/60 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-blue-500 transition-colors" />
              </div>
              <div className="col-span-2">
                <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1 block">CPF</label>
                <input type="text" value={kycForm.taxId} onChange={e => setKycForm({...kycForm, taxId: e.target.value})} className="w-full bg-slate-900/60 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-blue-500 transition-colors font-mono" />
              </div>
              <div className="col-span-1">
                <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1 block">Nascimento</label>
                <input type="date" value={kycForm.dateOfBirth} onChange={e => setKycForm({...kycForm, dateOfBirth: e.target.value})} className="w-full bg-slate-900/60 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-blue-500 transition-colors" />
              </div>
              <div className="col-span-1">
                <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1 block">Celular</label>
                <input type="tel" value={kycForm.phoneNumber} onChange={e => setKycForm({...kycForm, phoneNumber: e.target.value})} className="w-full bg-slate-900/60 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-blue-500 transition-colors" />
              </div>
              <div className="col-span-2">
                <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1 block">Rua</label>
                <input type="text" value={kycForm.address.street} onChange={e => setKycForm({...kycForm, address: {...kycForm.address, street: e.target.value}})} className="w-full bg-slate-900/60 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-blue-500 transition-colors" />
              </div>
              <div className="col-span-1">
                <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1 block">Cidade</label>
                <input type="text" value={kycForm.address.city} onChange={e => setKycForm({...kycForm, address: {...kycForm.address, city: e.target.value}})} className="w-full bg-slate-900/60 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-blue-500 transition-colors" />
              </div>
              <div className="col-span-1">
                <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1 block">Estado</label>
                <input type="text" value={kycForm.address.state} onChange={e => setKycForm({...kycForm, address: {...kycForm.address, state: e.target.value}})} className="w-full bg-slate-900/60 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-blue-500 transition-colors" />
              </div>
              <div className="col-span-1">
                <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1 block">CEP</label>
                <input type="text" value={kycForm.address.postalCode} onChange={e => setKycForm({...kycForm, address: {...kycForm.address, postalCode: e.target.value}})} className="w-full bg-slate-900/60 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-blue-500 transition-colors" />
              </div>
              <div className="col-span-1">
                <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1 block">País</label>
                <input type="text" value={kycForm.address.country} disabled className="w-full bg-slate-900/30 border border-slate-700/50 rounded-xl px-3 py-2 text-slate-400 text-sm outline-none cursor-not-allowed" />
              </div>
            </div>

            {isSimulating && efStatusLabel && (
              <div className="bg-blue-950/30 border border-blue-800/30 rounded-xl p-3 flex items-center gap-2 mt-4">
                <Loader2 className="w-4 h-4 text-blue-400 animate-spin flex-shrink-0" />
                <p className="text-xs text-blue-300 font-mono">{efStatusLabel}</p>
              </div>
            )}

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setPhase('etherfuse_preview')}
                disabled={isSimulating}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-white py-4 rounded-2xl font-bold transition-all disabled:opacity-50"
              >
                Voltar
              </button>
              <button
                onClick={handleSubmitKyc}
                disabled={isSimulating}
                className="flex-[2] bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white py-4 px-6 rounded-2xl font-bold transition-all shadow-[0_0_24px_rgba(37,99,235,0.25)] disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSimulating ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Enviar e Aprovar'}
              </button>
            </div>
          </div>
        )}

        {/* ── ETHERFUSE: KYC Pendente ──────────────────────────── */}
        {phase === 'etherfuse_kyc' && (
          <div className="flex flex-col items-center justify-center py-8 gap-5 animate-in fade-in">
             <div className="w-16 h-16 bg-blue-900/30 rounded-full flex items-center justify-center border border-blue-500/30">
                <Globe className="w-8 h-8 text-blue-400" />
             </div>
             <div className="text-center">
                <h3 className="text-lg font-bold text-white">Cadastro Obrigatório</h3>
                <p className="text-sm text-slate-400 mt-2 px-4 leading-relaxed">
                  Para investir em ativos do Tesouro na plataforma, é necessário completar seu cadastro e KYC na Etherfuse.
                </p>
             </div>
             <a
               href={efKycUrl}
               target="_blank"
               rel="noopener noreferrer"
               className="w-full mt-4 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white py-4 px-6 rounded-2xl font-bold transition-all shadow-[0_0_24px_rgba(37,99,235,0.25)]"
             >
               Finalizar KYC Etherfuse <ExternalLink className="w-4 h-4" />
             </a>
             <p className="text-xs text-slate-500 font-mono mt-2 animate-pulse">
                {efStatusLabel || 'Aguardando aprovação...'}
             </p>
             <button
               onClick={() => { setPhase('etherfuse_preview'); setEfStatusLabel(''); }}
               className="mt-2 w-full text-xs text-gray-600 hover:text-white transition-colors"
             >
               Voltar
             </button>
          </div>
        )}

        {/* ── ETHERFUSE: Tela Principal ──────────────────────────── */}
        {phase === 'etherfuse_preview' && (
          <div className="flex flex-col space-y-4 animate-in fade-in duration-300">

            {/* Header Institucional */}
            <div className="bg-gradient-to-br from-[#0F172A] via-[#0F172A] to-[#0a0f1e] rounded-2xl p-5 border border-slate-800 shadow-2xl relative overflow-hidden">
              <div className="absolute -top-6 -right-6 w-28 h-28 bg-blue-600/10 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-20 h-20 bg-indigo-500/5 rounded-full blur-xl pointer-events-none" />
              <div className="flex items-center gap-3 mb-3">
                <div className="w-11 h-11 bg-slate-900 rounded-xl flex items-center justify-center border border-slate-700">
                  <TrendingUp className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white tracking-tight">{EtherfuseAssetConfig.displayName}</h3>
                  <p className="text-[10px] text-blue-400 font-mono uppercase tracking-widest">{EtherfuseAssetConfig.assetCode} · Stellar Testnet · PIX Rail</p>
                </div>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Adquira <strong className="text-blue-300">TESOURO</strong> — título público federal tokenizado em Stellar via PIX. Custody direta na sua wallet.
              </p>

              {/* Valor */}
              <div className="mt-4 flex items-center gap-2">
                <span className="text-slate-500 text-sm font-semibold">R$</span>
                <input
                  type="number"
                  value={efAmount}
                  onChange={e => setEfAmount(e.target.value)}
                  className="flex-1 bg-slate-900/60 border border-slate-700 rounded-xl px-3 py-2 text-white text-lg font-bold outline-none focus:border-blue-500 transition-colors"
                  min="10"
                  step="10"
                />
                <span className="text-slate-500 text-sm">BRL</span>
              </div>
              {efQuote && (
                <p className="text-[10px] text-blue-300 font-mono mt-2">
                  ≈ {parseFloat(efQuote.destinationAmount).toFixed(7)} TESOURO · Taxa: R$ {parseFloat(efQuote.feeAmount).toFixed(2)}
                </p>
              )}
            </div>

            {/* Erro */}
            {trustlineResult && !trustlineResult.success && (
              <div className="bg-red-950/30 border border-red-800/40 rounded-xl p-3 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-300 font-mono">{trustlineResult.error}</p>
              </div>
            )}

            {/* Status label durante execução */}
            {isSimulating && efStatusLabel && (
              <div className="bg-blue-950/30 border border-blue-800/30 rounded-xl p-3 flex items-center gap-2">
                <Loader2 className="w-4 h-4 text-blue-400 animate-spin flex-shrink-0" />
                <p className="text-xs text-blue-300 font-mono">{efStatusLabel}</p>
              </div>
            )}

            {/* CTA Principal */}
            <button
              onClick={handleBuyTesouro}
              disabled={isSimulating || !efAmount || Number(efAmount) < 10}
              className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white py-4 px-6 rounded-2xl font-bold transition-all duration-300 disabled:opacity-50 shadow-[0_0_24px_rgba(37,99,235,0.25)]"
            >
              {isSimulating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Wallet className="w-5 h-5" />}
              {isSimulating ? efStatusLabel || 'Processando...' : `Comprar TESOURO · R$ ${efAmount}`}
            </button>

            <button
              onClick={() => { setPhase('provider_selection'); setTrustlineResult(null); setEfStatusLabel(''); }}
              className="w-full text-xs text-gray-600 hover:text-white transition-colors"
            >
              Voltar
            </button>
          </div>
        )}

        {/* ── ETHERFUSE: Settling (Polling) ─────────────────────── */}
        {phase === 'etherfuse_settling' && (
          <div className="flex flex-col items-center justify-center py-14 gap-5 animate-in fade-in">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-2 border-blue-500/30 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
              </div>
              <div className="absolute inset-0 rounded-full bg-blue-500/10 animate-ping" />
            </div>
            <div className="text-center">
              <p className="text-white font-bold text-base">Liquidando na Stellar...</p>
              <p className="text-xs text-slate-400 mt-1 font-mono">{efStatusLabel}</p>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-slate-600 font-mono">
              <ShieldCheck className="w-3 h-3" />
              TESOURO · Etherfuse · Stellar Testnet
            </div>
          </div>
        )}

        {/* ── ETHERFUSE: Done ───────────────────────────────────── */}
        {phase === 'etherfuse_done' && (
          <div className="flex flex-col items-center justify-center py-10 gap-4 animate-in zoom-in duration-300">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-600/20 to-indigo-600/20 rounded-full flex items-center justify-center border border-blue-500/30">
              <CheckCircle2 className="w-10 h-10 text-blue-400" />
            </div>
            <div className="text-center">
              <h3 className="text-xl font-bold text-white">Settlement Complete</h3>
              <p className="text-sm text-slate-400 mt-1">
                {efOrder?.amountInTokens ? (
                  <><strong className="text-blue-300">{parseFloat(efOrder.amountInTokens).toFixed(4)} TESOURO</strong> creditado na sua wallet</>
                ) : 'TESOURO creditado na sua wallet Stellar'}
              </p>
            </div>
            {efOrder?.confirmedTxSignature && (
              <a
                href={`https://stellar.expert/explorer/testnet/tx/${efOrder.confirmedTxSignature}`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 text-[10px] text-blue-400 font-mono bg-blue-950/30 px-4 py-2 rounded-xl border border-blue-800/40 hover:border-blue-500/50 transition-all"
              >
                <ExternalLink className="w-3 h-3" />
                Ver no Stellar Expert: {efOrder.confirmedTxSignature.substring(0, 12)}...
              </a>
            )}
            <div className="w-full grid grid-cols-3 gap-2 mt-2">
              {['Trustline Active', 'Treasury Funded', 'Settlement Complete'].map((s, i) => (
                <div key={i} className="flex flex-col items-center gap-1 p-2 bg-blue-950/20 rounded-xl border border-blue-900/30">
                  <CheckCircle2 className="w-4 h-4 text-blue-400" />
                  <p className="text-[9px] text-blue-300 text-center font-mono">{s}</p>
                </div>
              ))}
            </div>
            <button onClick={onClose} className="w-full bg-blue-700 hover:bg-blue-600 text-white py-3 rounded-2xl font-bold transition-all">
              Fechar
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
