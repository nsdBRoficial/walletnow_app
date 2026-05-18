export type ProviderStatus = 'active' | 'coming_soon' | 'maintenance';

export interface IDepositProvider {
  id: string;
  name: string;
  status: ProviderStatus;
  description: string;
  buttonLabel: string;
  iconName: string; // Used to identify the lucide-react icon dynamically or by switch case
  initiateDeposit?: (amount: number, userId: string) => Promise<any>;
}

export abstract class BaseDepositProvider implements IDepositProvider {
  abstract id: string;
  abstract name: string;
  abstract status: ProviderStatus;
  abstract description: string;
  abstract buttonLabel: string;
  abstract iconName: string;

  public logProviderAction(action: string, details?: any) {
    const detailString = details ? ` - ${JSON.stringify(details)}` : '';
    // This expects logger to be imported or handled, but let's keep it simple
    console.info(`[WalletNow][${this.name}] ${action}${detailString}`);
  }
}
