/**
 * @module tests/onchain/diag_sep6.ts
 * @description Suíte de testes automatizados Vitest para validação de diag_sep6.
 */
import { Keypair, Transaction, Networks } from '@stellar/stellar-sdk';

async function run() {
  const treasurySecret = 'SDG4Y22RUWD7R554PXM4VZPRY462YXU4WV5C6BLQFY7OVSAOOK3SODMM';
  const treasuryKeypair = Keypair.fromSecret(treasurySecret);
  const publicKey = treasuryKeypair.publicKey();
  const anchorDomain = 'testanchor.stellar.org';

  console.log(`🚀 Iniciando diagnóstico do SEP-6 para a Treasury: ${publicKey}`);

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

    // 4. Solicitação de Depósito SEP-6
    console.log('4. Solicitando depósito SEP-6...');
    const depositUrl = `https://${anchorDomain}/sep6/deposit?asset_code=SRT&account=${publicKey}&amount=10&type=bank_account`;
    const depositRes = await fetch(depositUrl, {
      headers: {
        'Authorization': `Bearer ${jwtToken}`
      }
    });
    if (!depositRes.ok) {
      const errText = await depositRes.text();
      throw new Error(`Falha ao solicitar depósito SEP-6: HTTP ${depositRes.status} — ${errText}`);
    }
    const depositData = await depositRes.json();
    console.log('✅ Solicitação de Depósito aceita:', JSON.stringify(depositData, null, 2));

    const txId = depositData.id;

    // 5. Consulta à transação SEP-6 com o token JWT
    console.log(`5. Consultando detalhes da transação SEP-6 ID: ${txId}...`);
    const txDetailsUrl = `https://${anchorDomain}/sep6/transaction?id=${txId}`;
    const txDetailsRes = await fetch(txDetailsUrl, {
      headers: {
        'Authorization': `Bearer ${jwtToken}`
      }
    });
    if (!txDetailsRes.ok) {
      const errText = await txDetailsRes.text();
      throw new Error(`Falha ao consultar transação: HTTP ${txDetailsRes.status} — ${errText}`);
    }
    const txDetailsData = await txDetailsRes.json();
    console.log('==================================================');
    console.log('DETALHES COMPLETOS DA TRANSAÇÃO SEP-6:');
    console.log(JSON.stringify(txDetailsData, null, 2));
    console.log('==================================================');

  } catch (err: any) {
    console.error('❌ ERRO NO DIAGNÓSTICO:', err.message);
    if (err.stack) console.error(err.stack);
  }
}

run();
