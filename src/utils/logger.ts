/**
 * @module src/utils/logger.ts
 * @description Utilitário de logging categorizado com redação automática ([REDACTED]) de segredos, chaves privadas e tokens.
 */
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DemoConfig } from '../config/demoMode';

export type LogCategory = '[WalletNow][UI]' | '[WalletNow][Realtime]' | '[WalletNow][Auth]' | '[WalletNow][Payment]' | '[WalletNow][Settlement]' | '[WalletNow][Horizon]' | '[WalletNow][Blockchain]' | '[WalletNow][System]' | '[WalletNow][Provider]' | '[WalletNow][Woovi]' | '[WalletNow][Stripe]' | '[WalletNow][Etherfuse]' | '[WalletNow][EtherfuseProxy]' | '[WalletNow][Trustline]' | '[WalletNow][Treasury]' | '[WalletNow][KYC]' | '[WalletNow][Experiment]';

/**
 * Função utilitária para higienizar logs e prevenir vazamento de secrets.
 */
function sanitizePayload(payload: any): any {
  if (!payload) return payload;

  try {
    const stringified = JSON.stringify(payload, (key, value) => {
      const lowerKey = key.toLowerCase();
      // Não exibe secrets e priv keys
      if (lowerKey.includes('secret') || lowerKey.includes('private') || lowerKey.includes('token') || lowerKey.includes('key')) {
        return '[REDACTED]';
      }
      return value;
    });
    return JSON.parse(stringified);
  } catch (e) {
    return '[UNSERIALIZABLE PAYLOAD]';
  }
}

class AppLogger {
  private log(level: 'info' | 'warn' | 'error', category: LogCategory | string, message: string, payload?: any) {
    if (!DemoConfig.verboseLogs && level !== 'error') return;

    const sanitizedPayload = payload ? sanitizePayload(payload) : undefined;
    const timestamp = new Date().toISOString();
    
    const formattedMessage = `${timestamp} ${category} ${message}`;
    const formattedPayload = sanitizedPayload ? `\n${JSON.stringify(sanitizedPayload, null, 2)}` : '';

    switch (level) {
      case 'info':
        console.info(`%c${formattedMessage}${formattedPayload}`, 'color: #00BFFF;');
        break;
      case 'warn':
        console.warn(`%c${formattedMessage}${formattedPayload}`, 'color: #FF8C00;');
        break;
      case 'error':
        // Erros devem sempre aparecer, mas higienizados.
        console.error(`%c${formattedMessage}${formattedPayload}`, 'color: #FF0000; font-weight: bold;');
        break;
    }
  }

  info(category: LogCategory | string, message: string, payload?: any) {
    this.log('info', category, message, payload);
  }

  warn(category: LogCategory | string, message: string, payload?: any) {
    this.log('warn', category, message, payload);
  }

  error(category: LogCategory | string, message: string, payload?: any) {
    this.log('error', category, message, payload);
  }
}

export const logger = new AppLogger();
