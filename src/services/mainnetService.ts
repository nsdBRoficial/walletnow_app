/**
 * @module src/services/mainnetService.ts
 * @description Serviço de domínio e integração (mainnetService) para operações Stellar, conciliação fiduciária e persistência Supabase (exporta: MainnetService).
 */
import { supabase } from '../lib/supabase';
import { Logger } from '../utils/productionLogger';

export const MainnetService = {
    /**
     * Solicita auto-funding (2 XLM) na MAINNET para uma nova wallet.
     * Invoca a Edge Function mainnet-funding que cuidará das travas e criação atômica da conta.
     * 
     * @param publicKey A chave pública da nova carteira.
     * @returns O hash da transação de ativação em caso de sucesso.
     */
    async requestMainnetFunding(publicKey: string): Promise<string> {
        Logger.info(`[MainnetService] Solicitando funding na MAINNET para: ${publicKey.slice(0, 8)}...`);
        
        const { data, error } = await supabase.functions.invoke('mainnet-funding', {
            body: { publicKey },
        });

        if (error) {
            Logger.error(`[MainnetService] Erro ao invocar mainnet-funding Edge Function`, error);
            throw new Error(error.message || `Falha na Edge Function: mainnet-funding`);
        }

        if (!data?.success) {
            Logger.error(`[MainnetService] Erro de negócio ao solicitar funding`, data);
            throw new Error(`[${data?.errorCode || 'UNKNOWN'}] ${data?.error || 'Erro desconhecido.'}`);
        }

        Logger.info(`[MainnetService] ✅ Funding MAINNET executado. Hash: ${data.txHash} (Ledger: ${data.ledger})`);
        return data.txHash;
    }
};
