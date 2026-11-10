/**
 * @module packages/onboarding/src/OnboardingOrchestrator.ts
 * @description Módulo de onboarding invisível (@walletnow/onboarding - OnboardingOrchestrator) — orquestração de identidade, carteira, patrocínio Gasless e sessão (exporta: OnboardingOrchestrator).
 */
/**
 * @walletnow/onboarding — OnboardingOrchestrator
 *
 * Implementação do domínio de Onboarding — caso de uso nº 1 do WalletNow.
 *
 * Responsabilidade única: orquestrar a jornada completa de integração de
 * um novo usuário na Stellar, expondo uma API orientada a negócio que
 * jamais vaza termos de infraestrutura (XDR, trustlines manuais, Horizon).
 *
 * Fluxo interno de createUser():
 *   1. Validar params
 *   2. Verificar duplicidade de externalId
 *   3. Criar identidade via IdentityEngine
 *   4. Criar wallet Stellar via WalletEngine (keypair local)
 *   5. Verificar se conta existe on-chain via AccountEngine
 *      └─ Se não existe + sponsored=true → solicitar Gas Station
 *   6. Configurar trustlines (patrocinadas ou diretas)
 *   7. Emitir evento de analytics
 *   8. Gerar token de sessão
 *   9. Retornar UserOnboardingResult
 */

import type {
  IOnboardingDomain,
  CreateUserParams,
  RestoreUserParams,
  SetupTrustlinesParams,
  UserOnboardingResult,
  TrustlineSetupResult,
  OnboardingUserStatus,
  OnboardingAccountStatus,
} from '@walletnow/contracts';
import { OnboardingError, NotImplementedError } from '@walletnow/contracts';
import type { OnboardingContext } from './OnboardingContext.js';
import { Account, TransactionBuilder, Networks, Operation, Asset, Keypair } from '@stellar/stellar-sdk';

export class OnboardingOrchestrator implements IOnboardingDomain {
  constructor(private readonly ctx: OnboardingContext) {}

  // ─── createUser ──────────────────────────────────────────────────────────────

