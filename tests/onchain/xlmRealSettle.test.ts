/**
 * @module tests/onchain/xlmRealSettle.test.ts
 * @description Suíte de testes automatizados Vitest para validação de xlmRealSettle.
 */
import { describe, it } from 'vitest';
import { StellarTestAnchorService } from '../../src/services/providers/stellarTestAnchor/stellarTestAnchorService';
import { Keypair } from '@stellar/stellar-sdk';

describe('Real On-Chain Stellar XLM Settlement Test', () => {
  it('deve realizar um settlement REAL de 1 XLM na Testnet e logar o diagnóstico completo', async () => {
    // 1. Gerar uma carteira de usuário de teste dinamicamente
    const userKeypair = Keypair.random();
    const userPublicKey = userKeypair.publicKey();

    console.log('\n==================================================');
    console.log('🚀 INICIANDO TESTE REAL ON-CHAIN DE SETTLEMENT XLM');
    console.log(`User PublicKey (Destino): ${userPublicKey}`);
    console.log('==================================================\n');

    // 2. Fundar a nova conta via Friendbot para que ela exista no Ledger
    console.log('⏳ Chamando Friendbot para fundar e ativar a conta de destino...');
    const friendbotUrl = `https://friendbot.stellar.org?addr=${userPublicKey}`;
    try {
      const response = await fetch(friendbotUrl);
      if (!response.ok) {
        throw new Error(`Friendbot respondeu com status ${response.status}`);
      }
      await response.json();
      console.log(`✅ Conta ${userPublicKey} ativada via Friendbot!`);
    } catch (e: any) {
      console.error('❌ Falha ao ativar a conta no Friendbot:', e.message);
      return; // Aborta teste
    }

    // 3. Chamar o settlement real via StellarTestAnchorService
    const amountToSettle = '1.0000000'; // 1 XLM
    const correlationID = `test-${Date.now()}`;

    try {
      console.log(`\n⏳ Iniciando settleXLM: ${amountToSettle} para ${userPublicKey}...`);
      const result = await StellarTestAnchorService.settleXLM(
        userPublicKey,
        amountToSettle,
        correlationID
      );

      console.log('\n==================================================');
      console.log('RESULTADO FINAL DO SETTLEMENT XLM:');
      console.log('Sucesso:', result.success);
      console.log('TxHash:', result.txHash || 'N/A');
      console.log('Ledger:', result.ledger || 'N/A');
      console.log('Erro:', result.error || 'N/A');
      console.log('==================================================\n');
    } catch (e: any) {
      console.error('Falha geral no teste de settlement:', e.message);
    }
  }, 90000); // Timeout de 90 segundos para chamadas de rede da testnet
});
