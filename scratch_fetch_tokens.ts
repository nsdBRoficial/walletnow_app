/**
 * @module scratch_fetch_tokens.ts
 * @description WalletNow Protocol - Arquitetura de carteira inteligente e pagamentos Stellar.
 */
async function run() {
  const res = await fetch('https://api.soroswap.finance/api/tokens?network=testnet');
  const text = await res.text();
  console.log("Response:", text.substring(0, 1000));
}
run();
