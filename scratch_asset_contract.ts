/**
 * @module scratch_asset_contract.ts
 * @description WalletNow Protocol - Arquitetura de carteira inteligente e pagamentos Stellar.
 */
import { Asset } from '@stellar/stellar-sdk';
import { loadEnv } from 'vite';

async function run() {
  const env = loadEnv('development', process.cwd(), '');
  const issuer = env.VITE_STELLAR_ISSUER_PUBLIC_KEY || 'GBBD47IF6LWK7P7MDEVSCWTTCJMZNCQGKYBOCZJQQZWV3W5J66K3Z44F';
  
  const asset = new Asset('USDC', issuer);
  const contractId = asset.contractId('Test SDF Network ; September 2015');
  console.log("Contract ID:", contractId);
}

run();
