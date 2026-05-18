import { BaseDepositProvider, ProviderStatus } from './depositProvider';
import { WooviService } from '../wooviService';
import { logger } from '../../utils/logger';

export class WooviProvider extends BaseDepositProvider {
  id = 'woovi';
  name = 'Woovi / Pix';
  status: ProviderStatus = 'active';
  description = 'Instant Pix deposits using Stellar infrastructure.';
  buttonLabel = 'Continue with Pix';
  iconName = 'QrCode';

  public async initiateDeposit(amount: number, userId: string): Promise<any> {
    logger.info('[WalletNow][Woovi]', `Initiating Woovi Pix generation for user ${userId}, amount: ${amount}`);
    try {
      const result = await WooviService.createCharge(amount, userId);
      return result;
    } catch (error) {
      logger.error('[WalletNow][Woovi]', 'Error generating Woovi charge', error);
      throw error;
    }
  }
}

export const wooviProvider = new WooviProvider();
