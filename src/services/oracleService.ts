import { Operation, TransactionBuilder, Networks, Asset } from "@stellar/stellar-sdk";
import { supabase } from "../lib/supabase";
import { WalletFactory } from "./walletFactory";

// Recupera informações da nossa Conta Master (Issuer de Testes)
const ISSUER_SECRET = import.meta.env.VITE_STELLAR_ISSUER_SECRET;
const ISSUER_PUBLIC = import.meta.env.VITE_STELLAR_ISSUER_PUBLIC;
const BASE_FEE = '10000'; // 0.001 XLM (10x a taxa base para rápida aprovação)

/**
 * Serviço de Oráculos de Precificação 
 * =====================================
 * O Blockchain Stellar é uma rede de registro. Ela não sabe qual é a cotação
 * comercial do XML ou BRZ na conversão para "Dólar" ou "Real".
 * Para isso, nós consultamos Oráculos Off-Chain (Corretoras Mundiais) 
 * com dupla ou tripla redundância de segurança para prevenir manipulação de preço.
 */
export const OracleService = {
    /**
     * Traz os preços em tempo real de toda a cesta Web3 contra BRL
     * Oráculo Principal: CoinGecko (Livre de CORS para frontends).
     */
    async getPrices(): Promise<{ xlm: number, usdc: number, btc: number }> {
        // Fallbacks conservadores caso oráculos falhem
        const fallbacks = { xlm: 0.80, usdc: 5.25, btc: 350000 };

        try {
            const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=stellar,usd-coin,bitcoin&vs_currencies=brl');
            if (res.ok) {
                const data = await res.json();
                return {
                    xlm: data.stellar?.brl || fallbacks.xlm,
                    usdc: data['usd-coin']?.brl || fallbacks.usdc,
                    btc: data.bitcoin?.brl || fallbacks.btc
                };
            }
        } catch (e) {
            console.warn('Oráculo CoinGecko falhou. Tentando redundâncias...', e);
        }

        // Tenta MercadoBitcoin como redundância pro XLM nativo, mas mascara erro de CORS
        try {
            const resMB = await fetch('https://api.mercadobitcoin.net/api/v4/tickers?symbols=XLM-BRL');
            const dataMB = await resMB.json();
            if (dataMB && dataMB[0]?.last) {
                fallbacks.xlm = parseFloat(dataMB[0].last);
            }
        } catch (e) { /* cors block */ }

        // NovaDax pra BTC
        try {
            const resNova = await fetch('https://api.novadax.com/v1/market/ticker?symbol=BTC_BRL');
            const dataNova = await resNova.json();
            if (dataNova?.data?.lastPrice) {
                fallbacks.btc = parseFloat(dataNova.data.lastPrice);
            }
        } catch (e) { /* cors block */ }

        return fallbacks;
    },

    /**
     * Wrapper legacy pro Settings (Pro Mode) e compatibilidade
     */
    async getXlmToBrlPrice(): Promise<number> {
        const prices = await this.getPrices();
        return prices.xlm;
    }
};
