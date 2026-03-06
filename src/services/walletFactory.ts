import { Keypair } from '@stellar/stellar-sdk';
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
        return localStorage.getItem(`${STORAGE_KEY_PREFIX}${userId}`);
    }
};
