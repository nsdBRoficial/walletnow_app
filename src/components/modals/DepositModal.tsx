/**
 * @module src/components/modals/DepositModal.tsx
 * @description Modal interativo React (DepositModal) para jornada financeira do usuário com estados de validação, confirmação e feedback on-chain (exporta: DepositModal).
 */
import { X, Copy, QrCode, CheckCircle2, Loader2, Zap, ExternalLink, CreditCard, Globe, ChevronRight, ShieldCheck, AlertCircle, TrendingUp, Wallet, RefreshCw } from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useWallet } from '../../contexts/WalletContext';
import { PaymentService } from '../../services/paymentService';
import { WalletFactory } from '../../services/walletFactory';
import { WooviService } from '../../services/wooviService';
import { availableProviders, IDepositProvider } from '../../services/providers';
import { logger } from '../../utils/logger';
import { DemoConfig } from '../../config/demoMode';
import { EtherfuseTrustlineService, TrustlineResult } from '../../services/providers/etherfuse/etherfuseTrustlineService';
import { EtherfuseAssetConfig } from '../../services/providers/etherfuse/etherfuseAssetConfig';
import { EtherfuseOnRampService, EtherfuseQuoteResult, EtherfuseOrderResult, SANDBOX_CONTAMINATION_ERROR, PROXY_ACCOUNT_NOT_PROVISIONED_ERROR } from '../../services/providers/etherfuse/etherfuseOnRampService';
import { StellarTestAnchorService } from '../../services/providers/stellarTestAnchor/stellarTestAnchorService';
import { EtherfuseV2ApiService, EfV2HttpError } from '../../services/providers/etherfuseV2/etherfuseV2ApiService';
import { EtherfusePersistenceService } from '../../services/providers/etherfuseV2/etherfusePersistenceService';
import { EtherfuseActivityService } from '../../services/providers/etherfuseV2/etherfuseActivityService';
import type { EfV2QuoteResult, EfV2OrderResult } from '../../services/providers/etherfuseV2/etherfuseV2Types';
import { PriceOracleService, type XlmPriceResult } from '../../services/priceOracleService';
import { StellarNetwork } from '../../config/stellarNetwork';


