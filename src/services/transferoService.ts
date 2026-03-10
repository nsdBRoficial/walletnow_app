import crypto from 'crypto';

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

class TransferoSDK {
    private accessToken: string | null = null;
    private tokenExpiresAt: number = 0;

    /**
     * 1. Autenticação OAuth2 "Client Credentials"
     * Negocia o ClientID e Secret em troca de um JWT assinado válido por N minutos.
     */
    async authenticate(): Promise<string> {
        if (this.accessToken && Date.now() < this.tokenExpiresAt) {
            return this.accessToken;
        }

        console.log('🔄 Autenticando com Sandbox API Transfero...');

        // Oauth2 necessita Content-Type urlencoded
        const body = new URLSearchParams({
            grant_type: 'client_credentials',
            client_id: TRANSFERO_CLIENT_ID,
            client_secret: TRANSFERO_CLIENT_SECRET,
            scope: TRANSFERO_SCOPE
        });

        const response = await fetch(`${TRANSFERO_API_URL}/auth/token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: body.toString()
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(`Falha grave de Autenticação Transfero B2B: ${err}`);
        }

        const data = await response.json();
        this.accessToken = data.access_token;
        // O token expira (ex: 3599 min). Guardamos pra não spammar o endpoint deles.
        this.tokenExpiresAt = Date.now() + ((data.expires_in - 60) * 1000);

        console.log('✅ Token JWT Transfero BaaS Obtido com Sucesso.');
        return this.accessToken;
    }

    /**
     * 2. PIX Cash-In (Gerar Cobrança)
     * Solicita um Endereço/QR Code dinâmico na Conta Mestre atrelado a este usuário.
     */
    async generatePixDeposit(amountInBRL: number, supabaseUserId: string) {
        const token = await this.authenticate();

        console.log(`📡 Solicitando QR Code Dinâmico (Cash-In) de R$${amountInBRL} para ${supabaseUserId}...`);

        // Cada depósito possui um UUID local para rastreabilidade de prevenção à lavagem de dinheiro (Webhooks)
        const localTrackingId = crypto.randomUUID();

        const response = await fetch(`${TRANSFERO_API_URL}/v1/deposits`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                account_id: TRANSFERO_ACCOUNT_ID, // Conta destino da Transfero (A nossa Master)
                amount: amountInBRL.toString(),
                currency: 'brl',
                method: 'pix',
                reference: localTrackingId, // ID local no nosso Supabase
                custom_data: {
                    user_id: supabaseUserId // Amarração Criptográfica: Quem pagará para receber o Mint na Blockchain
                }
            })
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(`Transfero Rejeitou Ordem de Depósito PIX: ${err}`);
        }

        const depositObject = await response.json();
        console.log('✅ Ordem Pix Registrada no Gateway Bancário Transfero!');

        // Retornamos os dados vitais para exibir o QR Code em Tela
        return {
            pixCode: depositObject.payment_method_details.qrcode,     // BR Code "Copia e Cola"
            transferoId: depositObject.id,                            // Tracker Oficial do Banco deles
            localReference: localTrackingId,                          // O nosso Tracker (Que atrela ao Banco Cripto)
            amount: amountInBRL
        };
    }

    /**
     * 3. Polling de Status de Depósito
     * Verifica na API da Transfero se aquele PIX já foi pago pelo usuário.
     */
    async checkDepositStatus(transferoId: string) {
        const token = await this.authenticate();

        const response = await fetch(`${TRANSFERO_API_URL}/v1/deposits/${transferoId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Falha ao checar status do depósito.');
        }

        const data = await response.json();
        return data.status; // Esperamos "PAID", "COMPLETED", "PENDING", etc.
    }

    // TODO: Sprint 9 Parte 2: Cash-out (Burn BRZ OnChain -> Saque PIX BACEN)
}

export const TransferoService = new TransferoSDK();
