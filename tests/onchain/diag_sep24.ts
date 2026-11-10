/**
 * @module tests/onchain/diag_sep24.ts
 * @description Suíte de testes automatizados Vitest para validação de diag_sep24.
 */
import { Keypair, Transaction, Networks } from '@stellar/stellar-sdk';

async function run() {
  const treasurySecret = 'SDG4Y22RUWD7R554PXM4VZPRY462YXU4WV5C6BLQFY7OVSAOOK3SODMM';
  const treasuryKeypair = Keypair.fromSecret(treasurySecret);
  const publicKey = treasuryKeypair.publicKey();
  const anchorDomain = 'testanchor.stellar.org';

  console.log(`🚀 Iniciando diagnóstico do SEP-24 para a Treasury: ${publicKey}`);

  try {
    // 1. SEP-10 Auth
    console.log('1. Obtendo challenge SEP-10...');
    const authUrl = `https://${anchorDomain}/auth?account=${publicKey}`;
    const authChallengeRes = await fetch(authUrl);
    if (!authChallengeRes.ok) {
      throw new Error(`Falha no GET /auth: HTTP ${authChallengeRes.status}`);
    }
    const challengeJson = await authChallengeRes.json();
    const transactionXDR = challengeJson.transaction;

    console.log('2. Assinando challenge localmente...');
    const challengeTx = new Transaction(transactionXDR, Networks.TESTNET);
    challengeTx.sign(treasuryKeypair);
    const signedXDR = challengeTx.toEnvelope().toXDR('base64');

    console.log('3. Submetendo challenge assinado...');
    const authPostRes = await fetch(`https://${anchorDomain}/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transaction: signedXDR })
    });
    if (!authPostRes.ok) {
      const errBody = await authPostRes.text();
      throw new Error(`Falha no POST /auth: HTTP ${authPostRes.status} — ${errBody}`);
    }
    const authData = await authPostRes.json();
    const jwtToken = authData.token;
    console.log('✅ JWT obtido com sucesso!');

    // 4. Solicitação de Depósito Interativo SEP-24
    console.log('4. Solicitando depósito interativo SEP-24...');
    const depositUrl = `https://${anchorDomain}/sep24/transactions/deposit/interactive`;
    const formData = new FormData();
    formData.append('asset_code', 'SRT');
    formData.append('account', publicKey);
    
    const depositRes = await fetch(depositUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${jwtToken}`
      },
      body: formData
    });

    if (!depositRes.ok) {
      const errText = await depositRes.text();
      throw new Error(`Falha ao solicitar depósito SEP-24: HTTP ${depositRes.status} — ${errText}`);
    }

    const depositData = await depositRes.json();
    console.log('✅ Depósito SEP-24 aceito:', JSON.stringify(depositData, null, 2));

    const interactiveUrl = depositData.url;
    console.log(`Interactive URL: ${interactiveUrl}`);

  } catch (err: any) {
    console.error('❌ ERRO NO DIAGNÓSTICO SEP-24:', err.message);
  }
}

run();
