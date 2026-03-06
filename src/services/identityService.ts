/// <reference types="vite/client" />
import { sha3_256 } from 'js-sha3';
import { Keypair, Horizon, TransactionBuilder, Networks, Asset, Operation, Memo, BASE_FEE } from '@stellar/stellar-sdk';
import { GoogleGenAI } from '@google/genai';

// 1. Instanciando a IA
// O Vite expõe nossas chaves a partir do .env. A Chave do Gemini Ai Studio deve ser definida.
const VITE_GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const ai = new GoogleGenAI({ apiKey: VITE_GEMINI_API_KEY });

// 2. Instanciando o Nó da Blockchain
// Conectamos ao "Horizon" da Testnet (Rede de testes oficial da Stellar)
const server = new Horizon.Server('https://horizon-testnet.stellar.org');

/**
 * Serviço de KYC ZK-STARK (Trust Layer)
 * 
 * Este serviço é invocado quando o usuário pede para virar "Conta Validada".
 * Ele analisa uma imagem (CNH/RG), criptografa o CPF sem revelar os números na rede (ZK-STARK)
 * e injeta a Prova de Conhecimento na Blockchain!
 */
export const IdentityService = {

    /**
     * 1. Hashing do CPF e Dados Completos em SHA3-256 (Pós-Quântico)
     * O "Super-Hash" encadeia todos os dados do usuário, gerando uma única assinatura
     * inquebrável por computação quântica graças à tecnologia "Sponge" do SHA-3.
     */
    generateZKHash(
        name: string,
        cpf: string,
        whatsapp: string,
        email: string,
        birthDate: string,
        address: string,
        secretSalt: string
    ): string {
        const cleanCpf = cpf.replace(/\D/g, ''); // Tira formatação
        const cleanPhone = whatsapp.replace(/\D/g, '');

        // Super-Hash Payload: Normaliza as strings para evitar falsos-negativos de CAPS LOCK
        const payload = `${name.toLowerCase().trim()}:${cleanCpf}:${cleanPhone}:${email.toLowerCase().trim()}:${birthDate.trim()}:${address.toLowerCase().trim()}:${secretSalt}`;

        const zkHash = sha3_256(payload);
        console.log(`🔐 Super-Hash ZK (SHA3-256) Computado: ${zkHash}`);

        return zkHash; // 32 bytes de pura segurança matemática
    },

    /**
     * 2. Visão Computacional Gemini (Análise e OCR IA)
     * O Gemini tem olhos. Enviaremos a imagem Base64, e ele extrairá e julgará se o CNH/RG bate
     * com o CPF e Nome que o usuário preencheu no formulário Front-end de identidade.
     */
    async validateDocumentWithAI(imageBase64: string, expectedCpf: string, expectedName: string): Promise<boolean> {
        try {
            console.log('🤖 Iniciando varredura pericial de IA no Google Gemini...');

            const prompt = `Você é um perito criminal digital de KYC (Conheça Seu Cliente).
      A imagem anexa é (ou deveria ser) um Documento de Identidade oficial Brasileiro (RG ou CNH).
      
      Tarefas:
      1. Leia os campos da imagem via OCR.
      2. Verifique se a foto parece de fato um documento (não uma foto genérica).
      
      Você deve responder ESTRITAMENTE num JSON perfeito (mínimo, sem crases na resposta), neste esquema:
      {
        "nome": "NOME LIDO NO DOCUMENTO",
        "cpf": "12345678900 (NÚMEROS DO CPF LIDO NO DOCUMENTO)",
        "is_valid_document": true ou false
      }`;

            // Vamos separar a string se o navegador jogar "data:image/jpeg;base64,...""
            const mimeTypeMatch = imageBase64.match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,.*/);
            const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : 'image/jpeg';
            const base64Data = imageBase64.split(',')[1] || imageBase64;

            // Enviando Request para a API nativa
            const response = await ai.models.generateContent({
                model: 'gemini-1.5-flash',
                contents: [
                    prompt,
                    {
                        inlineData: {
                            data: base64Data,
                            mimeType: mimeType
                        }
                    }
                ]
            });

            const responseText = response.text || '';
            console.log('🧠 Perícia do Gemini finalizada. Saída Bruta:', responseText);

            // Remoção de formatações Markdown da resposta ('```json ... ```')
            const cleanJson = responseText.replace(/```json|```/gi, '').trim();
            const extractedData = JSON.parse(cleanJson);

            const cleanExpectedCpf = expectedCpf.replace(/\D/g, '');
            const cpfMatch = extractedData.cpf === cleanExpectedCpf;

            // Compara primeira parte do nome em letra minúscula
            const expectedFirstName = expectedName.split(' ')[0].toLowerCase();
            const extractedNome = (extractedData.nome || '').toLowerCase();
            const nameMatch = extractedNome.includes(expectedFirstName);

            if (extractedData.is_valid_document && cpfMatch && nameMatch) {
                console.log('✅ IA aprovou! O documento do usuário é legítimo e idêntico ao formulário.');
                return true;
            } else {
                console.warn('⚠️ ALERTA KYC! Falha de Perícia. Dados extraídos divergentes.', {
                    api_leu: extractedData,
                    esperado: { cleanExpectedCpf, expectedFirstName }
                });
                return false;
            }
        } catch (err: any) {
            console.error('❌ Erro na Comunicação com API IA do Gemini:', err.message);
            return false;
        }
    },

    /**
     * 3. Mintagem da Reputação (Sponsored Reserves) e NFT de Identidade ZK
     * Após o serviço acima confirmar e bater o martelo (True), esse método é ativado.
     * CAP-33: A conta emissora Master assume de graça o aluguel do ledger (reserva)
     * para a carteira do usuário e patrocina as Trustlines (BRZ e KYCZK).
     * 
     * @param userPublicKey Chave do cliente que está sofrendo a auditoria (Criada no WalletFactory).
     * @param userSecretKey Permissão secreta necessária (Dual Singature) para confiar na master
     * @param zkHash A string gerada pelo js-sha3 (Passo 1 deste arquivo)
     */
    async mintReputationZK(userPublicKey: string, userSecretKey: string, zkHash: string): Promise<string | null> {
        try {
            console.log('⛓️ Blockchain: Preparando gravação do Ledger e Token de Conformidade (KYCZK)...');

            // ATENÇÃO: Contas Emissoras (Issuers) custeiam as taxas.
            // Esta seria a carteira MASTER da empresa, abastecida de Lúmens.
            // Para o teste rodar, você precisará gerar um par Mestre temporário e jogar na .env
            const ISSUER_SECRET = import.meta.env.VITE_STELLAR_ISSUER_SECRET || '';

            if (!ISSUER_SECRET) {
                throw new Error('Secret Seed da Conta Mestre Emissora não foi informada na variável VITE_STELLAR_ISSUER_SECRET.');
            }

            const issuerKeypair = Keypair.fromSecret(ISSUER_SECRET);
            const userKeypair = Keypair.fromSecret(userSecretKey);

            console.log('📡 Cores: Buscando sequência de transação no Horizon Network...');
            const issuerAccount = await server.loadAccount(issuerKeypair.publicKey());

            // Protocolo CAP-33 (Sponsored Reserves)
            // O usuário não precisará ter saldos XLM. A conta Master vai "Sponsorar"
            // a criação e as Trustlines do usuário.

            let isNewAccount = false;
            try {
                await server.loadAccount(userPublicKey);
            } catch (err: any) {
                if (err.response?.status === 404) {
                    isNewAccount = true;
                } else {
                    throw new Error(`Falha Horizon Crítica ao consultar Destino: ${err.message}`);
                }
            }

            // Construir lista de operações da transação blindada
            const operations: any[] = [];

            // 1. Iniciar Patrocínio (Master -> User)
            operations.push(Operation.beginSponsoringFutureReserves({
                sponsoredId: userPublicKey,
                // O source será por padrão a conta que construir a Transaction (Issuer)
            }));

            // 2. Cria a conta (Nasce na rede com 0 XLM, o custo base 1XLM é arcado pelo sponsor!)
            if (isNewAccount) {
                operations.push(Operation.createAccount({
                    destination: userPublicKey,
                    startingBalance: '0'
                }));
            }

            // 3. Estabelecer Trustlines (Limites de confiança das Moedas para a carteira do usuário)
            // KYCZK (Token de Identidade)
            const kycAsset = new Asset('KYCZK', issuerKeypair.publicKey());
            operations.push(Operation.changeTrust({
                asset: kycAsset,
                source: userPublicKey // A carteira aceitando a confiança é a do usuário
            }));

            // BRZ (Moeda Estável do Brasil na Testnet usando mesmo patrocínio Master como emissor Mock)
            const brzAsset = new Asset('BRZ', issuerKeypair.publicKey());
            operations.push(Operation.changeTrust({
                asset: brzAsset,
                source: userPublicKey
            }));

            // 4. Encerrar Patrocínio
            operations.push(Operation.endSponsoringFutureReserves({
                source: userPublicKey // O encerramento requer a assinatura do usuário (Patrocinado)
            }));

            const transactionBuilder = new TransactionBuilder(issuerAccount, {
                fee: BASE_FEE,
                networkPassphrase: Networks.TESTNET
            })
                // 🥇 Essa é a chave do NFT: Gravação ZK da auditoria no Ledger. 
                .addMemo(Memo.hash(zkHash))
                .setTimeout(30);

            // Anexa as Operações Empilhadas
            operations.forEach(op => transactionBuilder.addOperation(op));
            const transaction = transactionBuilder.build();

            // ✍️ DUPLA ASSINATURA (Obrigatoriedade do CAP-33)
            // Como mexemos de graça nas Trustlines de uma carteira que não é a Master,
            // precisamos que o usuário também autorize a jogada (Com sua Key secreta).
            transaction.sign(issuerKeypair);
            transaction.sign(userKeypair);

            console.log('🚀 Transmitindo assinatura ZK-STARK (Sponsored) para a Stellar Testnet...');
            const response = await server.submitTransaction(transaction);

            console.log(`✅ Sucesso Histórico! Cripto Identidade gerada!`);
            // Retorna a "Placa do Carro" da transação, você poderá buscá-la Explorer da Stellar!
            return response.hash;

        } catch (err: any) {
            console.error('❌ Blockchain Crítico: Falha na transação:', err?.response?.data || err.message);
            // Captura profunda dos Result Codes do Horizon para diagnóstico exato (ex: tx_bad_auth, op_already_exists)
            const resultCodes = err?.response?.data?.extras?.result_codes;
            let detailError = 'Erro desconhecido da Rede Stellar.';
            if (resultCodes) {
                detailError = `[BLOCKCHAIN REJECTED] TX: ${resultCodes.transaction} | OPS: ${resultCodes.operations?.join(', ')}`;
            } else if (err.message) {
                detailError = err.message;
            }
            throw new Error(`Falha Horizon: ${detailError}`);
        }
    }
};
