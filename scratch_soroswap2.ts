/**
 * @module scratch_soroswap2.ts
 * @description WalletNow Protocol - Arquitetura de carteira inteligente e pagamentos Stellar.
 */
import { SoroswapAPIClient } from './packages/plugins/plugin-soroswap/src/SoroswapAPIClient';
import { loadEnv } from 'vite';

async function run() {
  const env = loadEnv('development', process.cwd(), '');
  const apiKey = env.VITE_SOROSWAP_API_KEY || 'N/A';
  const client = new SoroswapAPIClient({ apiKey });

  const issuer = env.VITE_STELLAR_ISSUER_PUBLIC_KEY || 'GBBD47IF6LWK7P7MDEVSCWTTCJMZNCQGKYBOCZJQQZWV3W5J66K3Z44F'; // fallback just in case
  const usdcString = `USDC:${issuer}`;

  try {
    const res = await client.getQuote({
      assetIn: 'native',
      assetOut: usdcString,
      amount: '10000000', // 1 XLM
      tradeType: 'EXACT_IN',
      protocols: ['soroswap'] as any,
    }, 'testnet');
    console.log("Success with Code:Issuer format!", res);
  } catch (err: any) {
    console.error("Error with Code:Issuer:", err.message, err.details);
  }
}

run();
