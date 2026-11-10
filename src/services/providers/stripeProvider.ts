/**
 * @module src\services\providers\stripeProvider.ts
 * @description WalletNow Protocol - Arquitetura de carteira inteligente e pagamentos Stellar.
 */
import { BaseDepositProvider, ProviderStatus } from './depositProvider';

export class StripeProvider extends BaseDepositProvider {
  id = 'stripe';
  name = 'Stripe';
  status: ProviderStatus = 'coming_soon';
  description = 'Global fiat onboarding via cards and banking rails.';
  buttonLabel = 'Coming Soon';
  iconName = 'CreditCard';
}

export const stripeProvider = new StripeProvider();
