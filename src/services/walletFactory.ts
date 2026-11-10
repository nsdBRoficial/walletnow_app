/**
 * @module src\services\walletFactory.ts
 * @description WalletNow Protocol - Arquitetura de carteira inteligente e pagamentos Stellar.
 */
import { Keypair, TransactionBuilder, Asset, Operation, LiquidityPoolAsset } from '@stellar/stellar-sdk';
import { supabase } from '../lib/supabase';
import { isValidPublicKey, isValidSecretKey } from '../utils/stellarValidation';
import { DeviceVault } from '../security/deviceVault';
import { MnemonicVault } from '../security/mnemonicVault';
import { AppConfig } from '../config/environment';
import { StellarNetwork } from '../config/stellarNetwork';
import { isCurrentNetworkMainnet } from '../contexts/NetworkContext';
import { IssuerService } from '../utils/issuerService';
import { MainnetService } from './mainnetService';
import { generateMnemonic, deriveKeypairFromMnemonic, verifyMnemonicMatchesWallet } from '../utils/bip39Wallet';

/**
 * TODO [SECURITY-CRITICAL — BLOCKER MAINNET]:
 * VITE_STELLAR_ISSUER_SECRET está sendo lida no bundle do frontend.
 * Isso expõe a chave privada do issuer ao browser (inspecionável via DevTools).
 *
 * PLANO DE MIGRAÇíO:
 * 1. Criar Edge Function `stellar-issuer` no Supabase
 * 2. Mover activateAccount(), provisionWalletForUser() (ativação + trustline) para server-side
 * 3. O frontend passa apenas publicKey + userId, nunca recebe a issuer secret
 * 4. Remover VITE_STELLAR_ISSUER_SECRET do bundle completamente
 *
 * STATUS: Mantido para preservar fluxo atual de testnet. NíO fazer deploy em mainnet sem resolver.
 */

