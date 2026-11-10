/**
 * @module scratch_soroswap.ts
 * @description WalletNow Protocol - Arquitetura de carteira inteligente e pagamentos Stellar.
 */
import { SoroswapAPIClient } from './packages/plugins/plugin-soroswap/src/SoroswapAPIClient';
import { loadEnv } from 'vite';

async function run() {
  const env = loadEnv('development', process.cwd(), '');
  const apiKey = env.VITE_SOROSWAP_API_KEY || 'N/A';
  const client = new SoroswapAPIClient({ apiKey });

  const tests = [
    { name: "Omitted", value: undefined },
    { name: "Empty Array", value: [] },
    { name: "['soroswap']", value: ['soroswap'] },
    { name: "['SOROSWAP']", value: ['SOROSWAP'] },
    { name: "['phoenix']", value: ['phoenix'] },
    { name: "['soroswap', 'phoenix']", value: ['soroswap', 'phoenix'] }
  ];

  for (const t of tests) {
    try {
      const payload: any = {
        assetIn: 'native',
        assetOut: 'CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75',
        amount: '100000000',
        tradeType: 'EXACT_IN'
      };
      if (t.value !== undefined) {
        payload.protocols = t.value;
      }
      
      await client.getQuote(payload, 'testnet');
      console.log(`Success with ${t.name}!`);
    } catch (err: any) {
      console.error(`Error with ${t.name}:`, err.message);
    }
  }
}

run();
