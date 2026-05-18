/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DemoConfig } from '../config/demoMode';

type LogCategory = '[WalletNow][UI]' | '[WalletNow][Realtime]' | '[WalletNow][Auth]' | '[WalletNow][Payment]' | '[WalletNow][Blockchain]' | '[WalletNow][System]' | '[WalletNow][Provider]' | '[WalletNow][Woovi]' | '[WalletNow][Stripe]' | '[WalletNow][Etherfuse]';

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
  private log(level: 'info' | 'warn' | 'error', category: LogCategory, message: string, payload?: any) {
    if (!DemoConfig.verboseLogs && level !== 'error') return;

    const sanitizedPayload = payload ? sanitizePayload(payload) : undefined;
    const timestamp = new Date().toISOString();
    
    const formattedMessage = `${timestamp} ${category} ${message}`;

    switch (level) {
      case 'info':
        console.info(`%c${formattedMessage}`, 'color: #00BFFF;', sanitizedPayload || '');
        break;
      case 'warn':
        console.warn(`%c${formattedMessage}`, 'color: #FF8C00;', sanitizedPayload || '');
        break;
      case 'error':
        // Erros devem sempre aparecer, mas higienizados.
        console.error(`%c${formattedMessage}`, 'color: #FF0000; font-weight: bold;', sanitizedPayload || '');
        break;
    }
  }

  info(category: LogCategory, message: string, payload?: any) {
    this.log('info', category, message, payload);
  }

  warn(category: LogCategory, message: string, payload?: any) {
    this.log('warn', category, message, payload);
  }

  error(category: LogCategory, message: string, payload?: any) {
    this.log('error', category, message, payload);
  }
}

export const logger = new AppLogger();
