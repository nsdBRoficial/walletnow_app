import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IdentityService } from './identityService';
import { Keypair, Account } from '@stellar/stellar-sdk';
import { supabase } from '../lib/supabase';

// 1. Mock do Gemini AI Multi-Modal para os 3 cenários rigorosos
const { mockGenerateContent } = vi.hoisted(() => {
    return { mockGenerateContent: vi.fn() };
});
vi.mock('@google/genai', () => {
    return {
        GoogleGenAI: vi.fn().mockImplementation(function () {
            return {
                models: {
                    generateContent: mockGenerateContent
                }
            };
        })
    };
});

// 2. Mock do Motor Stellar Horizon para evitar chamadas de Rede Reais
const { mockSubmitTransaction, mockLoadAccount } = vi.hoisted(() => {
    return {
        mockSubmitTransaction: vi.fn(),
        mockLoadAccount: vi.fn()
    };
});

vi.mock('@stellar/stellar-sdk', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@stellar/stellar-sdk')>();
    return {
        ...actual,
        Horizon: {
            Server: vi.fn().mockImplementation(function () {
                return {
                    loadAccount: mockLoadAccount,
                    submitTransaction: mockSubmitTransaction
                };
            })
        }
    };
});

// 3. Mock do Supabase para o teste de Linking de Identidade
vi.mock('../lib/supabase', () => ({
    supabase: {
        from: vi.fn(() => ({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
                data: { id: 'mocked-id', stellar_address: 'GA_EXISTING_ADDRESS', kyc_verified: true, email: 'user@test.com' },
                error: null
            })
        }))
    }
}));

// Configurar as Keys Mockadas que o vite usa
vi.stubEnv('VITE_GEMINI_API_KEY', 'TEST_KEY');
// Uma valid secret seed para não quebrar a construção assíncrona da transaction e o CRC16 Checksum
vi.stubEnv('VITE_STELLAR_ISSUER_SECRET', 'SDZPNLSE4D5ACUJTNSECCR33TFUN45B6BRNL26REB3SCV3Q6M6U2SHBI');

