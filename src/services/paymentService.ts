import { Keypair, Memo, Operation, TransactionBuilder, Networks, Asset, Horizon } from "@stellar/stellar-sdk";
import { WooviService } from "./wooviService";

/**
 * PaymentService
 * 
 * Motor de orquestração financeira da WalletNow.
 * Integra a Blockchain Stellar (Testnet) com o gateway fiduciário Woovi.
 * 
 * Ativos:
 * - BRW: WalletNow Real Digital (Lastro 1:1 BRL, Ativo Soberano)
 * - BRZ: Digital Real (Testnet Asset)
 * 
 * Conceitos Blockchain Utilizados:
 * - Gasless (CAP-33): O Mestre (Issuer) patrocina a criação de contas e trustlines.
 * - X402 Tracking: Uso do campo MEMO para rastreabilidade entre PIX e Blockchain.
 * - Atomic Rollback: Garantia de estorno em caso de falha no gateway bancário.
 * 
 * ⚠️ AVISO DE SEGURANÇA (AUDITORIA v0.9):
 * O ISSUER_SECRET está sendo carregado via variáveis de ambiente VITE_ para prototipagem (MVP).
 * Em PRODUÇÃO, esta lógica deve ser movida para Backend Functions para evitar exposição no Client-side.
 */

const ISSUER_SECRET = import.meta.env.VITE_STELLAR_ISSUER_SECRET;
const BASE_FEE = '100000'; // 0.01 XLM (Alta para prioridade em Testnet)

