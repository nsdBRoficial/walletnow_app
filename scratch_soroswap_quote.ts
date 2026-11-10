/**
 * @module scratch_soroswap_quote.ts
 * @description WalletNow Protocol - Arquitetura de carteira inteligente e pagamentos Stellar.
 */
import { loadEnv } from 'vite';

async function run() {
  const env = loadEnv('development', process.cwd(), '');
  const apiKey = env.VITE_SOROSWAP_API_KEY || 'N/A';

  const payload = {
    assetIn: 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC',
    assetOut: 'CB3TLW74NBIOT3BUWOZ3TUM6RFDF6A4GVIRUQRQZABG5KPOUL4JJOV2F',
    amount: '10000000',
    tradeType: 'EXACT_IN',
    protocols: ['soroswap', 'phoenix', 'aqua', 'sdex']
  };

  try {
    const res = await fetch('https://api.soroswap.finance/quote?network=testnet', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    console.log("Status:", res.status, JSON.stringify(data));
  } catch (err: any) {
    console.error("Fetch failed:", err.message);
  }
}

run();
