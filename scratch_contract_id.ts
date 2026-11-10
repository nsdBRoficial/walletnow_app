/**
 * @module scratch_contract_id.ts
 * @description WalletNow Protocol - Arquitetura de carteira inteligente e pagamentos Stellar.
 */
import { Asset } from '@stellar/stellar-sdk';

async function run() {
  try {
    // Official USDC Testnet Issuer
    const issuer = 'GBBD47IF6LWK7P7MDEVSCWTTCJMZNCQGKYBOCZJQQZWV3W5J66K3Z44F';
    const asset = new Asset('USDC', issuer);
    const contractId = asset.contractId('Test SDF Network ; September 2015');
    console.log("USDC Contract ID on Testnet:", contractId);
  } catch(e: any) {
    console.error(e.message);
  }
}

run();
