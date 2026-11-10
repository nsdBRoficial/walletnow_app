/**
 * @module src/services/paymentService.ts
 * @description Serviço de domínio e integração (paymentService) para operações Stellar, conciliação fiduciária e persistência Supabase (exporta: PaymentService).
 */
/**
 * @packageDocumentation
 * @module Services/PaymentService
 *
 * PaymentService — Motor de Orquestração Financeira Fiat-to-Crypto
 *
 * Responsabilidade Arquitetural (SRP):
 * Integrar o gateway de pagamentos Pix (Woovi) à rede Stellar:
 * - Emissão (Mint) de tokens estáveis na confirmação de recebimento Pix.
 * - Resgate e Queima (Burn) de tokens estáveis com liquidação fiduciária Pix Out.
 * - Patrocínio atômico de taxas (Gasless) via CAP-33.
 *
 * @updated Setembro de 2026
 * @version 0.4.5-candidate
 */

import { Keypair, Memo, Operation, TransactionBuilder, Asset, Horizon } from "@stellar/stellar-sdk";
import { WooviService } from "./wooviService";
import { StellarNetwork } from '../config/stellarNetwork';
import { AppConfig } from '../config/environment';
import { IssuerService } from '../utils/issuerService';

/**
 * [PT-BR] ARQUITETURA DE SEGURANÇA E CUSTÓDIA FINANCEIRA (AUDITORIA FASE 2 / REMEDIADO):
 * -----------------------------------------------------------------------------------
 * O segredo institucional do emissor (STELLAR_ISSUER_SECRET) reside exclusivamente
 * no ambiente protegido do Supabase Vault e é operado pela Edge Function `stellar-issuer`.
 * O frontend web NUNCA possui nem recebe a chave secreta do emissor.
 *
 * Princípio de Autocustódia:
 * 1. O usuário assina localmente as operações que envolvem sua própria carteira
 *    (ex: abertura de trustline via CAP-33 ou envio de fundos para queima/burn).
 * 2. A transação com assinatura parcial do usuário é despachada via `IssuerService.invoke()`
 *    para a Edge Function `stellar-issuer`.
 * 3. A Edge Function valida a autenticação JWT, confirma a titularidade da conta, co-assina
 *    com o patrocinador institucional e submete a transação com segurança à rede Stellar.
 */

/**
 * PaymentService
 * 
 * [PT-BR] Motor de orquestração financeira da WalletNow. Integra a Blockchain Stellar (Testnet) com o gateway fiduciário Woovi.
 * Lógica principal de Mint/Burn: Depósitos PIX disparam o 'Mint' On-ramp de tokens BRW, enquanto Saques disparam o 'Burn' e transferem Off-ramp via API Pix.
 * Sponsorship: Implementa abstração de taxas 'Gasless' via CAP-33 onde o Issuer (Mestre) patrocina a criação de Trustlines e de Conta para usuários leigos.
 * 
 * [EN-US] Financial orchestration engine for WalletNow. Integrates Stellar Blockchain (Testnet) with the Woovi fiat gateway.
 * Core Mint/Burn Logic: PIX deposits trigger an On-ramp 'Mint' of BRW tokens, while Withdrawals trigger a 'Burn' and process an Off-ramp transfer via Pix API.
 * Sponsorship Logic: Implements 'Gasless' fee abstraction via CAP-33, where the Issuer sponsors Trustline and Account creation for end-users.
 * 
 * ⚠️ AVISO DE SEGURANÇA / SECURITY WARNING (AUDITORIA v0.9):
 * O ISSUER_SECRET está carregado em variáveis para MVP. Em produção deve ir para Backend Functions.
 * ISSUER_SECRET is loaded in env variables for MVP. In production, this must be moved to Backend Functions.
 */

// A ISSUER_SECRET foi movida para a Edge Function stellar-issuer
const BASE_FEE = StellarNetwork.baseFee;

/** Trava de concorrência em memória para evitar Duplo Mint/Burn no mesmo ciclo */
const processingLock = new Set<string>();

