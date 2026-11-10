/**
 * @module src/services/providers/providers.test.ts
 * @description Testes unitários para o registro de provedores de depósito (availableProviders),
 * WooviService (máquina de estados mock vs cliente HTTP com fetch mockado) e sanitização de logs (logger & productionLogger).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Keypair } from '@stellar/stellar-sdk';
import {
  availableProviders,
  wooviProvider,
  etherfuseV2Provider,
  defindexProvider,
  stripeProvider,
} from './index';
import { WooviService } from '../wooviService';
import { EtherfuseAssetConfig } from './etherfuse/etherfuseAssetConfig';
import { isValidPublicKey } from '../../utils/stellarValidation';
import { logger } from '../../utils/logger';
import { Logger as ProductionLogger } from '../../utils/productionLogger';
import { DemoConfig } from '../../config/demoMode';

describe('Deposit Providers Registry & Etherfuse Asset Config', () => {
  it('deve expor todos os 6 provedores registrados na ordem esperada com metadados válidos', () => {
    const ids = availableProviders.map((p) => p.id);
    expect(ids).toEqual([
      'woovi',
      'stellar_test_anchor',
      'etherfuse_v2',
      'defindex',
      'stripe',
      'etherfuse',
    ]);

    expect(wooviProvider.status).toBe('active');
    expect(etherfuseV2Provider.status).toBe('active');
    expect(defindexProvider.status).toBe('active');
    expect(stripeProvider.status).toBe('coming_soon');
  });

  it('deve validar a configuração do ativo RWA TESOURO da Etherfuse com emissor Ed25519 verificado', () => {
    expect(EtherfuseAssetConfig.assetCode).toBe('TESOURO');
    expect(isValidPublicKey(EtherfuseAssetConfig.issuer)).toBe(true);
    expect(EtherfuseAssetConfig.decimals).toBe(7);
  });

  it('deve delegar initiateDeposit do WooviProvider para WooviService.createCharge e propagar erros', async () => {
    const spy = vi.spyOn(WooviService, 'createCharge').mockResolvedValueOnce({
      correlationID: 'corr-001',
      brCode: '000201...',
      amount: 150,
      status: 'ACTIVE',
    });

    const charge = await wooviProvider.initiateDeposit(150, 'user-abc');
    expect(charge.correlationID).toBe('corr-001');
    expect(spy).toHaveBeenCalledWith(150, 'user-abc');

    spy.mockRejectedValueOnce(new Error('Gateway timeout'));
    await expect(wooviProvider.initiateDeposit(150, 'user-abc')).rejects.toThrow(
      'Gateway timeout'
    );
  });
});

describe('WooviService — Cliente HTTP Real (fetch mockado) & Máquina de Estados', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('deve chamar POST /charge e GET /charge/:id quando isMockMode = false', async () => {
    (WooviService as any).isMockMode = false;

    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            charge: {
              correlationID: 'real-charge-1',
              brCode: '000201REAL',
              value: 25000,
              status: 'ACTIVE',
            },
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            charge: { status: 'COMPLETED' },
          }),
          { status: 200 }
        )
      );

    const created = await WooviService.createCharge(250, 'user-real-12345678');
    expect(created.correlationID).toBe('real-charge-1');
    expect(created.amount).toBe(250);
    expect(created.status).toBe('ACTIVE');

    const status = await WooviService.checkPaymentStatus('real-charge-1');
    expect(status).toBe('COMPLETED');
    expect(fetchSpy).toHaveBeenCalledTimes(2);

    (WooviService as any).isMockMode = true;
  });

  it('deve lançar erro explícito quando a API HTTP da Woovi retornar status 4xx/5xx ou payload incompleto', async () => {
    (WooviService as any).isMockMode = false;

    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response('Unauthorized', { status: 401 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({}), { status: 200 }))
      .mockResolvedValueOnce(new Response('Server error', { status: 500 }));

    await expect(WooviService.createCharge(50, 'user-12345678')).rejects.toThrow(
      'Erro na criação da cobrança Woovi: 401'
    );
    await expect(WooviService.createCharge(50, 'user-12345678')).rejects.toThrow(
      'Payload da Woovi incompleto'
    );
    await expect(WooviService.checkPaymentStatus('corr-err')).rejects.toThrow(
      'Erro na consulta Woovi: 500'
    );

    (WooviService as any).isMockMode = true;
  });
});

describe('Sanitização de Telemetria e Logs (logger & productionLogger)', () => {
  it('deve redigir campos secret, privateKey, token e key no AppLogger', () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    DemoConfig.verboseLogs = true;

    const secretKey = Keypair.random().secret();
    logger.error('[WalletNow][System]', 'Falha de assinatura', {
      userSecret: secretKey,
      authToken: 'jwt-123',
      publicInfo: 'visible-value',
    });

    const loggedArg = errSpy.mock.calls[0]?.[0] as string;
    expect(loggedArg).toContain('[REDACTED]');
    expect(loggedArg).toContain('visible-value');
    expect(loggedArg).not.toContain(secretKey);
    expect(loggedArg).not.toContain('jwt-123');

    logger.info('[WalletNow][UI]', 'Evento normal', { apiKey: 'sensitive-key' });
    expect(infoSpy.mock.calls[0]?.[0]).toContain('[REDACTED]');
  });

  it('deve redigir chaves secretas Stellar (S...), CPFs e JWTs em strings e objetos no ProductionLogger', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const secret = Keypair.random().secret();
    const fakeJwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjMifQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

    ProductionLogger.warn(
      'Dados recebidos',
      `Chave=${secret} CPF=123.456.789-01 JWT=${fakeJwt}`,
      { cpf: '12345678901', secretSeed: secret, safe: 'ok' }
    );

    const serialized = JSON.stringify(warnSpy.mock.calls[0]);
    expect(serialized).not.toContain(secret);
    expect(serialized).not.toContain('123.456.789-01');
    expect(serialized).not.toContain('12345678901');
    expect(serialized).not.toContain(fakeJwt);
    expect(serialized).toContain('[REDACTED]');
    expect(serialized).toContain('ok');
  });
});
