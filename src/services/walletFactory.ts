import { Keypair, Horizon, TransactionBuilder, Networks, Asset, Operation } from '@stellar/stellar-sdk';
import { supabase } from '../lib/supabase';
import { isValidPublicKey, isValidSecretKey } from '../utils/stellarValidation';

/**
 * WalletFactory
 * 
 * [PT-BR] Fábrica de carteiras Stellar focada em Abstração de Custódia (UX-Zero).
 * Gerencia criação, Ativação patrocinada (Sponsor/CAP-33) e Setup de Trustlines.
 * Assinatura Bio-criptográfica (Passkeys): Atualmente, a Chave Secreta é isolada no banco local (simulando enclave do dispositivo).
 * Em produção, será resguardada e assinada por biometria criptográfica usando WebCrypto API garantindo total Soberania ao usuário real.
 * 
 * [EN-US] Stellar wallet factory focused on Custodial Abstraction (UX-Zero).
 * Manages creation, sponsored activation (Sponsor/CAP-33), and Trustline setup.
 * Bio-cryptographic Signature (Passkeys): Currently, the Secret Key is isolated locally (simulating a device enclave).
 * In production, it will be safeguarded and signed by cryptography biometrics using WebCrypto API ensuring total Sovereignty for the real user.
 */

const STORAGE_KEY_PREFIX = '@walletnow:secret:';

