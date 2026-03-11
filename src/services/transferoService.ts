
/**
 * Sprint 9: Integração B2B Transfero Sandbox
 * 
 * Este serviço cuida da conexão do WalletNow com a Switch Blockchain financeira da Transfero.
 * Aqui geramos PIX (Cash-In) que recebem o depósito fiduciário, bem como sacamos BRZ (Cash-out)
 * convertendo tudo pela infraestrutura do BaaS deles na rede Testnet.
 */

const TRANSFERO_CLIENT_ID = process.env.TRANSFERO_CLIENT_ID || import.meta.env.VITE_TRANSFERO_CLIENT_ID;
const TRANSFERO_CLIENT_SECRET = process.env.TRANSFERO_CLIENT_SECRET || import.meta.env.VITE_TRANSFERO_CLIENT_SECRET;
const TRANSFERO_API_URL = process.env.TRANSFERO_API_URL || import.meta.env.VITE_TRANSFERO_API_URL;
const TRANSFERO_SCOPE = process.env.TRANSFERO_SCOPE || import.meta.env.VITE_TRANSFERO_SCOPE;
const TRANSFERO_ACCOUNT_ID = process.env.TRANSFERO_ACCOUNT_ID || import.meta.env.VITE_TRANSFERO_ACCOUNT_ID;

// MOCK DATABASE Apenas no formato em memória do Navegador para atuar sem Backend
const fakeDatabase = new Map<string, { status: string, createdAt: number }>();

class TransferoSDK {
    private accessToken: string | null = null;
    private tokenExpiresAt: number = 0;

    /**
     * 1. Autenticação OAuth2 "Client Credentials" (MOCK)
     */
    async authenticate(): Promise<string> {
        console.log('🔄 Autenticando com Sandbox API Transfero (MOCK FRONTEND)...');
        return new Promise((resolve) => setTimeout(() => resolve('fake-jwt-token-12345'), 500));
    }

    /**
     * 2. PIX Cash-In (Gerar Cobrança - MOCK)
     */
    async generatePixDeposit(amountInBRL: number, supabaseUserId: string) {
        await this.authenticate();

        console.log(`📡 Solicitando QR Code Dinâmico (Cash-In) de R$${amountInBRL} para ${supabaseUserId} (MOCK)...`);

        const localTrackingId = crypto.randomUUID();
        const fakeTransferoId = 'dep_' + crypto.randomUUID().substring(0, 8);
        
        // Registra o nosso PIX pendente na Memória Dinâmica do React
        fakeDatabase.set(fakeTransferoId, {
            status: 'PENDING',
            createdAt: Date.now()
        });

        console.log('✅ Ordem Pix Registrada no Gateway Bancário Transfero (MOCK)!');

        return {
            pixCode: `00020126580014br.gov.bcb.pix0136${crypto.randomUUID()}5204000053039865405${amountInBRL}5802BR5915MOCK TRANSFERO`,
            transferoId: fakeTransferoId,                            
            localReference: localTrackingId,                          
            amount: amountInBRL
        };
    }

    /**
     * 3. Polling de Status de Depósito (MOCK)
     */
    async checkDepositStatus(transferoId: string) {
        await this.authenticate();
        
        const deposit = fakeDatabase.get(transferoId);

        if (!deposit) {
            throw new Error('Falha ao checar status do depósito (Not Found).');
        }

        // A Mágica do Nosso Mock: 
        // Se passaram mais de 10 segundos desde que o PIX foi gerado na interface, dizemos que foi pago!
        if (Date.now() - deposit.createdAt > 10000 && deposit.status === 'PENDING') {
            deposit.status = 'PAID';
            console.log(`🤖 [MOCK TRANSFERO] O Pagamento Mock do depósito ${transferoId} foi confirmado agora.`);
        }

        return deposit.status; // Esperamos "PAID", "COMPLETED", "PENDING", etc.
    }

    // TODO: Sprint 9 Parte 2: Cash-out (Burn BRZ OnChain -> Saque PIX BACEN)
}

export const TransferoService = new TransferoSDK();