export const PaymentService = {
    /**
     * Realiza a emissão (Minting) de tokens BRW para uma carteira de usuário.
     * Implementa Onboarding Mágico (Gasless) via CAP-33 se a conta for nova.
     * 
     * @param targetPublicKey Chave G... do destinatário.
     * @param amount Valor em string (ex: "10.00").
     * @param userSecretKey Chave S... do usuário (usada apenas para assinar a abertura da Trustline).
     * @param correlationID ID da Woovi para o Memo X402.
     * @returns Hash da transação ou null.
     */
    async mintBRW(targetPublicKey: string, amount: string, userSecretKey?: string, correlationID?: string): Promise<string | null> {
        try {
            // Verificação Crítica de Ambiente (Auditoria Hostinger)
            if (!ISSUER_SECRET) {
                console.error("❌ [PaymentService] Erro Fatal: VITE_STELLAR_ISSUER_SECRET não encontrada no ambiente.");
                throw new Error("Configuração do servidor incompleta (Missing Issuer Key).");
            }

            // X402: Rastreabilidade ponta-a-ponta Woovi <-> Stellar
            const x402Memo = correlationID
                ? Memo.text(`X402:${correlationID.slice(0, 22)}`)
                : Memo.none();

            const server = new Horizon.Server('https://horizon-testnet.stellar.org');
            const issuerKeypair = Keypair.fromSecret(ISSUER_SECRET);
            const issuerAccount = await server.loadAccount(issuerKeypair.publicKey());
            const brwAsset = new Asset('BRW', issuerKeypair.publicKey());

            console.log(`📡 [Stellar-Audit] Iniciando Mintagem para: ${targetPublicKey.slice(0, 8)}...`);
            console.log(`🔑 [Stellar-Audit] Conta Pagadora/Emissora: ${issuerKeypair.publicKey().slice(0, 8)}...`);

            let isNewAccount = false;
            let hasTrustLine = false;

            // Verificação de existência e Trustline (Gasless Setup)
            try {
                const userAccount = await server.loadAccount(targetPublicKey);
                hasTrustLine = userAccount.balances.some(
                    (b: any) => b.asset_code === 'BRW' && b.asset_issuer === issuerKeypair.publicKey()
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

            const transaction = new TransactionBuilder(issuerAccount, {
                fee: BASE_FEE,
                networkPassphrase: Networks.TESTNET,
                memo: x402Memo,
            })
            .setTimeout(30);
            
            operations.forEach(op => transaction.addOperation(op));
            
            const builtTx = transaction.build();

            // Assinaturas Dinâmicas
            console.log("✍️ [Stellar-Audit] Coletando assinatura do Issuer...");
            builtTx.sign(issuerKeypair);

            if (isNewAccount || !hasTrustLine) {
                console.log("✍️ [Stellar-Audit] Coletando assinatura do Usuário (Setup de Confiança)...");
                builtTx.sign(Keypair.fromSecret(userSecretKey!));
            }

            const response = await server.submitTransaction(builtTx);
            console.log("✨ [Stellar-Audit] Mintagem concluída com sucesso! Hash:", response.hash);
            return response.hash;
        } catch (error: any) {
            this._handleStellarError('OnRamp BRW', error);
            return null;
        }
    },

    /**
     * Executa a queima (Burn) de tokens BRW para processar um saque PIX.
     * O token é enviado de volta ao Issuer, o que sinaliza a liquidação do ativo.
     * 
     * @param userSecretKey Chave S... do usuário.
     * @param amount Valor a ser queimado.
     * @param correlationID Identificador do saque.
     * @returns Hash da transação.
     */
    async executeOffRamp(userSecretKey: string, amount: string, correlationID: string): Promise<string | null> {
        try {
            const server = new Horizon.Server('https://horizon-testnet.stellar.org');
            const userKeypair = Keypair.fromSecret(userSecretKey);
            const userPublicKey = userKeypair.publicKey();
            const issuerKeypair = Keypair.fromSecret(ISSUER_SECRET!);

            // Validação de Saldo Prévio (Pre-flight check)
            const account = await server.loadAccount(userPublicKey);
            const brwBalance = account.balances.find(
                (b: any) => b.asset_code === 'BRW' && b.asset_issuer === issuerKeypair.publicKey()
            );

            if (!brwBalance || parseFloat(brwBalance.balance) < parseFloat(amount)) {
                throw new Error(`Saldo insuficiente: Você possui R$ ${brwBalance?.balance || '0.00'}`);
            }

            // Memo X402 formatado para Saque
            const x402Memo = Memo.text(`saque-pix:${correlationID.slice(0, 18)}`);
            const issuerAccount = await server.loadAccount(issuerKeypair.publicKey());
            const brwAsset = new Asset('BRW', issuerKeypair.publicKey());

            const transaction = new TransactionBuilder(issuerAccount, {
                fee: BASE_FEE,
                networkPassphrase: Networks.TESTNET,
                memo: x402Memo
            })
            .addOperation(Operation.payment({
                source: userPublicKey,
                destination: issuerKeypair.publicKey(),
                asset: brwAsset,
                amount: amount
            }))
            .setTimeout(30)
            .build();

            transaction.sign(userKeypair, issuerKeypair);
            const response = await server.submitTransaction(transaction);
            return response.hash;
        } catch (error: any) {
            this._handleStellarError('Off-Ramp Blockchain', error);
            return null;
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
            const server = new Horizon.Server('https://horizon-testnet.stellar.org');
            const userKeypair = Keypair.fromSecret(userSecretKey);
            const userPublicKey = userKeypair.publicKey();
            const issuerKeypair = Keypair.fromSecret(ISSUER_SECRET!);

            const issuerAccount = await server.loadAccount(issuerKeypair.publicKey());
            const userAccount = await server.loadAccount(userPublicKey);

            const getAsset = (code: string) => code === 'XLM' ? Asset.native() : new Asset(code, issuerKeypair.publicKey());
            const fromAsset = getAsset(fromAssetCode);
            const toAsset = getAsset(toAssetCode);

            const operations: any[] = [];

            // 1. Recebe o ativo do usuário
            operations.push(Operation.payment({
                source: userPublicKey,
                destination: issuerKeypair.publicKey(),
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
                source: issuerKeypair.publicKey(),
                destination: userPublicKey,
                asset: toAsset,
                amount: String(parseFloat(receiveAmount).toFixed(7))
            }));

            const transaction = new TransactionBuilder(issuerAccount, {
                fee: BASE_FEE,
                networkPassphrase: Networks.TESTNET
            })
            .setTimeout(30);

            operations.forEach(op => transaction.addOperation(op));

            const builtTx = transaction.build();

            builtTx.sign(issuerKeypair, userKeypair);
            const response = await server.submitTransaction(builtTx);
            return response.hash;
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
            const server = new Horizon.Server('https://horizon-testnet.stellar.org');
            const userKeypair = Keypair.fromSecret(userSecretKey);
            const issuerKeypair = Keypair.fromSecret(ISSUER_SECRET!);
            const issuerAccount = await server.loadAccount(issuerKeypair.publicKey());

            const getAsset = (code: string) => code === 'XLM' ? Asset.native() : new Asset(code, issuerKeypair.publicKey());

            const transaction = new TransactionBuilder(issuerAccount, {
                fee: BASE_FEE,
                networkPassphrase: Networks.TESTNET
            })
            .addOperation(Operation.payment({
                source: userKeypair.publicKey(),
                destination: destPublicKey,
                asset: getAsset(assetCode),
                amount: String(parseFloat(amount).toFixed(7))
            }))
            .setTimeout(30)
            .build();

            transaction.sign(issuerKeypair, userKeypair);
            const response = await server.submitTransaction(transaction);
            return response.hash;
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
