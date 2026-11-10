/**
 * @module src/pages/SwapPage.tsx
 * @description Página principal da aplicação (SwapPage) — orquestração de estado, saldos Stellar e ações do usuário (exporta: SwapPage).
 */
/**
 * @packageDocumentation
 * @module Pages/SwapPage
 *
 * SwapPage — Interface Descentralizada de Troca de Ativos via ISwapCapability
 *
 * Responsabilidade:
 * Renderizar o painel de conversão de ativos da Stellar Network consumindo
 * o agregador de liquidez Soroswap via Clean Capability Inversion:
 * - INVARIANTE: O componente nunca acopla diretamente ao SoroswapPlugin; a descoberta é via manifesto.
 * - Proteção de Slippage e taxas embutidas no roteamento.
 * - Patrocínio automático de gas para as transações de swap.
 *
 * @updated Setembro de 2026
 * @version 0.4.5-candidate
 */

import React, { useState, useEffect } from 'react';
import { ArrowLeftRight, Settings, ChevronDown, RefreshCw, Zap, Info } from 'lucide-react';
import { useManifests } from '../hooks/useManifests';
import ProtocolCard from '../components/protocol/ProtocolCard';
import EmptyState, { SkeletonCard, ErrorState } from '../components/ui/EmptyState';
import SwapModal from '../components/modals/SwapModal';
import { useAuth } from '../contexts/AuthContext';
import { useWallet } from '../contexts/WalletContext';
import { WalletFactory } from '../services/walletFactory';
import { useIntegrationEngine } from '../contexts/IntegrationEngineContext';
import { TransactionBuilder, Horizon, Keypair } from '@stellar/stellar-sdk';
import { logger } from '../utils/logger';
import { PaymentService } from '../services/paymentService';
import { StellarNetwork } from '../config/stellarNetwork';

// ─── Token Selector ───────────────────────────────────────────────────────────

const TOKENS = [
  { code: 'XLM',    name: 'Stellar Lumens',   icon: '⭐' },
  { code: 'USDC',   name: 'USD Coin',          icon: '💵' },
  { code: 'TESOURO',name: 'Tesouro Tokenizado',icon: '🏦' },
  { code: 'BRW',    name: 'BRW Token',         icon: '🇧🇷' },
  { code: 'EURC',   name: 'Euro Coin',         icon: '💶' },
  { code: 'XRP',    name: 'Ripple Testnet',    icon: '💧' },
];

