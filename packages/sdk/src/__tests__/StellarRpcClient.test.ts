import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { StellarRpcClient } from '../rpc/StellarRpcClient.js';
import { WalletNowClient } from '../WalletNowClient.js';
import { NetworkError } from '@walletnow/contracts';

describe('@walletnow/sdk — StellarRpcClient Resilience & Retry Mechanism', () => {
  let fetchSpy: any;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('deve tentar novamente quando a chamada RPC falhar com erro 500 e retornar com sucesso na segunda tentativa', async () => {
    let callCount = 0;
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation((() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
          text: () => Promise.resolve('Soroban RPC node returned 500 Internal Error'),
        } as Response);
      }

      return Promise.resolve({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: () =>
          Promise.resolve({
            jsonrpc: '2.0',
            id: 1,
            result: {
              status: 'healthy',
              latestLedger: 998877,
            },
          }),
      } as Response);
    }) as any);

    const rpc = new StellarRpcClient({
      network: 'testnet',
      retry: {
        maxRetries: 3,
        retryDelayMs: 0,
      },
    });

    const result = await rpc.getHealth();

    // Critérios de Aceite:
    // 1. Provar que o SDK fez exatas duas requisições
    expect(fetchSpy).toHaveBeenCalledTimes(2);

    // 2. Retornar os dados do sucesso da segunda tentativa sem expor o erro ao usuário
    expect(result).toEqual({
      status: 'healthy',
      latestLedger: 998877,
    });
  });

  it('deve tentar novamente quando a chamada falhar por Timeout e retornar dados da segunda tentativa', async () => {
    let callCount = 0;
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation((() => {
      callCount++;
      if (callCount === 1) {
        const timeoutError = new Error('Connection timed out');
        timeoutError.name = 'TimeoutError';
        return Promise.reject(timeoutError);
      }

      return Promise.resolve({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: () =>
          Promise.resolve({
            jsonrpc: '2.0',
            id: 1,
            result: {
              sequence: '12345',
            },
          }),
      } as Response);
    }) as any);

    const rpc = new StellarRpcClient({
      network: 'testnet',
      retry: {
        maxRetries: 3,
        retryDelayMs: 0,
      },
    });

    const result = await rpc.getAccount('GBTEST...');

    // Critérios de Aceite:
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ sequence: '12345' });
  });

  it('deve funcionar transparentemente via WalletNowClient.init()', async () => {
    let callCount = 0;
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation((() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
          text: () => Promise.resolve('Internal server error on ledger retrieval'),
        } as Response);
      }

      return Promise.resolve({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: () =>
          Promise.resolve({
            jsonrpc: '2.0',
            id: 1,
            result: {
              ledgerNumber: 887766,
            },
          }),
      } as Response);
    }) as any);

    const client = await WalletNowClient.init({
      network: 'testnet',
      rpc: {
        retry: {
          maxRetries: 3,
          retryDelayMs: 0,
        },
      },
    });

    const result = await client.rpc.getLatestLedger();

    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ ledgerNumber: 887766 });
  });

  it('não deve retentar chamadas em erros 4xx de cliente', async () => {
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation((() => {
      return Promise.resolve({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: () => Promise.resolve('Account not found'),
      } as Response);
    }) as any);

    const rpc = new StellarRpcClient({
      network: 'testnet',
      retry: {
        maxRetries: 3,
        retryDelayMs: 0,
      },
    });

    await expect(rpc.call('getAccount', { address: 'UNKNOWN' })).rejects.toThrow('RPC HTTP Error 404');
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('deve lançar NetworkError ao esgotar todas as tentativas configuradas', async () => {
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation((() => {
      return Promise.resolve({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: () => Promise.resolve('Persistent RPC failure'),
      } as Response);
    }) as any);

    const rpc = new StellarRpcClient({
      network: 'testnet',
      retry: {
        maxRetries: 2,
        retryDelayMs: 0,
      },
    });

    await expect(rpc.getHealth()).rejects.toThrow(NetworkError);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });
});
