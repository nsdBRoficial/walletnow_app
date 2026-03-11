import { Keypair, Horizon } from '@stellar/stellar-sdk';
import { supabase } from '../lib/supabase';

// Constante simples para chaveamento do Storage. 
// Num cenário real, usaríamos criptografia antes de salvar (Ex: AES-256)
const STORAGE_KEY_PREFIX = '@walletnow:secret:';

/**
 * Serviço: Stellar Wallet Factory (A Fábrica de Carteiras)
 * =======================================================
 * Responsável por toda a abstração Custodial de "UX Zero".
 * 
 * O que isso significa? Significa que o usuário NÃO precisa saber o que
 * é Blockchain, o que é Chave Pública, Chave Privada, Seed Phrase...
 * Este arquivo faz todo o trabalho pesado de criar a carteira na rede
 * Stellar, salvar o "endereço/PIX" na nuvem e esconder a "senha" localmente.
 */
export const WalletFactory = {
    /**
     * Função Principal: provisionWalletForUser
     * ----------------------------------------
     * Passo 1: Gera um novo par de chaves matemáticas da Stellar (Pública/Privada)
     * Passo 2: Salva a Chave Pública (Endereço de Recebimento) na nuvem (Supabase Profile)
     * Passo 3: Salva a Chave Secreta/Privada (Senha de Gastar) no celular/PC do usuário (LocalStorage)
     * 
     * @param userId O ID único do usuário gerado pelo Supabase após o login.
     * @returns Retorna a Chave Pública gerada ou 'null' se algo der errado.
     */
    async provisionWalletForUser(userId: string): Promise<string | null> {
        try {
            console.log('🌱 WalletFactory: Iniciando provisionamento Web3 (Criando Carteira)...');

            // 1. Geração criptográfica usando o SDK oficial da Stellar
            // O Keypair.random() roda um algoritmo matemático complexo (ED25519)
            // para gerar um par de chaves que nunca existiu no universo antes.
            const keypair = Keypair.random();

            // A publicKey (Chave Pública) funciona como sua "Chave PIX". Começa com a letra 'G'.
            // Exemplo: GABC...XYZ. É seguro mostrar para todo mundo.
            const publicKey = keypair.publicKey();

            // A secretKey (Chave Privada/Secreta) funciona como a "Senha do Banco". Começa com a letra 'S'.
            // Exemplo: SABC...XYZ. NINGUÉM pode ver isso, se não roubam seu dinheiro.
            const secretKey = keypair.secret();

            console.log(`🔑 Carteira Matemática gerada! Chave Pública: ${publicKey.slice(0, 5)}...${publicKey.slice(-4)}`);

            // 2. Persistência de Banco de Dados: Linkando a carteira ao Perfil do usuário
            // Aqui dizemos para a nuvem (Supabase): "Ei banco, salve que o fulano dono do ID tal
            // agora é dono desta Chave Pública da Stellar".
            const { error: dbError } = await supabase
                .from('profiles')
                .update({ stellar_address: publicKey }) // O campo que criamos na tabela profiles
                .eq('id', userId); // Filtra para atualizar apenas a linha deste usuário exato

            // Se a nuvem reclamar (banco de dados fora do ar, erro de permissão), a gente trava tudo.
            if (dbError) {
                throw new Error(`Erro ao salvar no Banco de Dados (Supabase): ${dbError.message}`);
            }

            // 3. Persistência Custodial Local: Escondendo a Senha
            // A Regra de Ouro de Cripto é: "Not your keys, not your coins" (Sem as chaves, sem o dinheiro).
            // Jamais salvamos a 'secretKey' na nossa base de dados (Supabase).
            // Por isso, deixamos ela salva apenas no Navegador/Celular local do usuário (LocalStorage).
            // *Nota: No futuro, isso será protegido por cofre do sistema (KMS / Keychain ou Supabase Vault).*
            localStorage.setItem(`${STORAGE_KEY_PREFIX}${userId}`, secretKey);

            console.log('✅ WalletFactory: Carteira gerada, vinculada ao usuário e chave privada salva localmente!');

            // 4. ATIVAÇÃO BLOCKCHAIN (MUITO IMPORTANTE!)
            // Uma chave matemática da Stellar só passa a existir fisicamente no Ledger (Livro-Razão)
            // quando ela recebe o depósito mínimo de ativação (1 XLM).
            // Em produção, a Plataforma (Sponsor) paga isso. Na Testnet, chamamos o Robô (Friendbot).
            try {
                console.log(`🤖 WalletFactory: Acordando o Friendbot para ativar a conta [${publicKey.slice(0,5)}...] na blockchain...`);
                // O Friendbot vai dar 10.000 XLM de graça para essa nova carteira para fins de teste.
                const response = await fetch(`https://horizon-testnet.stellar.org/friendbot?addr=${encodeURIComponent(publicKey)}`);
                const responseJSON = await response.json();
                console.log("SUCCESS! You have a new account :)", responseJSON);
            } catch (e) {
                console.error("ERROR! Algo deu errado ao ativar a conta via Friendbot:", e);
                // Mesmo que o Friendbot falhe (rate limit etc), retornamos a chave pública
                // e o Sponsor precisará ativá-la manualmente no momento da Carga de BRZ.
            }

            // Devolvemos apenas a Chave Pública para que o nosso Front-end (React) possa exibi-la na tela de Configurações
            return publicKey;

        } catch (error) {
            // Se qualquer coisa der errado nos passos acima, a gente avisa o painel do desenvolvedor (Console)
            console.error('❌ WalletFactory Erro Crítico. Não foi possível gerar a carteira:', error);
            return null;
        }
    },

    /**
     * Helper (Ajudante) para recuperar a Chave Privada/Secreta do usuário logado.
     * Nós precisaremos disso no futuro na "Sprint 4" quando o usuário for transferir fundos/sacar,
     * pois precisaremos dessa chave para "assinar/autorizar" a transação na rede Stellar.
     */
    getSecretKey(userId: string): string | null {
        try {
            return localStorage.getItem(`${STORAGE_KEY_PREFIX}${userId}`);
        } catch (e) {
            console.error("📛 WalletFactory: Acesso negado ao LocalStorage (Modo Anônimo?).", e);
            return null;
        }
    },

    /**
     * Helper para buscar o histórico Real On-Chain de transferências (Payments).
     * Oculta métricas técnicas (trustlines, options) e traz apenas os pagamentos relevantes
     * (Depósitos PIX recebidos e Saques enviados).
     */
    async getHistory(publicKey: string): Promise<any[]> {
        try {
            const server = new Horizon.Server('https://horizon-testnet.stellar.org');
            const page = await server.payments().forAccount(publicKey).limit(20).order('desc').call();

            const history = page.records.map((record: any) => {
                // A biblioteca Stellar SDK retorna record.type como 'payment' ou 'create_account' (que também tem um starting_balance)
                let amount = '0';
                let asset = 'XLM';

                if (record.type === 'payment') {
                    amount = record.amount;
                    asset = record.asset_code || 'XLM';
                } else if (record.type === 'create_account') {
                    amount = record.starting_balance;
                }

                const isDeposit = record.to === publicKey || record.account === publicKey /* para create_account */;

                return {
                    id: record.id,
                    hash: record.transaction_hash,
                    type: isDeposit ? 'deposit' : 'send',
                    title: isDeposit ? 'Depósito PIX' : 'Saque PIX / Envio',
                    amount: isDeposit ? `+ R$ ${parseFloat(amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : `- R$ ${parseFloat(amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
                    rawAmount: parseFloat(amount),
                    assetCode: asset,
                    date: new Date(record.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }),
                    status: 'Concluído'
                };
            }).filter(tx => tx.rawAmount > 0 && tx.assetCode === 'BRZ'); // Mantém o app focado em Real(BRZ)

            return history;
        } catch (error) {
            console.error('WalletFactory (getHistory): Falha ao buscar histórico on-chain', error);
            return [];
        }
    },

    /**
     * Helper (Ajudante) para buscar os saldos reais na Blockchain
     * Retorna os balanços em formato de dicionário simplificado.
     */
    async getBalances(publicKey: string): Promise<{ brz: string, xlm: string, usdc: string, btc: string } | null> {
        try {
            const server = new Horizon.Server('https://horizon-testnet.stellar.org');
            const account = await server.loadAccount(publicKey);

            let brzBalance = '0.00';
            let xlmBalance = '0.00';
            let usdcBalance = '0.00';
            let btcBalance = '0.00';

            account.balances.forEach((balance: any) => {
                if (balance.asset_type === 'native') {
                    xlmBalance = balance.balance;
                } else if (balance.asset_code === 'BRZ') {
                    brzBalance = balance.balance;
                } else if (balance.asset_code === 'USDC') {
                    usdcBalance = balance.balance;
                } else if (balance.asset_code === 'BTC') {
                    btcBalance = balance.balance;
                }
            });

            return { brz: brzBalance, xlm: xlmBalance, usdc: usdcBalance, btc: btcBalance };
        } catch (error: any) {
            // Conta pode ainda não existir (404) ou erro de rede
            if (error.response?.status !== 404) {
                console.error('WalletFactory (getBalances):', error);
            }
            return null;
        }
    }
};
