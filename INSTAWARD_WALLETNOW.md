# INSTAWARDS SOW ATUALIZADO PROJETO WALLETNOW

**[en]**
## 1. Project & Team Information
**Project Name:** WalletNow — Your Web3 self-custody fiat ramp abstraction.
**Team:** NSD Team (Solo Developer).
**Primary Contacts:**
- Douglas Alexandre (Decision Maker / Developer) [nsd.douglas@gmail.com].

**Ambassador Chapter:** Rio de Janeiro.
**Submission Date:** 11/03/2026.


## 2. Overview & Intent
**Purpose:** To validate the WalletNow MVP as a seamless fiat-to-crypto gateway, ensuring absolute Full Abstraction of Blockchain complexities and instant settlement via Stellar BRZ.
**Intent:** Delivery of a functional prototype featuring GasLess processing (via Sponsored Reserves), ZK-Stark Trust Layer identification, and real-time PIX deposits automated in BRZ within 30 days.


## 3. Problem Statement & Objective
**Problem:** Regular users entering Web3 face extremely steep learning curves involving seed phrases, gas fees, and complex bridging processes.
**Objective:** In 30 days, the MVP will demonstrate a "Web2 App Experience" where users log in via Passkeys, generate a dynamic PIX QR code, and instantly receive BRZ assets settled directly in their decentralized self-custody wallets without paying a single XLM in fees.


## 4. Scope of Work (30-Day Deliverables)
- **WalletNow Mobile/PWA MVP:** Interface entirely free of crypto jargon, onboarding with Firebase Auth + WebAuthn (Passkeys), and support for Sponsored Reserves (GasLess).
- **Transfero BRZ & Stellar SDK Integration:** "Just-in-Time" fiat settlement utilizing the Transfero BaaSiC API and automated mint transfers of BRZ on the Stellar Testnet.
- **PQC Trust Registry:** Implementation of user identity and KYC registration natively encrypted inside the platform, utilizing Gemini Multimodal AI and SHA-3 256 Hash constraints for anti-fraud validation.


## 5. Execution Plan & Timeline (30 Days)
- **Week 1:** Technical infrastructure setup (React/Vite, Supabase databases, Stellar Wallet Factory module).
- **Week 2:** Development of the authentication flow, Passkey enrollment, and biometric Identity abstraction (Magic Setup) along with Gemini AI KYC checks.
- **Week 3:** Integration of the On-Ramp and Off-Ramp API services (Transfero), Frontend Polling for PIX deposits, and GasLess token minting (Stellar SDK).
- **Week 4:** Final deployment to static web-hosting (Hostinger), edge cases testing (Rate Limits, UI loading loops), and UI polishing.


## 6. Evidence of Completion
- **Deliverable 1:** Public/Private GitHub repository access + Live URL deployed on Hostinger demonstrating the Full Abstraction user journey.
- **Deliverable 2:** Demonstrative transaction hash (Tx hash) of the BRZ settlement recorded directly on Stellar Expert.
- **Deliverable 3:** Documentation of the PQC Identity mechanisms and the GasLess fee abstraction capabilities built on top of the Stellar Network.


## 7. Budget & Rationale
**Requested Amount:** $5,000 USD.
**Rationale:** Dedicated hours for advanced blockchain engineering, integration of Web3 payment gateways (Transfero BaaSiC), architectural decoupling, and post-quantum identity mechanisms abstraction (GasLess reserves management).
**Commitment:** Completion of the remaining scope and stabilization of the product within 30 days with focused and verifiable execution.
