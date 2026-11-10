/**
 * @module tests\integration\complete_sep24.ts
 * @description WalletNow Protocol - Arquitetura de carteira inteligente e pagamentos Stellar.
 */
import { Keypair, Transaction, Networks } from '@stellar/stellar-sdk';

async function run() {
  const treasurySecret = 'SDG4Y22RUWD7R554PXM4VZPRY462YXU4WV5C6BLQFY7OVSAOOK3SODMM';
  const treasuryKeypair = Keypair.fromSecret(treasurySecret);
  const publicKey = treasuryKeypair.publicKey();
  const anchorDomain = 'testanchor.stellar.org';

  console.log(`🚀 Iniciando tentativa de auto-complete de SEP-24 para a Treasury: ${publicKey}`);

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
    const txId = depositData.id;
    console.log(`✅ Depósito SEP-24 aceito! ID: ${txId}`);

    // 5. Tenta chamar a rota de complete do Polaris
    console.log('5. Tentando chamar endpoint de complete do Polaris...');
    
    // Tentamos caminhos comuns
    const commonPaths = [
      `/sep24/transaction/deposit/interactive/complete?transaction_id=${txId}`,
      `/sep24/transactions/deposit/interactive/complete?transaction_id=${txId}`,
      `/sep24/transaction/deposit/complete?transaction_id=${txId}`,
      `/sep24/transactions/deposit/complete?transaction_id=${txId}`,
    ];

    for (const path of commonPaths) {
      const url = `https://${anchorDomain}${path}`;
      console.log(`Testando GET em: ${url}`);
      try {
        const res = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${jwtToken}`
          }
        });
        console.log(`Resposta: HTTP ${res.status}`);
        if (res.ok) {
          const body = await res.text();
          console.log('Sucesso! Body:', body.slice(0, 100));
        }
      } catch (err: any) {
        console.log('Erro no caminho:', err.message);
      }
    }

  } catch (err: any) {
    console.error('❌ ERRO:', err.message);
  }
}

run();