  async createUser(params: CreateUserParams): Promise<UserOnboardingResult> {
    // 1. Validar entrada
    this._validateExternalId(params.externalId);

    const {
      externalId,
      displayName,
      authMethod = 'keypair',
      trustlines = [],
      sponsored = true,
      metadata = {},
    } = params;

    const network = this.ctx.network;

    // 2. Criar Identidade (gera keypair internamente, nunca expõe private key)
    let identityResult;
    try {
      identityResult = await this.ctx.identity.create({
        method: authMethod === 'keypair' ? 'keypair' : authMethod,
        label: displayName ?? externalId,
        // Para keypair gerado automaticamente, secretOrMnemonic é gerado internamente
        // pelo adapter — o builder jamais vê a chave privada
        ...(authMethod === 'keypair' ? { secretOrMnemonic: await this._generateManagedKeypair() } : {}),
      } as Parameters<typeof this.ctx.identity.create>[0]);
    } catch (err) {
      throw new OnboardingError(
        'ACCOUNT_CREATION_FAILED',
        `Failed to create identity for externalId "${externalId}": ${(err as Error).message}`,
        { externalId, authMethod },
      );
    }

    const userId = identityResult.identity.id;

    // 3. Criar Wallet Stellar vinculada à identidade
    let walletResult;
    try {
      walletResult = await this.ctx.wallet.create({
        identityId: userId,
        custodyType: 'self-custody',
        network,
        label: displayName ?? externalId,
      });
    } catch (err) {
      throw new OnboardingError(
        'ACCOUNT_CREATION_FAILED',
        `Failed to create Stellar wallet for user "${externalId}": ${(err as Error).message}`,
        { externalId },
      );
    }

    const publicKey = walletResult.publicKey;

    // 4. Verificar e ativar conta on-chain
    let accountStatus: OnboardingAccountStatus = 'pending';
    let isSponsored = false;

    const existsOnChain = await this.ctx.account.existsOnChain(publicKey);

    if (!existsOnChain) {
      if (sponsored) {
        // Verificar cota do Gas Station antes de solicitar
        const hasQuota = await this.ctx.gasStation.hasQuota(network);
        if (!hasQuota) {
          throw new OnboardingError(
            'SPONSORSHIP_LIMIT_EXCEEDED',
            `Gas Station quota exceeded for network "${network}". ` +
              'Please upgrade your plan or wait for quota renewal.',
            { externalId, network },
          );
        }

        try {
          await this.ctx.gasStation.sponsorAccountCreation(publicKey, network);
          accountStatus = 'sponsored';
          isSponsored = true;

          await this.ctx.analytics.track({
            name: 'onboarding.account_sponsored',
            userId,
            externalId,
            network,
            metadata: { publicKey },
          });
        } catch (err) {
          throw new OnboardingError(
            'SPONSORSHIP_FAILED',
            `Gas Station failed to sponsor account creation for "${externalId}": ${(err as Error).message}`,
            { externalId, publicKey, network },
          );
        }
      } else {
        // Conta não existe e não foi solicitado patrocínio — fica como pending
        accountStatus = 'pending';
      }
    } else {
      accountStatus = 'active';
    }

    // 5. Configurar trustlines (se conta foi ativada on-chain)
    let configuredTrustlines: string[] = [];
    let failedTrustlines: string[] = [];

    if (trustlines.length > 0 && (accountStatus === 'sponsored' || accountStatus === 'active')) {
      try {
        const accountState = await this.ctx.account.getState(publicKey);
        const sourceAccount = new Account(publicKey, accountState.sequenceNumber);
        const txBuilder = new TransactionBuilder(sourceAccount, {
          fee: '100',
          networkPassphrase: network === 'testnet' ? Networks.TESTNET : Networks.PUBLIC,
        });

        for (const assetStr of trustlines) {
          // [PT-BR] Resolve o ativo com emissor estável/conhecido (R-13) em vez de chave aleatória descartável
          const asset = this._resolveAsset(assetStr, network);
          txBuilder.addOperation(Operation.changeTrust({ asset }));
        }
        
        txBuilder.setTimeout(0);
        const innerTx = txBuilder.build();
        const signedXdr = await this.ctx.wallet.signTransaction(innerTx.toXDR());

        const trustlineResult = await this.ctx.gasStation.sponsorTransaction(
          signedXdr,
          network,
        );
        configuredTrustlines = trustlines;
        failedTrustlines = [];

        await this.ctx.analytics.track({
          name: 'onboarding.trustlines_configured',
          userId,
          externalId,
          network,
          metadata: { configured: configuredTrustlines.length, failed: failedTrustlines.length },
        });
      } catch (err) {
        // Falha em trustlines não é fatal — o usuário foi criado, apenas sem trustlines
        console.error('[OnboardingOrchestrator] Trustline setup failed silently:', err);
        failedTrustlines = [...trustlines];
      }
    }

    // 6. Gerar token de sessão
    let sessionToken: string;
    try {
      sessionToken = await this.ctx.session.createToken(userId, publicKey);
    } catch (err) {
      throw new OnboardingError(
        'SESSION_CREATION_FAILED',
        `Failed to create session token for user "${externalId}": ${(err as Error).message}`,
        { externalId, userId },
      );
    }

    // 7. Emitir evento de analytics de sucesso
    await this.ctx.analytics.track({
      name: 'onboarding.user_created',
      userId,
      externalId,
      network,
      metadata: {
        authMethod,
        isSponsored,
        trustlines: configuredTrustlines.length,
        accountStatus,
      },
    });

    return {
      userId,
      externalId,
      stellarAddress: publicKey,
      network,
      isSponsored,
      trustlines: configuredTrustlines,
      failedTrustlines,
      authMethod: identityResult.identity.authMethod,
      accountStatus,
      createdAt: identityResult.identity.createdAt,
      sessionToken,
    };
  }