// Define quais propriedades (props) este componente espera receber.
interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function DepositModal({ isOpen, onClose, onSuccess, initialProvider }: DepositModalProps) {
  const { profile } = useAuth();
  const { activeAccount, refreshAccounts } = useWallet();
  // Phases do experimento KYC-First (fluxo hospedado Etherfuse)
  const [phase, setPhase] = useState<
    | 'provider_selection'
    // ── Etherfuse V1 (KYC hospedado — intacto) ────────────────────────────────
    | 'etherfuse_preview'
    | 'etherfuse_customer_creation'
    | 'etherfuse_kyc_form'
    | 'etherfuse_kyc_polling'
    | 'etherfuse_financial_onboarding'
    | 'etherfuse_quote'
    | 'etherfuse_order'
    | 'etherfuse_settling'
    | 'etherfuse_done'
    // ── Etherfuse V2 (KYC programático — fluxo validado) ─────────────────────
    | 'ef2_preview'
    | 'ef2_trustline'
    | 'ef2_customer_creation'
    | 'ef2_kyc_submitting'
    | 'ef2_kyc_polling'
    | 'ef2_pix_registration'
    | 'ef2_quote'
    | 'ef2_order'
    | 'ef2_settling'
    | 'ef2_done'
    | 'ef2_error'
    // ── Defindex ─────────────────────────────────────────────────────────────
    | 'defindex_vault_selection'
    | 'defindex_input'
    | 'defindex_submitting'
    | 'defindex_done'
    // ── Woovi / BRW ───────────────────────────────────────────────────────────
    | 'input'
    | 'generating'
    | 'waiting_payment'
    | 'minting'
    | 'success'
  >('provider_selection');
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
  const [efKycUrl, setEfKycUrl] = useState('');
  
  // Defindex states
  const [defindexAmount, setDefindexAmount] = useState('10'); // Default to 10 XLM
  const [defindexVaultId, setDefindexVaultId] = useState('CCLV4H7WTLJQ7ATLHBBQV2WW3OINF3FOY5XZ7VPHZO7NH3D2ZS4GFSF6'); // XLM Testnet Vault
  const [defindexVaultAsset, setDefindexVaultAsset] = useState('XLM');
  const [defindexTxHash, setDefindexTxHash] = useState<string | null>(null);

  // ── Estados do Etherfuse V2 (fluxo programático) ───────────────────────────
  const [ef2Amount, setEf2Amount] = useState('50');
  const [ef2StatusLabel, setEf2StatusLabel] = useState('');
  const [ef2Quote, setEf2Quote] = useState<EfV2QuoteResult | null>(null);
  const [ef2Order, setEf2Order] = useState<EfV2OrderResult | null>(null);
  const [ef2CustomerId, setEf2CustomerId] = useState('');
  const [ef2ErrorMsg, setEf2ErrorMsg] = useState('');
  // EXPERIMENTO: sem efInitialBankAccountId — sem fallback de UUID fake

  // Dados Inputados e Retornados
  const [amount, setAmount] = useState('');
  /**
   * pixData.amount      = valor em BRL (usado pelo Woovi/BRW em 1:1)
   * pixData.quotedXlmAmount = valor em XLM calculado via oráculo NO momento da geração
   *                           (usado pelo TestAnchor para settlement real)
   * Separação explícita evita o bug brlAmount → XLM amount.
   */
  const [pixData, setPixData] = useState<{
    brCode: string;
    correlationID: string;
    amount: number;          // BRL — para Woovi/BRW (1:1)
    quotedXlmAmount: number; // XLM — para TestAnchor (via oráculo)
    xlmSource: string;       // Fonte do oráculo (para log QA)
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [ef2TxHash, setEf2TxHash] = useState<string | null>(null);

  // ── Cotação XLM/BRL (PriceOracleService) ─────────────────────────────────
  const [xlmPrice, setXlmPrice] = useState<XlmPriceResult | null>(null);
  const [xlmPriceLoading, setXlmPriceLoading] = useState(false);
  const [xlmPriceError, setXlmPriceError] = useState(false);
  const xlmDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      // Reset V2
      setEf2Quote(null);
      setEf2Order(null);
      setEf2StatusLabel('');
      setEf2CustomerId('');
      setEf2ErrorMsg('');
      setEf2TxHash(null);
      // Reset cotação
      setXlmPrice(null);
      setXlmPriceError(false);
    }
  }, [isOpen]);

  /**
   * Busca cotação XLM/BRL via PriceOracleService com debounce de 400ms.
   * Só executa quando o provider selecionado é o stellar_testanchor
   * e o usuário está na fase 'input' com um valor válido.
   * Não faz flood: o cache interno do PriceOracleService garante 20s entre requests reais.
   */
  const fetchXlmQuote = useCallback(async () => {
    if (selectedProvider?.id !== 'stellar_testanchor') return;
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      setXlmPrice(null);
      setXlmPriceError(false);
      return;
    }
    setXlmPriceLoading(true);
    setXlmPriceError(false);
    try {
      const result = await PriceOracleService.getXlmBrlPrice();
      setXlmPrice(result);
    } catch {
      setXlmPriceError(true);
      setXlmPrice(null);
    } finally {
      setXlmPriceLoading(false);
    }
  }, [selectedProvider?.id, amount]);

  // Debounce: espera 400ms após o usuário parar de digitar antes de buscar cotação
  useEffect(() => {
    if (phase !== 'input' || selectedProvider?.id !== 'stellar_testanchor') return;
    if (xlmDebounceRef.current) clearTimeout(xlmDebounceRef.current);
    xlmDebounceRef.current = setTimeout(() => {
      fetchXlmQuote();
    }, 400);
    return () => {
      if (xlmDebounceRef.current) clearTimeout(xlmDebounceRef.current);
    };
  }, [amount, phase, selectedProvider?.id, fetchXlmQuote]);

  /**
   * [Experiment] FASE 1: Trustline + registerCustomer via onboarding-url.
   * 409 → ABORTAR com mensagem SANDBOX_CONTAMINATION.
   * Não chama quote, bankAccounts nem createOrder — apenas registra e exibe link KYC hospedado.
   */
  const handleStartEtherfuse = async () => {
    if (!activeAccount?.stellar_public_key || !profile?.id) return;
    setIsSimulating(true);
    setEfStatusLabel('Verificando Trustline...');
    logger.info('[WalletNow][Experiment]', 'Phase: etherfuse_customer_creation', {
      timestamp: new Date().toISOString(),
      phase: 'etherfuse_customer_creation',
      publicKey: activeAccount.stellar_public_key.substring(0, 12) + '...',
    });
    try {
      const secretKey = WalletFactory.getSecretKey(profile.id);
      if (!secretKey) {
        setTrustlineResult({ success: false, error: 'Secret key não encontrada.' });
        return;
      }
      const tr = await EtherfuseTrustlineService.createTrustline(activeAccount.stellar_public_key, secretKey);
      setTrustlineResult(tr);
      if (!tr.success) return;

      setEfStatusLabel('Registrando na Etherfuse...');
      const cust = await EtherfuseOnRampService.registerCustomer(activeAccount.stellar_public_key);
      setEfCustomerId(cust.customerId);
      setEfKycUrl(cust.kycUrl);

      logger.info('[WalletNow][Experiment]', 'Phase: etherfuse_kyc_form', {
        timestamp: new Date().toISOString(),
        phase: 'etherfuse_kyc_form',
        customerId: cust.customerId,
        hasKycUrl: !!cust.kycUrl,
      });
      setEfStatusLabel('Abra o link Etherfuse para completar KYC e cadastro bancário.');
      setPhase('etherfuse_kyc_form');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.startsWith(SANDBOX_CONTAMINATION_ERROR)) {
        logger.error('[WalletNow][Experiment]', '⛔ SANDBOX_CONTAMINATION', {
          timestamp: new Date().toISOString(),
          phase: 'etherfuse_customer_creation_409',
        });
        setEfStatusLabel(`⛔ ${msg}`);
      } else {
        logger.error('[WalletNow][Experiment]', 'Erro em handleStartEtherfuse', {
          timestamp: new Date().toISOString(),
          error: msg,
        });
        setEfStatusLabel(`❌ ${msg}`);
      }
    } finally {
      setIsSimulating(false);
    }
  };

  /**
   * [Experiment] FASE 2: Onboarding financeiro — só chamado após kycStatus = approved.
   * getFiatAccounts → quote → createOrder → simulate → settle.
   * REGRA: sem fallback UUID — se getFiatAccounts retornar [], abortar com PROXY_ACCOUNT_NOT_PROVISIONED.
   */
  const handleFinancialOnboarding = async () => {
    if (!activeAccount?.stellar_public_key || !efCustomerId) return;
    setIsSimulating(true);
    logger.info('[WalletNow][Experiment]', 'Phase: etherfuse_financial_onboarding', {
      timestamp: new Date().toISOString(),
      phase: 'etherfuse_financial_onboarding',
      customerId: efCustomerId,
    });
    try {
      setPhase('etherfuse_financial_onboarding');
      setEfStatusLabel('Buscando conta bancária real...');
      const accounts = await EtherfuseOnRampService.getFiatAccounts(efCustomerId);
      const realBankAccountId = accounts[0].bankAccountId;
      setEfBankAccountId(realBankAccountId);

      setPhase('etherfuse_quote');
      setEfStatusLabel('Obtendo cotação BRL → TESOURO...');
      const quote = await EtherfuseOnRampService.getQuote(efCustomerId, activeAccount.stellar_public_key, efAmount);
      setEfQuote(quote);

      setPhase('etherfuse_order');
      setEfStatusLabel('Criando ordem de compra...');
      const order = await EtherfuseOnRampService.createOrder(
        efCustomerId, realBankAccountId, quote.quoteId, activeAccount.stellar_public_key
      );
      setEfOrder(order);

      setEfStatusLabel('⚡ Sandbox: Simulando pagamento PIX...');
      await EtherfuseOnRampService.simulateFiatReceived(order.orderId);

      setPhase('etherfuse_settling');
      const final = await EtherfuseOnRampService.pollUntilCompleted(
        order.orderId,
        (s) => setEfStatusLabel(`Status: ${s}`),
        90_000
      );
      if (final) setEfOrder(final);
      setPhase('etherfuse_done');
      if (onSuccess) setTimeout(onSuccess, 1500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.startsWith(PROXY_ACCOUNT_NOT_PROVISIONED_ERROR)) {
        logger.error('[WalletNow][Experiment]', '⛔ PROXY_ACCOUNT_NOT_PROVISIONED', {
          timestamp: new Date().toISOString(),
          phase: 'etherfuse_financial_onboarding_empty',
          customerId: efCustomerId,
          hypothesis: 'Fluxo hospedado Etherfuse não completado — proxy account não provisionado',
        });
      } else {
        logger.error('[WalletNow][Experiment]', 'Erro em handleFinancialOnboarding', {
          timestamp: new Date().toISOString(),
          error: msg,
        });
      }
      setEfStatusLabel(`❌ ${msg}`);
      setPhase('etherfuse_kyc_polling');
    } finally {
      setIsSimulating(false);
    }
  };

  /**
   * [EtherfuseV2] Handler principal do fluxo programático validado.
   *
   * Fluxo end-to-end (sandbox):
   *   1. Trustline TESOURO (reutiliza EtherfuseTrustlineService v1)
   *   2. createCustomer → obtém customerId + bankAccountId diretamente
   *   3. KYC programático (identity + documentos mock + acordos)
   *   4. Polling KYC até approved (sandbox auto-aprova)
   *   5. Registro conta PIX com CPF mock
   *   6. Cotação BRL → TESOURO
   *   7. Criar ordem on-ramp com bankAccountId real
   *   8. Simular PIX recebido (sandbox)
   *   9. Polling até completed
   *
   * SANDBOX-ONLY: CPF mock, identidade mock, simulateFiatReceived.
   * V1 (phases etherfuse_*) permanece INTACTO — não é tocado aqui.
   */
  const handleStartEtherfuseV2 = async () => {
    if (!activeAccount?.stellar_public_key || !profile?.id) return;

    const LOG_TAG = '[WalletNow][EtherfuseV2]';

    try {
      // ── PASSO 1: Trustline TESOURO ──────────────────────────────────────────
      setPhase('ef2_trustline');
      setEf2StatusLabel('Verificando trustline TESOURO...');
      logger.info(LOG_TAG, 'Iniciando fluxo programático V2', {
        timestamp: new Date().toISOString(),
        publicKey: activeAccount.stellar_public_key.substring(0, 12) + '...',
      });

      const secretKey = WalletFactory.getSecretKey(profile.id);
      if (!secretKey) {
        throw new Error('Secret key não encontrada. Verifique sua wallet.');
      }

      const tr = await EtherfuseTrustlineService.createTrustline(activeAccount.stellar_public_key, secretKey);
      if (!tr.success) {
        throw new Error(tr.error || 'Falha ao criar trustline TESOURO.');
      }
      logger.info(LOG_TAG, '✅ Trustline OK.', { alreadyExists: tr.alreadyExists });

      // Usa email baseado no profile ou fallback para sandbox
      const email = (profile as Record<string, unknown>).email as string | undefined
        || `sandbox-${profile.id.substring(0, 8)}@walletnow.app`;

      // ── VERIFICAÇíO DE PERSISTÊNCIA ─────────────────────────────────────────
      let activeCustomerId = '';
      let activeBankAccountId = '';
      let skipOnboarding = false;

      const cachedCustomer = EtherfusePersistenceService.getCustomer(activeAccount.stellar_public_key);
      if (cachedCustomer) {
        setPhase('ef2_customer_creation');
        setEf2StatusLabel('Validando identidade existente...');
        try {
          const kycStatus = await EtherfuseV2ApiService.getKycStatus(cachedCustomer.customerId, activeAccount.stellar_public_key);
          if (kycStatus.status === 'approved') {
            logger.info(LOG_TAG, 'Existing customer detected', { customerId: cachedCustomer.customerId });
            logger.info(LOG_TAG, 'Skipping onboarding');
            logger.info(LOG_TAG, 'Reusing customerId');
            activeCustomerId = cachedCustomer.customerId;
            activeBankAccountId = cachedCustomer.bankAccountId;
            setEf2CustomerId(activeCustomerId);
            skipOnboarding = true;
          } else {
            logger.warn(LOG_TAG, 'Cached KYC not approved, restarting onboarding.', { status: kycStatus.status });
            EtherfusePersistenceService.clearCustomer(activeAccount.stellar_public_key);
          }
        } catch (e) {
          logger.warn(LOG_TAG, 'Failed to validate cached customer, restarting onboarding.', { error: String(e) });
          EtherfusePersistenceService.clearCustomer(activeAccount.stellar_public_key);
        }
      }

      // ── PASSO 2 ao 5: ONBOARDING NOVO ───────────────────────────────────────
      if (!skipOnboarding) {
        setPhase('ef2_customer_creation');
        setEf2StatusLabel('Registrando na Etherfuse...');

        try {
          const customer = await EtherfuseV2ApiService.createCustomer(
            email,
            activeAccount.stellar_public_key,
            'BR',
          );
          activeCustomerId = customer.id;
          activeBankAccountId = customer.bankAccountId;
          setEf2CustomerId(activeCustomerId);
          
          logger.info(LOG_TAG, '✅ Customer criado.', {
            customerId: activeCustomerId,
            hasBankAccountId: !!activeBankAccountId,
          });

          // Salvar localmente
          EtherfusePersistenceService.saveCustomer(activeAccount.stellar_public_key, activeCustomerId, activeBankAccountId);

          // PASSO 3: KYC Programático
          setPhase('ef2_kyc_submitting');
          setEf2StatusLabel('Submetendo identidade KYC (mock)...');
          await EtherfuseV2ApiService.submitKycIdentity(activeCustomerId, activeAccount.stellar_public_key);

          setEf2StatusLabel('Submetendo documentos KYC (mock)...');
          await EtherfuseV2ApiService.submitKycDocuments(activeCustomerId, activeAccount.stellar_public_key);

          setEf2StatusLabel('Aceitando Acordos V2...');
          await EtherfuseV2ApiService.acceptAgreements(customer.presignedUrl, customer.id);

          // PASSO 4: Polling KYC
          setPhase('ef2_kyc_polling');
          setEf2StatusLabel('Aguardando aprovação do sandbox...');
          await EtherfuseV2ApiService.pollKycUntilApproved(
            activeCustomerId,
            activeAccount.stellar_public_key,
            (status) => setEf2StatusLabel(`KYC: ${status}`),
            60_000,
          );
          setEf2StatusLabel('✅ KYC aprovado! Registrando conta PIX...');

          // PASSO 5: Registrar Conta PIX
          setPhase('ef2_pix_registration');
          setEf2StatusLabel('Registrando chave PIX (CPF mock)...');
          const registeredBankId = await EtherfuseV2ApiService.registerPixAccount(customer.presignedUrl);
          if (registeredBankId) {
            activeBankAccountId = registeredBankId;
            logger.info(LOG_TAG, '✅ Conta PIX registrada com ID:', activeBankAccountId);
          } else {
            logger.info(LOG_TAG, '✅ Conta PIX registrada (sem ID explícito retornado).');
          }
          
        } catch (error: any) {
          if (error instanceof EfV2HttpError && error.status === 409) {
            setPhase('error');
            setEf2StatusLabel('Conta já registrada!');
            throw new Error('Você já iniciou um cadastro na Etherfuse com esta carteira (Erro 409). Como o cache local não foi encontrado, a transação não pôde ser continuada. Limpe o cache na plataforma da Etherfuse ou contate o suporte.');
          }
          throw error;
        }
      }

      // ── PASSO 6: Cotação BRL → TESOURO ─────────────────────────────────────
      setPhase('ef2_quote');
      setEf2StatusLabel('Obtendo cotação BRL → TESOURO...');
      const quote = await EtherfuseV2ApiService.getQuote(
        activeCustomerId,
        activeAccount.stellar_public_key,
        ef2Amount,
      );
      setEf2Quote(quote);
      logger.info(LOG_TAG, '✅ Cotação obtida.', {
        sourceAmount: quote.sourceAmount,
        destinationAmount: quote.destinationAmount,
      });

      // ── PASSO 7: Criar Ordem On-Ramp ───────────────────────────────────────
      setPhase('ef2_order');
      setEf2StatusLabel('Criando ordem de compra...');
      const order = await EtherfuseV2ApiService.createOnRampOrder(
        activeCustomerId,
        activeBankAccountId, // Agora usa o ID retornado pelo registerPixAccount se aplicável
        quote.quoteId,
        activeAccount.stellar_public_key,
      );
      setEf2Order(order);
      logger.info(LOG_TAG, '✅ Ordem criada.', { orderId: order.orderId });

      // ── PASSO 8: Simular PIX (sandbox) ─────────────────────────────────────
      setEf2StatusLabel('⚡ Sandbox: Simulando pagamento PIX...');
      await EtherfuseV2ApiService.simulateFiatReceived(order.orderId);

      // ── PASSO 9: Polling até completed ─────────────────────────────────────
      setPhase('ef2_settling');
      const finalOrder = await EtherfuseV2ApiService.pollUntilCompleted(
        order.orderId,
        (s) => setEf2StatusLabel(`Status: ${s}`),
        90_000,
      );

      if (finalOrder) setEf2Order(finalOrder);
      
      setEf2StatusLabel('Buscando hash de liquidação on-chain...');
      let hashToUse = finalOrder?.confirmedTxSignature || order.confirmedTxSignature || null;
      if (!hashToUse) {
        const fallbackTx = await EtherfuseActivityService.findLatestTesouroTransaction(activeAccount.stellar_public_key);
        if (fallbackTx) {
          hashToUse = fallbackTx.txHash;
        }
      }
      setEf2TxHash(hashToUse);

      EtherfuseActivityService.saveActivity(activeAccount.stellar_public_key, {
        orderId: order.orderId,
        txHash: hashToUse || 'Pendente',
        explorerUrl: hashToUse ? StellarNetwork.getTxExplorerUrl(hashToUse) : '',
        asset: 'TESOURO',
        amountBRL: quote.sourceAmount,
        amountToken: quote.destinationAmount,
        status: finalOrder?.status || order.status,
        createdAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        type: 'BUY TESOURO',
      });

      setPhase('ef2_done');

      logger.info(LOG_TAG, '🎉 Fluxo V2 concluído com sucesso!', {
        timestamp: new Date().toISOString(),
        orderId: order.orderId,
        amountInTokens: finalOrder?.amountInTokens,
        txSignature: hashToUse,
      });

      if (onSuccess) setTimeout(onSuccess, 1500);
      refreshAccounts().catch(e => logger.error(LOG_TAG, 'Erro ao fazer refresh:', e));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error(LOG_TAG, '❌ Erro no fluxo V2', {
        timestamp: new Date().toISOString(),
        error: msg,
      });
      setEf2ErrorMsg(msg);
      setPhase('ef2_error');
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

  // [Experiment] Polling automático KYC — fase etherfuse_kyc_polling
  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;

    if (isOpen && phase === 'etherfuse_kyc_polling' && efCustomerId && activeAccount?.stellar_public_key) {
      timer = setInterval(async () => {
        try {
          const statusResult = await EtherfuseOnRampService.getKycStatus(efCustomerId, activeAccount.stellar_public_key);
          logger.info('[WalletNow][Experiment]', `[Polling] KYC status: ${statusResult.status}`, {
            timestamp: new Date().toISOString(),
            phase: 'etherfuse_kyc_polling',
            customerId: efCustomerId,
            kycStatus: statusResult.status,
          });

          if (statusResult.status === 'approved' || statusResult.status === 'approved_chain_deploying') {
            clearInterval(timer);
            setEfStatusLabel('✅ KYC Aprovado! Iniciando onboarding financeiro...');
            logger.info('[WalletNow][Experiment]', 'KYC approved — disparando handleFinancialOnboarding', {
              timestamp: new Date().toISOString(),
              customerId: efCustomerId,
              kycStatus: statusResult.status,
            });
            handleFinancialOnboarding();
          } else if (statusResult.status === 'rejected') {
            clearInterval(timer);
            logger.error('[WalletNow][Experiment]', 'KYC Rejeitado', {
              timestamp: new Date().toISOString(),
              customerId: efCustomerId,
              reason: statusResult.currentRejectionReason,
            });
            setEfStatusLabel(`❌ KYC Rejeitado: ${statusResult.currentRejectionReason || 'motivo não informado'}`);
          } else {
            setEfStatusLabel(
              statusResult.status === 'not_started'
                ? 'Aguardando início do KYC no link Etherfuse...'
                : 'Aguardando aprovação do KYC...'
            );
          }
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e);
          logger.error('[WalletNow][Experiment]', 'Erro no polling KYC', {
            timestamp: new Date().toISOString(),
            error: msg,
          });
        }
      }, 5000);
    }

    return () => clearInterval(timer);
    
  }, [isOpen, phase, efCustomerId, activeAccount?.stellar_public_key]);

  // Se o modal não estiver aberto (isOpen === false), não renderiza nada na tela.
  // MAS os hooks devem ficar acima disto.
  if (!isOpen) return null;

  /**
   * triggerMinting — Orquestra o settlement on-chain após confirmação do PIX.
   *
   * IMPORTANTE (bug fix):
   *   - Para stellar_testanchor: usa pixData.quotedXlmAmount (XLM real via oráculo)
   *   - Para Woovi/BRW:         usa depositAmount (BRL em 1:1 → BRW)
   *   - Os dois valores são DISTINTOS e não devem ser trocados.
   *
   * @param depositAmount   Valor em BRL cobrado no PIX (Woovi) — NíO usar para XLM.
   * @param correlationID   ID da cobrança Woovi para Memo X402.
   */
  const triggerMinting = async (depositAmount: number, correlationID: string) => {
    if (!activeAccount?.stellar_public_key || !profile?.id) return;

    setPhase('minting');

    try {
      const userSecret = WalletFactory.getSecretKey(profile.id);

      // ── Despacho por Provider ────────────────────────────────────────────
      if (selectedProvider?.id === 'stellar_testanchor') {
        // ── TestAnchor: settlement real de XLM via treasury ─────────────
        //
        // BUG CORRIGIDO: O valor enviado para settleXLM DEVE ser o quotedXlmAmount
        // (calculado em BRL/XLM via oráculo no momento da geração do PIX),
        // NíO o depositAmount (que é BRL e causava entrega de 100 XLM para R$100).
        //
        const quotedXlmAmount = pixData?.quotedXlmAmount;
        if (!quotedXlmAmount || quotedXlmAmount <= 0) {
          throw new Error(
            'Cotação XLM não disponível. Reinicie o depósito para obter um novo quote.'
          );
        }

        if (!import.meta.env.VITE_STELLAR_TREASURY_SECRET) {
          throw new Error(
            'Treasury wallet não configurada. Adicione VITE_STELLAR_TREASURY_SECRET ao .env'
          );
        }

        // ── [QA LOG] Final Settlement ──────────────────────────────────
        logger.info('[DepositFlow]', 'Final Settlement — valores unificados', {
          brlInput: depositAmount,
          oracleQuote: quotedXlmAmount.toFixed(7),
          deliveredAmount: `${quotedXlmAmount.toFixed(7)} XLM`,
          xlmSource: pixData?.xlmSource || 'N/A',
          correlationID,
          check: depositAmount === quotedXlmAmount
            ? '⚠️ BRL == XLM (possível bug de passagem)'
            : '✅ BRL != XLM (separação correta)',
        });

        logger.info('[WalletNow][Settlement]',
          `🚀 Iniciando settlement XLM | R$${depositAmount} BRL → ${quotedXlmAmount.toFixed(7)} XLM`,
          { correlationID, quotedXlmAmount }
        );

        const result = await StellarTestAnchorService.settleXLM(
          activeAccount.stellar_public_key,
          quotedXlmAmount.toFixed(7), // ← XLM real (oráculo), não BRL
          correlationID
        );

        if (!result.success || !result.txHash) {
          throw new Error(result.error || 'Settlement XLM falhou sem hash.');
        }

        setTxHash(result.txHash);

        // ── [QA LOG] Delivered Amount ──────────────────────────────────
        logger.info('[DepositFlow]', 'Delivered Amount confirmado', {
          deliveredXlm: quotedXlmAmount.toFixed(7),
          txHash: result.txHash,
          ledger: result.ledger,
          brlPaid: depositAmount,
          consistent: true,
        });

        logger.info('[WalletNow][Settlement]',
          `✅ Settlement XLM concluído! ${quotedXlmAmount.toFixed(7)} XLM → Hash: ${result.txHash}`
        );

      } else {
        // ── Woovi / BRW: Mint do token interno (fluxo original — intocado) ──
        // BRW é 1:1 com BRL, então depositAmount (BRL) == BRW correto.
        const hash = await PaymentService.mintBRW(
          activeAccount.stellar_public_key,
          depositAmount.toString(), // BRL → BRW (1:1, correto)
          userSecret || undefined,
          correlationID
        );

        if (hash) {
          setTxHash(hash);
          logger.info('[WalletNow][Blockchain]',
            `✅ Depósito Liquidado via PIX com sucesso! ${depositAmount} BRW | Hash: ${hash}`
          );
        }
      }

      setPhase('success');
      if (onSuccess) onSuccess();

      // Fechamento automático: 3 segundos
      setTimeout(() => {
        onClose();
      }, 3000);
    } catch (e: any) {
      const isTestAnchor = selectedProvider?.id === 'stellar_testanchor';
      logger.error('[WalletNow][Settlement]',
        `❌ Falha crítica no settlement (${isTestAnchor ? 'XLM Nativo' : 'BRW Mint'})`, e
      );
      alert(`⚠️ PIX Recebido, mas falha no settlement: ${e.message}`);
      setPhase('input');
    }
  };

  const handleGeneratePix = async () => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0 || !profile?.id) return;

    setPhase('generating');

    try {
      const brlAmount = Number(amount);

      // ── [QA LOG] Início do fluxo de depósito ────────────────────────────
      logger.info('[DepositFlow]', 'BRL Input recebido', {
        brlAmount,
        provider: selectedProvider?.id,
        timestamp: new Date().toISOString(),
      });

      // ── Consulta oráculo ANTES de gerar o PIX (para fixar o quote) ──────
      // Apenas para o TestAnchor (XLM settlement real).
      // Para Woovi/BRW o ratio é 1:1 BRL→BRW, sem conversão.
      let quotedXlmAmount = brlAmount; // fallback neutro (nunca usado para XLM sem override abaixo)
      let xlmSource = 'N/A';

      if (selectedProvider?.id === 'stellar_testanchor') {
        try {
          // Busca cotação no momento exato da geração — fixa o quote para o settlement
          const priceData = await PriceOracleService.getXlmBrlPrice();
          quotedXlmAmount = brlAmount / priceData.xlm_brl;
          xlmSource = priceData.source;

          // ── [QA LOG] Oracle Quote ────────────────────────────────────────
          logger.info('[DepositFlow]', 'Oracle Quote calculado', {
            brlAmount,
            xlmBrlRate: priceData.xlm_brl,
            quotedXlmAmount: quotedXlmAmount.toFixed(7),
            source: priceData.source,
            updatedAt: priceData.updated_at,
            fromCache: priceData.from_cache,
          });
        } catch (oracleError) {
          // Se o oráculo falhar após retry, usa o xlmPrice do estado (já buscado pelo debounce)
          if (xlmPrice && xlmPrice.xlm_brl > 0) {
            quotedXlmAmount = brlAmount / xlmPrice.xlm_brl;
            xlmSource = `${xlmPrice.source} (state cache)`;
            logger.warn('[DepositFlow]', 'Oráculo falhou no handleGeneratePix, usando state cache', {
              brlAmount,
              quotedXlmAmount: quotedXlmAmount.toFixed(7),
              source: xlmSource,
            });
          } else {
            // Fallback estático conservador — nunca deve chegar aqui com o sistema normal
            const STATIC_RATE = 0.80;
            quotedXlmAmount = brlAmount / STATIC_RATE;
            xlmSource = 'fallback estático (0.80 BRL/XLM)';
            logger.error('[DepositFlow]', '⚠️ Oráculo completamente indisponível — usando fallback estático', {
              brlAmount,
              quotedXlmAmount: quotedXlmAmount.toFixed(7),
            });
          }
        }
      }

      // 1. Chama o Gateway Woovi para gerar a cobrança Pix (QR Code EMV)
      const result = await WooviService.createCharge(brlAmount, profile.id);

      // ── [QA LOG] PIX Gerado ──────────────────────────────────────────────
      logger.info('[DepositFlow]', 'PIX gerado com sucesso', {
        correlationID: result.correlationID,
        brlCharged: result.amount,
        quotedXlmAmount: quotedXlmAmount.toFixed(7),
        xlmSource,
        settlementAsset: selectedProvider?.id === 'stellar_testanchor' ? 'XLM' : 'BRW',
      });

      setPixData({
        brCode: result.brCode,
        correlationID: result.correlationID,
        amount: result.amount,          // BRL — Woovi/BRW settlement (1:1)
        quotedXlmAmount,                // XLM — TestAnchor settlement (via oráculo)
        xlmSource,
      });
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
                  case 'TrendingUp': return <TrendingUp className="w-5 h-5" />;
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
                      } else if (provider.id === 'etherfuse_v2') {
                        setPhase('ef2_preview');
                      } else if (provider.id === 'defindex') {
                        setPhase('defindex_vault_selection');
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
        {/* ── EXPERIMENT: Fase loading — customer creation ─────────── */}
        {phase === 'etherfuse_customer_creation' && (
          <div className="flex flex-col items-center justify-center py-14 gap-5 animate-in fade-in">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-2 border-blue-500/30 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
              </div>
              <div className="absolute inset-0 rounded-full bg-blue-500/10 animate-ping" />
            </div>
            <p className="text-white font-bold text-base">Registrando na Etherfuse...</p>
            <p className="text-xs text-slate-400 font-mono">{efStatusLabel}</p>
          </div>
        )}

        {/* ── EXPERIMENT: etherfuse_kyc_form — Fluxo Hospedado Etherfuse ── */}
        {phase === 'etherfuse_kyc_form' && (
          <div className="flex flex-col space-y-5 animate-in fade-in duration-300">
            <div className="flex flex-col items-center justify-center pt-2 pb-4 border-b border-white/5 gap-3">
              <div className="w-14 h-14 bg-blue-900/30 rounded-full flex items-center justify-center border border-blue-500/30">
                <ShieldCheck className="w-7 h-7 text-blue-400" />
              </div>
              <div className="text-center">
                <h3 className="text-lg font-bold text-white">Verificação de Identidade</h3>
                <p className="text-xs text-slate-400 mt-1 px-4 leading-relaxed">
                  Complete seu KYC e cadastro bancário PIX no portal Etherfuse.
                  <br />
                  <strong className="text-blue-300">O banco de dados da proxy account é provisionado lá.</strong>
                </p>
              </div>
              <div className="px-3 py-1 bg-amber-500/10 border border-amber-500/30 rounded-full">
                <span className="text-[10px] text-amber-400 font-mono font-bold tracking-widest uppercase">[Experiment] Fluxo Hospedado — KYC-First</span>
              </div>
            </div>

            <div className="bg-slate-900/60 border border-blue-800/30 rounded-2xl p-4 space-y-3">
              <p className="text-[11px] text-slate-400 font-mono leading-relaxed">
                1. Abra o link Etherfuse abaixo<br />
                2. Complete KYC + cadastro da conta PIX<br />
                3. Retorne aqui e clique em <strong className="text-blue-300">"Já completei o KYC"</strong>
              </p>
              {efKycUrl ? (
                <a
                  href={efKycUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white py-3 px-5 rounded-xl font-bold transition-all shadow-[0_0_24px_rgba(37,99,235,0.2)] text-sm"
                >
                  <Globe className="w-4 h-4" />
                  Abrir Etherfuse KYC Portal <ExternalLink className="w-3.5 h-3.5" />
                </a>
              ) : (
                <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
                  <AlertCircle className="w-4 h-4 text-amber-400" />
                  URL de onboarding não disponível
                </div>
              )}
            </div>

            {efStatusLabel && (
              <div className="bg-blue-950/20 border border-blue-800/20 rounded-xl p-3 flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin flex-shrink-0" />
                <p className="text-xs text-blue-300 font-mono">{efStatusLabel}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => { setPhase('etherfuse_preview'); setEfStatusLabel(''); }}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-2xl font-bold transition-all text-sm"
              >
                Voltar
              </button>
              <button
                onClick={() => setPhase('etherfuse_kyc_polling')}
                className="flex-[2] bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white py-3 px-5 rounded-2xl font-bold transition-all shadow-[0_0_20px_rgba(37,99,235,0.2)] text-sm flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                Já completei o KYC
              </button>
            </div>
          </div>
        )}

        {/* ── EXPERIMENT: etherfuse_kyc_polling — Aguardando aprovação ─── */}
        {phase === 'etherfuse_kyc_polling' && (
          <div className="flex flex-col items-center justify-center py-8 gap-5 animate-in fade-in">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-2 border-blue-500/30 flex items-center justify-center">
                <ShieldCheck className="w-8 h-8 text-blue-400" />
              </div>
              <div className="absolute inset-0 rounded-full bg-blue-500/10 animate-ping" />
            </div>
            <div className="text-center">
              <h3 className="text-base font-bold text-white">Aguardando Aprovação KYC</h3>
              <p className="text-xs text-slate-400 mt-1 px-4 leading-relaxed">
                Verificando status a cada 5s. O onboarding financeiro só inicia após <strong className="text-blue-300">approved</strong>.
              </p>
            </div>
            <p className="text-xs text-slate-500 font-mono animate-pulse">{efStatusLabel || 'Verificando...'}</p>
            <div className="w-full flex gap-3">
              <button
                onClick={() => setPhase('etherfuse_kyc_form')}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-2xl font-bold transition-all text-sm"
              >
                Voltar ao link
              </button>
            </div>
            <div className="w-full flex items-center gap-2 text-[10px] text-slate-600 font-mono justify-center">
              <ShieldCheck className="w-3 h-3" />
              [Experiment] customerId: {efCustomerId.substring(0, 8)}...
            </div>
          </div>
        )}

        {/* ── EXPERIMENT: Fases de loading financeiro ──────────────────── */}
        {(phase === 'etherfuse_financial_onboarding' || phase === 'etherfuse_quote' || phase === 'etherfuse_order') && (
          <div className="flex flex-col items-center justify-center py-14 gap-5 animate-in fade-in">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-2 border-blue-500/30 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
              </div>
              <div className="absolute inset-0 rounded-full bg-blue-500/10 animate-ping" />
            </div>
            <div className="text-center">
              <p className="text-white font-bold text-base">
                {phase === 'etherfuse_financial_onboarding' && 'Buscando conta bancária...'}
                {phase === 'etherfuse_quote' && 'Obtendo cotação BRL → TESOURO...'}
                {phase === 'etherfuse_order' && 'Criando ordem on-ramp...'}
              </p>
              <p className="text-xs text-slate-400 font-mono mt-1">{efStatusLabel}</p>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-slate-600 font-mono">
              <ShieldCheck className="w-3 h-3" />
              [Experiment] bankAccountId: {efBankAccountId ? efBankAccountId.substring(0, 8) + '...' : 'aguardando...'}
            </div>
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

            {/* [Experiment] CTA — Inicia fluxo KYC-First hospedado */}
            <button
              onClick={handleStartEtherfuse}
              disabled={isSimulating || !efAmount || Number(efAmount) < 10}
              className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white py-4 px-6 rounded-2xl font-bold transition-all duration-300 disabled:opacity-50 shadow-[0_0_24px_rgba(37,99,235,0.25)]"
            >
              {isSimulating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Wallet className="w-5 h-5" />}
              {isSimulating ? efStatusLabel || 'Processando...' : `Iniciar KYC · R$ ${efAmount}`}
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
                href={StellarNetwork.getTxExplorerUrl(efOrder.confirmedTxSignature)}
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

              {/* ── Bloco de Cotação XLM/BRL (apenas TestAnchor) ─────────── */}
              {selectedProvider?.id === 'stellar_testanchor' && (
                <div className="mt-4 w-full px-4">
                  {/* Carregando cotação */}
                  {xlmPriceLoading && (
                    <div className="flex items-center justify-center gap-2 py-2">
                      <Loader2 className="w-3.5 h-3.5 text-[#00E676] animate-spin" />
                      <span className="text-xs text-gray-500 font-mono">Buscando cotação...</span>
                    </div>
                  )}

                  {/* Erro na cotação — fallback visual amigável */}
                  {xlmPriceError && !xlmPriceLoading && (
                    <div className="flex items-center justify-center gap-2 py-2 px-3 bg-amber-950/20 border border-amber-800/30 rounded-xl">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                      <span className="text-xs text-amber-400 font-mono">
                        Cotação indisponível — verifique sua conexão
                      </span>
                    </div>
                  )}

                  {/* Cotação disponível + XLM estimado */}
                  {xlmPrice && !xlmPriceLoading && Number(amount) > 0 && (
                    <div className="flex flex-col gap-1.5 py-2 px-3 bg-[#00E676]/5 border border-[#00E676]/20 rounded-xl">
                      {/* Quantidade estimada de XLM — destaque principal */}
                      <div className="flex items-center justify-center gap-1.5">
                        <span className="text-[#00E676] font-bold text-base">
                          ≈ {(Number(amount) / xlmPrice.xlm_brl).toFixed(4)} XLM
                        </span>
                        {xlmPrice.from_cache && (
                          <span className="text-[9px] text-gray-600 font-mono">(cache)</span>
                        )}
                      </div>

                      {/* Linha de detalhes da cotação */}
                      <div className="flex items-center justify-between text-[10px] font-mono text-gray-500 border-t border-white/5 pt-1.5 mt-0.5">
                        <span>
                          Cotação: <span className="text-gray-400">R$ {xlmPrice.xlm_brl.toFixed(4)}/XLM</span>
                        </span>
                        <button
                          onClick={() => { PriceOracleService.clearCache(); fetchXlmQuote(); }}
                          className="p-0.5 hover:text-[#00E676] transition-colors"
                          title="Atualizar cotação"
                        >
                          <RefreshCw className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between text-[10px] font-mono text-gray-600">
                        <span>Fonte: <span className="text-gray-500">{xlmPrice.source}</span></span>
                        <span>Atualizado: <span className="text-gray-500">
                          {new Date(xlmPrice.updated_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span></span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <p className="text-[10px] text-gray-500 text-center uppercase tracking-wider font-mono">
              {selectedProvider?.id === 'stellar_testanchor'
                ? 'Stellar TestAnchor — Settlement em XLM Nativo. Fundos enviados para a sua carteira Stellar.'
                : 'Woovi PIX Gateway — Conversão 1:1 BRL ➔ BRW. Fundos bloqueados até recepção na Stellar Testnet.'}
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
              <label className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-2 block">
                {selectedProvider?.id === 'stellar_testanchor' ? 'Chave Copia e Cola Oficial' : 'Chave Copia e Cola Oficial (Woovi)'}
              </label>
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

        {/* Phase 4: Settlement Onchain (Woovi BRW Mint ou Stellar TestAnchor XLM) */}
        {phase === 'minting' && (
          <div className="flex flex-col items-center justify-center py-16 animate-in zoom-in">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-2 border-[#00E676]/30 flex items-center justify-center mb-6">
                <Zap className="w-8 h-8 text-[#00E676] animate-pulse" />
              </div>
              <div className="absolute inset-0 rounded-full bg-[#00E676]/10 animate-ping"></div>
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-xl font-bold text-white">PIX Recebido com Sucesso!</h3>
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 text-[#00E676] animate-spin" />
                <p className="text-gray-400 font-medium text-sm mt-1 text-center">Liquidando Onchain...</p>
              </div>
            </div>
            
            <div className="mt-8 flex flex-col items-center gap-2">
              <div className="flex items-center gap-2 text-xs text-gray-500 font-mono bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
                <ShieldCheck className="w-4 h-4 text-[#00E676]" />
                Validando assinaturas
              </div>
              {selectedProvider?.id === 'stellar_testanchor' ? (
                <p className="text-[10px] text-gray-600 mt-4 uppercase tracking-widest font-mono">TestAnchor · XLM · Stellar Testnet</p>
              ) : (
                <p className="text-[10px] text-gray-600 mt-4 uppercase tracking-widest font-mono">Woovi API · Stellar Smart Contract</p>
              )}
            </div>
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
                href={StellarNetwork.getTxExplorerUrl(txHash)} 
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

        {/* ═══════════════════════════════════════════════════════════════════
            ETHERFUSE V2 — Fluxo Programático Validado
            Phases prefixadas com ef2_ para não conflitar com V1.
            O V1 (phases etherfuse_*) permanece INTACTO acima.
        ═══════════════════════════════════════════════════════════════════ */}

        {/* ── EF2 Preview: Tela inicial do fluxo V2 ────────────────────── */}
        {phase === 'ef2_preview' && (
          <div className="flex flex-col space-y-4 animate-in fade-in duration-300">
            <div className="bg-gradient-to-br from-[#0a1628] via-[#0d1f3c] to-[#0a1628] rounded-2xl p-5 border border-emerald-900/40 shadow-2xl relative overflow-hidden">
              <div className="absolute -top-6 -right-6 w-28 h-28 bg-emerald-600/10 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-20 h-20 bg-teal-500/5 rounded-full blur-xl pointer-events-none" />
              <div className="flex items-center gap-3 mb-3">
                <div className="w-11 h-11 bg-slate-900 rounded-xl flex items-center justify-center border border-emerald-800/50">
                  <TrendingUp className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white tracking-tight">Etherfuse V2 (Sandbox)</h3>
                  <p className="text-[10px] text-emerald-400 font-mono uppercase tracking-widest">TESOURO · Fluxo Programático · PIX Rail</p>
                </div>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Adquira <strong className="text-emerald-300">TESOURO</strong> — título público federal tokenizado em Stellar via PIX.
                Fluxo programático validado: KYC automático no sandbox Etherfuse.
              </p>
              <div className="mt-3 px-3 py-1.5 bg-emerald-900/20 border border-emerald-700/30 rounded-lg inline-flex items-center gap-2">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                <span className="text-[10px] text-emerald-400 font-mono font-bold uppercase tracking-wider">Sandbox Auto-Approve KYC</span>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <span className="text-slate-500 text-sm font-semibold">R$</span>
                <input
                  type="number"
                  value={ef2Amount}
                  onChange={e => setEf2Amount(e.target.value)}
                  className="flex-1 bg-slate-900/60 border border-slate-700 rounded-xl px-3 py-2 text-white text-lg font-bold outline-none focus:border-emerald-500 transition-colors"
                  min="10"
                  step="10"
                />
                <span className="text-slate-500 text-sm">BRL</span>
              </div>
              {ef2Quote && (
                <p className="text-[10px] text-emerald-300 font-mono mt-2">
                  ≈ {parseFloat(ef2Quote.destinationAmount).toFixed(7)} TESOURO · Taxa: R$ {parseFloat(ef2Quote.feeAmount).toFixed(2)}
                </p>
              )}
            </div>

            {ef2ErrorMsg && (
              <div className="bg-red-950/30 border border-red-800/40 rounded-xl p-3 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-300 font-mono break-all">{ef2ErrorMsg}</p>
              </div>
            )}

            <button
              id="btn-ef2-start"
              onClick={handleStartEtherfuseV2}
              disabled={!ef2Amount || Number(ef2Amount) < 10}
              className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white py-4 px-6 rounded-2xl font-bold transition-all duration-300 disabled:opacity-50 shadow-[0_0_24px_rgba(16,185,129,0.25)]"
            >
              <Wallet className="w-5 h-5" />
              Comprar TESOURO · R$ {ef2Amount}
            </button>
            <button
              onClick={() => { setPhase('provider_selection'); setEf2ErrorMsg(''); }}
              className="w-full text-xs text-gray-600 hover:text-white transition-colors"
            >
              Voltar
            </button>
          </div>
        )}

        {/* ── EF2 Loading genérico (trustline, customer, kyc, pix, quote, order) ── */}
        {(['ef2_trustline', 'ef2_customer_creation', 'ef2_kyc_submitting', 'ef2_pix_registration', 'ef2_quote', 'ef2_order'] as const).some(p => p === phase) && (
          <div className="flex flex-col items-center justify-center py-14 gap-5 animate-in fade-in">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-2 border-emerald-500/30 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
              </div>
              <div className="absolute inset-0 rounded-full bg-emerald-500/10 animate-ping" />
            </div>
            <div className="text-center">
              <p className="text-white font-bold text-base">
                {phase === 'ef2_trustline' && 'Verificando Trustline TESOURO...'}
                {phase === 'ef2_customer_creation' && 'Criando customer Etherfuse...'}
                {phase === 'ef2_kyc_submitting' && 'Submetendo KYC programático...'}
                {phase === 'ef2_pix_registration' && 'Registrando conta PIX...'}
                {phase === 'ef2_quote' && 'Obtendo cotação BRL → TESOURO...'}
                {phase === 'ef2_order' && 'Criando ordem on-ramp...'}
              </p>
              <p className="text-xs text-slate-400 font-mono mt-1">{ef2StatusLabel}</p>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-slate-600 font-mono">
              <ShieldCheck className="w-3 h-3" />
              [EtherfuseV2] Fluxo Programático · Sandbox
            </div>
          </div>
        )}

        {/* ── EF2 KYC Polling ─────────────────────────────────────────── */}
        {phase === 'ef2_kyc_polling' && (
          <div className="flex flex-col items-center justify-center py-8 gap-5 animate-in fade-in">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-2 border-emerald-500/30 flex items-center justify-center">
                <ShieldCheck className="w-8 h-8 text-emerald-400" />
              </div>
              <div className="absolute inset-0 rounded-full bg-emerald-500/10 animate-ping" />
            </div>
            <div className="text-center">
              <h3 className="text-base font-bold text-white">Aguardando Aprovação KYC</h3>
              <p className="text-xs text-slate-400 mt-1 px-4 leading-relaxed">
                Sandbox auto-aprova após submissão programática.
              </p>
            </div>
            <p className="text-xs text-slate-500 font-mono animate-pulse">{ef2StatusLabel || 'Verificando...'}</p>
          </div>
        )}

        {/* ── EF2 Settling (Polling ordem) ────────────────────────────── */}
        {phase === 'ef2_settling' && (
          <div className="flex flex-col items-center justify-center py-14 gap-5 animate-in fade-in">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-2 border-emerald-500/30 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
              </div>
              <div className="absolute inset-0 rounded-full bg-emerald-500/10 animate-ping" />
            </div>
            <div className="text-center">
              <p className="text-white font-bold text-base">Liquidando na Stellar...</p>
              <p className="text-xs text-slate-400 mt-1 font-mono">{ef2StatusLabel}</p>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-slate-600 font-mono">
              <ShieldCheck className="w-3 h-3" />
              TESOURO · EtherfuseV2 · Stellar Testnet
            </div>
          </div>
        )}

        {/* ── EF2 Done (Sucesso) ──────────────────────────────────────── */}
        {phase === 'ef2_done' && (
          <div className="flex flex-col items-center justify-center py-10 gap-4 animate-in zoom-in duration-300">
            <div className="w-20 h-20 bg-gradient-to-br from-emerald-600/20 to-teal-600/20 rounded-full flex items-center justify-center border border-emerald-500/30">
              <CheckCircle2 className="w-10 h-10 text-emerald-400" />
            </div>
            <div className="text-center">
              <h3 className="text-xl font-bold text-white">TESOURO Creditado!</h3>
              <p className="text-sm text-slate-400 mt-1">
                {ef2Order?.amountInTokens ? (
                  <><strong className="text-emerald-300">{parseFloat(ef2Order.amountInTokens).toFixed(4)} TESOURO</strong> na sua wallet Stellar</>
                ) : 'TESOURO creditado na sua wallet Stellar'}
              </p>
            </div>
            {ef2TxHash && (
              <div className="w-full mt-2 bg-slate-900/50 border border-slate-700/50 rounded-xl p-4 text-center">
                <p className="text-xs text-slate-500 font-mono mb-2">Transaction Hash</p>
                <div className="flex items-center justify-between gap-2 bg-black/40 px-3 py-2 rounded-lg border border-slate-800">
                  <span className="text-xs text-emerald-400 font-mono truncate">
                    {ef2TxHash.length > 20 ? `${ef2TxHash.substring(0, 16)}...` : ef2TxHash}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(ef2TxHash);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      className="p-1.5 hover:bg-slate-800 rounded-md transition-colors"
                      title="Copiar Hash"
                    >
                      {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-400 hover:text-white" />}
                    </button>
                    {ef2TxHash !== 'Pendente' && (
                      <a
                        href={StellarNetwork.getTxExplorerUrl(ef2TxHash)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 hover:bg-slate-800 rounded-md transition-colors flex items-center gap-1"
                        title="Ver no Stellar Expert"
                      >
                        <ExternalLink className="w-4 h-4 text-slate-400 hover:text-emerald-400" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )}
            <div className="w-full grid grid-cols-3 gap-2 mt-2">
              {['Trustline OK', 'PIX Simulado', 'TESOURO Liquidado'].map((s, i) => (
                <div key={i} className="flex flex-col items-center gap-1 p-2 bg-emerald-950/20 rounded-xl border border-emerald-900/30">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <p className="text-[9px] text-emerald-300 text-center font-mono">{s}</p>
                </div>
              ))}
            </div>
            <button id="btn-ef2-close" onClick={onClose} className="w-full bg-emerald-700 hover:bg-emerald-600 text-white py-3 rounded-2xl font-bold transition-all">
              Fechar
            </button>
          </div>
        )}

        {/* ── EF2 Error ──────────────────────────────────────────────── */}
        {phase === 'ef2_error' && (
          <div className="flex flex-col items-center justify-center py-10 gap-4 animate-in fade-in">
            <div className="w-16 h-16 bg-red-900/20 rounded-full flex items-center justify-center border border-red-800/40">
              <AlertCircle className="w-8 h-8 text-red-400" />
            </div>
            <div className="text-center">
              <h3 className="text-base font-bold text-white">Erro no Fluxo V2</h3>
              <p className="text-xs text-slate-500 font-mono mt-2 break-all px-2">{ef2ErrorMsg}</p>
            </div>
            <button
              onClick={() => { setPhase('ef2_preview'); setEf2ErrorMsg(''); setEf2StatusLabel(''); }}
              className="w-full bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-2xl font-bold transition-all"
            >
              Tentar Novamente
            </button>
            <button
              onClick={() => setPhase('provider_selection')}
              className="w-full text-xs text-gray-600 hover:text-white transition-colors"
            >
              Voltar à seleção
            </button>
          </div>
        )}

        {/* ── Defindex Vault Selection ──────────────────────────────────────── */}
        {phase === 'defindex_vault_selection' && (
          <div className="flex flex-col space-y-4">
            <div className="text-center mb-4">
              <h3 className="text-lg font-bold text-white">Selecione o Vault</h3>
              <p className="text-sm text-gray-400">Escolha onde deseja investir</p>
            </div>
            <button
              onClick={() => {
                setDefindexVaultId('CCLV4H7WTLJQ7ATLHBBQV2WW3OINF3FOY5XZ7VPHZO7NH3D2ZS4GFSF6');
                setDefindexVaultAsset('XLM');
                setPhase('defindex_input');
              }}
              className="w-full bg-slate-800 hover:bg-slate-700 text-white py-4 px-6 rounded-2xl font-bold transition-colors border border-slate-700"
            >
              Vault: XLM Blend Strategy
            </button>
            <button
              disabled
              className="w-full bg-slate-800/40 text-slate-500 py-4 px-6 rounded-2xl font-bold border border-slate-800 mt-2 cursor-not-allowed flex justify-between items-center"
            >
              <span>Vault: USDC Blend Strategy</span>
              <span className="text-[10px] bg-slate-700 text-slate-300 px-2 py-1 rounded-md">SOON</span>
            </button>
            <button
              disabled
              className="w-full bg-slate-800/40 text-slate-500 py-4 px-6 rounded-2xl font-bold border border-slate-800 mt-2 cursor-not-allowed flex justify-between items-center"
            >
              <span>Vault: CETES Blend Strategy</span>
              <span className="text-[10px] bg-slate-700 text-slate-300 px-2 py-1 rounded-md">SOON</span>
            </button>
            <button
              onClick={() => setPhase('provider_selection')}
              className="w-full text-xs text-gray-600 hover:text-white transition-colors mt-4"
            >
              Voltar
            </button>
          </div>
        )}

        {/* ── Defindex Input ──────────────────────────────────────── */}
        {phase === 'defindex_input' && (
          <div className="flex flex-col space-y-4">
            <div className="text-center mb-4">
              <h3 className="text-lg font-bold text-white">Valor do Depósito</h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-500 text-sm font-semibold"></span>
              <input
                type="number"
                value={defindexAmount}
                onChange={(e) => setDefindexAmount(e.target.value)}
                placeholder="10.00"
                className="flex-1 bg-slate-900/60 border border-slate-700 rounded-xl px-3 py-2 text-white text-lg font-bold outline-none focus:border-blue-500 transition-colors"
              />
              <span className="text-slate-500 text-sm">{defindexVaultAsset}</span>
            </div>
            <button
              onClick={async () => {
                setPhase('defindex_submitting');
                setDefindexTxHash(null);
                try {
                  const { WalletFactory } = await import('../../services/walletFactory');
                  const { Keypair, TransactionBuilder, Horizon } = await import('@stellar/stellar-sdk');
                  const { DefindexAPIClient, DefindexYieldService } = await import('@walletnow/plugin-defindex');
                  
                  if (!profile?.id) throw new Error("Perfil não encontrado");
                  const secretStr = WalletFactory.getSecretKey(profile.id);
                  if (!secretStr) throw new Error("Chave secreta não encontrada");
                  const keypair = Keypair.fromSecret(secretStr);
                  
                  logger.info('[WalletNow][Defindex]', 'Iniciando depósito');
                  const apiClient = new DefindexAPIClient({ apiKey: import.meta.env.VITE_DEFINDEX_API_KEY });
                  const yieldService = new DefindexYieldService({ client: apiClient, network: 'testnet', events: { emit: () => {} } as any });
                  
                  const stroopsAmount = Math.floor(parseFloat(defindexAmount) * 1e7);
                  const depositTx = await yieldService.deposit(
                    { vaultId: defindexVaultId, amounts: [stroopsAmount], from: keypair.publicKey(), invest: false },
                    async (xdr) => {
                      const tx = TransactionBuilder.fromXDR(xdr, StellarNetwork.passphrase);
                      tx.sign(keypair);
                      return tx.toXDR();
                    },
                    async (signedXdr) => {
                      const server = StellarNetwork.createServer();
                      const tx = TransactionBuilder.fromXDR(signedXdr, StellarNetwork.passphrase);
                      const res = await server.submitTransaction(tx as any);
                      return { hash: res.hash, ledger: res.ledger };
                    }
                  );
                  logger.info('[WalletNow][Defindex]', 'Depósito confirmado:', depositTx.txHash);
                  // HACKATHON MOCK - Salva localmente para a interface atualizar rápido antes da indexação
                  if (defindexVaultAsset === 'XLM') {
                     const currentMock = parseFloat(localStorage.getItem(`@walletnow:mock_xlm_yield_${activeAccount.stellar_public_key}`) || '0');
                     localStorage.setItem(`@walletnow:mock_xlm_yield_${activeAccount.stellar_public_key}`, (currentMock + parseFloat(defindexAmount)).toString());
                  }

                  setDefindexTxHash(depositTx.txHash);
                  setPhase('defindex_done');
                } catch (e: any) {
                  const errorMsg = e.message || String(e);
                  logger.error('[WalletNow][Defindex]', 'Erro no depósito', e);

                  let finalError = errorMsg;
                  if (errorMsg.includes('MissingTrustline') || errorMsg.includes('errorCode":13')) {
                    finalError = `Falta Trustline na sua carteira para este ativo (${defindexVaultAsset}). A rede Stellar exige que você adicione (Trustline) o token antes de poder recebê-lo ou enviá-lo (XLM não precisa, por isso funciona). Adicione o ativo na sua carteira de testnet primeiro.`;
                  }
                  
                  alert("Erro ao tentar depositar na Testnet: " + finalError);
                  setPhase('defindex_input');
                }
              }}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 px-6 rounded-2xl font-bold transition-colors mt-4"
            >
              Confirmar Depósito
            </button>
            <button
              onClick={() => setPhase('defindex_vault_selection')}
              className="w-full text-xs text-gray-600 hover:text-white transition-colors mt-2"
            >
              Voltar
            </button>
          </div>
        )}

        {/* ── Defindex Submitting ──────────────────────────────────────── */}
        {phase === 'defindex_submitting' && (
          <div className="flex flex-col items-center justify-center py-14 gap-5 animate-in fade-in">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-2 border-blue-500/30 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
              </div>
            </div>
            <div className="text-center">
              <p className="text-white font-bold text-base">Enviando para o Defindex...</p>
              <p className="text-xs text-slate-400 mt-1">Assinando e executando XDR</p>
            </div>
          </div>
        )}

        {/* ── Defindex Done ──────────────────────────────────────── */}
        {phase === 'defindex_done' && (
          <div className="flex flex-col items-center justify-center py-10 gap-4 animate-in zoom-in">
            <div className="w-20 h-20 bg-blue-900/20 rounded-full flex items-center justify-center border border-blue-500/30">
              <CheckCircle2 className="w-10 h-10 text-blue-400" />
            </div>
            <div className="text-center">
              <h3 className="text-xl font-bold text-white">Depósito Concluído!</h3>
              <p className="text-sm text-slate-400 mt-1">Seu saldo no vault foi atualizado.</p>
            </div>
            {defindexTxHash && (
              <div className="w-full mt-2 mb-4 bg-slate-900/50 rounded-xl p-3 border border-slate-700/50 flex flex-col items-center justify-center gap-2">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Transaction Hash</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-blue-400 break-all select-all text-center">
                    {defindexTxHash.slice(0, 12)}...{defindexTxHash.slice(-12)}
                  </span>
                  <div className="flex">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(defindexTxHash);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      className="p-1.5 hover:bg-slate-800 rounded-md transition-colors"
                      title="Copiar Hash"
                    >
                      {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-400 hover:text-white" />}
                    </button>
                    <a
                      href={StellarNetwork.getTxExplorerUrl(defindexTxHash)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 hover:bg-slate-800 rounded-md transition-colors flex items-center gap-1"
                      title="Ver no Stellar Expert"
                    >
                      <ExternalLink className="w-4 h-4 text-slate-400 hover:text-blue-400" />
                    </a>
                  </div>
                </div>
              </div>
            )}
            <button onClick={async () => {
              if (onSuccess) onSuccess();
              await refreshAccounts(); // Refresh global sem F5
              onClose();
            }} className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-2xl font-bold transition-all">
              Fechar e Atualizar
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
