/**
 * @module src\utils\issuerService.ts
 * @description WalletNow Protocol - Arquitetura de carteira inteligente e pagamentos Stellar.
 */
import { supabase } from '../lib/supabase';
import { Logger } from './productionLogger';

type IssuerAction = 
    | 'fund_wallet' 
    | 'sponsor_wallet' 
    | 'mint_asset' 
    | 'burn_asset' 
    | 'swap_assets' 
    | 'send_on_chain' 
    | 'mint_reputation_zk';

export const IssuerService = {
    /**
     * Invoca a Edge Function stellar-issuer para operações server-side.
     * 
     * @param action A ação a ser executada pela Edge Function.
     * @param payload Os dados necessários para a ação.
     * @returns O hash da transação Stellar ou null em caso de erro não tratado (se capturado externamente).
     */
    async invoke(action: IssuerAction, payload: Record<string, any>): Promise<string> {
        Logger.info(`[IssuerService] Invocando Edge Function action=${action}...`);
        
        // As edge functions exigem que o usuário esteja autenticado.
        // O JWT é enviado automaticamente pelo cliente Supabase.
        const { data, error } = await supabase.functions.invoke('stellar-issuer', {
            body: { action, ...payload },
        });

        if (error) {
            Logger.error(`[IssuerService] Erro ao invocar Edge Function para action=${action}`, error);
            throw new Error(error.message || `Falha na Edge Function: ${action}`);
        }

        if (!data?.success) {
            Logger.error(`[IssuerService] Erro de negócio retornado pela Edge Function para action=${action}`, data);
            throw new Error(`[${data?.errorCode || 'UNKNOWN'}] ${data?.error || 'Erro desconhecido.'}`);
        }

        Logger.info(`[IssuerService] Action=${action} executada com sucesso. Hash: ${data.txHash}`);
        return data.txHash;
    }
};
