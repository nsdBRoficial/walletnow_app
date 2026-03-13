import express from 'express';
import cors from 'cors';
import crypto from 'crypto';

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

const PORT = 4000;

// Configurações do Issuer para Webhook (Produção)
const ISSUER_SECRET = process.env.VITE_STELLAR_ISSUER_SECRET;

// O Banco de Dados em Memória do Mock Server
const fakeDatabase = new Map<string, {
    status: string,
    amount: string,
    qrcode: string,
    createdAt: number
}>();

// ROTA 1: FAKE AZURE AD OAUTH2
// Recebe o ID e Secret e devolve um JWT
app.post('/api/auth/token', (req, res) => {
    console.log('🤖 [MOCK TRANSFERO] Recebendo Requisição OAuth2...');
    return res.status(200).json({
        access_token: 'fake-jwt-token-12345',
        expires_in: 3600,
        token_type: 'Bearer'
    });
});

// ROTA 2: FAKE GERAR PIX DEPÓSITO
// Recebe o pedido do PIX Dinâmico
app.post('/api/v1/deposits', (req, res) => {
    console.log('🤖 [MOCK TRANSFERO] Gerando Ordem de Depósito PIX...');
    const payload = req.body;

    const fakeTransferoId = 'dep_' + crypto.randomUUID().substring(0, 8);

    fakeDatabase.set(fakeTransferoId, {
        status: 'PENDING',
        amount: payload.amount,
        qrcode: `00020126580014br.gov.bcb.pix0136${crypto.randomUUID()}5204000053039865405${payload.amount}5802BR5915MOCK TRANSFERO`,
        createdAt: Date.now()
    });

    return res.status(201).json({
        id: fakeTransferoId,
        payment_method_details: {
            qrcode: fakeDatabase.get(fakeTransferoId)!.qrcode
        }
    });
});

// ROTA 3: FAKE STATUS DO PIX (POLLING)
app.get('/api/v1/deposits/:id', (req, res) => {
    const transferoId = req.params.id;
    const deposit = fakeDatabase.get(transferoId);

    if (!deposit) {
        return res.status(404).json({ message: "Deposit not found" });
    }

    // A Mágica do Nosso Mock: 
    // Se passaram mais de 10 segundos desde que o PIX foi gerado, nós magicamente dizemos que o usuário pagou!
    if (Date.now() - deposit.createdAt > 10000 && deposit.status === 'PENDING') {
        deposit.status = 'PAID';
        console.log(`🤖 [MOCK TRANSFERO] Status do depósito ${transferoId} atualizado para PAID!`);
    }

    console.log(`🤖 [MOCK TRANSFERO] Respondendo status do depósito ${transferoId}: ${deposit.status}`);

    return res.status(200).json({
        id: transferoId,
        status: deposit.status
    });
});

// ROTA 4: WOOVI WEBHOOK (PLACEHOLDER)
// Em produção, este endpoint receberia o aviso da Woovi quando o PIX fosse pago.
app.post('/api/v1/webhooks/woovi', (req, res) => {
    const event = req.body;
    
    console.log('🔔 [WEBHOOK WOOVI] Evento recebido:', event?.event);

    if (event?.event === 'OPENPIX:CHARGE_COMPLETED') {
        const correlationID = event?.charge?.correlationID;
        const value = event?.charge?.value / 100;

        console.log(`✅ [WEBHOOK WOOVI] Pagamento confirmado via Webhook! ID: ${correlationID} | Valor: R$ ${value}`);
        
        // Em um sistema real, aqui o backend chamaria o PaymentService.mintBRW 
        // usando a chave do Issuer persistida no servidor.
        console.info('ℹ️  A mintagem automática via Webhook exige integração com Secret Key no Backend.');
    }

    return res.status(200).json({ status: 'ok' });
});

app.listen(PORT, () => {
    console.log('===========================================================');
    console.log(`🤖 [MOCK TRANSFERO] SIMULADOR BANCÁRIO ONLINE NA PORTA ${PORT}`);
    console.log('===========================================================');
    console.log('Este servidor isolado responde localmente a todas as chamadas');
    console.log('no lugar da Transfero API/Azure oficial para evitar o erro 401.');
});