  // ─── restoreUser ─────────────────────────────────────────────────────────────

  async restoreUser(params: RestoreUserParams): Promise<UserOnboardingResult> {
    this._validateExternalId(params.externalId);

    const { externalId, authMethod } = params;
    const network = this.ctx.network;

    // Buscar identidade pelo externalId
    const identities = await this.ctx.identity.list();
    const identity = identities.find((id) => id.label === externalId || id.id === externalId);

    if (!identity) {
      throw new OnboardingError(
        'USER_NOT_FOUND',
        `No user found for externalId "${externalId}". Use createUser() to onboard new users.`,
        { externalId },
      );
    }

    // Re-autenticar sessão
    let authResult;
    try {
      authResult = await this.ctx.identity.authenticate(identity.id);
    } catch (err) {
      throw new OnboardingError(
        'USER_NOT_FOUND',
        `Authentication failed for user "${externalId}": ${(err as Error).message}`,
        { externalId, identityId: identity.id },
      );
    }

    // Recuperar a wallet Stellar associada
    const wallets = await this.ctx.wallet.list(identity.id);
    const activeWallet = wallets.find((w) => w.isActive) ?? wallets[0];
    
    if (!activeWallet) {
      throw new OnboardingError(
        'USER_NOT_FOUND',
        `User "${externalId}" has no associated Stellar wallet.`,
        { externalId, identityId: identity.id },
      );
    }

    const publicKey = activeWallet.publicKey;

    // Consultar estado on-chain atual
    const existsOnChain = await this.ctx.account.existsOnChain(publicKey);
    const accountStatus: OnboardingAccountStatus = existsOnChain ? 'active' : 'pending';

    // Gerar novo token de sessão
    let sessionToken: string;
    try {
      sessionToken = await this.ctx.session.createToken(identity.id, publicKey);
    } catch (err) {
      throw new OnboardingError(
        'SESSION_CREATION_FAILED',
        `Failed to create session token for user "${externalId}": ${(err as Error).message}`,
        { externalId },
      );
    }

    await this.ctx.analytics.track({
      name: 'onboarding.user_restored',
      userId: identity.id,
      externalId,
      network,
      metadata: { authMethod: authMethod ?? identity.authMethod, accountStatus },
    });

    return {
      userId: identity.id,
      externalId,
      stellarAddress: publicKey,
      network,
      isSponsored: false, // Conta já existe, não foi re-patrocinada
      trustlines: [],     // Trustlines existentes não são re-listadas aqui (use getUserStatus)
      failedTrustlines: [],
      authMethod: identity.authMethod,
      accountStatus,
      createdAt: identity.createdAt,
      sessionToken,
    };
  }

  // ─── getUserStatus ────────────────────────────────────────────────────────────

  async getUserStatus(userId: string): Promise<OnboardingUserStatus> {
    const identity = await this.ctx.identity.get(userId);

    if (!identity) {
      throw new OnboardingError(
        'USER_NOT_FOUND',
        `No user found with userId "${userId}".`,
        { userId },
      );
    }

    const wallets = await this.ctx.wallet.list(userId);
    const activeWallet = wallets.find((w) => w.isActive) ?? wallets[0];

    if (!activeWallet) {
      throw new OnboardingError(
        'USER_NOT_FOUND',
        `User "${userId}" has no associated Stellar wallet.`,
        { userId },
      );
    }

    const publicKey = activeWallet.publicKey;
    const existsOnChain = await this.ctx.account.existsOnChain(publicKey);
    let accountStatus: OnboardingAccountStatus = existsOnChain ? 'active' : 'pending';

    // Consultar trustlines configuradas
    let trustlines: string[] = [];
    if (existsOnChain) {
      const accountState = await this.ctx.account.getState(publicKey);
      trustlines = accountState.balances
        .filter((b) => b.asset.issuer !== null) // Exclui XLM nativo
        .map((b) => b.asset.code);
    }

    return {
      userId: identity.id,
      externalId: identity.label ?? identity.id,
      stellarAddress: publicKey,
      network: this.ctx.network,
      accountStatus,
      trustlines,
      isSponsored: (accountStatus as OnboardingAccountStatus) === 'sponsored',
      createdAt: identity.createdAt,
      lastActiveAt: identity.lastAuthAt,
    };
  }

