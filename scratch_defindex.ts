/**
 * @module scratch_defindex.ts
 * @description WalletNow Protocol - Arquitetura de carteira inteligente e pagamentos Stellar.
 */
import { DefindexAPIClient } from './packages/plugins/plugin-defindex/src/DefindexAPIClient';
import { loadEnv } from 'vite';

async function run() {
  const env = loadEnv('development', process.cwd(), '');
  const apiKey = env.VITE_DEFINDEX_API_KEY;

  const client = new DefindexAPIClient({ apiKey });
  try {
    const discover = await client.discoverVaults('mainnet');
    console.log(`Found ${discover.vaults.length} vaults on Mainnet.`);
    if (discover.vaults.length > 0) {
      const firstVault = discover.vaults[0];
      console.log('Testing first vault:', firstVault.address);
      const info = await client.getVaultInfo(firstVault.address, 'mainnet');
      console.log('Mainnet Vault Info:', JSON.stringify(info, null, 2));
    }
  } catch (err) {
    console.error(err);
  }
}

run();
