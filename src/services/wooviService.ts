/**
 * Sprint 9.1: Woovi Gateway Service (PIX / OpenPix)
 *
 * Substitui o motor de pagamentos da Transfero pelo gateway da Woovi.
 * Autenticação: Authorization: {AppID} no header (sem "Bearer", sem "Basic")
 * O AppID é o Base64(ClientId:ClientSecret) gerado no painel Woovi → Autorização → AppID.
 *
 * Documentação: https://developers.woovi.com/api
 * Sandbox: https://app.woovi.com.br
 */

// Header Woovi: Authorization: {AppID}
// O VITE_WOOVI_APP_ID É o token Base64(ClientId:ClientSecret) — não é separado do auth token.
const WOOVI_APP_ID = import.meta.env.VITE_WOOVI_APP_ID;

// ── DEBUG: Exibe no Console se o AppID está chegando preenchido ou undefined ──
// Remove este bloco antes de ir para produção.
console.debug(
  '[WooviService] VITE_WOOVI_APP_ID:',
  WOOVI_APP_ID
    ? `✅ Preenchido (${WOOVI_APP_ID.slice(0, 12)}...${WOOVI_APP_ID.slice(-6)})`
    : '❌ UNDEFINED — verifique o .env.development e reinicie o servidor Vite'
);

// Base URL via Vite Proxy para evitar CORS no browser.
// Em produção real, essa chamada deveria vir de um Backend (Edge Function / Worker).
const WOOVI_BASE_URL = '/api/woovi';

// Banco de dados em memória para o Modo Mock (quando as envs não estiverem configuradas)
const mockDatabase = new Map<string, { status: string; createdAt: number }>();

/**
 * Payload de resposta de uma cobrança criada com sucesso na Woovi.
 */
export interface WooviCharge {
  correlationID: string;
  brCode: string; // A string Copia e Cola do PIX (EMV)
  amount: number; // Em Reais (já convertido de centavos)
  status: 'ACTIVE' | 'COMPLETED' | 'EXPIRED' | 'ERROR_ON_CREATE';
}

class WooviSDK {
  private isMockMode: boolean;

  constructor() {
    // Opera em modo Mock se o AppID não estiver configurado no .env
    this.isMockMode = !WOOVI_APP_ID;
    if (this.isMockMode) {
      console.warn('⚠️ WooviService: VITE_WOOVI_APP_ID ausente. Operando em MODO MOCK. Adicione a variável ao .env.development e reinicie o Vite.');
    } else {
      console.info('✅ WooviService: AppID carregado. Modo SANDBOX REAL ativo.');
    }
  }


  /**
   * GET /api/v1/charge/:correlationID
   * Verifica o status de uma cobrança existente.
   */
  async checkPaymentStatus(correlationID: string): Promise<'ACTIVE' | 'COMPLETED' | 'EXPIRED' | 'ERROR_ON_CREATE'> {
    if (this.isMockMode) {
      return this._mockCheckStatus(correlationID);
    }

    const response = await fetch(`${WOOVI_BASE_URL}/charge/${correlationID}`, {
      method: 'GET',
      headers: {
        // Woovi: Authorization header = AppID direto (Base64 do painel)
        'Authorization': WOOVI_APP_ID,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Woovi checkStatus HTTP Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    // A API Woovi retorna a cobrança dentro de `charge`
    return data?.charge?.status ?? 'ACTIVE';
  }

  /**
   * POST /api/v1/charge
   * Cria uma nova cobrança PIX dinâmica (EMV QR Code).
   *
   * @param amountBRL - Valor em Reais (ex: 100.50)
   * @param userId - ID do usuário para rastreabilidade e correlação (correlationID)
   */
  async createCharge(amountBRL: number, userId: string): Promise<WooviCharge> {
    if (this.isMockMode) {
      return this._mockCreateCharge(amountBRL, userId);
    }

    // Woovi trabalha em centavos (integer). R$ 100,00 = 10000 centavos.
    const amountInCents = Math.round(amountBRL * 100);

    // O correlationID une o universo fiat (Woovi) ao universo on-chain (Stellar)
    const correlationID = `walletnow-${userId.substring(0, 8)}-${Date.now()}`;

    const payload = {
      correlationID,
      value: amountInCents,
      comment: `Deposito WalletNow - Usuario: ${userId.substring(0, 8)}`,
      expiresIn: 3600, // 1 hora de validade
    };

    // DEBUG: Confirma qual AppID está sendo usado no request
    console.debug('[WooviService] createCharge | Authorization sendo enviado:',
      WOOVI_APP_ID ? `${WOOVI_APP_ID.slice(0, 12)}...` : 'VAZIO!');

    const response = await fetch(`${WOOVI_BASE_URL}/charge`, {
      method: 'POST',
      headers: {
        // Woovi: Authorization header = AppID direto (Base64 do painel → Autorização)
        'Authorization': WOOVI_APP_ID,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error(`❌ Woovi createCharge Error Body:`, errBody);
      throw new Error(`Woovi createCharge HTTP Error: ${response.status} - ${errBody}`);
    }

    const data = await response.json();
    const charge = data?.charge;

    if (!charge) {
      throw new Error('Woovi: Resposta inválida - campo "charge" ausente.');
    }

    return {
      correlationID: charge.correlationID,
      brCode: charge.brCode,          // String Copia e Cola EMV completa
      amount: charge.value / 100,     // Converter de volta para Reais
      status: charge.status,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // HELPERS DE MOCK (Modo Desenvolvimento sem credenciais Woovi)
  // ─────────────────────────────────────────────────────────────────────────────

  private _mockCreateCharge(amountBRL: number, userId: string): WooviCharge {
    const correlationID = `mock-woovi-${userId.substring(0, 8)}-${Date.now()}`;

    mockDatabase.set(correlationID, {
      status: 'ACTIVE',
      createdAt: Date.now(),
    });

    console.log(`🤖 [MOCK WOOVI] Cobrança criada: ${correlationID} | R$ ${amountBRL.toFixed(2)}`);

    // Gera um código PIX dummy mas bem formatado visualmente
    const fakePixCode = `00020126580014br.gov.bcb.pix0136${crypto.randomUUID()}5204000053039865405${amountBRL.toFixed(2)}5802BR5925WALLETNOW MOCK WOOVI6009SAO PAULO62070503***6304${Math.random().toString(16).slice(2, 6).toUpperCase()}`;

    return {
      correlationID,
      brCode: fakePixCode,
      amount: amountBRL,
      status: 'ACTIVE',
    };
  }

  private _mockCheckStatus(correlationID: string): 'ACTIVE' | 'COMPLETED' | 'EXPIRED' | 'ERROR_ON_CREATE' {
    const charge = mockDatabase.get(correlationID);

    if (!charge) {
      throw new Error(`[MOCK WOOVI] Cobrança não encontrada: ${correlationID}`);
    }

    // Mágica do Mock: Após 12 segundos, o pagamento "cai" automaticamente
    if (Date.now() - charge.createdAt > 12000 && charge.status === 'ACTIVE') {
      charge.status = 'COMPLETED';
      console.log(`✅ [MOCK WOOVI] Pagamento confirmado! correlationID: ${correlationID}`);
    }

    return charge.status as any;
  }
}

export const WooviService = new WooviSDK();