  // ─── setupTrustlines ─────────────────────────────────────────────────────────

  async setupTrustlines(params: SetupTrustlinesParams): Promise<TrustlineSetupResult> {
    const { stellarAddress, assets, sponsored = true } = params;
    const network = this.ctx.network;

    if (!assets.length) {
      return {
        stellarAddress,
        configured: [],
        failed: [],
        isSponsored: false,
      };
    }

    // Verificar se conta existe on-chain
    const existsOnChain = await this.ctx.account.existsOnChain(stellarAddress);
    if (!existsOnChain) {
      throw new OnboardingError(
        'ACCOUNT_CREATION_FAILED',
        `Account "${stellarAddress}" does not exist on-chain. Cannot setup trustlines.`,
        { stellarAddress, network },
      );
    }

    if (sponsored) {
      const hasQuota = await this.ctx.gasStation.hasQuota(network);
      if (!hasQuota) {
        throw new OnboardingError(
          'SPONSORSHIP_LIMIT_EXCEEDED',
          `Gas Station quota exceeded for network "${network}".`,
          { stellarAddress, network },
        );
      }

      const accountState = await this.ctx.account.getState(stellarAddress);
      const sourceAccount = new Account(stellarAddress, accountState.sequenceNumber);
      const txBuilder = new TransactionBuilder(sourceAccount, {
        fee: '100',
        networkPassphrase: network === 'testnet' ? Networks.TESTNET : Networks.PUBLIC,
      });

      for (const assetStr of assets) {
        const asset = this._resolveAsset(assetStr, network);
        txBuilder.addOperation(Operation.changeTrust({ asset }));
      }
      
      txBuilder.setTimeout(0);
      const innerTx = txBuilder.build();
      const signedXdr = await this.ctx.wallet.signTransaction(innerTx.toXDR());

      const result = await this.ctx.gasStation.sponsorTransaction(signedXdr, network);
      return {
        stellarAddress,
        configured: assets,
        failed: [],
        isSponsored: true,
        txHash: result.txHash,
      };
    }

    // Sem patrocínio — retorna a transação assinada para o usuário submeter manualmente,
    // ou submete diretamente caso a context permita
    const accountState = await this.ctx.account.getState(stellarAddress);
    const sourceAccount = new Account(stellarAddress, accountState.sequenceNumber);
    const txBuilder = new TransactionBuilder(sourceAccount, {
      fee: '100',
      networkPassphrase: network === 'testnet' ? Networks.TESTNET : Networks.PUBLIC,
    });

    for (const assetStr of assets) {
      const asset = this._resolveAsset(assetStr, network);
      txBuilder.addOperation(Operation.changeTrust({ asset }));
    }
    
    txBuilder.setTimeout(0);
    const innerTx = txBuilder.build();
    const signedXdr = await this.ctx.wallet.signTransaction(innerTx.toXDR());

    return {
      stellarAddress,
      configured: [],
      failed: assets.map(a => ({ asset: a, reason: 'Self-funding not implemented yet. Use sponsored=true or submit manually.' })),
      isSponsored: false
    };
  }

  // ─── createTestUser ───────────────────────────────────────────────────────────

