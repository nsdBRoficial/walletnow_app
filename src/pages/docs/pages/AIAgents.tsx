/**
 * @module src\pages\docs\pages\AIAgents.tsx
 * @description WalletNow Protocol - Arquitetura de carteira inteligente e pagamentos Stellar.
 */
﻿import React, { useState, useCallback } from 'react';
import { Copy, Check, ExternalLink } from 'lucide-react';
import { Keypair, Transaction } from '@stellar/stellar-sdk';

const NETWORKS = {
  TESTNET: 'Test SDF Network ; September 2015'
};

interface LogEntry {
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
  timestamp: string;
}

export default function AIAgents() {
  const [sepSecretKey, setSepSecretKey] = useState('');
  const [sepAnchor, setSepAnchor] = useState('testanchor.stellar.org');
  const [sepAsset, setSepAsset] = useState('SRT');
  const [sepLoading, setSepLoading] = useState(false);
  const [sepResultUrl, setSepResultUrl] = useState<string | null>(null);
  const [sepLogs, setSepLogs] = useState<LogEntry[]>([
    { message: 'IA & SEP Integration Console initialized.', type: 'info', timestamp: new Date().toLocaleTimeString() }
  ]);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const addSepLog = useCallback((message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info') => {
    setSepLogs(prev => [
      { message, type, timestamp: new Date().toLocaleTimeString() },
      ...prev
    ]);
  }, []);

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(type);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const handleRunSepFlow = async () => {
    if (!sepSecretKey) {
      addSepLog('Erro: Chave Secreta do usuario e obrigatoria.', 'error');
      return;
    }
    setSepLoading(true);
    setSepResultUrl(null);
    addSepLog(`Iniciando fluxo invisivel com ${sepAnchor}...`, 'info');

    try {
      const userKeypair = Keypair.fromSecret(sepSecretKey);
      const userAddress = userKeypair.publicKey();

      addSepLog(`[SEP-10] Solicitando desafio para conta: ${userAddress.slice(0, 8)}...`, 'info');
      const challengeUrl = `https://${sepAnchor}/auth?account=${userAddress}`;
      const challengeRes = await fetch(challengeUrl);
      if (!challengeRes.ok) throw new Error(`Falha no GET /auth: HTTP ${challengeRes.status}`);
      const challengeJson = await challengeRes.json();
      const transactionXDR = challengeJson.transaction;
      addSepLog(`[SEP-10] Desafio obtido. Assinando silenciosamente localmente...`, 'info');

      const challengeTx = new Transaction(transactionXDR, NETWORKS.TESTNET);
      challengeTx.sign(userKeypair);
      const signedXDR = challengeTx.toEnvelope().toXDR('base64');
      addSepLog(`[SEP-10] Enviando desafio assinado para a ancora...`, 'info');

      const tokenRes = await fetch(`https://${sepAnchor}/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transaction: signedXDR })
      });
      if (!tokenRes.ok) throw new Error(`Falha no POST /auth: HTTP ${tokenRes.status}`);
      const tokenJson = await tokenRes.json();
      const jwtToken = tokenJson.token;
      addSepLog(`[SEP-10] Autenticacao concluida! Token JWT recebido.`, 'success');

      addSepLog(`[SEP-24] Solicitando rampa interativa para o ativo ${sepAsset}...`, 'info');
      const depositUrl = `https://${sepAnchor}/sep24/transactions/deposit/interactive`;
      const formData = new FormData();
      formData.append('asset_code', sepAsset);
      formData.append('account', userAddress);

      const depositRes = await fetch(depositUrl, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${jwtToken}` },
        body: formData
      });

      if (!depositRes.ok) {
        const errText = await depositRes.text();
        throw new Error(`Falha no deposito SEP-24: HTTP ${depositRes.status} - ${errText}`);
      }

      const depositData = await depositRes.json();
      setSepResultUrl(depositData.url);
      addSepLog(`[SEP-24] Sucesso! Rampa fiduciaria gerada em background.`, 'success');
    } catch (err: any) {
      console.error('[SEP Flow Error]', err);
      addSepLog(`Falha no fluxo SEP: ${err.message}`, 'error');
    } finally {
      setSepLoading(false);
    }
  };

  const AI_PROMPT = `Voce e um assistente de desenvolvimento especialista na blockchain Stellar e no WalletNow SDK.
Ao gerar codigos para integracao de carteiras e onboarding:
1. Sempre use o WalletNowClient da biblioteca '@walletnow/sdk' para inicializar.
2. Abstraia a complexidade de transacoes. Use 'wn.onboarding.createUser({ externalId, authMethod })' para criar contas com biometria/Passkey de forma gasless patrocinada.
3. Para depositos fiduciarios e onboarding de ativos de forma invisivel, utilize o 'StellarAnchorService.seamlessFund(anchorDomain, userAddress, userSecretKey, assetCode)'.
4. NUNCA exponha chaves privadas no frontend de producao.`;

  return (
    <div className="ai-agents-wrapper">
      <h1 className="mb-4">IA &amp; SEP Integration</h1>
      <p className="doc-subtitle">
        Veja o WalletNow SDK em acao. Copie prompts para IAs de codificacao e teste fluxos de autenticacao (SEP-10) e deposito fiduciario (SEP-24) de forma silenciosa para o usuario final.
      </p>

      <div className="doc-info-card" style={{ marginBottom: '32px' }}>
        <strong>Explorando IAs na Rede Stellar?</strong>
        <p style={{ marginTop: '8px', marginBottom: 0 }}>
          Se voce esta construindo agentes autonomos ou integracoes de IA, a propria Stellar fornece ferramentas poderosas.
          Recomendamos a leitura da documentacao oficial:{' '}
          <a
            href="https://developers.stellar.org/docs/build/building-with-ai"
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontWeight: 'bold', textDecoration: 'underline' }}
          >
            Building with AI on Stellar
          </a>.
        </p>
      </div>

      <div className="ai-grid">
        <div className="tk-main-card">
          <div className="ai-card-header">
            <div className="tk-badge">SEP-01 · SEP-10 · SEP-24</div>
            <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Simulador de Onboarding Invisivel</h3>
          </div>

          <div className="ai-section-box" style={{ borderColor: 'rgba(0,255,153,0.2)' }}>
            <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent)', margin: '0 0 8px 0' }}>
              Prompt de System para IAs (Cursor, Gemini, Copilot)
            </h4>
            <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', margin: '0 0 12px 0' }}>
              Copie e cole este prompt no chat da sua IA favorita para ensina-la a integrar o WalletNow SDK.
            </p>
            <div style={{ background: '#090d16', borderRadius: '6px', padding: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <textarea
                readOnly
                style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', resize: 'none', fontFamily: "JetBrains Mono, monospace", fontSize: '11px', color: '#a1a1aa', lineHeight: 1.6 }}
                rows={6}
                value={AI_PROMPT}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button className="tk-sec-btn sm" onClick={() => copyToClipboard(AI_PROMPT, 'AI Prompt')}>
                  {copiedText === 'AI Prompt' ? <Check size={12} color="#00ff99" /> : <Copy size={12} />} Copiar Prompt
                </button>
              </div>
            </div>
          </div>

          <div className="ai-section-box" style={{ marginTop: '16px' }}>
            <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 4px 0' }}>
              Live Demo: Onboarding Silencioso de Ancora
            </h4>
            <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', margin: '0 0 16px 0' }}>
              Simule o fluxo criptografico em segundo plano.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label className="tk-lbl">Chave Privada de Teste (S...)</label>
                <input
                  type="password"
                  className="tk-input-text"
                  style={{ fontFamily: "JetBrains Mono, monospace" }}
                  placeholder="Insira a Secret Key do usuario"
                  value={sepSecretKey}
                  onChange={e => setSepSecretKey(e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label className="tk-lbl">Ancora de Destino</label>
                  <input type="text" className="tk-input-text" value={sepAnchor} onChange={e => setSepAnchor(e.target.value)} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label className="tk-lbl">Codigo do Ativo</label>
                  <input type="text" className="tk-input-text" style={{ fontFamily: "JetBrains Mono, monospace" }} value={sepAsset} onChange={e => setSepAsset(e.target.value)} />
                </div>
              </div>

              <button
                className={`tk-primary-btn${sepLoading ? ' loading' : ''}`}
                onClick={handleRunSepFlow}
                disabled={sepLoading}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                {sepLoading ? <span className="tk-spinner" /> : 'Executar Fluxo Invisivel'}
              </button>
            </div>

            {sepResultUrl && (
              <div style={{ background: 'rgba(0,255,153,0.05)', border: '1px dashed var(--accent)', borderRadius: '8px', padding: '16px', marginTop: '16px' }}>
                <h5 style={{ color: 'var(--accent)', margin: '0 0 8px 0', fontSize: '13px' }}>Rampa Fiduciaria Criada!</h5>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0 0 12px 0' }}>
                  Clique no botao abaixo para abrir a interface hospedada da ancora:
                </p>
                <a
                  href={sepResultUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="tk-primary-btn"
                  style={{ textDecoration: 'none', color: '#000', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}
                >
                  Abrir Rampa Interativa SEP-24 <ExternalLink size={14} />
                </a>
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', minWidth: 0 }}>
          <div className="tk-side-card">
            <h4 className="tk-card-title-small">SEP-01: stellar.toml do Emissor</h4>
            <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', margin: '0 0 10px 0' }}>
              Metadados descobertos publicamente no dominio de testes.
            </p>
            <div className="tk-console" style={{ background: '#090d16', maxHeight: '280px' }}>
              <pre style={{ color: '#a1a1aa', fontSize: '11px', margin: 0, fontFamily: "JetBrains Mono, monospace", overflowX: 'auto', whiteSpace: 'pre' }}>
{`# stellar.toml
ACCOUNTS = [
  "GDGD77A34F5T3TLSOOHWRE4KXZ5TMLWZ5EBYUQSCE2AXGWWPL2RXYWRX",
  "GBCLQJID2ESAVTYM5GGPX7GQNW42WBAELU5RVITBGFS5PM6XCG4IVDP42"
]
VERSION = "2.1.0"
NETWORK_PASSPHRASE = "Test Network"

[[CURRENCIES]]
code = "BRW"
name = "WalletNow BRL"
status = "live"

[[CURRENCIES]]
code = "USDW"
name = "WalletNow USD"
status = "live"`}
              </pre>
            </div>
          </div>

          <div className="tk-side-card">
            <h4 className="tk-card-title-small">Logs do Console de Abstracao</h4>
            <div className="tk-console" style={{ minHeight: '120px', maxHeight: '260px' }}>
              {sepLogs.map((log, idx) => (
                <div key={idx} className={`tk-console-line ${log.type}`}>
                  <span className="tk-console-time">{log.timestamp}</span>
                  {log.message}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .ai-agents-wrapper { width: 100%; }
        .ai-grid { display: grid; grid-template-columns: 1fr 280px; gap: 20px; width: 100%; align-items: flex-start; }
        @media (max-width: 900px) { .ai-grid { grid-template-columns: 1fr; } }
        .ai-card-header { display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px; }
        .ai-section-box { background: rgba(255,255,255,0.02); border: 1px solid var(--border-subtle); border-radius: 8px; padding: 16px; }
        .tk-main-card { background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: 12px; padding: 24px; min-width: 0; }
        .tk-side-card { background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: 12px; padding: 16px; position: sticky; top: 80px; }
        @media (max-width: 900px) { .tk-side-card { position: static; } }
        .tk-badge { display: inline-flex; background: rgba(0,255,153,0.1); color: var(--accent); padding: 3px 10px; border-radius: 100px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; border: 1px solid rgba(0,255,153,0.2); }
        .tk-card-title-small { font-size: 11px; font-weight: 800; color: var(--text-tertiary); text-transform: uppercase; margin: 0 0 10px 0; letter-spacing: 0.05em; }
        .tk-lbl { display: block; font-size: 11px; font-weight: 600; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.05em; }
        .tk-input-text { background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; padding: 9px 12px; color: var(--text-primary); font-size: 13px; transition: all 0.2s; width: 100%; box-sizing: border-box; }
        .tk-input-text:focus { outline: none; border-color: var(--accent); background: rgba(0,255,153,0.05); }
        .tk-primary-btn { background: var(--accent); color: #000; border: none; border-radius: 6px; padding: 11px 20px; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; gap: 8px; }
        .tk-primary-btn:hover { background: #00cc7a; transform: translateY(-1px); }
        .tk-primary-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
        .tk-sec-btn { background: rgba(255,255,255,0.05); color: var(--text-primary); border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; padding: 9px 16px; font-size: 13px; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; gap: 6px; }
        .tk-sec-btn:hover { background: rgba(255,255,255,0.1); }
        .tk-sec-btn.sm { padding: 5px 10px; font-size: 11px; }
        .tk-console { background: #0d0d0f; border-radius: 6px; padding: 10px; font-size: 11px; overflow-y: auto; display: flex; flex-direction: column; gap: 6px; border: 1px solid rgba(255,255,255,0.05); }
        .tk-console-line { color: var(--text-secondary); line-height: 1.4; word-break: break-all; }
        .tk-console-line.info { color: #a1a1aa; }
        .tk-console-line.success { color: var(--accent); }
        .tk-console-line.error { color: #ff4d4d; }
        .tk-console-time { color: rgba(255,255,255,0.3); margin-right: 6px; }
      `}</style>
    </div>
  );
}
