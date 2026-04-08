# 💳 WalletNow - The Zero-Knowledge WaaS (v1.0)
LIVE STELLAR TESTNET ON: https://nsdbr.com/walletnow

*The end of Web3 complexity. Now with a Full Fin-on-Chain Asset Cycle.*

## 📖 Project Description (Pitch-Focus)

**WalletNow** is a "Wallet-as-a-Service" (WaaS) platform focused on financial interoperability with the **Stellar Network**. We abstract 100% of crypto technical complexities (seeds, keys, gas) for new users, delivering the agility and natural experience of a fiat bank via Instant PIX without compromising the Blockchain DNA.

**Key Highlights:**
- **Maximum Sovereignty & Passkeys:** All transaction signatures and identity keys occur locally on the client through bio-cryptographic authentication based on **Passkeys (WebAuthn)**. No private key is ever transmitted to central servers (Non-Custodial architecture based on the user's secure enclave).
- **Fast On/Off Ramp via PIX:** Fluid fiat-to-crypto gateways powered by `WooviService`.
- **Mint/Burn & ZK-STARKs Integration:** Financial flows operate at a 1:1 peg, instantly Minting On-chain Tokens (**BRW**) and Burning them upon withdrawals. This entire flow validates **Zero-Knowledge** premises, allowing end-to-end Liveness Verification of onboarded users without exposing privacy hashes or PII data on the Mainnet, using ZK-STARKs principles to prove identity sovereignty.

## 🛠️ Setup Instructions

To run the platform completely offline/locally via **Sandbox**:

1. Clone the repository to your local machine:
   ```bash
   git clone https://github.com/nsdBRoficial/walletnow_app.git
   cd walletnow_app
   ```
2. Copy the environment example file containing the integration placeholders:
   ```bash
   cp .env.example .env.development
   ```
3. Fill in the required keys in the `.env.development` file:
   - `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (Your Auth instance).
   - `VITE_STELLAR_ISSUER_SECRET` (The master key for Testnet Gasless sponsorship).
   - `VITE_GEMINI_API_KEY` (Google Key for Chat/KYC Intelligence).
   - `VITE_WOOVI_APP_ID` (AppID/Key for the banking gateway).

4. Install the dependencies using Node:
   ```bash
   npm install
   ```
5. Start in developer mode:
   ```bash
   npm run dev
   ```

## 📸 Screenshots Table

Below are the visual indicators proving the successfully executed WalletNow flows.

| Application Step | Proven State Description | Image Location / Path |
| :--- | :--- | :--- |
| **Wallet Connected** | Passive connection state via Supabase with locally generated Wallet. | `/docs/screenshots/wallet_connected.png` |
| **Balance Displayed** | Active on-chain asset reading (BRW, BRZ, XLM) on the Testnet. | `/docs/screenshots/balance_dashboard.png` |
| **Successful Testnet Tx** | Blockchain operation history via dashboard or attached explorer. | `/docs/screenshots/testnet_tx.png` |
| **Tx Result Modal** | Clear StellarExpert audit link after Minting/Burning inside operation modals. | `/docs/screenshots/success_modal_explorer.png` |

---

## 🏗️ Technical Core & X402 Standard

### Traceability Standard (X402)
Every fiat transaction is strongly cryptographically tied to a Blockchain transaction through verifiable Memos (`X402:correlationID`), enabling total end-to-end auditing.

### Sponsored Reserves (CAP-33)
Our account abstraction architecture is powered by Stellar's **Sponsored Reserves (CAP-33)**. The protocol eliminates the need for the user to buy XLM just to "open a wallet". This action is magically subsidized by a Master Issuer that manages Trustlines automatically, making the UX as clean as a Web2 application.

*   `/src/services/paymentService.ts`: Financial orchestrator (*Mint, Burn, Sponsorship*).
*   `/src/services/wooviService.ts`: PIX gateway integration.
*   `/src/services/walletFactory.ts`: Sovereign Zero-Knowledge management on the client.

---
*Disclaimer: This project submitted for the Hackathon runs entirely on the Stellar Testnet.*