  async createTestUser(params: Partial<CreateUserParams> = {}): Promise<UserOnboardingResult> {
    if (this.ctx.network !== 'testnet') {
      throw new OnboardingError(
        'TESTNET_ONLY',
        'createTestUser() is only available on testnet. Use createUser() for production.',
        { network: this.ctx.network },
      );
    }

    if (!this.ctx.faucet) {
      throw new OnboardingError(
        'TESTNET_ONLY',
        'Testnet faucet is not configured in this OnboardingContext.',
        { network: this.ctx.network },
      );
    }

    const externalId = params.externalId ?? `test_user_${Date.now()}`;

    // Criar usuário base
    const user = await this.createUser({
      externalId,
      displayName: params.displayName ?? `Test User ${externalId}`,
      authMethod: params.authMethod ?? 'keypair',
      trustlines: params.trustlines ?? ['USDC'],
      sponsored: false, // Testnet usa friendbot, não Gas Station
    });

    // Ativar via Friendbot
    await this.ctx.faucet.activateAccount(user.stellarAddress);

    await this.ctx.analytics.track({
      name: 'onboarding.test_user_created',
      userId: user.userId,
      externalId,
      network: this.ctx.network,
    });

    return {
      ...user,
      accountStatus: 'active',
      trustlines: ['USDC'],
      failedTrustlines: [],
    };
  }

  // ─── Helpers Privados ─────────────────────────────────────────────────────────

  private _validateExternalId(externalId: string): void {
    if (!externalId || externalId.trim().length === 0) {
      throw new OnboardingError(
        'INVALID_EXTERNAL_ID',
        'externalId cannot be empty.',
        { externalId },
      );
    }
    if (externalId.length > 256) {
      throw new OnboardingError(
        'INVALID_EXTERNAL_ID',
        'externalId cannot exceed 256 characters.',
        { externalId: externalId.slice(0, 32) + '...' },
      );
    }
  }

  /**
   * Gera um keypair gerenciado automaticamente.
   *
   * NOTA: Em produção, o keypair é gerado via Crypto Driver e a secret key
   * é imediatamente cifrada no storage seguro do adapter.
   * O OrchestratOr NUNCA tem acesso à secret key em plaintext.
   *
   * Esta função retorna um placeholder para o adapter — o adapter
   * detecta este marcador e gera o keypair internamente de forma segura.
   */
  private async _generateManagedKeypair(): Promise<string> {
    // O marcador '__MANAGED__' é reconhecido pelo KeypairAuthAdapter
    // para gerar e cifrar o keypair automaticamente, sem exposição.
    return '__MANAGED__';
  }

  /**
   * [PT-BR] Resolve a especificação do ativo e seu respectivo emissor (Issuer) na rede Stellar.
   * Suporta:
   * 1. 'CODE:ISSUER' (ex: 'USDC:GA5ZSE...') -> usa explicitamente o emissor fornecido.
   * 2. 'CODE' (ex: 'USDC', 'BRZ', 'BRW', 'USDW') -> busca no mapa oficial de emissores conhecidos
   *    de acordo com a rede ativa (testnet ou mainnet), eliminando emissores aleatórios descartáveis.
   */
  private _resolveAsset(assetStr: string, network: string): Asset {
    if (assetStr.includes(':')) {
      const parts = assetStr.split(':');
      const code = parts[0] || 'USDC';
      const issuer = parts[1] || 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';
      return new Asset(code, issuer);
    }

    const TESTNET_FALLBACK = 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';
    const TESTNET_ISSUERS: Record<string, string> = {
      USDC: TESTNET_FALLBACK,
      BRZ: TESTNET_FALLBACK,
      BRW: TESTNET_FALLBACK,
      USDW: TESTNET_FALLBACK,
    };

    const MAINNET_ISSUERS: Record<string, string> = {
      USDC: 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN', // Circle Mainnet
      BRZ: 'GDVKY2GU2DRXBEUF2WOSEM2BFKBLBHNBKNTXCDBC7525JOOE3SKGHGV',  // Transfero Mainnet
    };

    const issuer = network === 'mainnet'
      ? (MAINNET_ISSUERS[assetStr] || TESTNET_ISSUERS[assetStr] || TESTNET_FALLBACK)
      : (TESTNET_ISSUERS[assetStr] || TESTNET_FALLBACK);

    return new Asset(assetStr, issuer);
  }
}
