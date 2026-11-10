/**
 * @module packages/core/src/public/errors/StateError.ts
 * @description Classe de erro tipada (StateError) da hierarquia de exceções do núcleo @walletnow/core (exporta: StateError).
 */
import { WalletNowError } from './WalletNowError.js';

/**
 * StateError — Violações da State Machine do Kernel.
 * ADR-000: INVARIANT-009 exige que este erro exista.
 *
 * Lançado quando:
 * - boot() é chamado antes de init()
 * - Métodos de runtime são chamados antes de READY
 * - boot() é chamado duas vezes
 * - Qualquer operação é tentada após DESTROYED
 */
export class StateError extends WalletNowError {
  readonly currentState: string;
  readonly expectedState?: string | undefined;

  constructor(
    code: string,
    message: string,
    context: Record<string, unknown> & { current: string; expected?: string },
  ) {
    super(code, message, context);
    this.name = 'StateError';
    this.currentState = context.current;
    this.expectedState = context.expected;
  }
}
