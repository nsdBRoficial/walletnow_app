import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { StellarRpcClient, WalletNowClient } from '@walletnow/sdk';
import { NetworkError } from '@walletnow/contracts';

describe('Issue 4: Teste de Resiliência - Mecanismo de Retry em Chamadas RPC', () => {
  let fetchSpy: any;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('deve tentar novamente quando a chamada RPC falhar com erro HTTP 500 e retornar com sucesso na segunda tentativa', async () => {
    // 1. Mockar a função fetch utilizada para comunicar com o nó RPC
    let callCount = 0;
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation((() => {
      callCount++;
      if (callCount === 1) {
        // Falha na primeira chamada com erro 500
        return Promise.resolve({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
          text: () => Promise.resolve('RPC node internal server error: database busy'),
        } as Response);
      }

      // Sucesso na segunda chamada
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
              latestLedger: 1234567,
            },
          }),
      } as Response);
    }) as any);

    // Instancia o cliente RPC do SDK com delay zero para execução ágil do teste
    const rpc = new StellarRpcClient({
      network: 'testnet',
      retry: {
        maxRetries: 3,
        retryDelayMs: 0,
      },
    });

    // Executa a chamada RPC
    const result = await rpc.getHealth();

    // Critérios de Aceite:
    // 1. O teste deve provar que o SDK fez exatas duas requisições
    expect(fetchSpy).toHaveBeenCalledTimes(2);

    // 2. O teste deve passar retornando os dados do sucesso da segunda tentativa, sem expor o erro inicial ao usuário
    expect(result).toEqual({
      status: 'healthy',
      latestLedger: 1234567,
    });
  });

  it('deve tentar novamente quando a chamada RPC falhar por Timeout e retornar com sucesso na segunda tentativa', async () => {
    // 1. Mockar a função fetch para simular timeout de rede na primeira chamada
    let callCount = 0;
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation((() => {
      callCount++;
      if (callCount === 1) {
        // Falha por timeout na primeira chamada
        const timeoutErr = new Error('The operation was aborted due to timeout');
        timeoutErr.name = 'AbortError';
        return Promise.reject(timeoutErr);
      }

      // Sucesso na segunda chamada
      return Promise.resolve({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: () =>
          Promise.resolve({
            jsonrpc: '2.0',
            id: 1,
            result: {
              id: 'GAAC7NPJWWRKO57TDAWO35AV6X43DWYHNZKW77D7FT6HKYA74KUL5CXP',
              sequence: '987654321',
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

    // Chamada RPC para getAccount
    const result = await rpc.getAccount('GAAC7NPJWWRKO57TDAWO35AV6X43DWYHNZKW77D7FT6HKYA74KUL5CXP');

    // Critérios de Aceite:
    // 1. O teste deve provar que o SDK fez exatas duas requisições
    expect(fetchSpy).toHaveBeenCalledTimes(2);

    // 2. O teste deve passar retornando os dados do sucesso da segunda tentativa
    expect(result).toEqual({
      id: 'GAAC7NPJWWRKO57TDAWO35AV6X43DWYHNZKW77D7FT6HKYA74KUL5CXP',
      sequence: '987654321',
    });
  });

  it('deve integrar o retry com a fachada principal WalletNowClient do SDK', async () => {
    let callCount = 0;
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation((() => {
      callCount++;
      if (callCount === 1) {
        // Falha transiente HTTP 500
        return Promise.resolve({
          ok: false,
          status: 500,
          statusText: 'Service Unavailable',
          text: () => Promise.resolve('Horizon / Soroban transient 500'),
        } as Response);
      }

      // Sucesso na 2ª tentativa
      return Promise.resolve({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: () =>
          Promise.resolve({
            jsonrpc: '2.0',
            id: 1,
            result: {
              sequence: 45678,
              protocolVersion: 21,
            },
          }),
      } as Response);
    }) as any);

    // Inicialização canônica da fachada WalletNowClient
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

    // Critérios de Aceite cumpridos via fachada
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(result).toEqual({
      sequence: 45678,
      protocolVersion: 21,
    });
  });

  it('não deve fazer retry em erros determinísticos de cliente (ex: HTTP 400 Bad Request)', async () => {
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation((() => {
      return Promise.resolve({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: () => Promise.resolve('Invalid parameters for method getAccount'),
      } as Response);
    }) as any);

    const rpc = new StellarRpcClient({
      network: 'testnet',
      retry: {
        maxRetries: 3,
        retryDelayMs: 0,
      },
    });

    await expect(rpc.getAccount('INVALID_KEY')).rejects.toThrow('RPC HTTP Error 400');

    // Erros 4xx falham imediatamente sem retry desnecessário
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('deve lançar NetworkError com código RPC_UNAVAILABLE quando todas as tentativas esgotarem', async () => {
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation((() => {
      return Promise.resolve({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: () => Promise.resolve('Persistent RPC outage'),
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

    // Duas tentativas realizadas (1 inicial + 1 retry) antes de esgotar
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });
});
