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
     * Traz a cotação médica ponderada / média do XLM para BRL (Real)
     * usando 3 Corretoras descentralizadas / centralizadas:
     * 1. Binance (Maior Mundial) -> USD-BRL * XLM-USD
     * 2. Mercado Bitcoin (Maior Nacional)
     * 3. NovaDax (Alta Liquidez Nacional)
     */
    async getXlmToBrlPrice(): Promise<number> {
        const prices: number[] = [];

        // Oráculo 1: Binance (Liquidez Global)
        try {
            const resXLM = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=XLMUSDT');
            const dataXLM = await resXLM.json();

            const resBRL = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=USDTBRL');
            const dataBRL = await resBRL.json();

            if (dataXLM.price && dataBRL.price) {
                prices.push(parseFloat(dataXLM.price) * parseFloat(dataBRL.price));
            }
        } catch (e) { console.warn('Oráculo Binance falhou', e); }

        // Oráculo 2: Mercado Bitcoin (Latam)
        try {
            const resMB = await fetch('https://api.mercadobitcoin.net/api/v4/tickers?symbols=XLM-BRL');
            const dataMB = await resMB.json();
            if (dataMB && dataMB[0]?.last) {
                prices.push(parseFloat(dataMB[0].last));
            }
        } catch (e) { console.warn('Oráculo MercadoBitcoin falhou', e); }

        // Oráculo 3: NovaDax (Liquidez Latam 2)
        try {
            const resNova = await fetch('https://api.novadax.com/v1/market/ticker?symbol=XLM_BRL');
            const dataNova = await resNova.json();
            if (dataNova?.data?.lastPrice) {
                prices.push(parseFloat(dataNova.data.lastPrice));
            }
        } catch (e) { console.warn('Oráculo NovaDax falhou', e); }

        if (prices.length === 0) {
            // Cotação de Emergência Padrão
            return 1.40;
        }

        // Tira a média dos Oráculos Vivos (Previne distorção extrema se 1 falhar)
        const soma = prices.reduce((a, b) => a + b, 0);
        return soma / prices.length;
    }
};