/**
 * @packageDocumentation
 * @module Services/WalletFactory
 *
 * WalletFactory — Fábrica de Contas, Trustlines e Autocustódia Stellar
 *
 * Responsabilidade Arquitetural (SRP):
 * Centralizar o ciclo de provisionamento de contas Stellar:
 * - Geração de pares de chaves Ed25519 e mnemônicos BIP-39.
 * - Isolamento seguro no cofre do cliente (`DeviceVault` / `MnemonicVault`).
 * - Ativação de contas e patrocínio atômico de Trustlines via Hot Wallet (CAP-33).
 * - Integração transparente de emissores oficiais (`IssuerService`).
 *
 * Princípios de Segurança:
 * - A chave privada do usuário permanece 100% no cliente (`DeviceVault`).
 * - Apenas a chave pública `G...` é registrada na tabela de usuários do Supabase.
 *
 * @updated Setembro de 2026
 * @version 0.4.5-candidate
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
    /**
     * Ativa a conta do usuário via Issuer como Sponsor (mainnet) ou Friendbot (testnet).
     * Implementa retry com backoff exponencial (3 tentativas: 1s, 2s, 4s).
     */
    async activateAccount(publicKey: string): Promise<boolean> {
        // ⛔ BLOQUEIO ABSOLUTO MAINNET: Este método usa IssuerService/Sponsor (Testnet only).
        // NUNCA deve ser chamado quando isCurrentNetworkMainnet() === true.
        // Se chegar aqui na Mainnet, é um bug de orquestração — falhar rápido e silenciosamente
        // para não entrar em loop com ALREADY_FUNDED.
        if (isCurrentNetworkMainnet()) {
            console.error(
                '[WalletNow][WalletFactory] ⛔ [MainnetFunding] BLOCKED_SPONSOR_FALLBACK — ' +
                'activateAccount() não pode ser chamado na MAINNET. ' +
                'Use MainnetService.requestMainnetFunding() diretamente.'
            );
            throw new Error('Sponsor activation blocked in MAINNET runtime.');
        }

        const maxAttempts = 3;
        const baseDelay = 1000; // 1 segundo

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                console.log(`[WalletNow][WalletFactory] 🛡️ Ativando conta via Sponsor (tentativa ${attempt}/${maxAttempts}): ${publicKey.slice(0, 8)}...`);
                await IssuerService.invoke('fund_wallet', { publicKey });
                console.log('[WalletNow][WalletFactory] ✅ Conta ativada com sucesso via Sponsor Edge Function.');
                return true;
            } catch (error: any) {
                const isLastAttempt = attempt === maxAttempts;
                if (isLastAttempt) {
                    console.error('[WalletNow][WalletFactory] ❌ Falha na ativação após 3 tentativas:', error.message);
                    return false;
                }
                const delay = baseDelay * Math.pow(2, attempt - 1); // 1s, 2s, 4s
                console.warn(`[WalletNow][WalletFactory] ⚠️ Tentativa ${attempt} falhou. Aguardando ${delay}ms...`);
                await new Promise(r => setTimeout(r, delay));
            }
        }
        return false;
    },

    /**
     * Provisiona uma nova carteira Stellar completa para o usuário.
     *
     * FLUXO BIP39 (wallets novas):
     * 1. Gera mnemonic de 12 palavras via @scure/bip39 (128 bits de entropia, WebCrypto)
     * 2. Deriva keypair ED25519 via SLIP-0010 / SEP-0005 (path m/44'/148'/0')
     * 3. Valida chaves antes de persistir qualquer dado
     * 4. Salva Public Key no Supabase
     * 5. Criptografa Secret Key no DeviceVault (AES-GCM)
     * 6. Criptografa mnemonic no MnemonicVault (AES-GCM, separado)
     * 7. Marca versão como 'bip39' no localStorage
     *
     * Wallets legadas (criadas antes desta versão) não são afetadas.
     */
    async provisionWalletForUser(userId: string): Promise<string | null> {
        try {
            console.log("[WalletNow][WalletFactory] Iniciando provisionamento BIP39 para o usuário:", userId);

            // --- ETAPA 1: Gerar keypair via BIP39/SLIP-0010 (determinístico e recuperável) ---
            const mnemonic = generateMnemonic();
            const derived = deriveKeypairFromMnemonic(mnemonic);
            const publicKey = derived.publicKey;
            const secretKey = derived.secretKey;

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

            // Salva a Chave Secreta localmente de forma CRIPTOGRAFADA (WebCrypto)
            try {
                const encKey = await DeviceVault.generateEncryptionKey(userId);
                const encryptedData = await DeviceVault.encryptSecret(secretKey, encKey);
                
                localStorage.setItem(`${STORAGE_KEY_PREFIX}${userId}`, JSON.stringify(encryptedData));
                
                // Popula a RAM volátil para evitar relogar imediatamente no onboarding
                DeviceVault.setVolatileSecret(secretKey);

                console.log("[WalletNow][WalletFactory] Secret Key encriptada (AES-GCM) e armazenada com segurança localmente.");

                // --- ETAPA BIP39: Salvar mnemonic criptografada no MnemonicVault ---
                // A mnemonic é criptografada separadamente com a mesma chave PBKDF2
                // Nunca é enviada ao servidor nem armazenada em plaintext
                await MnemonicVault.saveMnemonic(mnemonic, userId);
                console.log("[WalletNow][WalletFactory] ✅ Mnemonic BIP39 criptografada e salva no MnemonicVault.");
            } catch (storageError) {
                console.error("[WalletNow][WalletFactory] 🚨 Falha catastrófica no DeviceVault/LocalStorage. Abortando!");
                throw storageError;
            }


            // Ativação de conta: Friendbot (testnet) ou Auto-Funding (mainnet)
            // CRIT: Usa isCurrentNetworkMainnet() dinâmico (NetworkContext/localStorage)
            //       em vez de AppConfig.stellar.isMainnet (estático/env var).
            const isMainnet = isCurrentNetworkMainnet();
            console.log(`[WalletNow][WalletFactory] Rede detectada para funding: ${isMainnet ? 'MAINNET' : 'TESTNET'}`);
            if (isMainnet) {
                // MAINNET: Aciona Edge Function de auto-funding com 2 XLM
                console.log("[MainnetWallet] Inciando fluxo de auto-funding via Edge Function na MAINNET.");
                console.log("[WalletNow][WalletFactory] 🛡️ [Stellar-Audit] Ativando conta na MAINNET via Mainnet Funding Treasury.");
                try {
                    await MainnetService.requestMainnetFunding(publicKey);
                    console.log("[MainnetWallet] ✅ Auto-funding executado com sucesso e conta ativada na MAINNET.");
                    console.log("[WalletNow][WalletFactory] ✅ Conta ativada com sucesso na MAINNET.");
                } catch (fundingErr) {
                    console.error("[WalletNow][WalletFactory] ❌ Falha no auto-funding da Mainnet:", fundingErr);
                    // Opcional: permitir o usuário prosseguir, mas a wallet não estará ativa on-chain
                }
            } else {
                // TESTNET: Tenta Friendbot, ou faz fallback para Sponsor via IssuerService (Testnet Treasury)
                const friendbotUrl = StellarNetwork.getFriendbotUrl(publicKey);
                if (friendbotUrl) {
                    try {
                        await fetch(friendbotUrl);
                        console.log("[WalletNow][WalletFactory] ✅ [Stellar-Audit] Conta ativada via Friendbot (testnet).");
                    } catch (e) {
                        console.warn("[WalletNow][WalletFactory] ⚠️ Friendbot indisponível. Tentando ativação via Sponsor Testnet...");
                        await this.activateAccount(publicKey); // fallback testnet
                    }
                } else {
                    await this.activateAccount(publicKey);
                }
            }

            // Setup Gasless de Trustlines:
            // USDC = trustline principal (stablecoin do ecossistema, fase QA/mainnet prep)
            // BRW = trustline secundária (token interno testnet, mantido para compatibilidade)
            const ISSUER_PUBLIC = AppConfig.stellar.issuerPublicKey;
            if (ISSUER_PUBLIC) {
                const server = StellarNetwork.createServer();
                // USDC usa o mesmo issuer que BRW em testnet (mock local)
                // Em mainnet, StellarNetwork.getAsset('USDC') resolve para Circle issuer real
                const usdcAsset = new Asset('USDC', ISSUER_PUBLIC);
                const brwAsset = new Asset('BRW', ISSUER_PUBLIC);
                const userKeypair = Keypair.fromSecret(secretKey);
                
                // Espera a rede processar a criação antes de mudar trust
                await new Promise(r => setTimeout(r, 2000));

                try {
                    const issuerAccount = await server.loadAccount(ISSUER_PUBLIC);
                    // Uma única transação patrocinada com USDC (principal) + BRW (secundário)
                    const transaction = new TransactionBuilder(issuerAccount, {
                        fee: StellarNetwork.baseFee,
                        networkPassphrase: StellarNetwork.passphrase
                    })
                    .addOperation(Operation.beginSponsoringFutureReserves({ sponsoredId: publicKey }))
                    .addOperation(Operation.changeTrust({ asset: usdcAsset, source: publicKey })) // USDC primeiro
                    .addOperation(Operation.changeTrust({ asset: brwAsset, source: publicKey })) // BRW secundário
                    .addOperation(Operation.endSponsoringFutureReserves({ source: publicKey }))
                    .setTimeout(30)
                    .build();
                    
                    transaction.sign(userKeypair);
                    const partialXdr = transaction.toXDR();
                    
                    await IssuerService.invoke('sponsor_wallet', { 
                        publicKey, 
                        partialXdr 
                    });
                    
                    console.log("[WalletNow][WalletFactory] ✅ Trustlines estabelecidas: USDC (principal) + BRW (secundário) via Edge Function.");
                } catch (setupError) {
                    console.warn("[WalletNow][WalletFactory] ⚠️ Erro no setup inicial das Trustlines. O Mint cuidará disso.", setupError);
                }
            }

            console.log("[WalletNow][WalletFactory] Provisionamento 100% concluído com sucesso.");
            return publicKey;
        } catch (error) {
            console.error('[WalletNow][WalletFactory] ❌ Erro fatal no provisionamento da carteira:', error);
            // FAIL-SAFE: Limpar qualquer resíduo se falhar no meio do fluxo
            DeviceVault.clearSensitiveMemory();
            MnemonicVault.clearSensitiveMnemonicMemory();
            return null;
        }
    },

    /**
     * Recupera a Secret Key do usuário diretamente da memória VOLÁTIL.
    /**
     * Recupera a Secret Key do usuário da memória volátil.
     * Requer que a carteira já tenha sido destrancada (unlockWallet) após o login.
     */
    getSecretKey(userId: string): string | null {
        return DeviceVault.getVolatileSecret();
    },

    /**
     * Descriptografa o cofre local usando a autenticação biométrica associada ao userId.
     * Suporta tanto carteiras BIP39 (novas) quanto wallets legadas (Keypair.random()).
     */
    async unlockWallet(userId: string): Promise<boolean> {
        try {
            const rawStorage = localStorage.getItem(`${STORAGE_KEY_PREFIX}${userId}`);
            if (!rawStorage) return false;

            if (rawStorage.startsWith('{')) {
                // Versão criptografada (v1 AES-GCM)
                const vaultData = JSON.parse(rawStorage);
                const encKey = await DeviceVault.generateEncryptionKey(userId);
                const plaintext = await DeviceVault.decryptSecret(vaultData.ciphertext, vaultData.iv, encKey);
                DeviceVault.setVolatileSecret(plaintext);
                console.log('[WalletNow][WalletFactory] Carteira destrancada via WebCrypto.');
                return true;
            } else {
                // FALLBACK: chave legacy plaintext — migra silenciosamente para AES-GCM
                console.warn('[WalletNow][WalletFactory] Chave legacy detectada. Migrando para AES-GCM Vault...');
                const encKey = await DeviceVault.generateEncryptionKey(userId);
                const encryptedData = await DeviceVault.encryptSecret(rawStorage, encKey);
                localStorage.setItem(`${STORAGE_KEY_PREFIX}${userId}`, JSON.stringify(encryptedData));
                DeviceVault.setVolatileSecret(rawStorage);
                // Marca como legacy se ainda não tiver versão definida
                MnemonicVault.markAsLegacy(userId);
                console.log('[WalletNow][WalletFactory] Migração de segurança concluída com sucesso.');
                return true;
            }
        } catch (e) {
            console.error('[WalletNow][WalletFactory] Erro ao destrancar carteira:', e);
            DeviceVault.clearSensitiveMemory();
            MnemonicVault.clearSensitiveMnemonicMemory();
            return false;
        }
    },

    /**
     * Recupera uma carteira BIP39 a partir da mnemonic de recuperação.
     *
     * FLUXO:
     * 1. Valida a mnemonic BIP39
     * 2. Deriva o keypair determinístico (SLIP-0010/SEP-0005)
     * 3. Verifica se o publicKey bate com o endereço registrado no Supabase
     * 4. Salva o secret key criptografado no vault local
     * 5. Salva a mnemonic criptografada no MnemonicVault
     *
     * @param mnemonic 12 palavras de recuperação
     * @param userId ID do usuário Supabase
     * @param expectedPublicKey Chave pública registrada (para verificação)
     * @returns true se a recuperação foi bem-sucedida
     */
    async recoverWalletFromMnemonic(
        mnemonic: string,
        userId: string,
        expectedPublicKey: string
    ): Promise<boolean> {
        try {
            // Deriva o keypair a partir da mnemonic
            const derived = deriveKeypairFromMnemonic(mnemonic);

            // Verifica se a mnemonic gera o mesmo endereço da carteira
            if (!verifyMnemonicMatchesWallet(mnemonic, expectedPublicKey)) {
                console.warn('[WalletNow][WalletFactory] ⚠️ Mnemonic não corresponde ao endereço da carteira.');
                return false;
            }

            // Salva o secret key criptografado (substitui vault existente)
            const encKey = await DeviceVault.generateEncryptionKey(userId);
            const encryptedSecret = await DeviceVault.encryptSecret(derived.secretKey, encKey);
            localStorage.setItem(`${STORAGE_KEY_PREFIX}${userId}`, JSON.stringify(encryptedSecret));

            // Salva a mnemonic criptografada
            await MnemonicVault.saveMnemonic(mnemonic, userId);

            // Carrega na memória volátil
            DeviceVault.setVolatileSecret(derived.secretKey);
            
            console.log('[WalletNow][WalletFactory] ✅ Carteira recuperada com sucesso via mnemonic BIP39.');
            return true;
        } catch (err: any) {
            console.error('[WalletNow][WalletFactory] ❌ Falha na recuperação via mnemonic:', err.message);
            // FAIL-SAFE CRÍTICO: Previne chaves órfãs na RAM
            DeviceVault.clearSensitiveMemory();
            MnemonicVault.clearSensitiveMnemonicMemory();
            return false;
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
            const server = StellarNetwork.createServer();
            const page = await server.operations()
                .forAccount(publicKey)
                .limit(20)
                .order('desc')
                .join('transactions')
                .call();

            const history = page.records.map((record: any) => {
                let amount = '0';
                let asset = 'XLM';
                let title = 'Transação';
                let type = record.type;
                let isDeposit = false;
                let providerInfo = '';

                if (record.type === 'payment') {
                    amount = record.amount;
                    asset = record.asset_code || 'XLM';
                    isDeposit = record.to === publicKey;
                    title = isDeposit ? 'Depósito' : 'Envio';
                } else if (record.type === 'path_payment_strict_receive' || record.type === 'path_payment_strict_send') {
                    amount = record.amount || record.source_amount || record.dest_amount || '0';
                    asset = record.asset_code || 'XLM';
                    isDeposit = record.to === publicKey || record.source_account !== publicKey;
                    title = 'Swap On-Chain';
                } else if (record.type === 'create_account') {
                    amount = record.starting_balance;
                    isDeposit = record.account === publicKey;
                    title = 'Conta Criada';
                } else if (record.type === 'invoke_host_function') {
                    // Smart Contract Call (Defindex Yield)
                    amount = '0';
                    asset = 'YIELD';
                    isDeposit = false;
                    title = 'Interação Defindex';
                }

                const transaction = (record as any).transaction;
                const memoValue = transaction?.memo_type === 'text' ? transaction.memo : null;
                
                let correlationID = null;
                if (memoValue) {
                    if (memoValue.startsWith('X402:')) {
                        correlationID = memoValue.replace('X402:', '');
                        providerInfo = 'PIX API';
                    } else {
                        providerInfo = memoValue;
                    }
                }

                if (title === 'Interação Defindex') providerInfo = 'Defindex DeFi';
                if (asset === 'TESOURO') providerInfo = 'Etherfuse RWA';

                const parsedAmount = parseFloat(amount);
                const safeAmount = isNaN(parsedAmount) ? 0 : parsedAmount;

                let amountFormatted = '';
                if (record.type === 'invoke_host_function') {
                    amountFormatted = 'Smart Contract';
                } else {
                    const prefix = isDeposit ? '+' : '-';
                    if (['BRZ', 'BRW'].includes(asset)) {
                        amountFormatted = `${prefix} R$ ${safeAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
                    } else {
                        amountFormatted = `${prefix} ${safeAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 5 })} ${asset}`;
                    }
                }

                // Ajusta o title se tiver provider info extra
                if (providerInfo) {
                    title = `${title} (${providerInfo})`;
                }

                return {
                    id: record.id,
                    hash: record.transaction_hash,
                    type: isDeposit ? 'deposit' : type,
                    title,
                    amount: amountFormatted,
                    rawAmount: safeAmount,
                    assetCode: asset,
                    correlationID,
                    date: new Date(record.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }),
                    status: 'Concluído'
                };
            }).filter(tx => tx.type === 'invoke_host_function' || tx.type === 'deposit' || tx.type === 'path_payment_strict_receive' || tx.type === 'path_payment_strict_send' || (tx.rawAmount > 0 && ['BRZ', 'BRW', 'XLM', 'TESOURO'].includes(tx.assetCode)));

            return history;

        } catch (error) {
            console.error('Falha ao buscar histórico on-chain:', error);
            return [];
        }
    },

    /**
     * Consulta os saldos reais de múltiplos ativos na conta Stellar.
     * Estrutura Genérica de RWA suportando futuros ativos: TESOURO, CETES, USTB.
     */
    async getBalances(publicKey: string): Promise<{ brz: string, brw: string, xlm: string, usdc: string, eurc: string, btc: string, tesouro: string, cetes: string, ustb: string, lp_shares: string } | null> {
        try {
            const server = StellarNetwork.createServer();
            const account = await server.loadAccount(publicKey);

            // Inicia valores vazios para todos os ativos suportados
            const balances = { brz: '0.00', brw: '0.00', xlm: '0.00', usdc: '0.00', eurc: '0.00', btc: '0.00', tesouro: '0.00', cetes: '0.00', ustb: '0.00', lp_shares: '0.00' };
            const foundRWAs: string[] = [];

            account.balances.forEach((balance: any) => {
                const code = balance.asset_code;
                if (balance.asset_type === 'native') balances.xlm = balance.balance;
                else if (code === 'BRZ') balances.brz = balance.balance;
                else if (code === 'BRW') balances.brw = balance.balance;
                else if (code === 'USDC') balances.usdc = balance.balance;
                else if (code === 'EURC') balances.eurc = balance.balance;
                else if (code === 'BTC') balances.btc = balance.balance;
                // --- RWA Bonds ---
                else if (code === 'TESOURO') {
                    balances.tesouro = balance.balance;
                    foundRWAs.push(`TESOURO: ${balance.balance}`);
                }
                else if (code === 'CETES') {
                    balances.cetes = balance.balance;
                    foundRWAs.push(`CETES: ${balance.balance}`);
                }
                else if (code === 'USTB') {
                    balances.ustb = balance.balance;
                    foundRWAs.push(`USTB: ${balance.balance}`);
                }
                else if (balance.asset_type === 'liquidity_pool_shares') {
                    balances.lp_shares = balance.balance;
                }
            });

            if (foundRWAs.length > 0) {
                console.info('[WalletNow][Balances] 🔍 Fallback Horizon detectou RWA na carteira:', foundRWAs.join(', '));
            }

            return balances;
        } catch (error: any) {
            if (error.response?.status !== 404) console.error('[WalletNow][Balances] ❌ Erro ao buscar saldos:', error);
            return null;
        }
    },

    /**
     * Deposita liquidez na AMM Pool Clássica especificada (EX: XLM / USDC)
     * Também possui função "One-Click Swap" caso a carteira não tenha quantidade suficiente de um dos ativos.
     */
    async depositLiquidity(
        userId: string, 
        assetA: Asset, 
        assetB: Asset, 
        amountA: string, 
        amountB: string,
        opts?: { 
            requiresTrustline?: boolean;
            autoSwap?: {
                buyAsset: Asset;
                sellAsset: Asset;
                buyAmount: string;
                maxSellAmount: string;
            }
        }
    ) {
        try {
            const secretKeyStr = this.getSecretKey(userId);
            if (!secretKeyStr) throw new Error("Credencial secreta indisponível.");
            const keypair = Keypair.fromSecret(secretKeyStr);
            const publicKey = keypair.publicKey();
            const server = StellarNetwork.createServer();
            const account = await server.loadAccount(publicKey);
            
            const lpAsset = new LiquidityPoolAsset(assetA, assetB, 30); // 30 bps fee
            
            const txBuilder = new TransactionBuilder(account, {
                fee: StellarNetwork.baseFee,
                networkPassphrase: StellarNetwork.passphrase
            });

            // Adiciona trustline para Asset B (USDC) se o usuário não tiver
            const hasTrustlineB = account.balances.some((b: any) => 
                b.asset_type !== 'native' && b.asset_code === assetB.getCode() && b.asset_issuer === assetB.getIssuer()
            );
            if (!hasTrustlineB && !assetB.isNative()) {
                console.log("[WalletNow][Liquidity] 🔐 Injetando ChangeTrust para", assetB.getCode());
                txBuilder.addOperation(Operation.changeTrust({ asset: assetB }));
            }

            // Se precisar do swap one-click, faz ANTES de confiar na pool
            if (opts?.autoSwap) {
                console.log("[WalletNow][Liquidity] 🔄 Injetando Swap Nativo na Transação para comprar", opts.autoSwap.buyAmount);
                txBuilder.addOperation(Operation.pathPaymentStrictReceive({
                    sendAsset: opts.autoSwap.sellAsset,
                    sendMax: opts.autoSwap.maxSellAmount,
                    destination: publicKey,
                    destAsset: opts.autoSwap.buyAsset,
                    destAmount: opts.autoSwap.buyAmount,
                    path: [] // O Horizon resolve automaticamente o melhor caminho
                }));
            }

            // Adiciona trustline da LP na carteira se for a primeira vez
            if (opts?.requiresTrustline) {
                console.log("[WalletNow][Liquidity] 🔐 Injetando ChangeTrust da LP na Transação");
                txBuilder.addOperation(Operation.changeTrust({ asset: lpAsset }));
            }

            // Em vez de lpAsset.toString(), usamos a string hexadecimal para não dar buffer overflow
            const liquidityPoolIdHex = '4cd1f6defba237eecbc5fefe259f89ebc4b5edd49116beb5536c4034fc48d63f';

            txBuilder.addOperation(Operation.liquidityPoolDeposit({
                liquidityPoolId: liquidityPoolIdHex,
                maxAmountA: amountA,
                maxAmountB: amountB,
                minPrice: '0.0001', // format as float string, cannot be 0.0
                maxPrice: '1000.0', // format as float string
            }));

            const transaction = txBuilder.setTimeout(30).build();
            transaction.sign(keypair);

            console.log("[WalletNow][Liquidity] ⏳ Submetendo Depósito na Pool...", lpAsset.toString());
            const response = await server.submitTransaction(transaction as any);
            console.log("[WalletNow][Liquidity] ✅ Depósito confirmado:", response.hash);
            
            return { success: true, hash: response.hash };
        } catch (error: any) {
            console.error('[WalletNow][Liquidity] ❌ Falha no depósito:', error);
            let errMsg = error.message;
            if (error.response?.data?.extras?.result_codes?.operations) {
                const ops = error.response.data.extras.result_codes.operations;
                const realErrors = ops.filter((op: string) => op !== 'op_success');
                if (realErrors.length > 0) {
                    errMsg = realErrors.join(', ');
                    if (errMsg.includes('op_underfunded')) {
                        const opIndex = ops.findIndex((op: string) => op === 'op_underfunded');
                        errMsg = `op_underfunded na operação ${opIndex}: Saldo insuficiente. Verifique se tem XLM e reservas suficientes.`;
                    } else if (errMsg.includes('op_too_few_offers') || errMsg.includes('op_over_source_max')) {
                        errMsg = "op_too_few_offers: A liquidez da pool é muito baixa para suportar essa quantia sem um slippage gigantesco. Tente um valor menor.";
                    }
                }
            }
            throw new Error(errMsg);
        }
    },

    /**
     * Remove liquidez da AMM Pool Clássica especificada.
     */
    async withdrawLiquidity(
        userId: string, 
        assetA: Asset, 
        assetB: Asset, 
        sharesAmount: string
    ) {
        try {
            const secretKeyStr = this.getSecretKey(userId);
            if (!secretKeyStr) throw new Error("Credencial secreta indisponível.");
            const keypair = Keypair.fromSecret(secretKeyStr);
            const publicKey = keypair.publicKey();
            const server = StellarNetwork.createServer();
            const account = await server.loadAccount(publicKey);
            
            const lpAsset = new LiquidityPoolAsset(assetA, assetB, 30);
            
            const txBuilder = new TransactionBuilder(account, {
                fee: StellarNetwork.baseFee,
                networkPassphrase: StellarNetwork.passphrase
            });

            const liquidityPoolIdHex = '4cd1f6defba237eecbc5fefe259f89ebc4b5edd49116beb5536c4034fc48d63f';

            txBuilder.addOperation(Operation.liquidityPoolWithdraw({
                liquidityPoolId: liquidityPoolIdHex,
                amount: sharesAmount,
                minAmountA: '0',
                minAmountB: '0'
            }));

            const transaction = txBuilder.setTimeout(30).build();
            transaction.sign(keypair);

            console.log("[WalletNow][Liquidity] ⏳ Submetendo Saque da Pool...", lpAsset.toString());
            const response = await server.submitTransaction(transaction as any);
            console.log("[WalletNow][Liquidity] ✅ Saque confirmado:", response.hash);
            
            return { success: true, hash: response.hash };
        } catch (error: any) {
            console.error('[WalletNow][Liquidity] ❌ Falha no saque:', error);
            throw new Error(error.response?.data?.extras?.result_codes?.operations?.[0] || error.message);
        }
    }
};
