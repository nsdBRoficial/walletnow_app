import { Keypair, Operation, TransactionBuilder, Networks, Asset, Horizon } from "@stellar/stellar-sdk";

const ISSUER_SECRET = import.meta.env.VITE_STELLAR_ISSUER_SECRET;
const BASE_FEE = '100000'; // Alta para prevenir delay na Testnet (0.01 XLM)

/**
 * On-Ramp Service (Woovi PIX Gateway + Stellar Testnet)
 * Recepciona a confirmação de pagamento da Woovi e
 * converte imediatamente injetando BRW "em tempo real" via Blockchain Stellar
 * na conta do usuário, encerrando a intermediação.
 *
 * Ativo Soberano: BRW (WalletNow Real Digital — lastreado 1:1 em BRL)
 * Issuer: GBI7PGNABMNIDFJADAKSN4HXEYAO25PZQVD7US6H6V7GY5XUQSWKAKM5
 */
export const PaymentService = {
    /**
     * [SPRINT 9.2] Minta tokens BRW (ativo soberano WalletNow) da carteira Issuer
     * diretamente para a Carteira do Usuário. Acionado após confirmação Woovi.
     *
     * @param targetPublicKey A chave pública G... do cliente
     * @param amount Em BRL, ex: '150.00'
     * @param userSecretKey Necessário apenas no primeiro depósito (para assinar TrustLine CAP-33)
     */
    async mintBRW(targetPublicKey: string, amount: string, userSecretKey?: string): Promise<string | null> {
        try {
            console.log(`🏦 PaymentService: Woovi PIX Confirmado! Mintando BRW R$ ${amount} para ${targetPublicKey.slice(0,5)}...`);

            const server = new Horizon.Server('https://horizon-testnet.stellar.org');
            const issuerKeypair = Keypair.fromSecret(ISSUER_SECRET!);
            const issuerAccount = await server.loadAccount(issuerKeypair.publicKey());
            // Ativo soberano BRW emitido pela nossa conta Issuer
            const brwAsset = new Asset('BRW', issuerKeypair.publicKey());

            let isNewAccount = false;
            let hasTrustLine = false;

            // Tenta localizar a conta na rede. Se der 404, conta não existe fisicamente ainda.
            try {
                const userAccount = await server.loadAccount(targetPublicKey);
                // Verifica TrustLine do BRW (nosso novo ativo soberano)
                hasTrustLine = userAccount.balances.some(
                    (b: any) => b.asset_type !== 'native' && b.asset_code === 'BRW' && b.asset_issuer === issuerKeypair.publicKey()
                );
            } catch (error: any) {
                if (error.response?.status === 404) {
                    console.log('⚠️ Conta virgem. Preparando Onboarding Mágico (Gasless) na mesma transação...');
                    isNewAccount = true;
                } else {
                    throw error;
                }
            }

            const operations: any[] = [];

            // Se for conta nova ou não tiver a TrustLine do BRW, fazemos o Setup patrocinado
            if (isNewAccount || !hasTrustLine) {
                if (!userSecretKey) {
                    throw new Error("Primeiro depósito requer a Inicialização Mágica (Secret Key indisponível localmente para criar a TrustLine BRW).");
                }

                // 1. Mestre patrocina as Reservas e TrustLines (CAP-33)
                operations.push(Operation.beginSponsoringFutureReserves({
                    sponsoredId: targetPublicKey
                }));

                // 2. Se a conta não existe, nós criamos ela com 0 XLM, sob tutela patrocinadora
                if (isNewAccount) {
                    operations.push(Operation.createAccount({
                        destination: targetPublicKey,
                        startingBalance: '0'
                    }));
                }

                // 3. Abre a TrustLine do BRW para o cliente (sendo patrocinada pelo Issuer)
                operations.push(Operation.changeTrust({
                    asset: brwAsset,
                    source: targetPublicKey
                }));

                // 4. Mestre termina o patrocínio desta operação de Setup
                operations.push(Operation.endSponsoringFutureReserves({
                    source: targetPublicKey
                }));
            }

            // 5. O DEPÓSITO DE FATO (O equivalente em BRW — 1 BRL = 1 BRW)
            operations.push(Operation.payment({
                destination: targetPublicKey,
                asset: brwAsset,
                amount: amount
            }));

            // Construímos o pacote de Blocos (Transaction)
            const transactionBuilder = new TransactionBuilder(issuerAccount, {
                fee: BASE_FEE,
                networkPassphrase: Networks.TESTNET
            }).setTimeout(30);

            operations.forEach(op => transactionBuilder.addOperation(op));
            const transaction = transactionBuilder.build();

            // Mestre assina para pagar a transação geral e emitir o BRZ
            transaction.sign(issuerKeypair);

            // Se mexemos na arquitetura da conta do usuário (Setup), ele DEVE assinar a permissão junto
            if (isNewAccount || !hasTrustLine) {
                const userKeypair = Keypair.fromSecret(userSecretKey!);
                transaction.sign(userKeypair);
            }

            console.log('🚀 Transmitindo Mintagem BRW para Blockchain Stellar...');
            const response = await server.submitTransaction(transaction);
            console.log('✅ BRW Mintado com sucesso! Hash Ledger:', response.hash);

            return response.hash;
        } catch (error: any) {
            console.error('❌ Falha Crítica no OnRamp BRW:', error?.response?.data || error.message);
            // Extrai o erro profundo da rede para debug
            const resultCodes = error?.response?.data?.extras?.result_codes;
            let detailError = error.message;
            if (resultCodes) {
                detailError = `[BLOCKCHAIN REJECTED] TX: ${resultCodes.transaction} | OPS: ${resultCodes.operations?.join(', ')}`;
            }
            throw new Error(detailError);
        }
    },

    /**
     * @deprecated Use mintBRW() em vez disso. Alias de retrocompatibilidade.
     */
    async mintPixToBRZ(targetPublicKey: string, amount: string, userSecretKey?: string): Promise<string | null> {
        console.warn('⚠️ mintPixToBRZ está depreciado. Use mintBRW()');
        return this.mintBRW(targetPublicKey, amount, userSecretKey);
    },

    /**
     * Off-Ramp Service (Saque PIX via Woovi)
     * Transfere o BRW do cliente de volta para o Issuer,
     * simulando a queima/resgate (burn) para que o Gateway dispare o PIX fiduciário
     * na conta bancária do destino.
     * 
     * @param userSecretKey A chave secreta S... do cliente pra assinar a saída
     * @param amount Em BRL, ex: '50.00'
     * @param targetPixKey (Log visual mockado)
     */
    async burnBRZToPix(userSecretKey: string, amount: string, targetPixKey: string): Promise<string | null> {
        try {
            console.log(`🏦 PaymentService: Resgate PIX Solicitado. Queimando R$ ${amount} BRZ para depositar na chave: ${targetPixKey}...`);

            const server = new Horizon.Server('https://horizon-testnet.stellar.org');
            const userKeypair = Keypair.fromSecret(userSecretKey);
            const issuerKeypair = Keypair.fromSecret(ISSUER_SECRET);

            // Carrega a conta Master (Issuer) para pagar a taxa e fornecer sequence number
            const issuerAccount = await server.loadAccount(issuerKeypair.publicKey());

            // O Ativo é o nosso BRZ de teste
            const brzAsset = new Asset('BRZ', issuerKeypair.publicKey());

            // Constrói O PIX REVERSO (Saque) na Ledger (Pagamento do user para o Issuer)
            // Gasless: O Banco (issuer) paga a Taxa de transação
            const transaction = new TransactionBuilder(issuerAccount, {
                fee: BASE_FEE,
                networkPassphrase: Networks.TESTNET
            })
                .addOperation(Operation.payment({
                    source: userKeypair.publicKey(), // Quem envia o dinheiro é o cliente
                    destination: issuerKeypair.publicKey(), // Volta pro cofre
                    asset: brzAsset,
                    amount: amount
                }))
                .setTimeout(30)
                .build();

            // Assinatura Dupla de Saque Gasless:
            // 1. Cliente assina pra liberar a grana.
            // 2. Issuer(Master) assina pra pagar a taxa de rede (Fee).
            transaction.sign(userKeypair, issuerKeypair);

            console.log('🚀 Transmitindo Saque PIX (Burn) para a Blockchain...');
            const response = await server.submitTransaction(transaction);

            return response.hash;
        } catch (error: any) {
            console.error('❌ Falha Crítica no OffRamp API (Saque):', error?.response?.data || error.message);
            throw error;
        }
    },

    /**
     * Swap Service (AMM Emulado Gasless via Market Maker Master)
     * Troca Ativo A por Ativo B do usuário. Como estamos na Testnet e não temos pools 
     * gigantes de liquidez, o Serviço emula a liquidez transferindo o Ativo A 
     * pro cofre Mestre e Mintando instantaneamente o Ativo B.
     */
    async swapAssets(userSecretKey: string, fromAssetCode: string, toAssetCode: string, payAmount: string, receiveAmount: string): Promise<string | null> {
        try {
            console.log(`💱 PaymentService: Swap Solicitado. ${payAmount} ${fromAssetCode} -> ${receiveAmount} ${toAssetCode}...`);

            const server = new Horizon.Server('https://horizon-testnet.stellar.org');
            const userKeypair = Keypair.fromSecret(userSecretKey);
            const userPublicKey = userKeypair.publicKey();
            const issuerKeypair = Keypair.fromSecret(ISSUER_SECRET!);

            const issuerAccount = await server.loadAccount(issuerKeypair.publicKey());
            const userAccount = await server.loadAccount(userPublicKey);

            const operations: any[] = [];

            // Helper para identificar se é XLM ou Token Mintado por nós
            const getAsset = (code: string) => {
                if (code === 'XLM') return Asset.native();
                return new Asset(code, issuerKeypair.publicKey());
            };

            const fromAsset = getAsset(fromAssetCode);
            const toAsset = getAsset(toAssetCode);

            // 1. BURN/VENDER: O Usuário paga pro Mestre
            operations.push(Operation.payment({
                source: userPublicKey,
                destination: issuerKeypair.publicKey(),
                asset: fromAsset,
                amount: String(parseFloat(payAmount).toFixed(7))
            }));

            // 2. CHECK TRUSTLINE: Se o cliente vai receber um token não-nativo, ele tem Trustline?
            if (toAssetCode !== 'XLM') {
                const hasTrustLine = userAccount.balances.some(
                    (b: any) => b.asset_type !== 'native' && b.asset_code === toAssetCode && b.asset_issuer === issuerKeypair.publicKey()
                );

                if (!hasTrustLine) {
                    console.log(`Abrindo Trustline Gasless para a moeda ${toAssetCode}...`);
                    operations.push(Operation.beginSponsoringFutureReserves({
                        source: issuerKeypair.publicKey(),
                        sponsoredId: userPublicKey
                    }));
                    operations.push(Operation.changeTrust({
                        source: userPublicKey,
                        asset: toAsset
                    }));
                    operations.push(Operation.endSponsoringFutureReserves({
                        source: userPublicKey
                    }));
                }
            }

            // 3. MINT/COMPRAR: O Mestre manda o Ativo B para o Cliente
            operations.push(Operation.payment({
                source: issuerKeypair.publicKey(),
                destination: userPublicKey,
                asset: toAsset,
                amount: String(parseFloat(receiveAmount).toFixed(7))
            }));

            const transactionBuilder = new TransactionBuilder(issuerAccount, {
                fee: BASE_FEE,
                networkPassphrase: Networks.TESTNET
            }).setTimeout(30);

            operations.forEach(op => transactionBuilder.addOperation(op));
            const transaction = transactionBuilder.build();

            // Duas assinaturas: Cofre Mestre e Conta do Cliente
            transaction.sign(issuerKeypair, userKeypair);

            console.log('🚀 Transmitindo Câmbio/Swap para a Blockchain...');
            const response = await server.submitTransaction(transaction);

            return response.hash;
        } catch (error: any) {
            console.error('❌ Falha Crítica no Swap API:', error?.response?.data || error.message);
            throw new Error(error.message);
        }
    },

    /**
     * Send On-Chain Service (Transferência Peer-to-Peer Gasless)
     * Transfere moedas reais da carteira do usuário para qualquer outra conta
     * global na Blockchain. O Cofre Master continua bancando a taxa de 0.001 XLM.
     * Funciona para BRZ, USDC, XLM, BTC e afins.
     */
    async sendAssetOnChain(userSecretKey: string, destPublicKey: string, assetCode: string, amount: string): Promise<string | null> {
        try {
            console.log(`🚀 PaymentService: Envio Descentralizado de ${amount} ${assetCode} para ${destPublicKey}`);

            const server = new Horizon.Server('https://horizon-testnet.stellar.org');
            const userKeypair = Keypair.fromSecret(userSecretKey);
            const userPublicKey = userKeypair.publicKey();
            const issuerKeypair = Keypair.fromSecret(ISSUER_SECRET!);

            // O issuerAccount pagará a taxa
            const issuerAccount = await server.loadAccount(issuerKeypair.publicKey());

            // Identificação do Asset
            const getAsset = (code: string) => {
                if (code === 'XLM') return Asset.native();
                return new Asset(code, issuerKeypair.publicKey());
            };
            const transferAsset = getAsset(assetCode);

            // Monta o Bloquinho de Pagamento
            const paymentOp = Operation.payment({
                source: userPublicKey,
                destination: destPublicKey,
                asset: transferAsset,
                amount: String(parseFloat(amount).toFixed(7))
            });

            const transactionBuilder = new TransactionBuilder(issuerAccount, {
                fee: BASE_FEE,
                networkPassphrase: Networks.TESTNET
            }).setTimeout(30);

            transactionBuilder.addOperation(paymentOp);
            const transaction = transactionBuilder.build();

            // Assinatura do Cliente (Permissão para movimentar fundos) + Master (Pagador da Taxa Gasless)
            transaction.sign(issuerKeypair, userKeypair);

            console.log('🔗 Transmitindo Envio On-Chain para a Ledger Mundial...');
            const response = await server.submitTransaction(transaction);

            return response.hash;
        } catch (error: any) {
            console.error('❌ Falha Crítica no Send On-Chain:', error?.response?.data || error.message);
            // Extrai o erro profundo
            const resultCodes = error?.response?.data?.extras?.result_codes;
            if (resultCodes?.operations?.includes('op_no_trust')) {
                throw new Error("A carteira de destino não possui linha de confiança (Trustline) para este ativo.");
            } else if (resultCodes?.operations?.includes('op_no_destination')) {
                throw new Error("A carteira informada não está ativa na Blockchain. Envie XLM primeiro para inicializá-la.");
            }
            throw new Error(error.message);
        }
    }
};
