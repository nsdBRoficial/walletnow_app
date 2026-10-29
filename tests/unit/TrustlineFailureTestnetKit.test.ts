import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  prepareTrustlineAndSwap,
  runTrustlineAndSwap,
  TrustlineSwapError,
  type ChangeTrustOperation,
  type SwapOperation,
  type TrustlineSwapStatus,
} from '../../packages/sdk/src/trustlineSwapFlow';

describe('Issue 5: Teste de Integração - Simulação de Falha de Trustline no TestnetKit', () => {
  let statusHistory: TrustlineSwapStatus[];
  let networkSubmit: ReturnType<typeof vi.fn>;
  let submitTrustline: ReturnType<typeof vi.fn>;
  let executeSwap: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.restoreAllMocks();
    statusHistory = [];

    // Rede do TestnetKit (Horizon) mockada
    networkSubmit = vi.fn(async (op: { type: string }) => ({ hash: `hash-${op.type}` }));
    submitTrustline = vi.fn((op: ChangeTrustOperation) => networkSubmit(op));
    executeSwap = vi.fn((op: SwapOperation) => networkSubmit(op));
  });

  // 1. Simular o fluxo de preparação de uma transação com duas operações (Trustline + Swap)
  const prepararTransacao = () =>
    prepareTrustlineAndSwap({
      sendAsset: 'XLM',
      sendAmount: '10',
      destAsset: 'BRW',
      destMin: '9.5',
      needsTrustline: true,
    });

  it('deve preparar a transação com duas operações: Trustline e Swap', () => {
    const transacao = prepararTransacao();

    expect(transacao.operations).toHaveLength(2);
    expect(transacao.operations[0].type).toBe('changeTrust');
    expect(transacao.operations[1].type).toBe('pathPaymentStrictSend');
  });

  it('deve mudar o status global para "Falhou" e não disparar o Swap quando a rede rejeitar a Trustline', async () => {
    // 2. Mockar a resposta da rede para rejeitar a operação de Trustline
    const rejeicaoDaRede: any = new Error('Request failed with status code 400');
    rejeicaoDaRede.response = {
      status: 400,
      data: { extras: { result_codes: { transaction: 'tx_failed', operations: ['op_no_issuer'] } } },
    };
    networkSubmit.mockRejectedValueOnce(rejeicaoDaRede);

    const execucao = runTrustlineAndSwap(prepararTransacao(), {
      submitTrustline,
      executeSwap,
      onStatusChange: (status) => statusHistory.push(status),
    });

    await expect(execucao).rejects.toBeInstanceOf(TrustlineSwapError);
    await expect(execucao).rejects.toMatchObject({ step: 'trustline' });

    // Critério de aceite 1: status da operação global no front-end muda para "Falhou"
    expect(statusHistory.at(-1)).toBe('Falhou');
    expect(statusHistory).not.toContain('Executando swap');

    // Critério de aceite 2: a função que dispara o Swap não foi chamada após a falha
    expect(submitTrustline).toHaveBeenCalledTimes(1);
    expect(executeSwap).not.toHaveBeenCalled();
    expect(networkSubmit).toHaveBeenCalledTimes(1);
  });

  it('deve executar o Swap apenas depois que a Trustline for confirmada', async () => {
    const resultado = await runTrustlineAndSwap(prepararTransacao(), {
      submitTrustline,
      executeSwap,
      onStatusChange: (status) => statusHistory.push(status),
    });

    expect(resultado.status).toBe('Concluído');
    expect(statusHistory).toEqual(['Preparando', 'Criando trustline', 'Executando swap', 'Concluído']);
    expect(executeSwap).toHaveBeenCalledTimes(1);
  });
});
