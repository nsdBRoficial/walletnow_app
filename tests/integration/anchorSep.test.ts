/**
 * @module tests\integration\anchorSep.test.ts
 * @description WalletNow Protocol - Arquitetura de carteira inteligente e pagamentos Stellar.
 */
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { StellarAnchorService } from '../../src/services/stellarAnchorService';
import { Keypair, TransactionBuilder, Account, Networks, Operation, Asset } from '@stellar/stellar-sdk';

describe('Stellar Anchor Integration Tests (SEP-10 & SEP-24)', () => {
  const mockAnchor = 'mockanchor.stellar.org';
  const testKeypair = Keypair.random();
  const testAddress = testKeypair.publicKey();
  const testSecret = testKeypair.secret();
  let mockChallengeXDR: string;

  beforeAll(() => {
    const sourceKeypair = Keypair.random();
    const account = new Account(sourceKeypair.publicKey(), '1');
    const tx = new TransactionBuilder(account, {
      fee: '100',
      networkPassphrase: Networks.TESTNET
    })
      .addOperation(Operation.payment({
        destination: Keypair.random().publicKey(),
        asset: Asset.native(),
        amount: '1'
      }))
      .setTimeout(0)
      .build();
    mockChallengeXDR = tx.toEnvelope().toXDR('base64');
  });

  it('should run a seamlessAuth challenge fetch, sign and submit flow', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch');
    
    // Configura o primeiro retorno (GET challenge) e o segundo (POST token)
    fetchSpy.mockImplementation((url: any, init?: any) => {
      const urlStr = typeof url === 'string' ? url : url.toString();
      
      if (urlStr.includes('/auth') && (!init || init.method === 'GET')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ transaction: mockChallengeXDR })
        } as any);
      }
      
      if (urlStr.includes('/auth') && init?.method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ token: 'mock-anchor-jwt-token-xyz-987' })
        } as any);
      }

      return Promise.reject(new Error(`Unexpected fetch URL: ${urlStr}`));
    });

    const jwtToken = await StellarAnchorService.seamlessAuth(
      mockAnchor,
      testAddress,
      testSecret
    );

    expect(jwtToken).toBe('mock-anchor-jwt-token-xyz-987');
    expect(fetchSpy).toHaveBeenCalledTimes(2);

    fetchSpy.mockRestore();
  });

  it('should generate an interactive deposit URL seamlessly via SEP-24', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch');

    // Configura as chamadas em sequência
    fetchSpy.mockImplementation((url: any, init?: any) => {
      const urlStr = typeof url === 'string' ? url : url.toString();

      if (urlStr.includes('/auth') && (!init || init.method === 'GET')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ transaction: mockChallengeXDR })
        } as any);
      }

      if (urlStr.includes('/auth') && init?.method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ token: 'mock-jwt-token' })
        } as any);
      }

      if (urlStr.includes('/sep24/transactions/deposit/interactive') && init?.method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ url: 'https://mockanchor.stellar.org/sep24/interactive?id=123' })
        } as any);
      }

      return Promise.reject(new Error(`Unexpected fetch: ${urlStr}`));
    });

    const interactiveUrl = await StellarAnchorService.seamlessFund(
      mockAnchor,
      testAddress,
      testSecret,
      'SRT'
    );

    expect(interactiveUrl).toBe('https://mockanchor.stellar.org/sep24/interactive?id=123');
    expect(fetchSpy).toHaveBeenCalledTimes(3);

    fetchSpy.mockRestore();
  });
});
