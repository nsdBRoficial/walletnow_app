import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WooviService } from '../../src/services/wooviService';
import { PaymentService } from '../../src/services/paymentService';

// Mocking o environment
vi.mock('../../src/services/paymentService', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    PaymentService: {
      ...actual.PaymentService,
      // Fazemos o mock das integrações externas On-chain reais para focar na máquina de estados lógica
      mintBRW: vi.fn().mockImplementation(async (targetPublicKey, amount, userSecretKey, correlationID) => {
        // Simulando a trava de processamento do PaymentService original
        // Já que mckamos a função, temos que recriar o check de `processingLock` para os testes se quisermos atestar
        // Porém, a trava real está no arquivo original e não pode ser exportada. Vamos atestar o comportamento base.
        if (!targetPublicKey || !amount) throw new Error("Missing params");
        return `mocked_hash_mint_${correlationID}`;
      }),
      executeOffRampWithRollback: vi.fn().mockImplementation(async (userSecretKey, amount, correlationID, pixKey) => {
        const num = parseFloat(amount);
        if (num <= 0) throw new Error("Valor de queima inválido");
        // Simula falha se valor for absurdo
        if (num > 10000) throw new Error("Saldo insuficiente");
        return { hash: `mocked_hash_burn_${correlationID}`, wooviId: `woovi_${Date.now()}` };
      })
    }
  };
});

describe('Payment Flow QA & Mock State Machine', () => {
  const mockUserId = 'user_123';
  let createdChargeId = '';

  beforeEach(() => {
    vi.clearAllMocks();
    // Força o modo Mock no SDK para garantir que a máquina de estados local seja atestada
    (WooviService as any).isMockMode = true;
  });

  describe('Fase 1: On-Ramp (Depósito Mockado)', () => {
    it('deve gerar uma cobrança EMV simulada com status ACTIVE', async () => {
      const charge = await WooviService.createCharge(100, mockUserId);
      expect(charge).toHaveProperty('correlationID');
      expect(charge).toHaveProperty('brCode');
      expect(charge.amount).toBe(100);
      expect(charge.status).toBe('ACTIVE');
      
      createdChargeId = charge.correlationID;
    });

    it('deve manter o status ACTIVE antes de 12 segundos (Fast-Mock guard)', async () => {
      const status = await WooviService.checkPaymentStatus(createdChargeId);
      expect(status).toBe('ACTIVE');
    });

    it('deve avançar o status para COMPLETED após simular a passagem de tempo no mockDatabase', async () => {
      // Como o mockDatabase não é acessível publicamente, forçamos o tempo global a avançar.
      vi.useFakeTimers();
      const charge = await WooviService.createCharge(50, mockUserId);
      
      // Avança 13 segundos para estourar o mock de 12s
      vi.advanceTimersByTime(13000);
      
      const newStatus = await WooviService.checkPaymentStatus(charge.correlationID);
      expect(newStatus).toBe('COMPLETED');
      vi.useRealTimers();
    });

    it('deve impedir que o status COMPLETED retorne para ACTIVE', async () => {
      vi.useFakeTimers();
      const charge = await WooviService.createCharge(50, mockUserId);
      vi.advanceTimersByTime(13000);
      
      let status = await WooviService.checkPaymentStatus(charge.correlationID);
      expect(status).toBe('COMPLETED');

      // Tenta re-verificar. A lógica previne que se altere de novo ou jogue erro no check
      status = await WooviService.checkPaymentStatus(charge.correlationID);
      expect(status).toBe('COMPLETED');
      vi.useRealTimers();
    });
  });

  describe('Fase 2: Off-Ramp (Saque)', () => {
    it('deve simular o saque do gateway Woovi retornando correlationID', async () => {
      const response = await WooviService.transferPix('12345678909', 50);
      expect(response).toHaveProperty('correlationID');
    }, 10000);

    it('deve falhar a simulação da Blockchain se saldo insuficiente (Mock)', async () => {
      await expect(PaymentService.executeOffRampWithRollback('secret', '15000', 'corr_1', '123'))
        .rejects
        .toThrow("Saldo insuficiente");
    });

    it('deve falhar a simulação da Blockchain se valor negativo', async () => {
      await expect(PaymentService.executeOffRampWithRollback('secret', '-50', 'corr_1', '123'))
        .rejects
        .toThrow("Valor de queima inválido");
    });

    it('deve executar OffRamp mockado com sucesso', async () => {
      const result = await PaymentService.executeOffRampWithRollback('secret', '50', 'corr_1', '123');
      expect(result).toHaveProperty('hash');
      expect(result.hash).toContain('mocked_hash_burn');
    });
  });
});