export const PaymentService = {
    /**
     * [PT-BR] Realiza a emissão (Minting) de tokens BRW (On-Ramp).
     * Usa o conceito "Gasless" patrocinando a operação pelo emissor se a conta for nova (Sponsorship).
     * 
     * [EN-US] Executes the BRW token Minting (On-Ramp).
     * Uses "Gasless" concept by sponsoring the operation via Issuer if the account is new (Sponsorship / CAP-33).
     * 
     * @param targetPublicKey Chave G... do destinatário.
     * @param amount Valor em string (ex: "10.00").
     * @param userSecretKey Chave S... do usuário (usada apenas para assinar a abertura da Trustline).
     * @param correlationID ID da Woovi para o Memo X402.
     * @returns Hash da transação ou null.
     */
    async mintBRW(targetPublicKey: string, amount: string, userSecretKey?: string, correlationID?: string): Promise<string | null> {
        try {
            if (correlationID && processingLock.has(`mint_${correlationID}`)) {
                console.warn(`[WalletNow][Mint] ⚠️ Tentativa de Mint duplicada ignorada para ID: ${correlationID}`);
                return null;
            }
            if (correlationID) processingLock.add(`mint_${correlationID}`);

            // Verificação Crítica de Ambiente (Auditoria Hostinger)
            if (!AppConfig.stellar.issuerPublicKey) {
                console.error("❌ [PaymentService] Erro Fatal: VITE_STELLAR_ISSUER_PUBLIC não encontrada no ambiente.");
                throw new Error("Configuração do servidor incompleta (Missing Issuer Public Key).");
            }

            // X402: Rastreabilidade ponta-a-ponta Woovi <-> Stellar
            const x402Memo = correlationID
                ? Memo.text(`X402:${correlationID.slice(0, 22)}`)
                : Memo.none();

            const server = StellarNetwork.createServer();
            const ISSUER_PUBLIC = AppConfig.stellar.issuerPublicKey!;
            const brwAsset = new Asset('BRW', ISSUER_PUBLIC);

            console.log(`📡 [Stellar-Audit] Iniciando Mintagem para: ${targetPublicKey.slice(0, 8)}... [rede: ${StellarNetwork.networkType}]`);
            console.log(`🔑 [Stellar-Audit] Conta Pagadora/Emissora: ${ISSUER_PUBLIC.slice(0, 8)}...`);

            let isNewAccount = false;
            let hasTrustLine = false;

            // Verificação de existência e Trustline (Gasless Setup)
            try {
                const userAccount = await server.loadAccount(targetPublicKey);
                hasTrustLine = userAccount.balances.some(
                    (b: any) => b.asset_code === 'BRW' && b.asset_issuer === ISSUER_PUBLIC
                );
            } catch (error: any) {
                if (error.response?.status === 404) {
                    console.log("ℹ️ [Stellar-Audit] Destinatário não existe. Ativando via Sponsor (CAP-33).");
                    isNewAccount = true;
                } else {
                    throw error;
                }
            }

            const operations: any[] = [];

            // Fluxo CAP-33: Patrocínio de Reservas e Trustlines
            if (isNewAccount || !hasTrustLine) {
                console.log("🛠️ [Stellar-Audit] Setup de Trustline BRW necessário.");
                if (!userSecretKey) {
                    throw new Error("Ação requer assinatura local do usuário (Setup de Conta). Certifique-se de que a carteira está carregada.");
                }

                operations.push(Operation.beginSponsoringFutureReserves({ sponsoredId: targetPublicKey }));
                
                if (isNewAccount) {
                    operations.push(Operation.createAccount({ destination: targetPublicKey, startingBalance: '0' }));
                }

                operations.push(Operation.changeTrust({ asset: brwAsset, source: targetPublicKey }));
                operations.push(Operation.endSponsoringFutureReserves({ source: targetPublicKey }));
            }

            // Operação de Pagamento (Mintagem de fato)
            console.log("💸 [Stellar-Audit] Executando operação de Payment (Mint)...");
            operations.push(Operation.payment({
                destination: targetPublicKey,
                asset: brwAsset,
                amount: amount
            }));

            let hash: string;
            
            if (isNewAccount || !hasTrustLine) {
                // Precisa do co-signing (usuário + issuer) pois tem alteração de trustline
                const issuerAccount = await server.loadAccount(ISSUER_PUBLIC);
                const transaction = new TransactionBuilder(issuerAccount, {
                    fee: BASE_FEE,
                    networkPassphrase: StellarNetwork.passphrase,
                    memo: x402Memo,
                }).setTimeout(30);
                
                operations.forEach(op => transaction.addOperation(op));
                const builtTx = transaction.build();

                console.log("✍️ [Stellar-Audit] Coletando assinatura local do Usuário (Setup de Confiança)...");
                builtTx.sign(Keypair.fromSecret(userSecretKey!));
                
                const partialXdr = builtTx.toXDR();
                
                console.log("☁️ [Stellar-Audit] Enviando para Edge Function (Mint + Setup)...");
                hash = await IssuerService.invoke('mint_asset', {
                    publicKey: targetPublicKey,
                    assetCode: 'BRW',
                    amount,
                    correlationId: correlationID,
                    partialXdr
                });
            } else {
                // Trustline já existe, o mint é simples e 100% server-side
                console.log("☁️ [Stellar-Audit] Enviando para Edge Function (Apenas Mint)...");
                hash = await IssuerService.invoke('mint_asset', {
                    publicKey: targetPublicKey,
                    assetCode: 'BRW',
                    amount,
                    correlationId: correlationID
                });
            }

            console.info(`[WalletNow][Mint] ✨ Mintagem de ${amount} BRW concluída com sucesso via Edge Function! Hash: ${hash}`);
            return hash;
        } catch (error: any) {
            this._handleStellarError('OnRamp BRW', error);
            return null;
        } finally {
            if (correlationID) processingLock.delete(`mint_${correlationID}`);
        }
    },

    /**
     * [PT-BR] Executa a queima (Burn) de tokens BRW processando o saque (Off-Ramp).
     * O ativo volta para o Issuer, destruindo liquidez e liquidando para BRL.
     * Assinatura: Requer a autorização local da chave privada (autenticação bio-criptográfica Passkeys no app real).
     * 
     * [EN-US] Executes the Burn of BRW tokens to process a withdrawal (Off-Ramp).
     * The asset returns to the Issuer, destroying liquidity and settling to fiat BRL.
     * Signature: Requires local private key authorization (Passkeys bio-cryptographic auth in real app).
     * 
     * @param userSecretKey Chave S... do usuário.
     * @param amount Valor a ser queimado.
     * @param correlationID Identificador do saque.
     * @returns Hash da transação.
     */
    async executeOffRamp(userSecretKey: string, amount: string, correlationID: string): Promise<string | null> {
        try {
            if (processingLock.has(`burn_${correlationID}`)) {
                console.warn(`[WalletNow][Burn] ⚠️ Tentativa de Burn duplicada ignorada para ID: ${correlationID}`);
                return null;
            }
            processingLock.add(`burn_${correlationID}`);

            const server = StellarNetwork.createServer();
            const userKeypair = Keypair.fromSecret(userSecretKey);
            const userPublicKey = userKeypair.publicKey();
            const ISSUER_PUBLIC = AppConfig.stellar.issuerPublicKey!;

            // Validação de Saldo Prévio (Pre-flight check)
            const account = await server.loadAccount(userPublicKey);
            const brwBalance = account.balances.find(
                (b: any) => b.asset_code === 'BRW' && b.asset_issuer === ISSUER_PUBLIC
            );

            // Impedir burn negativo ou de saldo insuficiente.
            const requestedAmount = parseFloat(amount);
            if (requestedAmount <= 0) {
                throw new Error(`[WalletNow][Burn] Valor de queima inválido (negativo ou zero): ${amount}`);
            }

            if (!brwBalance || parseFloat(brwBalance.balance) < requestedAmount) {
                throw new Error(`[WalletNow][Burn] Saldo insuficiente: Você possui R$ ${brwBalance?.balance || '0.00'}, tentando sacar ${requestedAmount}`);
            }

            console.info(`[WalletNow][Burn] 🔥 Executando queima de ${amount} BRW na Blockchain para o ID: ${correlationID}`);

            // Memo X402 formatado para Saque
            const x402Memo = Memo.text(`saque-pix:${correlationID.slice(0, 18)}`);
            const issuerAccount = await server.loadAccount(ISSUER_PUBLIC);
            const brwAsset = new Asset('BRW', ISSUER_PUBLIC);

            const transaction = new TransactionBuilder(issuerAccount, {
                fee: BASE_FEE,
                networkPassphrase: StellarNetwork.passphrase,
                memo: x402Memo
            })
            .addOperation(Operation.payment({
                source: userPublicKey,
                destination: ISSUER_PUBLIC,
                asset: brwAsset,
                amount: amount
            }))
            .setTimeout(30)
            .build();

            transaction.sign(userKeypair); // Apenas user assina no client
            const partialXdr = transaction.toXDR();
            
            const hash = await IssuerService.invoke('burn_asset', {
                partialXdr,
                amount,
                correlationId: correlationID
            });
            
            console.info(`[WalletNow][Burn] ✨ Queima na Blockchain finalizada com sucesso via Edge Function. Hash: ${hash}`);
            return hash;
        } catch (error: any) {
            this._handleStellarError('Off-Ramp Blockchain', error);
            return null;
        } finally {
            processingLock.delete(`burn_${correlationID}`);
        }
    },

    /**
     * Orquestração Híbrida de Saque com Rollback Atômico.
     * Garante que se o PIX bancário falhar após a queima on-chain, o usuário receba estorno.
     */
    async executeOffRampWithRollback(userSecretKey: string, amount: string, correlationID: string, pixKey: string): Promise<{ hash: string, wooviId: string }> {
        let burnHash: string | null = null;
        
        // FASE 1: Queima On-Chain (Blockchain)
        burnHash = await this.executeOffRamp(userSecretKey, amount, correlationID);
        if (!burnHash) throw new Error("A transação de queima na Blockchain falhou.");
        
        try {
            // FASE 2: Saque Bancário (Woovi)
            const { correlationID: wooviId } = await WooviService.transferPix(pixKey, parseFloat(amount));
            return { hash: burnHash, wooviId };

        } catch (wooviError: any) {
            console.warn('⚠️ Falha no Gateway Bancário. Iniciando Estorno Atômico (Refund)...');
            
            // FASE 3: Rollback (Devolver o token ao usuário)
            const userPublicKey = Keypair.fromSecret(userSecretKey).publicKey();
            const refundMemo = `REFUND:${correlationID.slice(0, 21)}`;
            
            let refundHash: string | null = null;
            try {
                refundHash = await this.mintBRW(userPublicKey, amount, userSecretKey, refundMemo);
            } catch (e: any) {
                console.error('❌ Erro na execução do Mint de Estorno:', e.message);
            }

            if (refundHash) {
                throw new Error(`O pagamento PIX falhou no gateway bancário, mas seu saldo BRW foi estornado automaticamente.`);
            } else {
                throw new Error(`Saque falhou. Tokens retidos. Hash para suporte: ${burnHash}`);
            }
        }
    },

    /**
     * Troca de ativos (Swap) emulada via Market Maker Master (Gasless).
     */
    async swapAssets(userSecretKey: string, fromAssetCode: string, toAssetCode: string, payAmount: string, receiveAmount: string): Promise<string | null> {
        try {
            const server = StellarNetwork.createServer();
            const userKeypair = Keypair.fromSecret(userSecretKey);
            const userPublicKey = userKeypair.publicKey();
            const ISSUER_PUBLIC = AppConfig.stellar.issuerPublicKey!;

            const issuerAccount = await server.loadAccount(ISSUER_PUBLIC);
            const userAccount = await server.loadAccount(userPublicKey);

            const getAsset = (code: string) => code === 'XLM' ? Asset.native() : new Asset(code, ISSUER_PUBLIC);
            const fromAsset = getAsset(fromAssetCode);
            const toAsset = getAsset(toAssetCode);

            const operations: any[] = [];

            // 1. Recebe o ativo do usuário
            operations.push(Operation.payment({
                source: userPublicKey,
                destination: ISSUER_PUBLIC,
                asset: fromAsset,
                amount: String(parseFloat(payAmount).toFixed(7))
            }));

            // 2. Setup de Trustline Gasless se necessário
            if (toAssetCode !== 'XLM') {
                const hasTrustLine = userAccount.balances.some((b: any) => b.asset_code === toAssetCode);
                if (!hasTrustLine) {
                    operations.push(Operation.beginSponsoringFutureReserves({ sponsoredId: userPublicKey }));
                    operations.push(Operation.changeTrust({ source: userPublicKey, asset: toAsset }));
                    operations.push(Operation.endSponsoringFutureReserves({ source: userPublicKey }));
                }
            }

            // 3. Envia o novo ativo para o usuário
            operations.push(Operation.payment({
                source: ISSUER_PUBLIC,
                destination: userPublicKey,
                asset: toAsset,
                amount: String(parseFloat(receiveAmount).toFixed(7))
            }));

            const transaction = new TransactionBuilder(issuerAccount, {
                fee: BASE_FEE,
                networkPassphrase: StellarNetwork.passphrase
            })
            .setTimeout(30);

            operations.forEach(op => transaction.addOperation(op));

            const builtTx = transaction.build();

            builtTx.sign(userKeypair); // User assina
            
            const hash = await IssuerService.invoke('swap_assets', {
                partialXdr: builtTx.toXDR(),
                fromAssetCode,
                toAssetCode,
                payAmount: String(parseFloat(payAmount).toFixed(7)),
                receiveAmount: String(parseFloat(receiveAmount).toFixed(7))
            });
            
            return hash;
        } catch (error: any) {
            this._handleStellarError('Swap API', error);
            return null;
        }
    },

    /**
     * Envio P2P descentralizado com taxas pagas pelo Mestre (Gasless).
     */
    async sendAssetOnChain(userSecretKey: string, destPublicKey: string, assetCode: string, amount: string): Promise<string | null> {
        try {
            const server = StellarNetwork.createServer();
            const userKeypair = Keypair.fromSecret(userSecretKey);
            const ISSUER_PUBLIC = AppConfig.stellar.issuerPublicKey!;
            const issuerAccount = await server.loadAccount(ISSUER_PUBLIC);

            const getAsset = (code: string) => code === 'XLM' ? Asset.native() : new Asset(code, ISSUER_PUBLIC);

            const transaction = new TransactionBuilder(issuerAccount, {
                fee: BASE_FEE,
                networkPassphrase: StellarNetwork.passphrase
            })
            .addOperation(Operation.payment({
                source: userKeypair.publicKey(),
                destination: destPublicKey,
                asset: getAsset(assetCode),
                amount: String(parseFloat(amount).toFixed(7))
            }))
            .setTimeout(30)
            .build();

            transaction.sign(userKeypair);
            
            const hash = await IssuerService.invoke('send_on_chain', {
                partialXdr: transaction.toXDR(),
                destPublicKey,
                assetCode,
                amount: String(parseFloat(amount).toFixed(7))
            });
            return hash;
        } catch (error: any) {
            this._handleStellarError('Send On-Chain', error);
            return null;
        }
    },

    /**
     * Tratamento centralizado de erros da rede Stellar.
     */
    _handleStellarError(context: string, error: any) {
        console.error(`❌ [Stellar-Audit] Falha em ${context}:`, error?.response?.data || error.message);
        const codes = error?.response?.data?.extras?.result_codes;
        if (codes) {
            console.error(`🔍 Códigos de Erro: TX=${codes.transaction} | OPS=${codes.operations?.join(',')}`);
        }
    }
};