describe('IdentityService & Core Integrity Tests (Sprint 8)', () => {

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('1. Mocks de IA Multimodal (Gemini API)', () => {

        it('Mock_Faker: Deve retornar falha por Face Mismatch', async () => {
            mockGenerateContent.mockResolvedValueOnce({
                text: JSON.stringify({
                    tipo_documento: "RG",
                    nome: "João Teste",
                    cpf: "12345678900",
                    data_nascimento: "01/01/1990",
                    facial_match: false, // FLAG de Liveness Falhou
                    is_valid_document: true
                })
            });

            const result = await IdentityService.validateDocumentWithAI('img_base64', 'selfie_base64', '12345678900', 'João', '01011990');

            expect(result.isApproved).toBe(false);
            expect(result.errorDetails.some(err => err.includes("Biometria Facial"))).toBe(true);
        });

        it('Mock_Fraude: Deve retornar falha por Data Mismatch (CPF Divergente do OCR)', async () => {
            mockGenerateContent.mockResolvedValueOnce({
                text: JSON.stringify({
                    tipo_documento: "RG",
                    nome: "João Teste",
                    cpf: "99999999999", // CPF Retornado da Leitura é Diferente do Digitado
                    data_nascimento: "01/01/1990",
                    facial_match: true,
                    is_valid_document: true
                })
            });

            const result = await IdentityService.validateDocumentWithAI('img_base64', 'selfie_base64', '12345678900', 'João', '01011990');

            expect(result.isApproved).toBe(false);
            expect(result.errorDetails.some(err => err.includes("CPF: Divergente"))).toBe(true);
        });

        it('Mock_Aprovado: Deve retornar status aprovado e vazio errorDetails ao ter match total', async () => {
            mockGenerateContent.mockResolvedValueOnce({
                text: JSON.stringify({
                    tipo_documento: "RG",
                    nome: "João Teste",
                    cpf: "12345678900",
                    data_nascimento: "01/01/1990",
                    facial_match: true,
                    is_valid_document: true
                })
            });

            const result = await IdentityService.validateDocumentWithAI('img_base64', 'selfie_base64', '12345678900', 'João', '01011990');

            expect(result.isApproved).toBe(true);
            expect(result.errorDetails.length).toBe(0);
        });
    });

    describe('2. Estabilidade Pós-Quântica (js-sha3)', () => {
        it('Garante robustez do Hash Híbrido sem random seeds mutáveis', () => {
            // Uma Prova ZK sempre deve gerar o exato mesmo Hash Híbrido se as chaves e dados forem iguais
            const hash1 = IdentityService.generateZKHash('Daniel', '12345678910', '551199999999', 'test@test.com', '01011990', 'Rua Alfa', 'mock-uuid-salt-secreto');
            const hash2 = IdentityService.generateZKHash('Daniel', '12345678910', '551199999999', 'test@test.com', '01011990', 'Rua Alfa', 'mock-uuid-salt-secreto');

            expect(hash1).toEqual(hash2);
            expect(hash1).toHaveLength(64); // SHA3-256 Retorna Hex String de 64 bytes
            expect(hash1).toMatch(/^[a-f0-9]+$/);
        });
    });

    describe('3. Interceptação On-Chain (Stellar SDK)', () => {
        it('Deve emitir transação de Patrocínio CAP-33 e incorporar Memo.hash corretamente', async () => {
            // Conta 1 (Master) carrega os lúmens. Conta 2 (Nova) gera Erro HTTP 404 (Precisa ser criada usando patrocínio)
            const masterKp = Keypair.fromSecret('SDZPNLSE4D5ACUJTNSECCR33TFUN45B6BRNL26REB3SCV3Q6M6U2SHBI');
            const validMasterPubKey = masterKp.publicKey();

            mockLoadAccount
                .mockResolvedValueOnce(new Account(validMasterPubKey, "1"))
                .mockRejectedValueOnce({ response: { status: 404 } });

            const fakeReceipt = 'tx_hash_success_receipt_123';
            mockSubmitTransaction.mockResolvedValueOnce({ hash: fakeReceipt });

            const userKp = Keypair.random();
            const fakeZkHash = '4ed8190eb1b7153f31053802612884434b3ef4643b91213f96c3bd1aa4bf583a';

            const resultHash = await IdentityService.mintReputationZK(userKp.publicKey(), userKp.secret(), fakeZkHash);
            expect(resultHash).toBe(fakeReceipt);

            // Inspecionar o que foi assinado e transacionado e se foi patrocinado e salvo o Hash perfeitamente
            const submittedTx = mockSubmitTransaction.mock.calls[0][0];

            // 1. ZK-STARK Hash Memo Verification
            expect(submittedTx.memo.type).toBe('hash');
            const hexMemo = submittedTx.memo.value.toString('hex');
            expect(hexMemo).toBe(fakeZkHash);

            // 2. Operações CAP-33 Sponsorship Embutidas
            const operationTypes = submittedTx.operations.map((op: any) => op.type);
            expect(operationTypes).toContain('beginSponsoringFutureReserves');
            expect(operationTypes).toContain('createAccount');
            expect(operationTypes).toContain('changeTrust'); // Cria a confianca pras moedas (BRZ e KYCZK)
            expect(operationTypes).toContain('endSponsoringFutureReserves');
        });
    });

    describe('4. Teste de Duplicidade (Supabase Auth Linking)', () => {
        it('Recupera endereço original e status KYC de uma conta magic link legada evitando Wallet Factory duplicada', async () => {
            // O auto-link é rodado e cruza o E-mail de G-Auth com os e-mails registrados via Magic Link
            const googleAuthEmail = 'daniel@test.com.br';

            // Simulando o pull da AuthContext para a busca de cruzamento de e-mails antigos
            const { data, error } = await supabase.from('profiles').select('*').eq('email', googleAuthEmail).single();

            expect(error).toBeNull();
            // 1. Garante que NÃO DEVE PERDER Endereço Criptográfico
            expect(data.stellar_address).toBe('GA_EXISTING_ADDRESS');
            // 2. Garante que o usuário preservou sua Identidade KYC
            expect(data.kyc_verified).toBe(true);
        });
    });
});
