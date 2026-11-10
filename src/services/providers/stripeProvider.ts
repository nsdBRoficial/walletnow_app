/**
 * @module src/services/providers/stripeProvider.ts
 * @description Provedor de depósito/liquidez (stripeProvider) conectado ao registro central de rampas do WalletNow (exporta: StripeProvider, stripeProvider).
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
