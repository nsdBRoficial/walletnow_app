import { describe, it, expect, vi, beforeAll } from 'vitest';
import { WalletFactory } from '../../src/services/walletFactory';
import { PaymentService } from '../../src/services/paymentService';
import { WooviService } from '../../src/services/wooviService';
import * as dotenv from 'dotenv';
import path from 'path';

// Carregar variáveis de ambiente manualmente para o Vitest
dotenv.config({ path: path.resolve(__dirname, '../../.env.development') });

// Mock do Supabase para evitar escritas reais no banco de dados durante os testes
vi.mock('../../src/lib/supabase', () => ({
    supabase: {
        from: () => ({
            update: () => ({
                eq: () => Promise.resolve({ error: null })
            }),
            select: () => ({
                eq: () => ({
                    single: () => Promise.resolve({ data: { stellar_address: 'GBTEST...' }, error: null })
                })
            })
        })
    }
}));

describe('WalletNow Integration Flow (Stellar Testnet + Mocked Woovi)', () => {
    let testUser = { id: 'test-user-id-' + Math.random() };
    let userPublicKey: string;
    let userSecretKey: string;

    beforeAll(async () => {
        // Mock do LocalStorage para vitest/node
        const storage: Record<string, string> = {};
        global.localStorage = {
            getItem: (key: string) => storage[key] || null,
            setItem: (key: string, value: string) => { storage[key] = value; },
            removeItem: (key: string) => { delete storage[key]; },
            clear: () => { for (const key in storage) delete storage[key]; },
            length: 0,
            key: (i: number) => Object.keys(storage)[i] || null
        };
    });

    it('should provision a new wallet and establish trustline', async () => {
        const publicKey = await WalletFactory.provisionWalletForUser(testUser.id);
        expect(publicKey).toBeDefined();
        expect(publicKey?.startsWith('G')).toBe(true);
        
        userPublicKey = publicKey!;
        userSecretKey = WalletFactory.getSecretKey(testUser.id)!;
        
        console.log('🧪 Test Setup:', { 
            publicKey: userPublicKey, 
            hasSecret: !!userSecretKey,
            secretPrefix: userSecretKey?.slice(0, 1) 
        });

        expect(userSecretKey).toBeDefined();
        expect(userSecretKey.startsWith('S')).toBe(true);
    }, 30000);

    it('should simulation deposit and real minting', async () => {
        const amount = "10.50";
        
        // 1. Simula criação de cobrança Woovi
        const charge = await WooviService.createCharge(10.50, 'BRW Test');
        expect(charge.correlationID).toBeDefined();

        // 2. Executa Mintagem Real na Testnet
        const txHash = await PaymentService.mintBRW(
            userPublicKey, 
            amount, 
            userSecretKey, 
            charge.correlationID
        );

        expect(txHash).toBeDefined();
        console.log('✅ Mint Real Concluído:', txHash);
    }, 60000);

    it('should execute off-ramp with burn and simulate success', async () => {
        const amount = "5.00";
        const correlationID = 'test-withdraw-id';
        const cpf = '12345678901';

        // Executa fluxo completo de Saque (Burn Real + Woovi Mockada)
        const result = await PaymentService.executeOffRampWithRollback(
            userSecretKey,
            amount,
            correlationID,
            cpf
        );

        expect(result.hash).toBeDefined();
        expect(result.wooviId).toBeDefined();
        console.log('✅ Burn Real Concluído:', result.hash);
    }, 60000);

    it('should rollback tokens if woovi transfer fails after burn', async () => {
        const amount = "1.00";
        const correlationID = 'test-rollback-id';
        const cpf = 'error_simulate';

        // Forçar falha no WooviService.transferPix
        const transferSpy = vi.spyOn(WooviService, 'transferPix').mockRejectedValue(new Error('Woovi connectivity error'));

        try {
            await PaymentService.executeOffRampWithRollback(
                userSecretKey,
                amount,
                correlationID,
                cpf
            );
            expect(true).toBe(false); // Não deve chegar aqui
        } catch (error: any) {
            expect(error.message).toContain('Blockchain falhou');
            console.log('✅ Rollback Detectado no Teste');
        }
        
        transferSpy.mockRestore();
    }, 60000);
});