function TokenSelector({
  selected,
  onSelect,
  label,
}: {
  selected: string;
  onSelect: (code: string) => void;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const token = TOKENS.find(t => t.code === selected) ?? TOKENS[0];

  return (
    <div style={{ position: 'relative' }}>
      <label style={{
        display: 'block',
        fontSize: 12,
        fontWeight: 500,
        color: 'var(--text-tertiary)',
        marginBottom: 6,
        letterSpacing: '0.02em',
      }}>
        {label}
      </label>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 14px',
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          color: 'var(--text-primary)',
          cursor: 'pointer',
          width: 160,
          transition: 'var(--transition-fast)',
        }}
        onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)')}
        onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border-subtle)')}
      >
        <span style={{ fontSize: 16 }}>{token.icon}</span>
        <div style={{ flex: 1, textAlign: 'left' }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{token.code}</div>
          <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 1 }}>{token.name}</div>
        </div>
        <ChevronDown size={13} color="var(--text-tertiary)" style={{ transform: open ? 'rotate(180deg)' : undefined, transition: 'transform 0.2s' }} />
      </button>

      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 90 }} onClick={() => setOpen(false)} />
          <div style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            width: 220,
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-lg)',
            zIndex: 100,
            overflow: 'hidden',
            animation: 'fade-in-up 0.15s ease both',
          }}>
            {TOKENS.map(t => (
              <button
                key={t.code}
                onClick={() => { onSelect(t.code); setOpen(false); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  width: '100%',
                  padding: '10px 14px',
                  background: t.code === selected ? 'var(--accent-dim)' : 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: t.code === selected ? 'var(--accent)' : 'var(--text-primary)',
                  fontSize: 13,
                  fontWeight: t.code === selected ? 600 : 400,
                  textAlign: 'left',
                  transition: 'var(--transition-fast)',
                }}
                onMouseEnter={e => { if (t.code !== selected) (e.currentTarget.style.background = 'var(--bg-hover)'); }}
                onMouseLeave={e => { if (t.code !== selected) (e.currentTarget.style.background = 'transparent'); }}
              >
                <span style={{ fontSize: 18 }}>{t.icon}</span>
                <div>
                  <div style={{ fontWeight: 600 }}>{t.code}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{t.name}</div>
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Swap Widget ──────────────────────────────────────────────────────────────

function SwapWidget() {
  const { profile } = useAuth();
  const { refreshAccounts, activeAccount } = useWallet();
  const engine = useIntegrationEngine();

  const [fromToken, setFromToken] = useState('XLM');
  const [toToken, setToToken] = useState('USDC');
  const [amount, setAmount] = useState('');
  const [slippage, setSlippage] = useState('0.5');
  const [showSettings, setShowSettings] = useState(false);
  const [status, setStatus] = useState<'idle' | 'swapping' | 'success'>('idle');
  const [balances, setBalances] = useState<Record<string, string>>({});

  useEffect(() => {
    if (activeAccount?.stellar_public_key) {
      WalletFactory.getBalances(activeAccount.stellar_public_key).then((b) => {
        if (b) setBalances(b as unknown as Record<string, string>);
      });
    }
  }, [activeAccount]);

  const handleFlip = () => {
    setFromToken(toToken);
    setToToken(fromToken);
  };

  const mapAsset = (code: string) => {
    if (code === 'XLM') return 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC';
    if (code === 'USDC') return 'CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA';
    if (code === 'XRP') return 'CDDIA6HYANLPMDKBVQRIIXY3NA6S3TMHZFJUNPMBEJGZ5JSHN3E2TAUI';
    throw new Error(`O token ${code} ainda não possui um Contract ID (SAC) configurado para a Soroswap no ambiente Testnet.`);
  };

  const handleDirectSwap = async () => {
      if (!amount || !profile?.id) return;
      setStatus('swapping');

      try {
          logger.info('[WalletNow][Soroswap]', `Iniciando swap IN-PLACE de ${amount} ${fromToken} para ${toToken}`);
          
          const secretKeyStr = WalletFactory.getSecretKey(profile.id);
          if (!secretKeyStr) throw new Error("Credencial secreta indisponível. Cadastre Passkey.");
          const keypair = Keypair.fromSecret(secretKeyStr);
          const publicKey = keypair.publicKey();

          const swapCap = engine.getCapability('swap');
          if (!swapCap?.provider) throw new Error("Serviço de Swap (Soroswap) indisponível");

          logger.info('[WalletNow][Soroswap]', 'Obtendo Quote da Soroswap API');
          
          const quoteParams: any = {
              assetIn: mapAsset(fromToken),
              assetOut: mapAsset(toToken),
              amount: Math.floor(parseFloat(amount) * 1e7).toString(),
              tradeType: 'EXACT_IN',
              protocols: ['soroswap', 'phoenix', 'aqua', 'sdex']
          };

          logger.info('[WalletNow][Soroswap]', 'Payload enviado:', JSON.stringify(quoteParams));

          const quote = await swapCap.provider.getQuote(quoteParams);
          logger.info('[WalletNow][Soroswap]', 'Quote obtido com sucesso', quote);

          logger.info('[WalletNow][Soroswap]', 'Construindo Transação XDR');
          const buildPayload = {
              quote,
              source: publicKey,
              slippage: parseFloat(slippage) / 100
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

          setStatus('success');
          await refreshAccounts();
          alert('Swap efetuado com sucesso via Soroswap!');
          setAmount('');
      } catch (error: any) {
          logger.error('[WalletNow][Swap]', 'Erro Swap', error);
          
          let errorMsg = error.message || String(error);
          const isSoroswapError = errorMsg.includes('Soroswap') || errorMsg.includes('Path') || (error.details && error.details.title);

          if (isSoroswapError) {
              logger.warn('[WalletNow][Swap]', 'Soroswap falhou durante o swap. Nenhuma simulação será feita. Transação original falhou.');
          }

          alert(`Falha no Swap (Soroswap): ` + errorMsg);
          setStatus('idle');
      }
  };

  const [currentQuote, setCurrentQuote] = useState<any>(null);
  const [isQuoting, setIsQuoting] = useState(false);

  useEffect(() => {
    let active = true;
    const fetchQuote = async () => {
      if (!amount || parseFloat(amount) <= 0) {
        setCurrentQuote(null);
        return;
      }
      setIsQuoting(true);
      try {
        const swapCap = engine.getCapability('swap');
        if (swapCap?.provider) {
          const quoteParams = {
            assetIn: mapAsset(fromToken),
            assetOut: mapAsset(toToken),
            amount: Math.floor(parseFloat(amount) * 1e7).toString(),
            tradeType: 'EXACT_IN',
            protocols: ['soroswap', 'phoenix', 'aqua', 'sdex']
          };
          const quote = await swapCap.provider.getQuote(quoteParams);
          if (active) setCurrentQuote(quote);
        }
      } catch (err) {
        if (active) setCurrentQuote(null);
        logger.warn('[WalletNow][Swap]', 'Erro ao buscar quote preview', err);
      } finally {
        if (active) setIsQuoting(false);
      }
    };

    const timer = setTimeout(fetchQuote, 500);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [amount, fromToken, toToken, engine]);

  const estimatedOut = currentQuote?.amountOut
    ? (parseFloat(currentQuote.amountOut) / 1e7).toFixed(4)
    : (amount ? (isQuoting ? 'Buscando...' : 'Sem rota') : '—');
  return (
    <div
      className="glass-card"
      style={{
        padding: 'var(--space-6)',
        maxWidth: 420,
        width: '100%',
      }}
    >
      {/* Widget header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-5)' }}>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Swap</h2>
        <button
          className="btn btn-ghost btn-icon-sm"
          onClick={() => setShowSettings(!showSettings)}
          title="Configurações de swap"
        >
          <Settings size={14} />
        </button>
      </div>

      {/* Slippage settings */}
      {showSettings && (
        <div style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: 'var(--space-4)',
          marginBottom: 'var(--space-4)',
        }}>
          <label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8, display: 'block' }}>
            Slippage máximo
          </label>
          <div style={{ display: 'flex', gap: 6 }}>
            {['0.1', '0.5', '1.0'].map(s => (
              <button
                key={s}
                onClick={() => setSlippage(s)}
                className={`btn btn-sm ${slippage === s ? 'btn-accent-ghost' : 'btn-ghost'}`}
              >
                {s}%
              </button>
            ))}
            <input
              className="input"
              type="number"
              value={slippage}
              onChange={e => setSlippage(e.target.value)}
              style={{ width: 70, padding: '5px 10px', fontSize: 13 }}
              placeholder="Custom"
            />
          </div>
        </div>
      )}

      {/* From */}
      <div style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
        padding: 'var(--space-4)',
        marginBottom: 4,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
          <TokenSelector selected={fromToken} onSelect={setFromToken} label="De" />
          <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
              Saldo: {balances[fromToken.toLowerCase()] || '0.00'}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            className="input input-mono"
            type="number"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="0.00"
            style={{ background: 'transparent', border: 'none', boxShadow: 'none', fontSize: 24, fontWeight: 700, padding: '4px 0', flex: 1 }}
          />
          <button
            className="btn btn-ghost btn-sm"
            style={{ fontSize: 11, color: 'var(--accent)' }}
            onClick={() => setAmount(balances[fromToken.toLowerCase()] || '0')}
          >
            MAX
          </button>
        </div>
      </div>

      {/* Flip button */}
      <div style={{ display: 'flex', justifyContent: 'center', margin: '4px 0' }}>
        <button
          onClick={handleFlip}
          className="btn btn-secondary btn-icon"
          style={{ borderRadius: '50%', width: 36, height: 36 }}
          title="Inverter tokens"
        >
          <ArrowLeftRight size={14} />
        </button>
      </div>

      {/* To */}
      <div style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
        padding: 'var(--space-4)',
        marginTop: 4,
        marginBottom: 'var(--space-4)',
      }}>
        <TokenSelector selected={toToken} onSelect={setToToken} label="Para" />
        <div style={{ marginTop: 12, fontSize: 24, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
          {estimatedOut}
        </div>
      </div>

      {/* Info row */}
      {amount && parseFloat(amount) > 0 && (
        <div style={{
          background: 'rgba(0,255,153,0.04)',
          border: '1px solid rgba(0,255,153,0.1)',
          borderRadius: 'var(--radius-md)',
          padding: '10px 14px',
          marginBottom: 'var(--space-4)',
          fontSize: 12,
          color: 'var(--text-secondary)',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Taxa estimada (Rede)</span>
            <span style={{ color: 'var(--text-primary)' }}>
              {currentQuote?.networkFee ? `~${(parseInt(currentQuote.networkFee)/1e7).toFixed(5)} XLM` : '—'}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Slippage máximo</span>
            <span style={{ color: 'var(--text-primary)' }}>{slippage}%</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Price Impact</span>
            <span style={{ color: currentQuote?.priceImpact > 1 ? 'var(--warning)' : 'var(--text-primary)' }}>
              {currentQuote?.priceImpact !== undefined ? `${(currentQuote.priceImpact * 100).toFixed(2)}%` : '—'}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Rota</span>
            <span style={{ color: 'var(--accent)', fontSize: 11 }}>
              {currentQuote?.protocol ? `Via ${currentQuote.protocol.toUpperCase()}` : '—'}
            </span>
          </div>
        </div>
      )}

      {/* CTA */}
      <button
        className="btn btn-primary"
        style={{ width: '100%', padding: '13px', fontSize: 14 }}
        disabled={!amount || parseFloat(amount) <= 0 || status === 'swapping'}
        onClick={handleDirectSwap}
      >
        {status === 'swapping' ? (
           <>Processing Swap via Soroswap...</>
        ) : (
           <>
             <ArrowLeftRight size={15} />
             {!amount || parseFloat(amount) <= 0 ? 'Insira o valor' : `Swap ${fromToken} → ${toToken}`}
           </>
        )}
      </button>

      {/* Disclaimer */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        marginTop: 'var(--space-3)',
        fontSize: 11,
        color: 'var(--text-tertiary)',
      }}>
        <Info size={11} />
        <span>Transações Stellar são irreversíveis. Revise antes de confirmar.</span>
      </div>
    </div>
  );
}

// ─── SwapPage ─────────────────────────────────────────────────────────────────

export default function SwapPage() {
  const { manifests, isLoading, error } = useManifests({ category: 'swap' });

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em', margin: 0, color: 'var(--text-primary)' }}>
            Swap
          </h1>
          <p className="section-subtitle">
            Troque ativos nativamente na Stellar com a melhor rota disponível
          </p>
        </div>
      </div>

      {/* Main layout */}
      <div style={{ display: 'flex', gap: 'var(--space-6)', flexWrap: 'wrap', alignItems: 'flex-start' }}>
        {/* Widget */}
        <SwapWidget />

        {/* Protocols sidebar */}
        <div style={{ flex: 1, minWidth: 280 }}>
          <h2 className="section-title" style={{ fontSize: 15, marginBottom: 'var(--space-4)' }}>
            Protocolos de Swap
          </h2>

          {error ? (
            <ErrorState description={error} />
          ) : isLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {[0, 1].map(i => <SkeletonCard key={i} height={120} />)}
            </div>
          ) : manifests.length === 0 ? (
            <EmptyState
              icon={<ArrowLeftRight size={20} />}
              title="Nenhum protocolo de swap disponível"
              description="Os protocolos de swap serão exibidos aqui quando disponíveis na rede."
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {manifests.map(m => (
                <ProtocolCard key={m.id} manifest={m} compact />
              ))}
            </div>
          )}

          {/* Network info */}
          <div style={{
            marginTop: 'var(--space-4)',
            padding: 'var(--space-4)',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <Zap size={12} color="var(--accent)" />
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
                Stellar DEX
              </span>
            </div>
            <p style={{ margin: 0, fontSize: 12, color: 'var(--text-tertiary)', lineHeight: 1.6 }}>
              Swaps são executados on-chain na Stellar via AMMs e order books nativos. 
              Confirmação em ~5 segundos. Taxas mínimas (~0.00001 XLM).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
