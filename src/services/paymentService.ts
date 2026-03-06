import { Keypair, Operation, TransactionBuilder, Networks, Asset, Horizon } from "@stellar/stellar-sdk";

const ISSUER_SECRET = import.meta.env.VITE_STELLAR_ISSUER_SECRET;
const BASE_FEE = '100000'; // Alta para prevenir delay na Testnet (0.01 XLM)

/**
 * On-Ramp Service (Transfero Mockado na Testnet)
 * Recepciona a requisição do PIX confirmada pelo banco parceiro e 
 * converte imediatamente injetando BRZ "em tempo real" via Blockchain Stellar
 * na conta do usuário, encerrando a intermediação.
 */
export const PaymentService = {
    /**
     * Minta tokens BRZ da carteira Master diretamente para a Carteira do Usuário
     * 
     * @param targetPublicKey A chave pública G... do cliente
     * @param amount Em BRL, ex: '150.00'
     */
    async mintPixToBRZ(targetPublicKey: string, amount: string, userSecretKey?: string): Promise<string | null> {
        try {
            console.log(`🏦 PaymentService: Ouvinte de PIX ativado. Depositando R$ ${amount}...`);

            const server = new Horizon.Server('https://horizon-testnet.stellar.org');
            const issuerKeypair = Keypair.fromSecret(ISSUER_SECRET!);
            const issuerAccount = await server.loadAccount(issuerKeypair.publicKey());
            const brzAsset = new Asset('BRZ', issuerKeypair.publicKey());

            let isNewAccount = false;
            let hasTrustLine = false;

            // Tenta localizar a conta na rede. Se der 404, conta não existe fisicamente ainda.
            try {
                const userAccount = await server.loadAccount(targetPublicKey);
                hasTrustLine = userAccount.balances.some(
                    (b: any) => b.asset_type !== 'native' && b.asset_code === 'BRZ' && b.asset_issuer === issuerKeypair.publicKey()
                );
            } catch (error: any) {
                if (error.response?.status === 404) {
                    console.log('⚠️ Conta virgên. Preparando Onboarding Mágico (Gasless) na mesma transação...');
                    isNewAccount = true;
                } else {
                    throw error;
                }
            }

            const operations: any[] = [];

            // Se for conta nova ou não tiver a TrustLine do BRZ, fazemos o Setup patrocinado
            if (isNewAccount || !hasTrustLine) {
                if (!userSecretKey) {
                    throw new Error("Primeiro depósito requer a Inicialização Mágica (Secret Key indisponível localmente para criar a TrustLine).");
                }

                // 1. Mestre patrocina a brincadeira (Reservas, Trustlines)
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

                // 3. Abre a TrustLine do BRZ para o cliente (sendo patrocinada)
                operations.push(Operation.changeTrust({
                    asset: brzAsset,
                    source: targetPublicKey
                }));

                // 4. Mestre termina o patrocínio desta operação de Setup
                operations.push(Operation.endSponsoringFutureReserves({
                    source: targetPublicKey
                }));
            }

            // 5. O DEPOSITO DE FATO (O equivalente em BRZ)
            operations.push(Operation.payment({
                destination: targetPublicKey,
                asset: brzAsset,
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

            console.log('🚀 Transmitindo Depósito Intermediado PIX para a Blockchain...');
            const response = await server.submitTransaction(transaction);
            console.log('✅ Depósito Sincronizado. Hash:', response.hash);

            return response.hash;
        } catch (error: any) {
            console.error('❌ Falha Crítica no OnRamp API:', error?.response?.data || error.message);
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
     * Off-Ramp Service (Transfero Mockado Saque PIX)
     * Transfere o BRZ do cliente de volta para o Issuer (Master),
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
    }
};
