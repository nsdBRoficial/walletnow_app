/**
 * Woovi Gateway Service (PIX / OpenPix)
 *
 * [PT-BR] Gerencia a integração do On-ramp / Off-ramp com a ponte fiduciária Woovi.
 * Depósito dispara o Mint (Emissão Blockchain 1:1), e Saque dispara o Burn (Queima de ativo on-chain).
 * Utiliza correlação X402 em todos os lados.
 * 
 * [EN-US] Manages On-ramp / Off-ramp integration with the Woovi fiat bridge.
 * Deposit triggers the Mint (1:1 Blockchain issuance), and Withdrawal triggers the Burn (On-chain asset destruction).
 * Utilizes X402 correlation across all perimeters.
 */

/**
 * AppID da Woovi (Base64 da combinação Cliente:Segredo).
 * Deve ser configurado no arquivo .env.
 */
const WOOVI_APP_ID = import.meta.env.VITE_WOOVI_APP_ID;

/**
 * Base URL para chamadas da API.
 * Em desenvolvimento (Vite), usamos o proxy '/api/woovi' para evitar CORS.
 * Em produção (Hostinger), usamos a URL absoluta da Woovi Sandbox.
 */
const WOOVI_BASE_URL = import.meta.env.DEV ? '/api/woovi' : 'https://api.woovi-sandbox.com/api/v1';

/**
 * Banco de dados volátil para o Modo Mock (Sandbox Local).
 */
const mockDatabase = new Map<string, { status: string; createdAt: number }>();

/**
 * Estrutura de dados para uma cobrança Woovi processada.
 */
export interface WooviCharge {
  /** ID único de correlação (X402) */
  correlationID: string;
  /** String EMV para o Copia e Cola do PIX */
  brCode: string;
  /** Valor real em BRL */
  amount: number;
  /** Status atual da cobrança no Gateway */
  status: 'ACTIVE' | 'COMPLETED' | 'EXPIRED' | 'ERROR_ON_CREATE';
}

/**
 * SDK de integração com a API da Woovi (OpenPix).
 */
class WooviSDK {
  /** Indica se o serviço está operando em modo de simulação (Mock). */
  private isMockMode: boolean;

  constructor() {
    this.isMockMode = !WOOVI_APP_ID || WOOVI_APP_ID === '';
    
    if (this.isMockMode) {
      console.warn('⚠️ [Woovi-Audit] Iniciado em MODO MOCK. Motivo: VITE_WOOVI_APP_ID ausente ou vazio.');
    } else {
      console.info('✅ [Woovi-Audit] Gateway Woovi inicializado em modo REAL.');
    }

    if (import.meta.env.PROD && !window.isSecureContext) {
      console.error('❌ [Security-Audit] Ambiente não seguro detectado! Passkeys e Stellar SDK podem falhar fora de HTTPS.');
    }
  }

