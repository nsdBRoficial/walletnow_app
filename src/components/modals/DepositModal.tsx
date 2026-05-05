// src/components/modals/DepositModal.tsx
//
// Modal de Depósito — Fluxo Etherfuse (On-Ramp)
//
// Fases:
//   input          → usuário informa valor
//   creating_order → Edge Function cria order na Etherfuse
//   waiting        → aguardando evento Realtime (status = 'completed')
//   claim_ready    → XDR disponível, usuário pode assinar
//   claiming       → assina e submete XDR à Stellar Testnet
//   success        → saldo on-chain atualizado

import {
  X, CheckCircle2, Loader2, Zap, ExternalLink, ArrowRightLeft, Info
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { BackendService, type FiatTransaction } from '../../services/backendService';
import { TransactionBuilder, Networks } from '@stellar/stellar-sdk';
import { WalletFactory } from '../../services/walletFactory';

interface DepositModalProps {
  isOpen:      boolean;
  onClose:     () => void;
  onSuccess?:  () => void;
}

type Phase =
  | 'input'
  | 'creating_order'
  | 'waiting'
  | 'claim_ready'
  | 'claiming'
  | 'success';

export default function DepositModal({ isOpen, onClose, onSuccess }: DepositModalProps) {
  const { profile } = useAuth();

  const [phase,        setPhase]        = useState<Phase>('input');
  const [amount,       setAmount]       = useState('');
  const [correlationId, setCorrelationId] = useState<string | null>(null);
  const [transaction,  setTransaction]  = useState<FiatTransaction | null>(null);
  const [txHash,       setTxHash]       = useState<string | null>(null);
  const [errorMsg,     setErrorMsg]     = useState<string | null>(null);

  // Ref para cleanup da subscrição Realtime
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Reset ao abrir/fechar
  useEffect(() => {
    if (isOpen) {
      setPhase('input');
      setAmount('');
      setCorrelationId(null);
      setTransaction(null);
      setTxHash(null);
      setErrorMsg(null);
    } else {
      // Limpar subscrição ao fechar
      unsubscribeRef.current?.();
      unsubscribeRef.current = null;
    }
  }, [isOpen]);

  // Subscreve ao Realtime quando temos um correlationId
  useEffect(() => {
    if (!correlationId || phase !== 'waiting') return;

    console.log(`[DepositModal] Subscrevendo Realtime para correlationId: ${correlationId}`);

    const unsubscribe = BackendService.subscribeToTransaction(
      correlationId,
      (updatedTx) => {
        console.log('[DepositModal] Realtime update:', updatedTx.status);
        setTransaction(updatedTx);

        if (updatedTx.status === 'completed' && updatedTx.stellar_xdr) {
          setPhase('claim_ready');
        } else if (updatedTx.status === 'failed') {
          setErrorMsg(updatedTx.error_message ?? 'Falha no processamento. Contate o suporte.');
          setPhase('input');
        }
      }
    );

    unsubscribeRef.current = unsubscribe;
    return unsubscribe;
  }, [correlationId, phase]);

  if (!isOpen) return null;

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleCreateOrder = async () => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) return;
    if (!profile?.stellar_address) {
      setErrorMsg('Carteira Stellar não configurada. Faça logout e login novamente.');
      return;
    }

    setPhase('creating_order');
    setErrorMsg(null);

    try {
      // Chama Edge Function etherfuse-create-order (sem ISSUER_SECRET no cliente)
      const result = await BackendService.createOrder(
        amount,
        profile.stellar_address
      );

      setCorrelationId(result.correlationId);
      setPhase('waiting');

      // Em Sandbox: acionar simulação automaticamente após criar o order
      // Isso substitui o Fast-Mock de 2s anterior — agora é um evento real
      console.log('[DepositModal] Acionando simulação Etherfuse Sandbox...');
      await BackendService.simulateFiat(result.correlationId);

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[DepositModal] Erro ao criar order:', msg);
      setErrorMsg(msg);
      setPhase('input');
    }
  };

  const handleClaimFunds = async () => {
    if (!transaction?.stellar_xdr || !profile?.id) return;

    setPhase('claiming');
    setErrorMsg(null);

    try {
      // ── 1. Obter keypair do usuário ──────────────────────────────────────────
      const secretKey = WalletFactory.getSecretKey(profile.id);
      if (!secretKey) throw new Error('Chave local não encontrada. Refaça o login.');

      const { Keypair, TransactionBuilder: TB, Networks: N, Horizon } = await import('@stellar/stellar-sdk');
      const userKeypair = Keypair.fromSecret(secretKey);

      console.log('[Claim] Keypair:', userKeypair.publicKey());
      console.log('[Claim] XDR length:', transaction.stellar_xdr.length);
      console.log('[Claim] XDR preview:', transaction.stellar_xdr.substring(0, 60));

      // ── 2. Deserializar XDR da Etherfuse ──────────────────────────────────────
      // O Etherfuse retorna um TransactionEnvelope (XDR base64) via stellarClaimTransaction
      // Pode conter ChangeTrust + ClaimClaimableBalance dependendo da conta
      let tx: ReturnType<typeof TB.fromXDR>;
      try {
        tx = TB.fromXDR(transaction.stellar_xdr, N.TESTNET);
        console.log('[Claim] XDR desserializado OK — tipo:', tx.constructor.name);
      } catch (xdrErr) {
        console.error('[Claim] Falha ao desserializar XDR:', xdrErr);
        throw new Error(
          `XDR inválido da Etherfuse: ${xdrErr instanceof Error ? xdrErr.message : String(xdrErr)}`
        );
      }

      // ── 3. Assinar com keypair do usuário ─────────────────────────────────────
      tx.sign(userKeypair);
      console.log('[Claim] Transação assinada com:', userKeypair.publicKey());

      // ── 4. Submeter à Stellar Testnet ─────────────────────────────────────────
      const server = new Horizon.Server('https://horizon-testnet.stellar.org');
      console.log('[Claim] Submetendo à Stellar Testnet...');

      let submitResult;
      try {
        submitResult = await server.submitTransaction(tx);
      } catch (submitErr: unknown) {
        // Extrair resultCodes da Stellar para erro legível
        const errObj = submitErr as { response?: { data?: { extras?: { result_codes?: unknown } } } };
        const codes   = errObj?.response?.data?.extras?.result_codes;
        console.error('[Claim] Erro ao submeter:', codes ?? submitErr);
        throw new Error(
          codes
            ? `Stellar rejeitou: ${JSON.stringify(codes)}`
            : `Falha ao submeter: ${submitErr instanceof Error ? submitErr.message : String(submitErr)}`
        );
      }

      const hash = submitResult.hash;
      console.log('[Claim] ✅ Transação confirmada! Hash:', hash);
      setTxHash(hash);

      // ── 5. Persistir no banco ─────────────────────────────────────────────────
      await BackendService.markAsClaimed(transaction.correlation_id, hash);
      console.log('[Claim] DB atualizado: status=claimed');

      setPhase('success');
      if (onSuccess) onSuccess();

      // Fechar modal automaticamente após 4s
      setTimeout(() => onClose(), 4000);

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[DepositModal] Erro no claim:', msg);
      setErrorMsg(`Falha ao assinar: ${msg}`);
      setPhase('claim_ready'); // Volta para tentar novamente
    }
  };


  const handleClose = () => {
    if (phase === 'creating_order' || phase === 'claiming') return; // Bloquear durante operações
    unsubscribeRef.current?.();
    onClose();
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="w-full max-w-md bg-[#161616] rounded-t-[32px] sm:rounded-[32px] p-6 border border-white/5 shadow-2xl animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-8 duration-500">

        {/* Cabeçalho */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-white">
            {phase === 'input' ? 'Depositar (On-Ramp)' : 'Processando Depósito'}
          </h2>
          <button
            onClick={handleClose}
            disabled={phase === 'creating_order' || phase === 'claiming'}
            className="p-2 bg-white/5 rounded-full text-gray-400 hover:text-white transition-colors disabled:opacity-40"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Erro global */}
        {errorMsg && (
          <div className="mb-4 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
            ⚠️ {errorMsg}
          </div>
        )}

        {/* ─── Phase: Input ──────────────────────────────────────────────────── */}
        {phase === 'input' && (
          <div className="flex flex-col space-y-6">
            <div className="flex flex-col items-center justify-center py-8 bg-black/30 rounded-2xl border border-white/5">
              <span className="text-sm text-gray-500 font-medium mb-2">Valor em MXN</span>
              <div className="flex items-center justify-center text-4xl font-bold text-white">
                <span className="text-gray-500 mr-2 text-2xl">$</span>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  min="0"
                  className="bg-transparent border-none outline-none text-center w-36 placeholder:text-gray-700 focus:ring-0 p-0"
                  autoFocus
                />
              </div>
              <span className="mt-2 text-xs text-gray-600 font-mono uppercase tracking-wide">
                Pesos mexicanos (MXN) via Etherfuse
              </span>
            </div>

            <div className="flex items-start gap-2 text-xs text-gray-500 bg-black/30 p-3 rounded-xl border border-white/5">
              <Info className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
              <p>
                Fiat → USDC Stellar via Etherfuse. Após o depósito, você assina a transação
                localmente para receber os tokens na sua carteira.
              </p>
            </div>

            <button
              onClick={handleCreateOrder}
              disabled={!amount || Number(amount) <= 0}
              className="w-full flex items-center justify-center gap-3 bg-[#00E676] hover:bg-[#00E676]/90 text-black py-4 px-6 rounded-2xl transition-all duration-300 font-bold disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(0,230,118,0.2)]"
            >
              <ArrowRightLeft className="w-5 h-5" />
              Iniciar Depósito Etherfuse
            </button>
          </div>
        )}

        {/* ─── Phase: Criando order ──────────────────────────────────────────── */}
        {phase === 'creating_order' && (
          <div className="flex flex-col items-center justify-center py-16 animate-in fade-in">
            <Loader2 className="w-12 h-12 text-[#00E676] animate-spin mb-4" />
            <p className="text-gray-300 font-semibold">Criando order na Etherfuse...</p>
            <p className="text-xs text-gray-600 mt-2 font-mono">
              Gerando quote + registrando order
            </p>
          </div>
        )}

        {/* ─── Phase: Aguardando Realtime ────────────────────────────────────── */}
        {phase === 'waiting' && (
          <div className="flex flex-col items-center space-y-6 animate-in fade-in">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-[#00E676]/10 flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-[#00E676] animate-spin" />
              </div>
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#00E676] rounded-full animate-ping" />
            </div>

            <div className="text-center">
              <p className="text-white font-semibold">Processando via Etherfuse</p>
              <p className="text-sm text-gray-400 mt-1">
                Aguardando confirmação do depósito fiat...
              </p>
              <p className="text-xs text-gray-600 mt-3 font-mono uppercase tracking-wider">
                Realtime ativo — sem polling
              </p>
            </div>

            {correlationId && (
              <div className="w-full bg-black/30 border border-white/5 rounded-xl p-3">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Order ID</p>
                <p className="text-xs text-gray-400 font-mono truncate">{correlationId}</p>
              </div>
            )}
          </div>
        )}

        {/* ─── Phase: Claim Ready ────────────────────────────────────────────── */}
        {phase === 'claim_ready' && transaction?.stellar_xdr && (
          <div className="flex flex-col items-center space-y-6 animate-in zoom-in duration-300">
            <div className="w-20 h-20 bg-[#00E676]/20 rounded-full flex items-center justify-center">
              <Zap className="w-10 h-10 text-[#00E676] fill-[#00E676]/20" />
            </div>

            <div className="text-center">
              <h3 className="text-xl font-bold text-white mb-1">Fiat Confirmado!</h3>
              <p className="text-sm text-gray-400">
                Etherfuse preparou sua transação Stellar.
                <br />Assine para receber os tokens na sua carteira.
              </p>
            </div>

            <div className="w-full bg-[#00E676]/5 border border-[#00E676]/20 rounded-xl p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-2 font-medium">
                Stellar Claimable Balance
              </p>
              <p className="text-xs text-gray-400 font-mono break-all leading-relaxed">
                {transaction.stellar_claimable_balance_id ?? 'Disponível'}
              </p>
            </div>

            <button
              onClick={handleClaimFunds}
              className="w-full flex items-center justify-center gap-3 bg-[#00E676] hover:bg-[#00E676]/90 text-black py-4 px-6 rounded-2xl transition-all duration-300 font-bold shadow-[0_0_20px_rgba(0,230,118,0.3)]"
            >
              <Zap className="w-5 h-5 fill-black" />
              Assinar e Receber Tokens
            </button>

            <p className="text-xs text-gray-600 text-center font-mono uppercase tracking-wider">
              Assinatura local — sua chave nunca sai do dispositivo
            </p>
          </div>
        )}

        {/* ─── Phase: Claiming ───────────────────────────────────────────────── */}
        {phase === 'claiming' && (
          <div className="flex flex-col items-center justify-center py-16 animate-in fade-in">
            <Zap className="w-12 h-12 text-[#00E676] animate-bounce mb-4 fill-[#00E676]/20" />
            <p className="text-white text-lg font-bold text-center">Assinando...</p>
            <p className="text-gray-400 font-medium text-sm mt-1 text-center">
              Submetendo transação à Stellar Testnet
            </p>
            <p className="text-xs text-gray-600 mt-4 uppercase tracking-widest font-mono">
              Etherfuse ClaimClaimableBalance
            </p>
          </div>
        )}

        {/* ─── Phase: Success ────────────────────────────────────────────────── */}
        {phase === 'success' && (
          <div className="flex flex-col items-center justify-center py-12 animate-in zoom-in duration-300">
            <div className="w-20 h-20 bg-[#00E676]/20 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="w-10 h-10 text-[#00E676]" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">Depósito Liquidado!</h3>
            <p className="text-gray-400 text-center text-sm mb-6">
              Tokens recebidos na sua carteira Stellar.
              <br />Saldo atualizado via Realtime.
            </p>

            {txHash && (
              <a
                href={`https://stellar.expert/explorer/testnet/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-[#00E676] text-xs font-semibold bg-[#00E676]/10 px-4 py-2 rounded-xl border border-[#00E676]/20 hover:bg-[#00E676]/20 transition-all"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Ver Comprovante na Stellar
              </a>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