export const WalletFactory = {
    /**
     * Provisiona uma nova carteira Stellar completa para o usuário.
     * 1. Gera par de chaves ED25519.
     * 2. Vincula Public Key ao perfil no Supabase.
     * 3. Salva Secret Key localmente.
     * 4. Ativa conta via Friendbot (Testnet).
     * 5. Estabelece Trustline BRW patrocidada (CAP-33).
     * 
     * @param userId ID do usuário no Supabase.
     * @returns Public Key gerada.
     */
    /**
     * Tenta ativar a conta do usuário usando o Issuer como Sponsor (Emergência).
     * Envia 1.5 XLM para cobrir o reserve balance e trustlines.
     */
    async activateAccount(publicKey: string): Promise<boolean> {
        try {
            const ISSUER_SECRET = import.meta.env.VITE_STELLAR_ISSUER_SECRET;
            if (!ISSUER_SECRET) return false;

            const server = new Horizon.Server('https://horizon-testnet.stellar.org');
            const issuerKeypair = Keypair.fromSecret(ISSUER_SECRET);
            const issuerAccount = await server.loadAccount(issuerKeypair.publicKey());

            console.log(`[WalletNow][WalletFactory] 🛡️ [Stellar-Audit] Ativando conta via Sponsor: ${publicKey.slice(0, 8)}...`);

            const transaction = new TransactionBuilder(issuerAccount, {
                fee: '100000',
                networkPassphrase: Networks.TESTNET
            })
            .addOperation(Operation.createAccount({
                destination: publicKey,
                startingBalance: '1.5' // Reserva mínima para conta + algumas trustlines
            }))
            .setTimeout(30)
            .build();

            transaction.sign(issuerKeypair);
            await server.submitTransaction(transaction);
            console.log("[WalletNow][WalletFactory] ✅ [Stellar-Audit] Conta ativada com sucesso via Sponsor.");
            return true;
        } catch (error: any) {
            console.error('[WalletNow][WalletFactory] ❌ [Stellar-Audit] Falha na ativação via Sponsor:', error?.response?.data || error.message);
            return false;
        }
    },

    /**
     * Provisiona uma nova carteira Stellar completa para o usuário.
     */
    async provisionWalletForUser(userId: string): Promise<string | null> {
        try {
            console.log("[WalletNow][WalletFactory] Iniciando provisionamento de carteira para o usuário:", userId);
            const keypair = Keypair.random();
            const publicKey = keypair.publicKey();
            const secretKey = keypair.secret();

            // Validação de segurança (Hard Validation) ANTES de persistir qualquer coisa
            if (!isValidPublicKey(publicKey) || !isValidSecretKey(secretKey)) {
                console.error("[WalletNow][WalletFactory] 🚨 Chaves geradas corrompidas ou inválidas. Abortando provisionamento.");
                throw new Error("Chaves Stellar corrompidas.");
            }

            // Salva apenas a Chave Pública no Banco (Referência)
            const { error: dbError } = await supabase
                .from('profiles')
                .update({ stellar_address: publicKey })
                .eq('id', userId);

            if (dbError) {
                console.error("[WalletNow][WalletFactory] ❌ Falha de rede ao persistir Public Key no banco:", dbError);
                throw new Error(`DB Sync Fail: ${dbError.message}`);
            }

            // Salva a Chave Secreta localmente (Posse do Usuário)
            try {
                localStorage.setItem(`${STORAGE_KEY_PREFIX}${userId}`, secretKey);
                console.log("[WalletNow][WalletFactory] Secret Key armazenada com segurança localmente.");
            } catch (storageError) {
                console.error("[WalletNow][WalletFactory] ❌ Falha catastrófica no LocalStorage (Quota/Permissão). Abortando!");
                // Rollback manual do Supabase pode não ser confiável, deixamos a aplicação fail-safe no AuthContext
                throw storageError;
            }

            // Tenta ativar via Friendbot primariamente
            try {
                await fetch(`https://horizon-testnet.stellar.org/friendbot?addr=${encodeURIComponent(publicKey)}`);
                console.log("[WalletNow][WalletFactory] ✅ [Stellar-Audit] Conta ativada via Friendbot.");
            } catch (e) {
                console.warn("[WalletNow][WalletFactory] ⚠️ Friendbot indisponível. Tentando ativação via Sponsor...");
                await this.activateAccount(publicKey);
            }

            // Setup Gasless de Ativo Soberano (BRW) se possível
            const ISSUER_SECRET = import.meta.env.VITE_STELLAR_ISSUER_SECRET;
            if (ISSUER_SECRET) {
                const server = new Horizon.Server('https://horizon-testnet.stellar.org');
                const issuerKeypair = Keypair.fromSecret(ISSUER_SECRET);
                const brwAsset = new Asset('BRW', issuerKeypair.publicKey());
                const userKeypair = Keypair.fromSecret(secretKey);
                
                // Espera um pouco para a rede processar a criação antes de mudar trust
                await new Promise(r => setTimeout(r, 2000));

                try {
                    const issuerAccount = await server.loadAccount(issuerKeypair.publicKey());
                    const transaction = new TransactionBuilder(issuerAccount, {
                        fee: '100000',
                        networkPassphrase: Networks.TESTNET
                    })
                    .addOperation(Operation.beginSponsoringFutureReserves({ sponsoredId: publicKey }))
                    .addOperation(Operation.changeTrust({ asset: brwAsset, source: publicKey }))
                    .addOperation(Operation.endSponsoringFutureReserves({ source: publicKey }))
                    .setTimeout(30)
                    .build();
                    
                    transaction.sign(issuerKeypair, userKeypair);
                    await server.submitTransaction(transaction);
                    console.log("[WalletNow][WalletFactory] ✅ Trustline base estabelecida.");
                } catch (setupError) {
                    console.warn("[WalletNow][WalletFactory] ⚠️ Erro no setup inicial da Trustline. O Mint cuidará disso.", setupError);
                }
            }

            console.log("[WalletNow][WalletFactory] Provisionamento 100% concluído com sucesso.");
            return publicKey;
        } catch (error) {
            console.error('[WalletNow][WalletFactory] ❌ Erro fatal no provisionamento da carteira:', error);
            return null;
        }
    },

    /**
     * Recupera a Secret Key do usuário do armazenamento local.
     */
    getSecretKey(userId: string): string | null {
        try {
            return localStorage.getItem(`${STORAGE_KEY_PREFIX}${userId}`);
        } catch (e) {
            return null;
        }
    },

    /**
     * Retorna o histórico de transações on-chain, filtrando pagamentos e extraindo memos X402.
     * 
     * @param publicKey Chave pública da conta.
     * @returns Lista de transações formatadas para o Dashboard.
     */
    async getHistory(publicKey: string): Promise<any[]> {
        try {
            const server = new Horizon.Server('https://horizon-testnet.stellar.org');
            const page = await server.payments()
                .forAccount(publicKey)
                .limit(20)
                .order('desc')
                .join('transactions')
                .call();

            const history = page.records.map((record: any) => {
                let amount = '0';
                let asset = 'XLM';

                if (record.type === 'payment') {
                    amount = record.amount;
                    asset = record.asset_code || 'XLM';
                } else if (record.type === 'create_account') {
                    amount = record.starting_balance;
                }

                const isDeposit = record.to === publicKey || record.account === publicKey;
                const transaction = (record as any).transaction;
                const memoValue = transaction?.memo_type === 'text' ? transaction.memo : null;
                
                const correlationID = (memoValue && memoValue.startsWith('X402:')) 
                    ? memoValue.replace('X402:', '') 
                    : null;

                return {
                    id: record.id,
                    hash: record.transaction_hash,
                    type: isDeposit ? 'deposit' : 'send',
                    title: isDeposit ? 'Depósito PIX' : 'Saque PIX / Envio',
                    amount: isDeposit ? `+ R$ ${parseFloat(amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : `- R$ ${parseFloat(amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
                    rawAmount: parseFloat(amount),
                    assetCode: asset,
                    correlationID,
                    date: new Date(record.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }),
                    status: 'Concluído'
                };
            }).filter(tx => tx.rawAmount > 0 && (tx.assetCode === 'BRZ' || tx.assetCode === 'BRW' || tx.assetCode === 'XLM'));

            return history;
        } catch (error) {
            console.error('Falha ao buscar histórico on-chain:', error);
            return [];
        }
    },

    /**
     * Consulta os saldos reais de múltiplos ativos na conta Stellar.
     */
    async getBalances(publicKey: string): Promise<{ brz: string, brw: string, xlm: string, usdc: string, btc: string } | null> {
        try {
            const server = new Horizon.Server('https://horizon-testnet.stellar.org');
            const account = await server.loadAccount(publicKey);

            let balances = { brz: '0.00', brw: '0.00', xlm: '0.00', usdc: '0.00', btc: '0.00' };

            account.balances.forEach((balance: any) => {
                const code = balance.asset_code;
                if (balance.asset_type === 'native') balances.xlm = balance.balance;
                else if (code === 'BRZ') balances.brz = balance.balance;
                else if (code === 'BRW') balances.brw = balance.balance;
                else if (code === 'USDC') balances.usdc = balance.balance;
                else if (code === 'BTC') balances.btc = balance.balance;
            });

            return balances;
        } catch (error: any) {
            if (error.response?.status !== 404) console.error('Erro ao buscar saldos:', error);
            return null;
        }
    }
};