  /**
   * Consulta o status atual de uma cobrança PIX no gateway.
   * 
   * @param correlationID ID de correlação da cobrança.
   * @returns O status da cobrança (ACTIVE, COMPLETED, etc).
   */
  async checkPaymentStatus(correlationID: string): Promise<'ACTIVE' | 'COMPLETED' | 'EXPIRED' | 'ERROR_ON_CREATE'> {
    if (this.isMockMode) {
      return this._mockCheckStatus(correlationID);
    }

    try {
      const response = await fetch(`${WOOVI_BASE_URL}/charge/${correlationID}`, {
        method: 'GET',
        headers: {
          'Authorization': WOOVI_APP_ID,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Erro na consulta Woovi: ${response.status}`);
      }

      const data = await response.json();
      return data?.charge?.status ?? 'ACTIVE';
    } catch (error: any) {
      console.error('❌ Falha ao verificar status PIX:', error.message);
      throw error;
    }
  }

  /**
   * Cria uma nova cobrança PIX dinâmica com QR Code EMV.
   * 
   * @param amountBRL Valor em Reais (ex: 50.00).
   * @param userId ID do usuário para vincular a transação.
   * @returns Objeto contendo os dados do QR Code e ID de correlação.
   */
  async createCharge(amountBRL: number, userId: string): Promise<WooviCharge> {
    if (this.isMockMode) {
      return this._mockCreateCharge(amountBRL, userId);
    }

    const amountInCents = Math.round(amountBRL * 100);
    const correlationID = `walletnow-${userId.substring(0, 8)}-${Date.now()}`;

    const payload = {
      correlationID,
      value: amountInCents,
      comment: `Deposito WalletNow - Usuario: ${userId.substring(0, 8)}`,
      expiresIn: 3600,
    };

    try {
      const response = await fetch(`${WOOVI_BASE_URL}/charge`, {
        method: 'POST',
        headers: {
          'Authorization': WOOVI_APP_ID,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errBody = await response.text();
        throw new Error(`Erro na criação da cobrança Woovi: ${response.status}`);
      }

      const data = await response.json();
      const charge = data?.charge;

      if (!charge) {
        throw new Error('Payload da Woovi incompleto.');
      }

      return {
        correlationID: charge.correlationID,
        brCode: charge.brCode,
        amount: charge.value / 100,
        status: charge.status,
      };
    } catch (error: any) {
      console.error('❌ Erro crítico no createCharge Woovi:', error.message);
      throw error;
    }
  }

  /**
   * Executa uma transferência PIX (Saque/Pix Out) para o destinatário informado.
   * Em ambientes Sandbox/Desenvolvedor, a chamada de API é simulada devido a limitações do gateway.
   * 
   * @param pixKey Chave PIX (atualmente restrito a CPF).
   * @param amountBRL Valor em Reais a ser sacado.
   * @returns Objeto com o correlationID da transação bancária.
   */
  async transferPix(pixKey: string, amountBRL: number): Promise<{ correlationID: string }> {
    const correlationID = `saque-${Date.now()}`;

    // Estratégia MVP: Sempre simula o Saque para fechar o ciclo sem bater na API Real (Off-ramp Sandbox não existe)
    console.info('🛠️ [Woovi-Audit] Saque Simulado acionado (Estratégia MVP).');
    await new Promise(resolve => setTimeout(resolve, 2000));
    return { correlationID };

    const amountInCents = Math.round(amountBRL * 100);
    const cleanCPF = pixKey.replace(/\D/g, '');

    const payload = {
      correlationID,
      value: amountInCents,
      pixKey: cleanCPF,
      pixKeyType: 'CPF', 
      taxID: cleanCPF      
    };

    try {
      const response = await fetch('https://api.woovi.com/api/v1/pix/payment', {
        method: 'POST',
        mode: 'cors',
        headers: {
          'Authorization': WOOVI_APP_ID,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Erro ao processar saque Woovi: ${response.status}`);
      }

      const data = await response.json();
      return { correlationID: data.correlationID || correlationID };
    } catch (error: any) {
      console.error('❌ Falha na transferência bancária PIX:', error.message);
      throw error;
    }
  }

  // Métodos Privados para Simulação (Mocks)

  private _mockCreateCharge(amountBRL: number, userId: string): WooviCharge {
    const correlationID = `mock-woovi-${userId.substring(0, 8)}-${Date.now()}`;
    mockDatabase.set(correlationID, { status: 'ACTIVE', createdAt: Date.now() });

    const fakePixCode = `00020126580014br.gov.bcb.pix0136MOCK-PIX-DATA-1234567890-ABCDEF-6304`;

    return {
      correlationID,
      brCode: fakePixCode,
      amount: amountBRL,
      status: 'ACTIVE',
    };
  }

  private _mockCheckStatus(correlationID: string): 'ACTIVE' | 'COMPLETED' | 'EXPIRED' | 'ERROR_ON_CREATE' {
    const charge = mockDatabase.get(correlationID);
    if (!charge) throw new Error(`Cobrança inexistente: ${correlationID}`);

    if (Date.now() - charge.createdAt > 12000 && charge.status === 'ACTIVE') {
      charge.status = 'COMPLETED';
    }

    return charge.status as any;
  }
}

/**
 * Instância exportada do serviço Woovi.
 */
export const WooviService = new WooviSDK();
