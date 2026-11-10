/**
 * @module src/services/stellarAnchorService.ts
 * @description Serviço de domínio e integração (stellarAnchorService) para operações Stellar, conciliação fiduciária e persistência Supabase (exporta: StellarAnchorService).
 */
import { Keypair, Transaction, Networks } from '@stellar/stellar-sdk';
import { StellarNetwork } from '../config/stellarNetwork';

/**
 * StellarAnchorService (SEP-10 & SEP-24 Client Interface)
 * 
 * [PT-BR] Serviço cliente que implementa a interação silenciosa (invisível)
 * com âncoras Stellar em conformidade com as SEPs oficiais do ecossistema.
 * Utilizado para autenticação (SEP-10) e rampas de depósito/saque interativas (SEP-24).
 * 
 * [EN-US] Client service implementing the silent (invisible) interaction
 * with Stellar Anchors in compliance with the ecosystem's official SEPs.
 * Used for authentication (SEP-10) and interactive deposit/withdrawal ramps (SEP-24).
 */
export class StellarAnchorService {
  /**
   * Executa a autenticação SEP-10 contra uma âncora de forma assíncrona e silenciosa.
   * 
   * @param anchorDomain O domínio da âncora (ex: 'testanchor.stellar.org')
   * @param userAddress A chave pública do usuário (G...)
   * @param userSecretKey A chave privada do usuário (S...)
   * @returns O JWT retornado pela âncora para assinar as demais requisições.
   */
  static async seamlessAuth(
    anchorDomain: string,
    userAddress: string,
    userSecretKey: string
  ): Promise<string> {
    try {
      console.info(`[SEP-10] 🔐 Iniciando autenticação silenciosa com a âncora: ${anchorDomain}...`);

      // 1. Obter o desafio de autenticação (Challenge XDR)
      const challengeUrl = `https://${anchorDomain}/auth?account=${userAddress}`;
      const challengeRes = await fetch(challengeUrl);
      if (!challengeRes.ok) {
        throw new Error(`Falha ao obter desafio SEP-10 da âncora: HTTP ${challengeRes.status}`);
      }
      
      const challengeJson = await challengeRes.json();
      const transactionXDR = challengeJson.transaction;
      if (!transactionXDR) {
        throw new Error('Payload do desafio SEP-10 inválido (faltando XDR da transação).');
      }

      // 2. Assinar o desafio localmente (comportamento invisível ao usuário final)
      const networkPassphrase = StellarNetwork.config.isMainnet ? Networks.PUBLIC : Networks.TESTNET;
      const challengeTx = new Transaction(transactionXDR, networkPassphrase);
      const userKeypair = Keypair.fromSecret(userSecretKey);
      
      challengeTx.sign(userKeypair);
      const signedXDR = challengeTx.toEnvelope().toXDR('base64');

      // 3. Enviar o desafio assinado para obter o Token JWT de Sessão
      const tokenRes = await fetch(`https://${anchorDomain}/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transaction: signedXDR })
      });

      if (!tokenRes.ok) {
        const errorText = await tokenRes.text();
        throw new Error(`Falha ao submeter resposta SEP-10: HTTP ${tokenRes.status} — ${errorText}`);
      }

      const tokenJson = await tokenRes.json();
      const jwtToken = tokenJson.token;
      if (!jwtToken) {
        throw new Error('A âncora não retornou o token JWT esperado.');
      }

      console.info(`[SEP-10] ✅ Autenticação concluída! JWT obtido.`);
      return jwtToken;
    } catch (error: any) {
      console.error(`[SEP-10] ❌ Falha na autenticação da âncora:`, error.message);
      throw error;
    }
  }

  /**
   * Gera uma URL de depósito interativo (SEP-24) sob o capô.
   * 
   * @param anchorDomain O domínio da âncora.
   * @param userAddress A chave pública da carteira do usuário.
   * @param userSecretKey A chave privada da carteira do usuário.
   * @param assetCode O código do ativo a ser depositado (ex: 'SRT', 'USDC').
   * @returns A URL interativa para renderização no portal.
   */
  static async seamlessFund(
    anchorDomain: string,
    userAddress: string,
    userSecretKey: string,
    assetCode: string
  ): Promise<string> {
    try {
      console.info(`[SEP-24] 💸 Iniciando geração de rampa de depósito interativo para o ativo: ${assetCode}...`);
      
      // 1. Autenticar silenciosamente
      const jwtToken = await this.seamlessAuth(anchorDomain, userAddress, userSecretKey);

      // 2. Montar FormData para o pedido interativo
      const formData = new FormData();
      formData.append('asset_code', assetCode);
      formData.append('account', userAddress);

      // 3. Submeter requisição de depósito
      const depositUrl = `https://${anchorDomain}/sep24/transactions/deposit/interactive`;
      const response = await fetch(depositUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${jwtToken}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Falha na requisição de depósito SEP-24: HTTP ${response.status} — ${errorText}`);
      }

      const data = await response.json();
      const interactiveUrl = data.url;
      if (!interactiveUrl) {
        throw new Error('A âncora não retornou uma URL interativa de rampa.');
      }

      console.info(`[SEP-24] ✅ URL Interativa gerada com sucesso!`);
      return interactiveUrl;
    } catch (error: any) {
      console.error(`[SEP-24] ❌ Falha na geração da rampa fiduciária:`, error.message);
      throw error;
    }
  }

  /**
   * Gera uma URL de saque interativo (SEP-24).
   * 
   * @param anchorDomain O domínio da âncora.
   * @param userAddress A chave pública da carteira do usuário.
   * @param userSecretKey A chave privada da carteira do usuário.
   * @param assetCode O código do ativo a ser sacado.
   * @returns A URL interativa de saque.
   */
  static async seamlessWithdraw(
    anchorDomain: string,
    userAddress: string,
    userSecretKey: string,
    assetCode: string
  ): Promise<string> {
    try {
      console.info(`[SEP-24] 💸 Iniciando geração de rampa de saque interativo para o ativo: ${assetCode}...`);
      
      // 1. Autenticar silenciosamente
      const jwtToken = await this.seamlessAuth(anchorDomain, userAddress, userSecretKey);

      // 2. Montar FormData para o pedido interativo
      const formData = new FormData();
      formData.append('asset_code', assetCode);
      formData.append('account', userAddress);

      // 3. Submeter requisição de saque
      const withdrawUrl = `https://${anchorDomain}/sep24/transactions/withdraw/interactive`;
      const response = await fetch(withdrawUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${jwtToken}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Falha na requisição de saque SEP-24: HTTP ${response.status} — ${errorText}`);
      }

      const data = await response.json();
      const interactiveUrl = data.url;
      if (!interactiveUrl) {
        throw new Error('A âncora não retornou uma URL interativa de rampa para saque.');
      }

      console.info(`[SEP-24] ✅ URL de Saque Interativo gerada com sucesso!`);
      return interactiveUrl;
    } catch (error: any) {
      console.error(`[SEP-24] ❌ Falha na geração da rampa de saque:`, error.message);
      throw error;
    }
  }
}
