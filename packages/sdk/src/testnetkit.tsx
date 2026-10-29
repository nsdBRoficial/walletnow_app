import './TestnetKit.css';
// @ts-nocheck
/**
 * WalletNow Developer Portal â€” Testnet Infrastructure Kit
 *
 * Painel completo e interativo para inicializar, financiar e gerenciar
 * ambientes de desenvolvimento e ativos confidenciais na Stellar Testnet.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Copy,
  Check,
  ExternalLink,
  Shield,
  Zap,
  Droplets,
  Coins,
  Activity,
  Wallet,
  RefreshCw,
  Search,
  Lock,
  Eye,
  EyeOff,
  Terminal,
  FileJson,
  Cpu,
  Image as ImageIcon,
  Flame,
  Send
} from 'lucide-react';
import {
  server,
  BRW_ISSUER,
  USDW_ISSUER,
  BRW_KEYPAIR,
  USDW_KEYPAIR,
  PLAYGROUND_SECRETS,
  PLAYGROUND_IDENTITY_KEYS,
  ensureIssuerActive,
  VAULT_KEYPAIR,
  VAULT_ADDRESS
} from './playgroundFakes';
import { Keypair, TransactionBuilder, Asset, Operation, LiquidityPoolAsset, Transaction, Networks } from '@stellar/stellar-sdk';
import { prepareTrustlineAndSwap, runTrustlineAndSwap, TrustlineSwapStatus } from './trustlineSwapFlow';

// Configurações do Faucet e Emissores
const NETWORKS = {
  TESTNET: 'Test SDF Network ; September 2015'
};

// Helper para instanciar LiquidityPoolAsset garantindo ordenação lexicográfica
function createLpAsset(assetA: Asset, assetB: Asset): LiquidityPoolAsset {
  if (assetA.isNative()) return new LiquidityPoolAsset(assetA, assetB, 30);
  if (assetB.isNative()) return new LiquidityPoolAsset(assetB, assetA, 30);

  const codeA = assetA.getCode();
  const codeB = assetB.getCode();

  if (codeA < codeB) return new LiquidityPoolAsset(assetA, assetB, 30);
  if (codeA > codeB) return new LiquidityPoolAsset(assetB, assetA, 30);

  const issuerA = assetA.getIssuer();
  const issuerB = assetB.getIssuer();
  return issuerA < issuerB 
    ? new LiquidityPoolAsset(assetA, assetB, 30) 
    : new LiquidityPoolAsset(assetB, assetA, 30);
}

type ActiveTab = 'dashboard' | 'faucet' | 'pools' | 'vault' | 'explorer' | 'health' | 'caatinga' | 'nfts' | 'hub';

interface LogEntry {
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
  timestamp: string;
}

export default function TestnetKit() {
  const tk: any = {};

  const [activeTab, setActiveTab] = useState<ActiveTab>('hub');
  
  // Estado do One-Click Environment
  const [envLoading, setEnvLoading] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [showSecret, setShowSecret] = useState(false);
  const [envResult, setEnvResult] = useState<{
    publicKey: string;
    secretKey: string;
    xlmTxHash?: string;
    trustlinesTxHash?: string;
    faucetTxHash?: string;
  } | null>(null);

  // Logs do Console de Infraestrutura
  const [logs, setLogs] = useState<LogEntry[]>([
    { message: 'Stellar Testnet Infrastructure Kit initialized.', type: 'info', timestamp: new Date().toLocaleTimeString() }
  ]);

  // Estado do Faucet
  const [faucetAddress, setFaucetAddress] = useState('');
  const [faucetAsset, setFaucetAsset] = useState<'XLM' | 'BRW' | 'USDW'>('BRW');
  const [faucetLoading, setFaucetLoading] = useState(false);
  const [faucetSuccess, setFaucetSuccess] = useState<{hash: string, asset: string, amount: string} | null>(null);
  const [faucetError, setFaucetError] = useState<string | null>(null);

  // Estado do Explorer
  const [searchAddress, setSearchAddress] = useState('');
  const [accountData, setAccountData] = useState<any | null>(null);
  const [explorerLoading, setExplorerLoading] = useState(false);

  // Estado das Pools de Liquidez Reais
  const [pools, setPools] = useState<any[]>([
    {
      name: 'XLM / USDW',
      assetA: Asset.native(),
      assetB: new Asset('USDW', USDW_ISSUER),
      id: '',
      reservesA: '0',
      reservesB: '0',
      shares: '0',
      loaded: false
    },
    {
      name: 'XLM / BRW',
      assetA: Asset.native(),
      assetB: new Asset('BRW', BRW_ISSUER),
      id: '',
      reservesA: '0',
      reservesB: '0',
      shares: '0',
      loaded: false
    },
    {
      name: 'USDW / BRW',
      assetA: new Asset('USDW', USDW_ISSUER),
      assetB: new Asset('BRW', BRW_ISSUER),
      id: '',
      reservesA: '0',
      reservesB: '0',
      shares: '0',
      loaded: false
    }
  ]);
  const [poolInputs, setPoolInputs] = useState<Record<number, { amountA: string; amountB: string; withdrawShares: string }>>({
    0: { amountA: '1000', amountB: '1000', withdrawShares: '100' },
    1: { amountA: '1000', amountB: '5000', withdrawShares: '100' },
    2: { amountA: '1000', amountB: '1000', withdrawShares: '100' }
  });
  const [poolsLoading, setPoolsLoading] = useState<Record<number, boolean>>({});
  const [swapStatus, setSwapStatus] = useState<Record<number, TrustlineSwapStatus>>({});

  // Estado do Health Check
  const [healthStatus, setHealthStatus] = useState<any>({
    horizon: 'checking',
    friendbot: 'checking',
    faucet: 'operational',
    rpc: 'operational',
    confidentialVerifier: 'soon'
  });

  // Estado do NFT Playground
  const [nftInputs, setNftInputs] = useState({
    code: 'TESTNFT',
    supply: '10',
    receiver: '',
    imageType: 'bottts'
  });
  const [nftLoading, setNftLoading] = useState(false);
  const [userNfts, setUserNfts] = useState<any[]>([]);

  // Estado do DeFi Vault (Real Yield)
  const [vaultData, setVaultData] = useState({
    tvlBRW: '0',
    tvlUSDW: '0',
    rewardPoolXLM: '0',
    loaded: false
  });
  const [vaultInputs, setVaultInputs] = useState({
    depositBRW: '100',
    depositUSDW: '100',
    withdrawBRW: '100',
    withdrawUSDW: '100'
  });
  const [vaultStake, setVaultStake] = useState({
    brw: '0',
    usdw: '0',
    xlm: '0'
  });
  const [vaultShares, setVaultShares] = useState({
    brw: '0',
    usdw: '0',
    xlm: '0'
  });
  const [vaultLoading, setVaultLoading] = useState(false);

  interface VaultHistoryItem {
    id: string;
    type: 'deposit' | 'withdraw' | 'yield' | 'boost';
    asset: string;
    amount: string;
    time: Date;
  }
  const [vaultHistory, setVaultHistory] = useState<VaultHistoryItem[]>([]);

  const envResultRef = useRef<any>(null);
  const vaultStakeRef = useRef<any>(null);
  const vaultSharesRef = useRef<any>(null);

  useEffect(() => {
    envResultRef.current = envResult;
  }, [envResult]);

  useEffect(() => {
    vaultStakeRef.current = vaultStake;
  }, [vaultStake]);

  useEffect(() => {
    vaultSharesRef.current = vaultShares;
  }, [vaultShares]);

  const addLog = useCallback((message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info') => {
    setLogs(prev => [
      { message, type, timestamp: new Date().toLocaleTimeString() },
      ...prev
    ]);
  }, []);

  // Helper para copiar texto
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    addLog(`Copied: ${label}`, 'info');
    setTimeout(() => setCopiedText(null), 2000);
  };

  // 1. One Click Test Environment
  const handleCreateEnvironment = async () => {
    if (envLoading) return;
    setEnvLoading(true);
    setEnvResult(null);
    addLog('Generating secure cryptographic keypair...', 'info');

    try {
      // Passo 1: Gerar Keypair Stellar real
      const pair = Keypair.random();
      const pubKey = pair.publicKey();
      const secretKey = pair.secret();

      PLAYGROUND_SECRETS.set(pubKey, secretKey);
      addLog(`New Keypair derived: ${pubKey.slice(0, 8)}... (Saved in RAM)`, 'success');

      // Passo 2: Ativar com Friendbot (Paralelizado com emissores)
      addLog('Activating user and token issuer accounts via Friendbot (parallel)...', 'info');
      const [friendbotRes] = await Promise.all([
        fetch(`https://friendbot.stellar.org/?addr=${pubKey}`),
        ensureIssuerActive('BRW'),
        ensureIssuerActive('USDW')
      ]);

      if (!friendbotRes.ok) {
        throw new Error('Friendbot failed to fund the account.');
      }
      const friendbotData = await friendbotRes.json();
      addLog(`User account activated with 10,000 XLM! Tx Hash: ${friendbotData.hash.slice(0, 12)}...`, 'success');
      addLog('BRW & USDW Token Issuers are active on-chain!', 'success');

      // Delay de propagação do ledger
      addLog('Waiting for ledger propagation (2.5s)...', 'info');
      await new Promise(resolve => setTimeout(resolve, 2500));

      // Passo 3: Criar Trustlines para BRW e USDW
      addLog('Building changeTrust transaction for BRW and USDW...', 'info');
      
      // Carrega o sequence number real da testnet com retry resiliente
      let account;
      let retries = 3;
      while (retries > 0) {
        try {
          account = await server.loadAccount(pubKey);
          break;
        } catch (e) {
          retries--;
          if (retries === 0) throw e;
          addLog('Account not found in Horizon yet. Retrying in 2.5s...', 'warning');
          await new Promise(resolve => setTimeout(resolve, 2500));
        }
      }

      let txBuilder = new TransactionBuilder(account!, {
        fee: '100',
        networkPassphrase: NETWORKS.TESTNET
      });

      // Configurar ativos
      const brwAsset = new Asset('BRW', BRW_ISSUER);
      const usdwAsset = new Asset('USDW', USDW_ISSUER);

      txBuilder = txBuilder
        .addOperation(Operation.changeTrust({ asset: brwAsset, limit: '1000000000' }))
        .addOperation(Operation.changeTrust({ asset: usdwAsset, limit: '1000000000' }));

      const tx = txBuilder.setTimeout(30).build();
      tx.sign(pair);

      addLog('Submitting trustlines transaction on-chain...', 'info');
      const trustlinesResult = await server.submitTransaction(tx);
      addLog(`Trustlines established for BRW and USDW! Tx Hash: ${trustlinesResult.hash.slice(0, 12)}...`, 'success');

      // Passo 4: Depositar 10.000 BRW e 10.000 USDW via Faucet
      addLog('Requesting auto-funding: 10,000 BRW & 10,000 USDW...', 'info');
      
      // Carrega contas emissoras
      const brwAccount = await server.loadAccount(BRW_ISSUER);
      const usdwAccount = await server.loadAccount(USDW_ISSUER);

      // Transação BRW Faucet
      const brwTx = new TransactionBuilder(brwAccount, {
        fee: '100',
        networkPassphrase: NETWORKS.TESTNET
      })
      .addOperation(Operation.payment({ destination: pubKey, asset: brwAsset, amount: '10000' }))
      .setTimeout(30)
      .build();
      brwTx.sign(BRW_KEYPAIR);
      const brwFaucetRes = await server.submitTransaction(brwTx);

      // Transação USDW Faucet
      const usdwTx = new TransactionBuilder(usdwAccount, {
        fee: '100',
        networkPassphrase: NETWORKS.TESTNET
      })
      .addOperation(Operation.payment({ destination: pubKey, asset: usdwAsset, amount: '10000' }))
      .setTimeout(30)
      .build();
      usdwTx.sign(USDW_KEYPAIR);
      const usdwFaucetRes = await server.submitTransaction(usdwTx);

      addLog('Test environment successfully initialized and funded!', 'success');

      setEnvResult({
        publicKey: pubKey,
        secretKey: secretKey,
        xlmTxHash: friendbotData.hash,
        trustlinesTxHash: trustlinesResult.hash,
        faucetTxHash: usdwFaucetRes.hash
      });

      // Atualiza o search input do Explorer e do Faucet para conveniência
      setSearchAddress(pubKey);
      setFaucetAddress(pubKey);
    } catch (err: any) {
      console.error('[Playground Error]', err);
      let detail = err.message;
      if (err.response?.data?.extras?.result_codes) {
        const codes = err.response.data.extras.result_codes;
        const opCodes = codes.operations ? ` operations=${codes.operations.join(', ')}` : '';
        detail += ` (Codes: transaction=${codes.transaction}${opCodes})`;
      } else if (err.response?.data?.detail) {
        detail += ` (${err.response.data.detail})`;
      }
      addLog(`Failed to initialize environment: ${detail}`, 'error');
    } finally {
      setEnvLoading(false);
    }
  };

  // NFT Minter
  const handleMintNft = async (e: React.FormEvent) => {
    e.preventDefault();
    const receiver = nftInputs.receiver || envResult?.publicKey;
    if (!receiver) {
      addLog('Error: Please initialize 1-Click Env or provide a receiver address.', 'error');
      alert('Inicie o 1-Click Env para ter uma wallet de recebimento.');
      return;
    }
    
    setNftLoading(true);
    addLog(`Preparing to mint ${nftInputs.supply} ${nftInputs.code} NFTs...`, 'info');

    try {
      const issuerPair = Keypair.random();
      const nftAsset = new Asset(nftInputs.code, issuerPair.publicKey());
      const receiverAccount = await server.loadAccount(receiver);

      // 1. Sponsor cria o Issuer account
      addLog('1/3 Funding new NFT Issuer account...', 'info');
      const fundTx = new TransactionBuilder(receiverAccount, { fee: '100', networkPassphrase: NETWORKS.TESTNET })
        .addOperation(Operation.createAccount({
          destination: issuerPair.publicKey(),
          startingBalance: '2' // minimo
        }))
        .setTimeout(30).build();
      
      if (envResult?.secretKey) {
        fundTx.sign(Keypair.fromSecret(envResult.secretKey));
      } else {
        throw new Error('No secret key found for sponsor.');
      }
      await server.submitTransaction(fundTx);

      // 2. Receiver cria a Trustline
      addLog('2/3 Creating trustline on receiver account...', 'info');
      const updatedReceiverAcc = await server.loadAccount(receiver);
      const trustTx = new TransactionBuilder(updatedReceiverAcc, { fee: '100', networkPassphrase: NETWORKS.TESTNET })
        .addOperation(Operation.changeTrust({ asset: nftAsset, limit: nftInputs.supply }))
        .setTimeout(30).build();
      
      trustTx.sign(Keypair.fromSecret(envResult.secretKey));
      await server.submitTransaction(trustTx);

      // 3. Issuer anexa metadados, faz o payment e sela a conta (Burn)
      addLog('3/3 Emitting tokens, attaching metadata, and sealing issuer...', 'info');
      const issuerAccount = await server.loadAccount(issuerPair.publicKey());
      
      let imageUrl = '';
      if (nftInputs.imageType === 'qrcode') {
        imageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${issuerPair.publicKey()}`;
      } else {
        imageUrl = `https://api.dicebear.com/7.x/${nftInputs.imageType}/svg?seed=${issuerPair.publicKey()}`;
      }

      const txBuilder = new TransactionBuilder(issuerAccount, { fee: '100', networkPassphrase: NETWORKS.TESTNET })
        .addOperation(Operation.manageData({
          name: 'image',
          value: imageUrl.slice(0, 64) // Stellar limit is 64 bytes
        }))
        .addOperation(Operation.payment({
          destination: receiver,
          asset: nftAsset,
          amount: nftInputs.supply
        }))
        .addOperation(Operation.setOptions({
          masterWeight: 0,
          lowThreshold: 0,
          medThreshold: 0,
          highThreshold: 0
        }));

      const setupTx = txBuilder.setTimeout(30).build();
      setupTx.sign(issuerPair);
      await server.submitTransaction(setupTx);

      addLog(`Successfully minted ${nftInputs.supply} NFTs!`, 'success');
      
      // Simular atualização de galeria local
      setUserNfts(prev => [...prev, {
        code: nftInputs.code,
        issuer: issuerPair.publicKey(),
        balance: nftInputs.supply,
        imageUrl
      }]);

    } catch (err: any) {
      console.error(err);
      addLog(`NFT Minting failed: ${err.message}`, 'error');
    } finally {
      setNftLoading(false);
    }
  };

  // 2. Faucet Interativo
  const handleFaucetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!faucetAddress) {
      addLog('Please enter a valid Stellar address', 'warning');
      return;
    }
    setFaucetLoading(true);
    setFaucetSuccess(null);
    setFaucetError(null);
    addLog(`Processing Faucet request for ${faucetAsset}...`, 'info');

    try {
      if (faucetAsset === 'XLM') {
        const res = await fetch(`https://friendbot.stellar.org/?addr=${faucetAddress}`);
        if (!res.ok) throw new Error('Friendbot failed to distribute XLM.');
        const data = await res.json();
        addLog(`Successfully funded 10,000 XLM. Tx Hash: ${data.hash.slice(0, 12)}...`, 'success');
        setFaucetSuccess({ hash: data.hash, asset: 'XLM', amount: '10,000' });
      } else {
        const isBRW = faucetAsset === 'BRW';
        const issuerKeypair = isBRW ? BRW_KEYPAIR : USDW_KEYPAIR;
        const issuerPub = issuerKeypair.publicKey();
        const assetCode = faucetAsset;

        const issuerAccount = await server.loadAccount(issuerPub);
        const assetObj = new Asset(assetCode, issuerPub);

        // Transferência Pública Clássica
        const tx = new TransactionBuilder(issuerAccount, {
          fee: '100',
          networkPassphrase: NETWORKS.TESTNET
        })
        .addOperation(
          Operation.payment({
            destination: faucetAddress,
            asset: assetObj,
            amount: '10000'
          })
        )
        .setTimeout(30)
        .build();

        tx.sign(issuerKeypair);
        const result = await server.submitTransaction(tx);
        addLog(`Successfully funded 10,000 ${assetCode}. Tx Hash: ${result.hash.slice(0, 12)}...`, 'success');
        setFaucetSuccess({ hash: result.hash, asset: assetCode, amount: '10,000' });
      }
    } catch (err: any) {
      addLog(`Faucet transaction failed: ${err.message}. Make sure the trustline is set up!`, 'error');
      setFaucetError(err.message);
    } finally {
      setFaucetLoading(false);
    }
  };

  // 3. Explorer de Testnet
  const handleSearchAccount = async (addressToSearch?: string) => {
    const target = addressToSearch || searchAddress;
    if (!target) return;
    setExplorerLoading(true);
    setAccountData(null);
    addLog(`Fetching on-chain details for account ${target.slice(0, 8)}...`, 'info');

    try {
      const acc = await server.loadAccount(target);
      const xlmBalance = acc.balances.find(b => b.asset_type === 'native')?.balance ?? '0';
      const balances = acc.balances
        .filter(b => b.asset_type !== 'native')
        .map((b: any) => ({
          code: b.asset_code,
          issuer: b.asset_issuer,
          balance: b.balance
        }));

      setAccountData({
        publicKey: target,
        sequence: acc.sequence,
        xlm: xlmBalance,
        balances
      });
      addLog('Account details retrieved successfully.', 'success');
    } catch (err: any) {
      addLog(`Failed to fetch account info: ${err.message}`, 'error');
    } finally {
      setExplorerLoading(false);
    }
  };

  // --- VAULT LOGIC ---
  const fetchVaultState = async () => {
    try {
      const acc = await server.loadAccount(VAULT_ADDRESS);
      const xlmBalance = acc.balances.find(b => b.asset_type === 'native')?.balance || '0';
      const brwBalance = acc.balances.find(b => (b as any).asset_code === 'BRW')?.balance || '0';
      const usdwBalance = acc.balances.find(b => (b as any).asset_code === 'USDW')?.balance || '0';
      
      setVaultData({
        tvlBRW: brwBalance,
        tvlUSDW: usdwBalance,
        rewardPoolXLM: xlmBalance,
        loaded: true
      });
    } catch (e) {
      // Conta não existe ainda
    }
  };

  const ensureVaultActive = async () => {
    try {
      await server.loadAccount(VAULT_ADDRESS);
    } catch (e) {
      addLog('Activating Global Vault Account on Testnet...', 'info');
      await fetch(`https://friendbot.stellar.org/?addr=${VAULT_ADDRESS}`);
      const vaultAcc = await server.loadAccount(VAULT_ADDRESS);
      const brwAsset = new Asset('BRW', BRW_ISSUER);
      const usdwAsset = new Asset('USDW', USDW_ISSUER);

      const tx = new TransactionBuilder(vaultAcc, { fee: '100', networkPassphrase: NETWORKS.TESTNET })
        .addOperation(Operation.changeTrust({ asset: brwAsset, limit: '1000000000' }))
        .addOperation(Operation.changeTrust({ asset: usdwAsset, limit: '1000000000' }))
        .setTimeout(30).build();
      tx.sign(VAULT_KEYPAIR);
      await server.submitTransaction(tx);
      addLog('Global Vault initialized with Trustlines.', 'success');
    }
    fetchVaultState();
  };

  const handleVaultDeposit = async (assetCode: 'BRW' | 'USDW' | 'XLM') => {
    if (!envResult) return alert('Initialize 1-Click Environment first!');
    let amount = '0';
    if (assetCode === 'BRW') amount = vaultInputs.depositBRW;
    else if (assetCode === 'USDW') amount = vaultInputs.depositUSDW;
    else if (assetCode === 'XLM') amount = vaultInputs.depositXLM;

    if (!amount || Number(amount) <= 0) return;

    setVaultLoading(true);
    addLog(`Depositing ${amount} ${assetCode} into Vault...`, 'info');
    try {
      const userKeypair = Keypair.fromSecret(envResult.secretKey);
      const userAccount = await server.loadAccount(userKeypair.publicKey());
      const assetObj = assetCode === 'XLM' ? Asset.native() : new Asset(assetCode, assetCode === 'BRW' ? BRW_ISSUER : USDW_ISSUER);

      const tx = new TransactionBuilder(userAccount, { fee: '100', networkPassphrase: NETWORKS.TESTNET })
        .addOperation(Operation.payment({ destination: VAULT_ADDRESS, asset: assetObj, amount: amount }))
        .setTimeout(30).build();
      
      tx.sign(userKeypair);
      await server.submitTransaction(tx);
      
      setVaultStake(prev => ({
        ...prev,
        [assetCode.toLowerCase()]: (Number(prev[assetCode.toLowerCase() as 'brw'|'usdw'|'xlm']) + Number(amount)).toString()
      }));
      setVaultShares(prev => ({
        ...prev,
        [assetCode.toLowerCase()]: (Number(prev[assetCode.toLowerCase() as 'brw'|'usdw'|'xlm']) + Number(amount)).toString()
      }));
      setVaultHistory(prev => [{ id: Math.random().toString(), type: 'deposit', asset: assetCode, amount, time: new Date() }, ...prev]);
      addLog(`Deposit successful!`, 'success');
      fetchVaultState();
    } catch (err: any) {
      addLog(`Deposit failed: ${err.message}`, 'error');
    } finally {
      setVaultLoading(false);
    }
  };

  const handleVaultWithdraw = async (assetCode: 'BRW' | 'USDW' | 'XLM') => {
    if (!envResult) return alert('Initialize 1-Click Environment first!');
    let amount = '0';
    if (assetCode === 'BRW') amount = vaultInputs.withdrawBRW;
    else if (assetCode === 'USDW') amount = vaultInputs.withdrawUSDW;
    else if (assetCode === 'XLM') amount = vaultInputs.withdrawXLM;

    if (!amount || Number(amount) <= 0) return;

    const currentStake = Number(vaultStake[assetCode.toLowerCase() as 'brw'|'usdw'|'xlm']);
    if (Number(amount) > currentStake) return alert('Not enough staked!');

    setVaultLoading(true);
    addLog(`Withdrawing ${amount} ${assetCode} from Vault...`, 'info');
    try {
      const vaultAcc = await server.loadAccount(VAULT_ADDRESS);
      const assetObj = assetCode === 'XLM' ? Asset.native() : new Asset(assetCode, assetCode === 'BRW' ? BRW_ISSUER : USDW_ISSUER);

      const tx = new TransactionBuilder(vaultAcc, { fee: '100', networkPassphrase: NETWORKS.TESTNET })
        .addOperation(Operation.payment({ destination: envResult.publicKey, asset: assetObj, amount: amount }))
        .setTimeout(30).build();
      
      tx.sign(VAULT_KEYPAIR);
      await server.submitTransaction(tx);
      
      setVaultStake(prev => ({
        ...prev,
        [assetCode.toLowerCase()]: (currentStake - Number(amount)).toString()
      }));
      setVaultShares(prev => ({
        ...prev,
        [assetCode.toLowerCase()]: (Number(prev[assetCode.toLowerCase() as 'brw'|'usdw'|'xlm']) - Number(amount)).toString()
      }));
      setVaultHistory(prev => [{ id: Math.random().toString(), type: 'withdraw', asset: assetCode, amount, time: new Date() }, ...prev]);
      addLog(`Withdrawal successful!`, 'success');
      fetchVaultState();
    } catch (err: any) {
      addLog(`Withdrawal failed: ${err.message}`, 'error');
    } finally {
      setVaultLoading(false);
    }
  };
  
  const handleBoostRewardPool = async () => {
    setVaultLoading(true);
    addLog('Requesting Friendbot to fund the Vault Reward Pool...', 'info');
    try {
      await fetch(`https://friendbot.stellar.org/?addr=${VAULT_ADDRESS}`);
      addLog('Successfully boosted the Reward Pool! 10000 XLM added.', 'success');
      setVaultHistory(prev => [{ id: Math.random().toString(), type: 'boost', asset: 'XLM', amount: '10000', time: new Date() }, ...prev]);
      fetchVaultState();
    } catch (err: any) {
      addLog(`Boost failed: ${err.message}`, 'error');
    } finally {
      setVaultLoading(false);
    }
  };
  // --- END VAULT LOGIC ---

  // Busca os dados das pools on-chain em tempo real
  const fetchPoolsData = async () => {
    try {
      const updated = await Promise.all(pools.map(async (pool) => {
        const lp = createLpAsset(pool.assetA, pool.assetB);
        const poolId = lp.toString().split(':')[1];
        
        try {
          const res = await fetch(`https://horizon-testnet.stellar.org/liquidity_pools/${poolId}`);
          if (res.ok) {
            const data = await res.json();
            const resA = data.reserves.find((r: any) => r.asset === (pool.assetA.isNative() ? 'native' : `${pool.assetA.getCode()}:${pool.assetA.getIssuer()}`))?.amount ?? '0';
            const resB = data.reserves.find((r: any) => r.asset === (pool.assetB.isNative() ? 'native' : `${pool.assetB.getCode()}:${pool.assetB.getIssuer()}`))?.amount ?? '0';
            return {
              ...pool,
              id: poolId,
              reservesA: resA,
              reservesB: resB,
              shares: data.total_shares,
              loaded: true
            };
          }
        } catch (e) {
          // A pool não existe on-chain ainda
        }
        return {
          ...pool,
          id: poolId,
          reservesA: '0',
          reservesB: '0',
          shares: '0',
          loaded: true
        };
      }));
      setPools(updated);
    } catch (err) {
      console.error('Failed to fetch pools state:', err);
    }
  };

  // Inicialização das pools com IDs determinísticos na montagem
  useEffect(() => {
    setPools(prev => prev.map(p => {
      try {
        const lp = createLpAsset(p.assetA, p.assetB);
        return {
          ...p,
          id: lp.toString().split(':')[1]
        };
      } catch (err) {
        return p;
      }
    }));
  }, []);

  // Recarregar os dados das pools ao alternar para a aba 'pools'
  useEffect(() => {
    if (activeTab === 'pools') {
      fetchPoolsData();
    }
    if (activeTab === 'vault') {
      ensureVaultActive();
    }
  }, [activeTab]);

  // Cronômetro do Yield do Vault (Aumentado para 10 Minutos com calculo de Shares e proporcionalidade real)
  useEffect(() => {
    if (!envResult) return;

    addLog('Yield Distribution Engine started. Rewards will be calculated and paid proportionally every 10 minutes.', 'info');

    const yieldInterval = setInterval(async () => {
      const currentEnv = envResultRef.current;
      const currentShares = vaultSharesRef.current;

      if (!currentEnv || !currentShares) return;
      
      // Cálculo de pesos (AUM em USD equivalente) para simular Shares reais:
      // 1 BRW = $0.20 | 1 USDW = $1.00 | 1 XLM = $0.05
      const userBRWVal = Number(currentShares.brw) * 0.2;
      const userUSDWVal = Number(currentShares.usdw) * 1.0;
      const userXLMVal = Number(currentShares.xlm) * 0.05;
      const userPower = userBRWVal + userUSDWVal + userXLMVal;

      if (userPower <= 0) return;

      // TVL Virtual concorrente de outros stakers ($2,000 USD) para simular diluição de pool
      const virtualStakersPower = 2000.0; 
      const totalPower = userPower + virtualStakersPower;
      const userShareFraction = userPower / totalPower;

      const globalReward = 1.0; // 1.0 XLM total de recompensa a cada 10 min
      const userRewardAmount = (globalReward * userShareFraction).toFixed(7);
      const virtualStakersReward = (globalReward * (1 - userShareFraction)).toFixed(7);

      addLog(`[Vault AUM] User Stake: $${userPower.toFixed(2)} | Total Pool AUM: $${totalPower.toFixed(2)} (User Share: ${(userShareFraction * 100).toFixed(2)}%)`, 'info');
      addLog(`Distributing real yield (XLM) proportionally to stakers...`, 'info');
      try {
        const vaultAcc = await server.loadAccount(VAULT_ADDRESS);

        const txBuilder = new TransactionBuilder(vaultAcc, { fee: '100', networkPassphrase: NETWORKS.TESTNET });
        txBuilder.addOperation(Operation.payment({
          destination: currentEnv.publicKey,
          asset: Asset.native(),
          amount: userRewardAmount
        }));

        const tx = txBuilder.setTimeout(30).build();
        tx.sign(VAULT_KEYPAIR);
        await server.submitTransaction(tx);
        
        addLog(`[Vault Yield] Successfully paid ${userRewardAmount} XLM to User and distributed ${virtualStakersReward} XLM to virtual stakers.`, 'success');
        setVaultHistory(prev => [{ id: Math.random().toString(), type: 'yield', asset: 'XLM', amount: userRewardAmount, time: new Date() }, ...prev]);
        fetchVaultState();
      } catch (err) {
        console.error('Yield distribution failed', err);
      }
    }, 600000); // 10 minutos
    
    return () => clearInterval(yieldInterval);
  }, [envResult]);

  // Ação de Depósito de Liquidez / Seed Pool
  const handleDepositLiquidity = async (poolIndex: number, isQuickSeed = false) => {
    if (!envResult) {
      addLog('Error: Please initialize your 1-Click Test Environment first to have active keys and funds.', 'error');
      alert('Por favor, crie seu ambiente de testes de 1-Clique na primeira aba para ter chaves e saldo!');
      return;
    }

    const pool = pools[poolIndex];
    const inputs = poolInputs[poolIndex] || { amountA: '1000', amountB: '1000', withdrawShares: '100' };
    const depA = isQuickSeed ? '5000' : inputs.amountA;
    const depB = isQuickSeed ? '5000' : inputs.amountB;

    setPoolsLoading(prev => ({ ...prev, [poolIndex]: true }));
    addLog(`Preparing liquidity deposit for ${pool.name} on-chain...`, 'info');

    try {
      const userKeypair = Keypair.fromSecret(envResult.secretKey);
      const userAddress = userKeypair.publicKey();

      // Carrega conta do usuário
      const account = await server.loadAccount(userAddress);
      const lpAsset = createLpAsset(pool.assetA, pool.assetB);
      const poolId = lpAsset.toString().split(':')[1];

      // Determina a correspondência correta das quantias com os ativos ordenados lexicograficamente
      const isOrdered = pool.assetA.isNative() || (!pool.assetB.isNative() && pool.assetA.getCode() < pool.assetB.getCode());
      const finalDepA = isOrdered ? depA : depB;
      const finalDepB = isOrdered ? depB : depA;
      
      let txBuilder = new TransactionBuilder(account, {
        fee: '100',
        networkPassphrase: NETWORKS.TESTNET
      });

      // Adiciona trustline do Liquidity Pool Share (LPS) se necessário
      const hasLpTrust = account.balances.some((b: any) => 
        b.asset_type === 'liquidity_pool_shares' && b.liquidity_pool_id === poolId
      );

      if (!hasLpTrust) {
        addLog(`Adding ChangeTrust operation for Liquidity Pool Shares (LPS)...`, 'info');
        txBuilder = txBuilder.addOperation(Operation.changeTrust({ asset: lpAsset, limit: '1000000000' }));
      }

      // Adiciona operação de depósito
      addLog(`Adding LiquidityPoolDeposit operation (A: ${finalDepA}, B: ${finalDepB})...`, 'info');
      txBuilder = txBuilder.addOperation(Operation.liquidityPoolDeposit({
        liquidityPoolId: poolId,
        maxAmountA: finalDepA,
        maxAmountB: finalDepB,
        minPrice: '0.0001',
        maxPrice: '10000.0'
      }));

      const tx = txBuilder.setTimeout(30).build();
      tx.sign(userKeypair);

      addLog(`Submitting transaction to Stellar Horizon...`, 'info');
      const res = await server.submitTransaction(tx);
      addLog(`Successfully deposited liquidity into ${pool.name}! Tx Hash: ${res.hash.slice(0, 12)}...`, 'success');
      
      // Atualiza dados
      await fetchPoolsData();
    } catch (err: any) {
      console.error('[Pool Deposit Error]', err);
      let detail = err.message;
      if (err.response?.data?.extras?.result_codes) {
        const codes = err.response.data.extras.result_codes;
        const opCodes = codes.operations ? ` operations=${codes.operations.join(', ')}` : '';
        detail += ` (Codes: transaction=${codes.transaction}${opCodes})`;
      }
      addLog(`Failed to deposit liquidity: ${detail}`, 'error');
    } finally {
      setPoolsLoading(prev => ({ ...prev, [poolIndex]: false }));
    }
  };

  // Ação de Retirada de Liquidez
  const handleWithdrawLiquidity = async (poolIndex: number) => {
    if (!envResult) {
      addLog('Error: Please initialize your 1-Click Test Environment first to have active keys and funds.', 'error');
      alert('Por favor, crie seu ambiente de testes de 1-Clique na primeira aba para ter chaves e saldo!');
      return;
    }

    const pool = pools[poolIndex];
    const inputs = poolInputs[poolIndex] || { amountA: '1000', amountB: '1000', withdrawShares: '100' };
    const sharesToBurn = inputs.withdrawShares;

    setPoolsLoading(prev => ({ ...prev, [poolIndex]: true }));
    addLog(`Preparing liquidity withdrawal from ${pool.name} on-chain...`, 'info');

    try {
      const userKeypair = Keypair.fromSecret(envResult.secretKey);
      const userAddress = userKeypair.publicKey();

      // Carrega conta do usuário
      const account = await server.loadAccount(userAddress);
      const lpAsset = createLpAsset(pool.assetA, pool.assetB);
      const poolId = lpAsset.toString().split(':')[1];
      
      let txBuilder = new TransactionBuilder(account, {
        fee: '100',
        networkPassphrase: NETWORKS.TESTNET
      });

      // Adiciona operação de saque
      addLog(`Adding LiquidityPoolWithdraw operation (Shares: ${sharesToBurn})...`, 'info');
      txBuilder = txBuilder.addOperation(Operation.liquidityPoolWithdraw({
        liquidityPoolId: poolId,
        amount: sharesToBurn,
        minAmountA: '0.0001',
        minAmountB: '0.0001'
      }));

      const tx = txBuilder.setTimeout(30).build();
      tx.sign(userKeypair);

      addLog(`Submitting transaction to Stellar Horizon...`, 'info');
      const res = await server.submitTransaction(tx);
      addLog(`Successfully withdrew ${sharesToBurn} shares from ${pool.name}! Tx Hash: ${res.hash.slice(0, 12)}...`, 'success');
      
      // Atualiza dados
      await fetchPoolsData();
    } catch (err: any) {
      console.error('[Pool Withdraw Error]', err);
      let detail = err.message;
      if (err.response?.data?.extras?.result_codes) {
        const codes = err.response.data.extras.result_codes;
        const opCodes = codes.operations ? ` operations=${codes.operations.join(', ')}` : '';
        detail += ` (Codes: transaction=${codes.transaction}${opCodes})`;
      }
      addLog(`Failed to withdraw liquidity: ${detail}`, 'error');
    } finally {
      setPoolsLoading(prev => ({ ...prev, [poolIndex]: false }));
    }
  };

  // Ação de Swap na Pool
  const handleSwapLiquidity = async (poolIndex: number) => {
    if (!envResult) {
      addLog('Error: Please initialize your 1-Click Test Environment first to have active keys and funds.', 'error');
      alert('Por favor, crie seu ambiente de testes de 1-Clique na primeira aba para ter chaves e saldo!');
      return;
    }

    const pool = pools[poolIndex];
    const inputs = poolInputs[poolIndex] || {};
    const amountIn = inputs.swapAmount || '10';
    const direction = inputs.swapDirection || 'AtoB';

    if (parseFloat(amountIn) <= 0) return;

    setPoolsLoading(prev => ({ ...prev, [poolIndex]: true }));
    addLog(`Preparing swap for ${pool.name} on-chain...`, 'info');

    try {
      const userKeypair = Keypair.fromSecret(envResult.secretKey);
      const userAddress = userKeypair.publicKey();

      const account = await server.loadAccount(userAddress);
      
      const assetIn = direction === 'AtoB' ? pool.assetA : pool.assetB;
      const assetOut = direction === 'AtoB' ? pool.assetB : pool.assetA;
      // Cálculo do AMM
      const amountInNum = parseFloat(amountIn);
      const isAtoB = direction === 'AtoB';
      const reserveIn = isAtoB ? parseFloat(pool.reservesA) : parseFloat(pool.reservesB);
      const reserveOut = isAtoB ? parseFloat(pool.reservesB) : parseFloat(pool.reservesA);
      
      const amountInWithFee = amountInNum * 0.997;
      const expectedOut = (reserveOut * amountInWithFee) / (reserveIn + amountInWithFee);
      const destMin = (expectedOut * 0.99).toFixed(7); // 1% slippage max

      const assetLabel = (a: Asset) => (a.isNative() ? 'XLM' : a.getCode());

      // Se o asset de saída não for nativo, verificar trustline
      const needsTrustline = !assetOut.isNative() && !account.balances.some((b: any) =>
        b.asset_code === assetOut.getCode() && b.asset_issuer === assetOut.getIssuer()
      );

      const prepared = prepareTrustlineAndSwap({
        sendAsset: assetLabel(assetIn),
        sendAmount: amountIn,
        destAsset: assetLabel(assetOut),
        destMin,
        needsTrustline
      });

      const newTxBuilder = async () => new TransactionBuilder(await server.loadAccount(userAddress), {
        fee: '100',
        networkPassphrase: NETWORKS.TESTNET
      });

      // A trustline é submetida antes e, se a rede rejeitar, o swap não é disparado
      const res = await runTrustlineAndSwap(prepared, {
        onStatusChange: (status) => setSwapStatus(prev => ({ ...prev, [poolIndex]: status })),
        submitTrustline: async (op) => {
          addLog(`Submitting ChangeTrust for ${op.asset}...`, 'info');
          const tx = (await newTxBuilder())
            .addOperation(Operation.changeTrust({ asset: assetOut, limit: op.limit }))
            .setTimeout(30)
            .build();
          tx.sign(userKeypair);
          return server.submitTransaction(tx);
        },
        executeSwap: async (op) => {
          addLog(`Submitting PathPaymentStrictSend (Send ${op.sendAmount} ${op.sendAsset} -> receive min ${op.destMin} ${op.destAsset})...`, 'info');
          const tx = (await newTxBuilder())
            .addOperation(Operation.pathPaymentStrictSend({
              sendAsset: assetIn,
              sendAmount: op.sendAmount,
              destAsset: assetOut,
              destMin: op.destMin,
              path: [],
              destination: userAddress
            }))
            .setTimeout(30)
            .build();
          tx.sign(userKeypair);
          return server.submitTransaction(tx);
        }
      });
      addLog(`Successfully swapped! Tx Hash: ${res.swapHash.slice(0, 12)}...`, 'success');
      
      // Atualiza dados
      await fetchPoolsData();
    } catch (err: any) {
      console.error('[Pool Swap Error]', err);
      let detail = err.message;
      if (err.response?.data?.extras?.result_codes) {
        const codes = err.response.data.extras.result_codes;
        const opCodes = codes.operations ? ` operations=${codes.operations.join(', ')}` : '';
        detail += ` (Codes: transaction=${codes.transaction}${opCodes})`;
      }
      addLog(`Failed to swap: ${detail}`, 'error');
    } finally {
      setPoolsLoading(prev => ({ ...prev, [poolIndex]: false }));
    }
  };

  // 4. Health Check
  const runHealthCheck = useCallback(async () => {
    setHealthStatus(prev => ({ ...prev, horizon: 'checking', friendbot: 'checking', vault: 'checking' }));

    try {
      // Horizon check
      const start = Date.now();
      await server.loadAccount(BRW_ISSUER);
      const horizonLatency = Date.now() - start;
      setHealthStatus(prev => ({ ...prev, horizon: `operational (${horizonLatency}ms)` }));
    } catch {
      setHealthStatus(prev => ({ ...prev, horizon: 'degraded' }));
    }

    try {
      // Friendbot check
      const res = await fetch('https://friendbot.stellar.org');
      setHealthStatus(prev => ({ ...prev, friendbot: res.status === 200 || res.status === 400 ? 'operational' : 'degraded' }));
    } catch {
      setHealthStatus(prev => ({ ...prev, friendbot: 'offline' }));
    }

    try {
      // Vault check
      await server.loadAccount(VAULT_ADDRESS);
      setHealthStatus(prev => ({ ...prev, vault: 'operational' }));
    } catch {
      setHealthStatus(prev => ({ ...prev, vault: 'offline (unfunded)' }));
    }
  }, []);

  useEffect(() => {
    runHealthCheck();
  }, [runHealthCheck]);

  return (
    <div className="tk-container">
      {activeTab === 'hub' ? (
        <div className="tk-header-area">
          <h1>{tk.title || 'Testnet Infrastructure Kit'}</h1>
          <p className="doc-subtitle">{tk.subtitle}</p>
          <div className="tk-subtitle-desc">
            O hub completo de infraestrutura para acelerar testes, automação de liquidez e simulações com privacidade na Stellar Testnet.
          </div>
        </div>
      ) : (
        <div className="tk-back-nav" style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button 
            className="tk-sec-btn" 
            onClick={() => setActiveTab('hub')} 
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '8px', 
              padding: '10px 18px', 
              fontSize: '13px', 
              fontWeight: 600, 
              borderRadius: 'var(--radius-md)', 
              cursor: 'pointer',
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)'
            }}
          >
            ← Voltar ao Hub de Infraestrutura
          </button>
          <span style={{ color: 'var(--text-tertiary)', fontSize: '13px' }}>
            Testnet Kit / <strong style={{ color: 'var(--accent)' }}>{activeTab.toUpperCase()}</strong>
          </span>
        </div>
      )}

      {/* Content Area */}
      <div className="tk-tab-content">
        
        {/* HUB CENTRAL / DASHBOARD */}
        {activeTab === 'hub' && (
          <div 
            style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', 
              gap: '20px', 
              marginTop: '10px' 
            }}
          >
            {/* Card 1: One-Click Env */}
            <div 
              className="tk-main-card clickable-card" 
              onClick={() => setActiveTab('dashboard')}
              style={{ cursor: 'pointer', transition: 'transform 0.2s, border-color 0.2s', margin: 0 }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span className="tk-badge" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', borderColor: 'transparent' }}>Ambiente</span>
                <Zap size={20} color="#3b82f6" />
              </div>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '16px' }}>One-Click Test Environment</h3>
              <p className="tk-card-desc" style={{ fontSize: '12px', margin: 0, lineHeight: '1.5' }}>
                Gere chaves, ative sua conta via Friendbot, configure trustlines para BRW/USDW e financie em lote.
              </p>
            </div>

            {/* Card 2: Faucet++ */}
            <div 
              className="tk-main-card clickable-card" 
              onClick={() => setActiveTab('faucet')}
              style={{ cursor: 'pointer', transition: 'transform 0.2s, border-color 0.2s', margin: 0 }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span className="tk-badge" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', borderColor: 'transparent' }}>Airdrop</span>
                <Droplets size={20} color="#10b981" />
              </div>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '16px' }}>Faucet++ Multiativos</h3>
              <p className="tk-card-desc" style={{ fontSize: '12px', margin: 0, lineHeight: '1.5' }}>
                Financie qualquer endereço ativo na Stellar Testnet com XLM, BRW ou USDW instantaneamente.
              </p>
            </div>

            {/* Card 3: Pools */}
            <div 
              className="tk-main-card clickable-card" 
              onClick={() => setActiveTab('pools')}
              style={{ cursor: 'pointer', transition: 'transform 0.2s, border-color 0.2s', margin: 0 }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span className="tk-badge" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', borderColor: 'transparent' }}>DeFi / AMM</span>
                <Coins size={20} color="#f59e0b" />
              </div>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '16px' }}>Liquidity Pools</h3>
              <p className="tk-card-desc" style={{ fontSize: '12px', margin: 0, lineHeight: '1.5' }}>
                Simule provisão de liquidez (LPS), swaps e consulte reservas das pools de liquidez reais.
              </p>
            </div>

            {/* Card 4: Vault */}
            <div 
              className="tk-main-card clickable-card" 
              onClick={() => setActiveTab('vault')}
              style={{ cursor: 'pointer', transition: 'transform 0.2s, border-color 0.2s', margin: 0 }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span className="tk-badge" style={{ background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6', borderColor: 'transparent' }}>Rendimento</span>
                <Shield size={20} color="#8b5cf6" />
              </div>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '16px' }}>DeFi Vault (Real Yield)</h3>
              <p className="tk-card-desc" style={{ fontSize: '12px', margin: 0, lineHeight: '1.5' }}>
                Simule agregação de rendimentos on-chain com base no TVL de BRW/USDW e ganhe XLM.
              </p>
            </div>

            {/* Card 5: Explorer */}
            <div 
              className="tk-main-card clickable-card" 
              onClick={() => setActiveTab('explorer')}
              style={{ cursor: 'pointer', transition: 'transform 0.2s, border-color 0.2s', margin: 0 }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span className="tk-badge" style={{ background: 'rgba(107, 114, 128, 0.1)', color: '#6b7280', borderColor: 'transparent' }}>Utilitário</span>
                <Search size={20} color="#6b7280" />
              </div>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '16px' }}>Testnet Explorer</h3>
              <p className="tk-card-desc" style={{ fontSize: '12px', margin: 0, lineHeight: '1.5' }}>
                Consulte e valide o saldo on-chain e trustlines de qualquer endereço na Stellar Testnet.
              </p>
            </div>

            {/* Card 6: NFTs */}
            <div 
              className="tk-main-card clickable-card" 
              onClick={() => setActiveTab('nfts')}
              style={{ cursor: 'pointer', transition: 'transform 0.2s, border-color 0.2s', margin: 0 }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span className="tk-badge" style={{ background: 'rgba(236, 72, 153, 0.1)', color: '#ec4899', borderColor: 'transparent' }}>Digital Collectibles</span>
                <ImageIcon size={20} color="#ec4899" />
              </div>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '16px' }}>NFT Playground</h3>
              <p className="tk-card-desc" style={{ fontSize: '12px', margin: 0, lineHeight: '1.5' }}>
                Crie coleções NFT e SFT nativas na Stellar (Classic). Especifique a quantidade e gere imagens automaticamente.
              </p>
            </div>

            {/* Card 7: Caatinga */}
            <div 
              className="tk-main-card clickable-card" 
              onClick={() => setActiveTab('caatinga')}
              style={{ cursor: 'pointer', transition: 'transform 0.2s, border-color 0.2s', margin: 0 }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span className="tk-badge" style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent)', borderColor: 'transparent' }}>Integração</span>
                <Cpu size={20} color="var(--accent)" />
              </div>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '16px' }}>Soroban & Caatinga</h3>
              <p className="tk-card-desc" style={{ fontSize: '12px', margin: 0, lineHeight: '1.5' }}>
                Crie projetos, compile e realize o deploy de contratos Soroban via CLI e bindings do Caatinga.
              </p>
            </div>

            {/* Card 7: Health */}
            <div 
              className="tk-main-card clickable-card" 
              onClick={() => setActiveTab('health')}
              style={{ cursor: 'pointer', transition: 'transform 0.2s, border-color 0.2s', margin: 0 }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span className="tk-badge" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderColor: 'transparent' }}>Status</span>
                <Activity size={20} color="#ef4444" />
              </div>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '16px' }}>Infrastructure Health</h3>
              <p className="tk-card-desc" style={{ fontSize: '12px', margin: 0, lineHeight: '1.5' }}>
                Monitore o status, a latência do Horizon e a integridade da infraestrutura Stellar de testes.
              </p>
            </div>
          </div>
        )}
        
        {/* TAB 1: ONE-CLICK ENVIRONMENT */}
        {activeTab === 'dashboard' && (
          <div className="tk-grid">
            <div className="tk-main-card">
              <div className="tk-card-header">
                <div className="tk-badge">V1 - Active</div>
                <h3>One-Click Test Environment</h3>
              </div>
              <p className="tk-card-desc">
                Crie um ambiente de testes completo em segundos. Isso gera uma nova carteira Stellar real na rede Testnet, solicita a ativação via Friendbot (10.000 XLM), configura as trustlines para nossos ativos BRW e USDW e deposita saldos de teste iniciais em ambas as moedas.
              </p>

              <div className="tk-action-panel">
                <button className={`tk-primary-btn ${envLoading ? 'loading' : ''}`} onClick={handleCreateEnvironment} disabled={envLoading}>
                  {envLoading ? (
                    <>
                      <span className="tk-spinner" /> Criando ambiente...
                    </>
                  ) : (
                    <>
                      <Zap size={16} fill="currentColor" /> Create Complete Test Environment
                    </>
                  )}
                </button>
              </div>

              {envResult && (
                <div className="tk-result-box">
                  <h4>Ambiente Criado com Sucesso!</h4>
                  <div className="tk-result-field">
                    <span className="tk-result-lbl">Public Key (Address)</span>
                    <div className="tk-copyable-value">
                      <code className="tk-mono-text">{envResult.publicKey}</code>
                      <button className="tk-icon-btn" onClick={() => copyToClipboard(envResult.publicKey, 'Public Key')} title="Copy Public Key">
                        {copiedText === 'Public Key' ? <Check size={14} color="#00ff99" /> : <Copy size={14} />}
                      </button>
                    </div>
                  </div>

                  <div className="tk-result-field">
                    <span className="tk-result-lbl">Secret Key (Private Key)</span>
                    <div className="tk-copyable-value">
                      <code className="tk-mono-text">{showSecret ? envResult.secretKey : 'â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢'}</code>
                      <div className="tk-btn-group">
                        <button className="tk-icon-btn" onClick={() => setShowSecret(!showSecret)} title="Toggle Visibility">
                          {showSecret ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                        <button className="tk-icon-btn" onClick={() => copyToClipboard(envResult.secretKey, 'Secret Key')} title="Copy Secret Key">
                          {copiedText === 'Secret Key' ? <Check size={14} color="#00ff99" /> : <Copy size={14} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="tk-result-field row">
                    <div>
                      <span className="tk-result-lbl">Asset ID BRW (Issuer)</span>
                      <div className="tk-copyable-value">
                        <code className="tk-mono-text">{BRW_ISSUER.slice(0, 15)}...</code>
                        <button className="tk-icon-btn" onClick={() => copyToClipboard(BRW_ISSUER, 'BRW Issuer')} title="Copy BRW Contract/Issuer">
                          {copiedText === 'BRW Issuer' ? <Check size={14} color="#00ff99" /> : <Copy size={14} />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <span className="tk-result-lbl">Asset ID USDW (Issuer)</span>
                      <div className="tk-copyable-value">
                        <code className="tk-mono-text">{USDW_ISSUER.slice(0, 15)}...</code>
                        <button className="tk-icon-btn" onClick={() => copyToClipboard(USDW_ISSUER, 'USDW Issuer')} title="Copy USDW Contract/Issuer">
                          {copiedText === 'USDW Issuer' ? <Check size={14} color="#00ff99" /> : <Copy size={14} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="tk-explorer-links-box">
                    <span className="tk-result-lbl">Links do Explorer (Testnet)</span>
                    <div className="tk-explorer-links">
                      <a href={`https://stellar.expert/explorer/testnet/account/${envResult.publicKey}`} target="_blank" rel="noopener noreferrer" className="tk-exp-link">
                        Account on Explorer <ExternalLink size={12} />
                      </a>
                      {envResult.trustlinesTxHash && (
                        <a href={`https://stellar.expert/explorer/testnet/tx/${envResult.trustlinesTxHash}`} target="_blank" rel="noopener noreferrer" className="tk-exp-link">
                          Trustlines Tx <ExternalLink size={12} />
                        </a>
                      )}
                      {envResult.faucetTxHash && (
                        <a href={`https://stellar.expert/explorer/testnet/tx/${envResult.faucetTxHash}`} target="_blank" rel="noopener noreferrer" className="tk-exp-link">
                          Faucet Funding Tx <ExternalLink size={12} />
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Trilha do Desenvolvedor */}
                  <div className="tk-developer-track" style={{ marginTop: '24px', borderTop: '1px solid var(--border-subtle)', paddingTop: '20px' }}>
                    <h4 style={{ color: 'var(--accent)', margin: '0 0 16px 0', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Zap size={16} fill="currentColor" /> Sua Trilha de Testes e Próximos Passos
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {/* Passo 2: Faucet */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.01)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                          <span style={{ background: 'rgba(0, 255, 153, 0.1)', color: 'var(--accent)', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold' }}>2</span>
                          <div style={{ textAlign: 'left' }}>
                            <strong style={{ fontSize: '13px', display: 'block' }}>Pedir mais Airdrop (Faucet++)</strong>
                            <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Seu endereço já está pré-configurado no Faucet. Adicione mais XLM, BRW ou USDW.</span>
                          </div>
                        </div>
                        <button className="tk-sec-btn sm" onClick={() => setActiveTab('faucet')} style={{ cursor: 'pointer' }}>Conectar Faucet</button>
                      </div>

                      {/* Passo 3: Pools */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.01)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                          <span style={{ background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-secondary)', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold' }}>3</span>
                          <div style={{ textAlign: 'left' }}>
                            <strong style={{ fontSize: '13px', display: 'block' }}>Prover Liquidez e Fazer Swaps (AMM)</strong>
                            <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Deposite seus tokens na Pool XLM/BRW ou USDW e teste Swaps reais sem slippage.</span>
                          </div>
                        </div>
                        <button className="tk-sec-btn sm" onClick={() => setActiveTab('pools')} style={{ cursor: 'pointer' }}>Interagir na AMM</button>
                      </div>

                      {/* Passo 4: Vault */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.01)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                          <span style={{ background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-secondary)', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold' }}>4</span>
                          <div style={{ textAlign: 'left' }}>
                            <strong style={{ fontSize: '13px', display: 'block' }}>Depositar no DeFi Vault (Yields)</strong>
                            <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Gere rendimentos on-chain de XLM enviando seus tokens BRW e USDW para o cofre.</span>
                          </div>
                        </div>
                        <button className="tk-sec-btn sm" onClick={() => setActiveTab('vault')} style={{ cursor: 'pointer' }}>Acessar Vault</button>
                      </div>

                      {/* Passo 5: Caatinga */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.01)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                          <span style={{ background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-secondary)', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold' }}>5</span>
                          <div style={{ textAlign: 'left' }}>
                            <strong style={{ fontSize: '13px', display: 'block' }}>Integrar Contratos Rust com Caatinga</strong>
                            <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Escreva seu caatinga.config.ts e faça deploy de contratos Soroban interativos.</span>
                          </div>
                        </div>
                        <button className="tk-sec-btn sm" onClick={() => setActiveTab('caatinga')} style={{ cursor: 'pointer' }}>Ver Integração</button>
                      </div>

                      {/* Passo 6: NFTs */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.01)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                          <span style={{ background: 'rgba(236, 72, 153, 0.1)', color: '#ec4899', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold' }}>6</span>
                          <div style={{ textAlign: 'left' }}>
                            <strong style={{ fontSize: '13px', display: 'block' }}>Criar Coleções NFT (Digital Collectibles)</strong>
                            <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Gere artes únicas na rede e minte um NFT usando as regras nativas de assets da Stellar.</span>
                          </div>
                        </div>
                        <button className="tk-sec-btn sm" onClick={() => setActiveTab('nfts')} style={{ cursor: 'pointer', borderColor: '#ec4899', color: '#ec4899' }}>Criar NFT</button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Console Log Lateral */}
            <div className="tk-side-card">
              <h3 className="tk-badge">Infrastructure Console Output</h3>
              <div className="tk-console">
                {logs.map((log, index) => (
                  <div key={index} className={`tk-console-line ${log.type}`}>
                    <span className="tk-console-time">[{log.timestamp}]</span> {log.message}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: FAUCET */}
        {activeTab === 'faucet' && (
          <div className="tk-grid">
            <div className="tk-main-card">
              <h3>Faucet++ Multiativos</h3>
              <p className="tk-card-desc">
                Adicione fundos a qualquer endereço de carteira ativo na Stellar Testnet. Distribua XLM, BRW ou USDW em um clique de forma imediata.
              </p>

              <form onSubmit={handleFaucetRequest} className="tk-form">
                <div className="tk-form-group">
                  <label className="tk-lbl">Destiny Address (Stellar Public Key)</label>
                  <input
                    type="text"
                    className="tk-input-text"
                    placeholder="ex: G..."
                    value={faucetAddress}
                    onChange={e => setFaucetAddress(e.target.value)}
                    disabled={faucetLoading}
                  />
                </div>

                <div className="tk-form-group">
                  <label className="tk-lbl">Select Asset</label>
                  <div className="tk-asset-picker">
                    {(['XLM', 'BRW', 'USDW'] as const).map(asset => (
                      <button
                        key={asset}
                        type="button"
                        className={`tk-asset-picker-btn ${faucetAsset === asset ? 'active' : ''}`}
                        onClick={() => setFaucetAsset(asset)}
                        disabled={faucetLoading}
                      >
                        {asset}
                      </button>
                    ))}
                  </div>
                </div>

                <button type="submit" className={`tk-primary-btn ${faucetLoading ? 'loading' : ''}`} disabled={faucetLoading}>
                  {faucetLoading ? <span className="tk-spinner" /> : <Droplets size={14} />} Request Airdrop (10,000 {faucetAsset})
                </button>
              </form>

              {/* Próximo Passo na Trilha */}
              <div className="tk-developer-track-footer" style={{ marginTop: '32px', borderTop: '1px solid var(--border-subtle)', paddingTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <strong style={{ fontSize: '13px', display: 'block', color: 'var(--accent)' }}>Próximo Passo Recomendado:</strong>
                  <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Agora que você recarregou sua carteira, gerencie ou interaja com Liquidity Pools do AMM.</span>
                </div>
                <button className="tk-sec-btn sm" onClick={() => setActiveTab('pools')} style={{ cursor: 'pointer' }}>Ir para AMM Pools →</button>
              </div>
            </div>

            <div className="tk-side-card">
              <h3 className="tk-badge">Test Assets Info</h3>
              <div className="tk-asset-list">
                <div className="tk-asset-info-item">
                  <div className="tk-ai-badge xlm">XLM</div>
                  <div>
                    <strong>Stellar Native Lumens</strong>
                    <span>Utilizado para pagamento de taxas de rede e limites de reserva base (base reserves).</span>
                  </div>
                </div>
                <div className="tk-asset-info-item">
                  <div className="tk-ai-badge brw">BRW</div>
                  <div>
                    <strong>WalletNow BRL (BRW)</strong>
                    <span>Moeda indexada ao Real brasileiro. Emissor:<br /><code className="tk-mini-mono">{BRW_ISSUER}</code></span>
                  </div>
                </div>
                <div className="tk-asset-info-item">
                  <div className="tk-ai-badge usdw">USDW</div>
                  <div>
                    <strong>WalletNow USD (USDW)</strong>
                    <span>Moeda indexada ao Dólar americano. Emissor:<br /><code className="tk-mini-mono">{USDW_ISSUER}</code></span>
                  </div>
                </div>
              </div>
              
              {/* Resultado do Faucet */}
              {faucetError && (
                <div className="tk-badge mt-6" style={{ borderColor: 'rgba(255,50,50,0.5)', color: '#ff6666', background: 'rgba(255,50,50,0.1)' }}>
                  Error: {faucetError}
                  <div className="text-[10px] text-gray-400 mt-2">Dica: Verifique se você não esqueceu de criar a Trustline na aba One-Click Env (op_no_trust) ou certifique-se de que o endereço é válido e existe na rede!</div>
                </div>
              )}
              {faucetSuccess && (
                <div className="mt-6" style={{ background: 'rgba(0,255,153,0.05)', border: '1px solid var(--accent)', borderRadius: 'var(--radius-lg)', padding: '16px' }}>
                  <div className="flex items-center gap-2 mb-3 text-[var(--accent)]">
                    <Check size={18} />
                    <h3 className="m-0 font-bold" style={{ color: 'var(--accent)', fontSize: '14px' }}>
                      Airdrop Success
                    </h3>
                  </div>
                  <div className="text-sm text-gray-300 mb-4">
                    Successfully requested <strong>{faucetSuccess.amount} {faucetSuccess.asset}</strong>.
                  </div>
                  <a href={`https://stellar.expert/explorer/testnet/tx/${faucetSuccess.hash}`} target="_blank" rel="noopener noreferrer" className="tk-primary-btn sm w-full justify-center" style={{ textDecoration: 'none', color: '#000', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    View on Explorer <ExternalLink size={14} />
                  </a>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: LIQUIDITY POOLS */}
        {activeTab === 'pools' && (
          <div className="tk-main-card">
            <h3>Liquidity Pools de Teste (AMM)</h3>
            <p className="tk-card-desc">
              Pools de liquidez nativas da Stellar para testes de Swap sem slippage. Essas pools rodam on-chain e você pode interagir com elas depositando e retirando liquidez.
            </p>

            <div className="tk-pools-list">
              {pools.map((pool, index) => {
                const inputs = poolInputs[index] || { amountA: '1000', amountB: '1000', withdrawShares: '100' };
                const isLoading = poolsLoading[index] === true;

                // Cálculo em tempo real do Swap
                const amountInNum = parseFloat(inputs.swapAmount || '0');
                let expectedOut = 0;
                let executionPrice = 0;
                let impact = 0;
                
                if (amountInNum > 0 && parseFloat(pool.reservesA) > 0 && parseFloat(pool.reservesB) > 0) {
                  const isAtoB = (inputs.swapDirection || 'AtoB') === 'AtoB';
                  const reserveIn = isAtoB ? parseFloat(pool.reservesA) : parseFloat(pool.reservesB);
                  const reserveOut = isAtoB ? parseFloat(pool.reservesB) : parseFloat(pool.reservesA);
                  const amountInWithFee = amountInNum * 0.997;
                  expectedOut = (reserveOut * amountInWithFee) / (reserveIn + amountInWithFee);
                  
                  const spotPrice = reserveOut / reserveIn;
                  executionPrice = expectedOut / amountInNum;
                  impact = (1 - (executionPrice / spotPrice)) * 100;
                }

                return (
                  <div key={pool.name} className="tk-pool-item-rich">
                    <div className="tk-pool-header-rich">
                      <div className="tk-pool-name-rich">{pool.name}</div>
                      <div className="tk-pool-actions-quick">
                        <button
                          className={`tk-primary-btn sm ${isLoading ? 'loading' : ''}`}
                          onClick={() => handleDepositLiquidity(index, true)}
                          disabled={isLoading}
                          title="Deposita 5.000 unidades de cada ativo para inicializar/reabastecer a pool na hora!"
                        >
                          {isLoading ? <span className="tk-spinner" /> : <Zap size={12} />} Quick Seed (5,000 / 5,000)
                        </button>
                      </div>
                    </div>

                    {/* Liquidity Pool ID */}
                    <div className="tk-pool-id-box">
                      <span className="tk-result-lbl text-xs">Liquidity Pool ID (Hex)</span>
                      <div className="tk-copyable-value sm">
                        <code className="tk-mono-text text-xs break-all">{pool.id || 'Carregando ID determinístico...'}</code>
                        <button className="tk-icon-btn" onClick={() => copyToClipboard(pool.id, `${pool.name} Pool ID`)} title="Copy Pool ID">
                          {copiedText === `${pool.name} Pool ID` ? <Check size={12} color="#00ff99" /> : <Copy size={12} />}
                        </button>
                      </div>
                    </div>

                    {/* Reserves & Shares */}
                    <div className="tk-pool-reserves">
                      <div className="tk-reserve-card">
                        <span className="tk-pm-label">Reserva Ativo A</span>
                        <span className="tk-pm-value">{parseFloat(pool.reservesA).toLocaleString()} {pool.name.split(' / ')[0]}</span>
                      </div>
                      <div className="tk-reserve-card">
                        <span className="tk-pm-label">Reserva Ativo B</span>
                        <span className="tk-pm-value">{parseFloat(pool.reservesB).toLocaleString()} {pool.name.split(' / ')[1]}</span>
                      </div>
                      <div className="tk-reserve-card">
                        <span className="tk-pm-label">Total Pool Shares</span>
                        <span className="tk-pm-value">{parseFloat(pool.shares).toLocaleString()} LPS</span>
                      </div>
                    </div>

                    {/* Link Explorer */}
                    {pool.id && (
                      <div className="mb-4">
                        <a
                          href={`https://stellar.expert/explorer/testnet/liquidity-pool/${pool.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="tk-exp-link text-xs inline-flex items-center gap-1 font-semibold"
                        >
                          View Pool on Stellar.Expert <ExternalLink size={10} />
                        </a>
                      </div>
                    )}

                    {/* Interactive Operations Panel */}
                    <div className="tk-pool-interactive-panel">
                      {/* Deposit Form */}
                      <div className="tk-pool-action-section">
                        <h5>Depositar Liquidez</h5>
                        <div className="tk-input-row">
                          <div className="tk-input-col">
                            <label className="text-xs text-gray-400">Qtd. {pool.name.split(' / ')[0]}</label>
                            <input
                              type="number"
                              className="tk-input-text sm"
                              value={inputs.amountA}
                              onChange={e => setPoolInputs(prev => ({
                                ...prev,
                                [index]: { ...inputs, amountA: e.target.value }
                              }))}
                              disabled={isLoading}
                            />
                          </div>
                          <div className="tk-input-col">
                            <label className="text-xs text-gray-400">Qtd. {pool.name.split(' / ')[1]}</label>
                            <input
                              type="number"
                              className="tk-input-text sm"
                              value={inputs.amountB}
                              onChange={e => setPoolInputs(prev => ({
                                ...prev,
                                [index]: { ...inputs, amountB: e.target.value }
                              }))}
                              disabled={isLoading}
                            />
                          </div>
                        </div>
                        <button
                          className={`tk-sec-btn sm w-full mt-2 ${isLoading ? 'loading' : ''}`}
                          onClick={() => handleDepositLiquidity(index, false)}
                          disabled={isLoading}
                        >
                          {isLoading ? <span className="tk-spinner" /> : 'Deposit Liquidity'}
                        </button>
                      </div>

                      {/* Withdraw Form */}
                      <div className="tk-pool-action-section">
                        <h5>Retirar Liquidez</h5>
                        <div className="tk-input-col">
                          <label className="text-xs text-gray-400">Qtd. Shares a Queimar (LPS)</label>
                          <input
                            type="number"
                            className="tk-input-text sm font-mono"
                            value={inputs.withdrawShares}
                            onChange={e => setPoolInputs(prev => ({
                              ...prev,
                              [index]: { ...inputs, withdrawShares: e.target.value }
                            }))}
                            disabled={isLoading}
                          />
                        </div>
                        <button
                          className={`tk-sec-btn sm w-full mt-2 danger ${isLoading ? 'loading' : ''}`}
                          onClick={() => handleWithdrawLiquidity(index)}
                          disabled={isLoading}
                        >
                          {isLoading ? <span className="tk-spinner" /> : 'Withdraw Liquidity'}
                        </button>
                      </div>

                      {/* Swap Form */}
                      <div className="tk-pool-action-section" style={{ borderColor: 'rgba(0,255,153,0.3)', background: 'rgba(0,255,153,0.02)' }}>
                        <h5 style={{ color: 'var(--accent)' }}>Swap Nativo</h5>
                        <div className="tk-input-row" style={{ flexDirection: 'column', gap: '8px' }}>
                          <select 
                            className="tk-input-text sm" 
                            style={{ padding: '6px', cursor: 'pointer', background: 'rgba(0,0,0,0.4)', color: 'var(--accent)' }}
                            value={inputs.swapDirection || 'AtoB'}
                            onChange={e => setPoolInputs(prev => ({
                              ...prev,
                              [index]: { ...inputs, swapDirection: e.target.value }
                            }))}
                            disabled={isLoading}
                          >
                            <option value="AtoB">{pool.name.split(' / ')[0]} ➔ {pool.name.split(' / ')[1]}</option>
                            <option value="BtoA">{pool.name.split(' / ')[1]} ➔ {pool.name.split(' / ')[0]}</option>
                          </select>
                          <input
                            type="number"
                            className="tk-input-text sm font-mono"
                            placeholder={`You send: Qtd de ${inputs.swapDirection === 'BtoA' ? pool.name.split(' / ')[1] : pool.name.split(' / ')[0]}`}
                            value={inputs.swapAmount || ''}
                            onChange={e => setPoolInputs(prev => ({
                              ...prev,
                              [index]: { ...inputs, swapAmount: e.target.value }
                            }))}
                            disabled={isLoading}
                          />
                          <div className="text-[11px] bg-[rgba(0,0,0,0.2)] p-2 rounded border border-gray-800">
                            {amountInNum > 0 && expectedOut > 0 ? (
                              <div className="flex flex-col gap-1">
                                <div className="flex justify-between text-gray-300">
                                  <span>Receive (~):</span>
                                  <strong className="text-[var(--accent)]">{expectedOut.toFixed(4)} {inputs.swapDirection === 'BtoA' ? pool.name.split(' / ')[0] : pool.name.split(' / ')[1]}</strong>
                                </div>
                                <div className="flex justify-between text-gray-500">
                                  <span>Price Impact:</span>
                                  <span style={{ color: impact > 2 ? '#ff6666' : impact > 0.5 ? '#ffcc00' : 'inherit' }}>
                                    {impact.toFixed(2)}%
                                  </span>
                                </div>
                                <div className="flex justify-between text-gray-500">
                                  <span>Slippage Tol.:</span>
                                  <span>1.00%</span>
                                </div>
                              </div>
                            ) : (
                              <div className="text-gray-500 text-center">Informe o valor para ver a estimativa da Pool.</div>
                            )}
                          </div>
                        </div>
                        <button
                          className={`tk-sec-btn sm w-full mt-2 ${isLoading ? 'loading' : ''}`}
                          onClick={() => handleSwapLiquidity(index)}
                          disabled={isLoading}
                          style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}
                        >
                          {isLoading ? <span className="tk-spinner" /> : 'Executar Swap'}
                        </button>
                        {swapStatus[index] && (
                          <div
                            role="status"
                            data-testid={`swap-status-${index}`}
                            className={`tk-status-badge mt-2 ${swapStatus[index] === 'Falhou' ? 'yellow' : 'green'}`}
                          >
                            Status: {swapStatus[index]}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Próximo Passo na Trilha */}
            <div className="tk-developer-track-footer" style={{ marginTop: '32px', borderTop: '1px solid var(--border-subtle)', paddingTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <strong style={{ fontSize: '13px', display: 'block', color: 'var(--accent)' }}>Próximo Passo Recomendado:</strong>
                <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Teste a simulação do DeFi Yield Vault para depositar liquidez e obter rendimentos em XLM.</span>
              </div>
              <button className="tk-sec-btn sm" onClick={() => setActiveTab('vault')} style={{ cursor: 'pointer' }}>Ir para o DeFi Vault →</button>
            </div>
          </div>
        )}

        {/* TAB 3.5: DEFI VAULT */}
        {activeTab === 'vault' && (
          <div className="tk-main-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
              <div>
                <h3 style={{ margin: 0 }}>{tk.vaultTitle || 'DeFi Vault (Real Yield)'}</h3>
                <p className="tk-card-desc" style={{ marginTop: '8px', marginBottom: 0 }}>
                  {tk.vaultDesc || 'Simulador on-chain de agregação de rendimentos. Adicione liquidez e ganhe XLM por minuto.'}
                </p>
              </div>
              <button className="tk-primary-btn" onClick={handleBoostRewardPool} disabled={vaultLoading}>
                {vaultLoading ? <span className="tk-spinner" /> : '🚀 Boost Reward Pool (+10k XLM)'}
              </button>
            </div>

            {/* ON-CHAIN PROOFS */}
            <div className="tk-result-box" style={{ marginTop: '0', marginBottom: '24px', padding: '16px', background: 'rgba(168, 85, 247, 0.05)', borderColor: 'rgba(168, 85, 247, 0.2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h4 style={{ margin: '0 0 4px 0', color: '#a855f7', fontSize: '12px', textTransform: 'uppercase' }}>🔗 On-Chain Verification</h4>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Verifique o TVL global e transações (Yields) deste Vault em tempo real na rede.</span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="tk-sec-btn sm" onClick={() => copyToClipboard(VAULT_ADDRESS, 'Vault Address')}>
                    {copiedText === 'Vault Address' ? <Check size={12} /> : <Copy size={12} />} Copy Address
                  </button>
                  <a href={`https://stellar.expert/explorer/testnet/account/${VAULT_ADDRESS}`} target="_blank" rel="noreferrer" className="tk-sec-btn sm" style={{ color: '#a855f7', borderColor: 'rgba(168, 85, 247, 0.4)', textDecoration: 'none' }}>
                    <ExternalLink size={12} /> Stellar Expert
                  </a>
                </div>
              </div>
              <div style={{ marginTop: '12px', padding: '8px 12px', background: 'rgba(0,0,0,0.3)', borderRadius: '4px', fontFamily: 'monospace', fontSize: '11px', color: 'var(--text-tertiary)', wordBreak: 'break-all' }}>
                {VAULT_ADDRESS}
              </div>
            </div>

            {/* TVL Global */}
            <div className="tk-pool-reserves mt-4 mb-8" style={{ border: '1px solid var(--border-subtle)', background: 'rgba(255,255,255, 0.02)' }}>
              <div className="tk-reserve-card">
                <span className="tk-pm-label" style={{ color: 'var(--text-tertiary)' }}>{tk.vaultTVL || 'Total Value Locked'} (BRW)</span>
                <span className="tk-pm-value text-blue-400">{parseFloat(vaultData.tvlBRW).toLocaleString()} BRW</span>
              </div>
              <div className="tk-reserve-card">
                <span className="tk-pm-label" style={{ color: 'var(--text-tertiary)' }}>{tk.vaultTVL || 'Total Value Locked'} (USDW)</span>
                <span className="tk-pm-value text-emerald-400">{parseFloat(vaultData.tvlUSDW).toLocaleString()} USDW</span>
              </div>
              <div className="tk-reserve-card">
                <span className="tk-pm-label" style={{ color: 'var(--accent)' }}>TVL / Reward Pool (XLM)</span>
                <span className="tk-pm-value">{parseFloat(vaultData.rewardPoolXLM).toLocaleString()} XLM</span>
              </div>
            </div>

            <div className="tk-vault-grid">
              {['BRW', 'USDW', 'XLM'].map((asset) => {
                const tvlMap: any = { BRW: vaultData.tvlBRW, USDW: vaultData.tvlUSDW, XLM: vaultData.rewardPoolXLM };
                const stakeMap: any = { BRW: vaultStake.brw, USDW: vaultStake.usdw, XLM: vaultStake.xlm };
                const inputsMap: any = { 
                  BRW: { dep: vaultInputs.depositBRW, wdr: vaultInputs.withdrawBRW }, 
                  USDW: { dep: vaultInputs.depositUSDW, wdr: vaultInputs.withdrawUSDW },
                  XLM: { dep: vaultInputs.depositXLM, wdr: vaultInputs.withdrawXLM }
                };
                
                const tvlNum = Number(vaultData.rewardPoolXLM) || 1; // Usando XLM TVL como base para APY local
                const currentStake = Number(stakeMap[asset]);
                const apy = ((52560 / tvlNum) * 100).toFixed(2); // 0.1 XLM * 60m * 24h * 365d = 52560 XLM/ano
                
                return (
                  <div key={asset} className="tk-pool-item-rich" style={{ marginBottom: 0 }}>
                    <div className="tk-pool-header-rich">
                      <div className="tk-pool-name-rich">{asset} Vault</div>
                      <div className="tk-badge" style={{ background: 'rgba(255,255,255,0.1)', color: 'white', borderColor: 'transparent' }}>
                        APY: <span style={{ color: 'var(--accent)' }}>{apy}%</span>
                      </div>
                    </div>
                    
                    <div className="tk-pool-id-box mb-4">
                      <div className="flex justify-between items-center mb-1">
                        <span className="tk-result-lbl text-xs">{tk.vaultStake || 'Your Stake'}:</span>
                        <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                          Shares: <strong>{Number(vaultShares[asset.toLowerCase() as 'brw'|'usdw'|'xlm']).toLocaleString()}</strong>
                        </span>
                      </div>
                      <div className="tk-copyable-value sm" style={{ background: 'transparent', paddingLeft: 0, border: 'none' }}>
                        <code className="tk-mono-text text-lg font-bold" style={{ color: 'white' }}>{parseFloat(stakeMap[asset]).toLocaleString()} {asset}</code>
                      </div>
                      {currentStake > 0 && (() => {
                        const userAssetAUM = currentStake * (asset === 'BRW' ? 0.2 : asset === 'USDW' ? 1.0 : 0.05);
                        const totalUserAUM = (Number(vaultShares.brw) * 0.2) + (Number(vaultShares.usdw) * 1.0) + (Number(vaultShares.xlm) * 0.05);
                        const globalAUM = totalUserAUM + 2000;
                        const shareFraction = userAssetAUM / globalAUM;
                        const minEarnings = shareFraction * 0.1; // 0.1 XLM/min global reward pool share
                        
                        return (
                          <div style={{ fontSize: '11px', color: 'var(--accent)', marginTop: '4px', display: 'flex', justifyContent: 'space-between' }}>
                            <span>Participação do AUM: <strong>{(shareFraction * 100).toFixed(4)}%</strong></span>
                            <span>Ganhos: ~{minEarnings.toFixed(6)} XLM/min</span>
                          </div>
                        );
                      })()}
                    </div>

                    <div className="tk-vault-interactive-panel">
                      <div className="tk-input-row">
                        <input
                          type="number"
                          className="tk-input-text sm"
                          placeholder={`Deposit ${asset}`}
                          value={inputsMap[asset].dep}
                          onChange={e => setVaultInputs(p => ({ ...p, [`deposit${asset}`]: e.target.value }))}
                          disabled={vaultLoading}
                        />
                        <button className={`tk-sec-btn sm ${vaultLoading ? 'loading' : ''}`} onClick={() => handleVaultDeposit(asset as any)} disabled={vaultLoading}>
                          {tk.vaultDeposit || 'Deposit'}
                        </button>
                      </div>
                      <div className="tk-input-row">
                        <input
                          type="number"
                          className="tk-input-text sm"
                          placeholder={`Withdraw ${asset}`}
                          value={inputsMap[asset].wdr}
                          onChange={e => setVaultInputs(p => ({ ...p, [`withdraw${asset}`]: e.target.value }))}
                          disabled={vaultLoading}
                        />
                        <button className={`tk-sec-btn sm danger ${vaultLoading ? 'loading' : ''}`} onClick={() => handleVaultWithdraw(asset as any)} disabled={vaultLoading}>
                          {tk.vaultWithdraw || 'Withdraw'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div className="tk-vault-footer mt-8" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
              {/* Mathematics Explanation */}
              <div className="tk-result-box" style={{ marginTop: 0 }}>
                <h4>📚 Entendendo o Rendimento (APY / APR)</h4>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  Esta simulação educacional emula as dinâmicas financeiras On-Chain usando as seguintes fórmulas de taxa flutuante (Floating Rate):
                </p>
                <div style={{ background: '#000', padding: '12px', borderRadius: '8px', fontSize: '11px', fontFamily: 'monospace', color: 'var(--text-tertiary)', margin: '12px 0' }}>
                  Reward_Per_Minute = 0.1 XLM<br/>
                  Total_Annual_Reward = 0.1 * 60 * 24 * 365 = 52,560 XLM<br/>
                  <br/>
                  <span style={{ color: 'var(--accent)' }}>APR% = (Total_Annual_Reward / TVL) * 100</span><br/>
                  User_Earning_Per_Min = (User_Stake / Total_Stake) * 0.1 XLM
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Sempre que um usuário deposita (aumenta o TVL), o APR cai (diluição). O botão <strong>Boost Reward Pool</strong> atua como um injetor externo de receitas, acionando o Faucet e aumentando as recompensas brutas.
                </p>
              </div>

              {/* Yield History Log */}
              <div className="tk-result-box" style={{ marginTop: 0 }}>
                <h4>⏱️ Yield History (On-Chain Log)</h4>
                <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {vaultHistory.length === 0 ? (
                    <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', textAlign: 'center', padding: '24px 0' }}>
                      Nenhuma transação efetuada ainda. Deposite e aguarde 1 minuto.
                    </div>
                  ) : (
                    vaultHistory.map(item => (
                      <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', padding: '8px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px' }}>
                        <div>
                          <strong style={{ color: item.type === 'yield' ? 'var(--accent)' : item.type === 'boost' ? '#a855f7' : 'white' }}>
                            {item.type.toUpperCase()}
                          </strong>
                          <span style={{ color: 'var(--text-tertiary)', marginLeft: '8px' }}>{item.time.toLocaleTimeString()}</span>
                        </div>
                        <div style={{ fontFamily: 'monospace', color: item.type === 'withdraw' ? '#ef4444' : 'var(--text-primary)' }}>
                          {item.type === 'withdraw' ? '-' : '+'}{item.amount} {item.asset}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Próximo Passo na Trilha */}
            <div className="tk-developer-track-footer" style={{ marginTop: '32px', borderTop: '1px solid var(--border-subtle)', paddingTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <strong style={{ fontSize: '13px', display: 'block', color: 'var(--accent)' }}>Próximo Passo Recomendado:</strong>
                <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Integre e faça deploy de contratos Soroban interativos reais usando o Caatinga.</span>
              </div>
              <button className="tk-sec-btn sm" onClick={() => setActiveTab('caatinga')} style={{ cursor: 'pointer' }}>Ir para Soroban & Caatinga →</button>
            </div>
          </div>
        )}

        {/* TAB 4: EXPLORER */}
        {activeTab === 'explorer' && (
          <div className="tk-main-card">
            <h3>Explorer Simplificado da Testnet</h3>
            <p className="tk-card-desc">
              Consulte e valide o saldo on-chain da sua carteira ou qualquer outro endereço de testes diretamente na Horizon testnet.
            </p>

            <div className="tk-search-bar">
              <input
                type="text"
                className="tk-input-text search"
                placeholder="Paste Stellar address (G...)"
                value={searchAddress}
                onChange={e => setSearchAddress(e.target.value)}
              />
              <button className="tk-primary-btn" onClick={() => handleSearchAccount()} disabled={explorerLoading}>
                {explorerLoading ? <span className="tk-spinner" /> : <Search size={14} />} Fetch Balances
              </button>
            </div>

            {accountData && (
              <div className="tk-explorer-result">
                <div className="tk-exp-header">
                  <Wallet size={16} />
                  <span>Account State: <strong>{accountData.publicKey.slice(0, 12)}...{accountData.publicKey.slice(-12)}</strong></span>
                </div>

                <div className="tk-exp-table">
                  <div className="tk-exp-row header">
                    <span>Asset</span>
                    <span>Issuer</span>
                    <span>Balance</span>
                  </div>
                  <div className="tk-exp-row">
                    <span className="tk-mono-text font-bold">XLM</span>
                    <span className="tk-light-text">Stellar Native</span>
                    <span className="tk-balance-val">{parseFloat(accountData.xlm).toLocaleString()} XLM</span>
                  </div>
                  {accountData.balances.map((b: any) => (
                    <div key={b.code || b.liquidity_pool_id || Math.random().toString()} className="tk-exp-row">
                      <span className="tk-mono-text font-bold">{b.code || 'LPS'}</span>
                      <span className="tk-light-text text-xs truncate" title={b.issuer || 'Liquidity Pool Shares'}>
                        {b.issuer ? `${b.issuer.slice(0, 15)}...` : 'Pool Shares'}
                      </span>
                      <span className="tk-balance-val">{parseFloat(b.balance).toLocaleString()} {b.code || 'Shares'}</span>
                    </div>
                  ))}
                  {accountData.balances.length === 0 && (
                    <div className="tk-empty-table">Nenhum token ou trustline customizada encontrada.</div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: HEALTH */}
        {activeTab === 'health' && (
          <div className="tk-main-card">
            <h3>Infrastructure Status & Health</h3>
            <p className="tk-card-desc">
              Verificador em tempo real da integridade das conexões e servidores da Stellar Testnet para garantir que o seu ambiente de desenvolvimento esteja totalmente operacional.
            </p>

            <div className="tk-health-list">
              <div className="tk-health-item">
                <div className="tk-health-meta">
                  <span className="tk-hm-lbl">Horizon Horizon Server</span>
                  <code className="tk-mini-mono">https://horizon-testnet.stellar.org</code>
                </div>
                <div className={`tk-status-badge ${healthStatus.horizon.includes('operational') ? 'green' : 'yellow'}`}>
                  {healthStatus.horizon}
                </div>
              </div>

              <div className="tk-health-item">
                <div className="tk-health-meta">
                  <span className="tk-hm-lbl">Friendbot API (Faucet XLM)</span>
                  <code className="tk-mini-mono">https://friendbot.stellar.org</code>
                </div>
                <div className={`tk-status-badge ${healthStatus.friendbot === 'operational' ? 'green' : 'yellow'}`}>
                  {healthStatus.friendbot}
                </div>
              </div>

              <div className="tk-health-item">
                <div className="tk-health-meta">
                  <span className="tk-hm-lbl">DeFi Vault (Real Yield Engine)</span>
                  <code className="tk-mini-mono">{VAULT_ADDRESS}</code>
                </div>
                <div className={`tk-status-badge ${healthStatus.vault === 'operational' ? 'green' : 'yellow'}`}>
                  {healthStatus.vault}
                </div>
              </div>

              <div className="tk-health-item">
                <div className="tk-health-meta">
                  <span className="tk-hm-lbl">WalletNow Faucet Engine</span>
                  <span className="tk-light-text">Cunhagem e distribuição de BRW/USDW</span>
                </div>
                <div className="tk-status-badge green">
                  {healthStatus.faucet}
                </div>
              </div>

              <div className="tk-health-item">
                <div className="tk-health-meta">
                  <span className="tk-hm-lbl">Liquidity Pool Seeder</span>
                  <span className="tk-light-text">Reposição automática de AMMs a cada 5min</span>
                </div>
                <div className="tk-status-badge green">
                  {healthStatus.rpc}
                </div>
              </div>

              <div className="tk-health-item">
                <div className="tk-health-meta">
                  <span className="tk-hm-lbl">OpenZeppelin Confidential Verifier</span>
                  <span className="tk-light-text">Zero-Knowledge Proofs (Ultrahonk) Verifier</span>
                </div>
                <div className={`tk-status-badge ${healthStatus.confidentialVerifier === 'soon' ? 'yellow' : 'green'}`}>
                  {healthStatus.confidentialVerifier}
                </div>
              </div>
            </div>

            <div className="tk-action-panel mt-6">
              <button className="tk-sec-btn" onClick={runHealthCheck}>
                <RefreshCw size={12} /> Force Infrastructure Refresh
              </button>
            </div>
          </div>
        )}

        {/* TAB 7: NFT PLAYGROUND */}
        {activeTab === 'nfts' && (
          <div className="tk-grid">
            <div className="tk-main-card">
              <div className="tk-card-header">
                <div className="tk-badge" style={{ background: 'rgba(236, 72, 153, 0.1)', color: '#ec4899', borderColor: 'transparent' }}>Digital Collectibles</div>
                <h3>Criador de Coleções / NFTs</h3>
              </div>
              <p className="tk-card-desc">
                Crie ativos únicos ou sem-fungíveis (SFTs) na rede Stellar Testnet com emissão trancada e imagem gerada automaticamente atrelada aos metadados <code>manageData</code>.
              </p>
              
              <form onSubmit={handleMintNft} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
                <div className="tk-input-group">
                  <label className="tk-input-label">Nome da Coleção / Token Code (Máx 12 chars)</label>
                  <input
                    type="text"
                    className="tk-input-text"
                    value={nftInputs.code}
                    onChange={(e) => setNftInputs({ ...nftInputs, code: e.target.value.toUpperCase().slice(0, 12) })}
                    placeholder="MYNFT"
                    required
                  />
                </div>
                
                <div className="tk-input-group">
                  <label className="tk-input-label">Quantidade Emitida (Supply) - Use 1 para item único</label>
                  <input
                    type="number"
                    className="tk-input-text"
                    value={nftInputs.supply}
                    onChange={(e) => setNftInputs({ ...nftInputs, supply: e.target.value })}
                    min="1"
                    step="1"
                    required
                  />
                </div>

                <div className="tk-input-group">
                  <label className="tk-input-label">Estilo de Imagem (Determinística)</label>
                  <select 
                    className="tk-input-text" 
                    value={nftInputs.imageType} 
                    onChange={(e) => setNftInputs({ ...nftInputs, imageType: e.target.value })}
                    style={{ appearance: 'none', background: 'rgba(0,0,0,0.2)' }}
                  >
                    <option value="bottts">Robot Avatars (DiceBear)</option>
                    <option value="identicon">Identicons (DiceBear)</option>
                    <option value="shapes">Abstract Shapes (DiceBear)</option>
                    <option value="qrcode">QR Code Colorido</option>
                  </select>
                </div>

                <div className="tk-input-group">
                  <label className="tk-input-label">Endereço de Recebimento (Receiver)</label>
                  <input
                    type="text"
                    className="tk-input-text"
                    value={nftInputs.receiver || (envResult ? envResult.publicKey : '')}
                    onChange={(e) => setNftInputs({ ...nftInputs, receiver: e.target.value })}
                    placeholder="G..."
                  />
                </div>

                <button type="submit" className="tk-primary-btn" disabled={nftLoading}>
                  {nftLoading ? <span className="tk-spinner" /> : <Flame size={16} />} 
                  Emitir Coleção na Stellar
                </button>
              </form>
            </div>

            <div className="tk-main-card">
              <div className="tk-card-header">
                <h3>Minha Galeria</h3>
              </div>
              <p className="tk-card-desc">Ativos criados e vinculados à carteira atual desta sessão.</p>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '16px', marginTop: '16px' }}>
                {userNfts.length === 0 ? (
                  <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '32px', border: '1px dashed var(--border-subtle)', borderRadius: '12px', color: 'var(--text-tertiary)' }}>
                    <ImageIcon size={32} style={{ opacity: 0.2, margin: '0 auto 8px' }} />
                    <p style={{ fontSize: '13px' }}>Nenhum NFT Mintado na Sessão</p>
                  </div>
                ) : (
                  userNfts.map((nft, idx) => (
                    <div key={idx} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '12px', textAlign: 'center' }}>
                      <img src={nft.imageUrl} alt={nft.code} style={{ width: '100%', height: 'auto', borderRadius: '8px', marginBottom: '8px', background: 'rgba(0,0,0,0.5)' }} />
                      <h4 style={{ margin: '0 0 4px', fontSize: '14px', color: 'var(--text-primary)' }}>{nft.code}</h4>
                      <p style={{ margin: '0 0 8px', fontSize: '10px', color: 'var(--text-tertiary)' }}>
                        Issuer: {nft.issuer.slice(0, 4)}...{nft.issuer.slice(-4)}
                      </p>
                      <div style={{ background: 'rgba(236, 72, 153, 0.1)', color: '#ec4899', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>
                        Supply: {nft.balance}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: CAATINGA SOROBAN PARTNER */}
        {activeTab === 'caatinga' && (
          <div className="tk-main-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
              <div>
                <h3 style={{ margin: 0 }}>Parceria Caatinga Toolchain</h3>
                <p className="tk-card-desc" style={{ marginTop: '8px', marginBottom: 0 }}>
                  Automatize a compilação, deployment e integração (wiring) de contratos inteligentes Soroban na Stellar Testnet de forma 100% TypeScript-native.
                </p>
              </div>
              <a href="https://dione-b.github.io/caatinga/" target="_blank" rel="noreferrer" className="tk-primary-btn" style={{ textDecoration: 'none', color: '#000', display: 'flex', alignItems: 'center', gap: '6px' }}>
                Documentação do Caatinga <ExternalLink size={14} />
              </a>
            </div>

            {/* Grid Principal do Caatinga */}
            <div className="tk-grid-caatinga" style={{ marginTop: '24px' }}>
              
              {/* Painel Interativo de Simulação do CLI */}
              <div className="tk-main-card" style={{ background: 'rgba(0,0,0,0.2)', borderColor: 'rgba(255,255,255,0.05)', margin: 0 }}>
                <h4 style={{ margin: '0 0 12px 0', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Terminal size={16} /> Simulador Interativo do CLI Caatinga
                </h4>
                <p className="text-xs text-gray-400 mb-4">
                  Clique nos passos do ciclo de vida abaixo para ver o Caatinga agindo e compilando/implantando o contrato de exemplo:
                </p>

                {/* Comandos do CLI */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
                  <button className="tk-sec-btn sm" onClick={() => {
                    addLog('Running: caatinga init', 'info');
                    const el = document.getElementById('caatinga-terminal-log');
                    if (el) el.innerHTML = '> caatinga init\n[INFO] Creating caatinga.config.ts...\n[SUCCESS] Caatinga project initialized successfully!';
                  }}>
                    1. init
                  </button>
                  <button className="tk-sec-btn sm" onClick={() => {
                    addLog('Running: caatinga build', 'info');
                    const el = document.getElementById('caatinga-terminal-log');
                    if (el) el.innerHTML = '> caatinga build\n[INFO] Compiling smart contracts in Rust...\n[INFO] Optimization level: active\n[SUCCESS] Generated custom_faucet.wasm (14.2 KB)';
                  }}>
                    2. build
                  </button>
                  <button className="tk-sec-btn sm" onClick={() => {
                    addLog('Running: caatinga deploy', 'info');
                    const el = document.getElementById('caatinga-terminal-log');
                    if (el) el.innerHTML = '> caatinga deploy --network testnet\n[INFO] Deploying custom_faucet.wasm to Stellar Testnet...\n[INFO] Transaction submitted. Waiting for ledger...\n[SUCCESS] Contract deployed successfully!\n[INFO] Contract ID: CB7...3F9\n[INFO] Saved to caatinga.artifacts.json';
                  }}>
                    3. deploy
                  </button>
                  <button className="tk-sec-btn sm" onClick={() => {
                    addLog('Running: caatinga generate', 'info');
                    const el = document.getElementById('caatinga-terminal-log');
                    if (el) el.innerHTML = '> caatinga generate --output ./src/bindings\n[INFO] Parsing WASM ABI...\n[INFO] Generating TypeScript client bindings...\n[SUCCESS] Type-safe client bindings generated in ./src/bindings/custom_faucet';
                  }}>
                    4. generate
                  </button>
                </div>

                {/* Terminal Log */}
                <div style={{ background: '#000', borderRadius: '8px', padding: '12px', border: '1px solid rgba(255,255,255,0.1)', minHeight: '120px', fontFamily: 'monospace', fontSize: '12px', color: '#00ff66', whiteSpace: 'pre-wrap' }} id="caatinga-terminal-log">
                  {`Selecione um comando acima para ver o output do CLI Caatinga.`}
                </div>

                {/* Execução de Métodos Soroban */}
                <h4 style={{ margin: '24px 0 12px 0', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Cpu size={16} /> Interação com Contrato Soroban
                </h4>
                <p className="text-xs text-gray-400 mb-4">
                  Agora que o contrato está "implantado" (via simulação), utilize os bindings gerados pelo Caatinga Client para interagir com o contrato na Testnet:
                </p>

                <div className="tk-pool-interactive-panel" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                  {/* Método: register_user */}
                  <div className="tk-pool-action-section" style={{ margin: 0 }}>
                    <h5>register_user(user_address)</h5>
                    <label className="text-[10px] text-gray-400">Registra sua carteira no contrato para torná-la elegível.</label>
                    <button className="tk-sec-btn sm w-full mt-4" onClick={async () => {
                      addLog('Invoking register_user on Soroban via Caatinga...', 'info');
                      await new Promise(resolve => setTimeout(resolve, 2000));
                      addLog('Soroban Transaction confirmed: user registered successfully!', 'success');
                    }}>
                      Executar register_user
                    </button>
                  </div>

                  {/* Método: claim_reward */}
                  <div className="tk-pool-action-section" style={{ margin: 0 }}>
                    <h5>claim_reward(amount)</h5>
                    <label className="text-[10px] text-gray-400">Resgata o airdrop do contrato (máx: 1000 tokens).</label>
                    <button className="tk-sec-btn sm w-full mt-4" onClick={async () => {
                      addLog('Invoking claim_reward on Soroban via Caatinga...', 'info');
                      await new Promise(resolve => setTimeout(resolve, 2000));
                      addLog('Soroban Transaction confirmed: claim_reward execution complete!', 'success');
                    }} style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}>
                      Executar claim_reward
                    </button>
                  </div>
                </div>
              </div>

              {/* Arquivos de Configuração Lateral */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div className="tk-side-card" style={{ margin: 0 }}>
                  <h3 className="tk-badge" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><FileJson size={14} /> Artifact File</h3>
                  <p className="text-xs text-gray-400 mb-3">
                    Formato de artefato gerado automaticamente pelo Caatinga em <code>caatinga.artifacts.json</code>:
                  </p>
                  <pre style={{ background: '#000', padding: '12px', borderRadius: '6px', fontSize: '11px', overflowX: 'auto', border: '1px solid rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }}>
{`{
  "network": "testnet",
  "contracts": {
    "custom_faucet": {
      "id": "CB7V...3F9",
      "wasmHash": "a3b9...c12",
      "deployedAt": "2026-07-13T14:04Z"
    }
  }
}`}
                  </pre>
                </div>

                <div className="tk-side-card" style={{ margin: 0 }}>
                  <h3 className="tk-badge">Vantagens de Testes</h3>
                  <ul className="text-xs text-gray-300 pl-4 flex flex-col gap-2" style={{ listStyleType: 'disc', margin: 0 }}>
                    <li><strong>TypeScript nativo:</strong> Escreva sua configuração sem precisar de instaladores pesados de Rust/Cargo para scripts.</li>
                    <li><strong>Dependency injection:</strong> Configure o endereço de emissão da WalletNow diretamente no seu arquivo de config.</li>
                    <li><strong>Bindings rápidos:</strong> Gera classes TypeScript limpas para integrar diretamente no seu App React ou Node.js.</li>
                  </ul>
                </div>
              </div>

            </div>

            {/* Próximo Passo na Trilha (Final) */}
            <div className="tk-developer-track-footer" style={{ marginTop: '32px', borderTop: '1px solid var(--border-subtle)', paddingTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', width: '100%' }}>
              <div>
                <strong style={{ fontSize: '13px', display: 'block', color: 'var(--accent)' }}>🎉 Parabéns! Trilha Concluída:</strong>
                <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Você cobriu todo o fluxo de onboarding, AMM, yields do Vault e deploy Soroban com Caatinga.</span>
              </div>
              <button className="tk-sec-btn sm" onClick={() => setActiveTab('hub')} style={{ cursor: 'pointer' }}>Voltar ao Hub Central</button>
            </div>
          </div>
        )}


      </div>

      
    </div>
  );
}
