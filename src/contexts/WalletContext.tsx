/**
 * @module src/contexts/WalletContext.tsx
 * @description Contexto React (WalletContext) para gerenciamento de estado reativo e provisão de serviços na árvore de componentes (exporta: WalletAccount, WalletProvider, useWallet).
 */
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { deriveKeypairFromMnemonic, validateMnemonic } from '../utils/bip39Wallet';
import { isValidSecretKey } from '../utils/stellarValidation';
import { Keypair } from '@stellar/stellar-sdk';
import { DeviceVault } from '../security/deviceVault';

export interface WalletAccount {
    id: string;
    user_id: string;
    label: string;
    account_type: 'generated' | 'imported' | 'legacy';
    stellar_public_key: string;
    is_active: boolean;
    is_default: boolean;
    created_at: string;
}

interface WalletContextProps {
    accounts: WalletAccount[];
    activeAccount: WalletAccount | null;
    loading: boolean;
    error: string | null;
    refreshAccounts: () => Promise<void>;
    switchAccount: (accountId: string) => Promise<void>;
    importMnemonic: (mnemonic: string, label: string) => Promise<void>;
    importSecretKey: (secretKey: string, label: string) => Promise<void>;
}

const WalletContext = createContext<WalletContextProps>({
    accounts: [],
    activeAccount: null,
    loading: true,
    error: null,
    refreshAccounts: async () => {},
    switchAccount: async () => {},
    importMnemonic: async () => {},
    importSecretKey: async () => {},
});

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, profile } = useAuth();
    const [accounts, setAccounts] = useState<WalletAccount[]>([]);
    const [activeAccount, setActiveAccount] = useState<WalletAccount | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const refreshAccounts = useCallback(async () => {
        console.log('[WalletContext] refreshAccounts: START', { userId: user?.id });
        if (!user) {
            console.log('[WalletContext] refreshAccounts: NO USER, aborting');
            setAccounts([]);
            setActiveAccount(null);
            setLoading(false);
            return;
        }

        try {
            console.log('[WalletContext] refreshAccounts: Fetching wallet_accounts from Supabase...');
            setLoading(true);
            const { data, error: fetchError } = await supabase
                .from('wallet_accounts')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: true });

            if (fetchError) throw fetchError;
            console.log('[WalletContext] refreshAccounts: Fetched accounts', data);

            const fetchedAccounts = data as WalletAccount[] || [];

            // HYBRID COMPATIBILITY LAYER: Garante coexistência da conta legada com contas importadas/geradas.
            // Injeta a conta sintetizada em memória SE o profile tem stellar_address E ainda não há
            // um registro real na wallet_accounts com essa mesma public key.
            if (profile?.stellar_address) {
                const alreadyHasLegacy = fetchedAccounts.some(
                    a => a.stellar_public_key === profile.stellar_address
                );
                if (!alreadyHasLegacy) {
                    fetchedAccounts.unshift({
                        id: 'legacy-profile-account',
                        user_id: user.id,
                        label: 'Main Account',
                        account_type: 'legacy',
                        stellar_public_key: profile.stellar_address,
                        is_active: fetchedAccounts.length === 0,
                        is_default: true,
                        created_at: new Date().toISOString()
                    });
                }
            }

            setAccounts(fetchedAccounts);

            const storedActiveId = localStorage.getItem(`@walletnow:active_account:${user.id}`);
            console.log('[WalletContext] refreshAccounts: storedActiveId from localStorage:', storedActiveId);
            
            const currentActive = fetchedAccounts.find(a => a.id === storedActiveId) 
                             || fetchedAccounts.find(a => a.is_active) 
                             || fetchedAccounts[0] 
                             || null;

            console.log('[WalletContext] refreshAccounts: setting currentActive:', currentActive?.stellar_public_key);
            setActiveAccount(currentActive);
            if (currentActive) {
                localStorage.setItem(`@walletnow:active_account:${user.id}`, currentActive.id);
            }

        } catch (err: any) {
            console.error('[WalletContext] Erro ao buscar contas:', err);
            setError(err.message || 'Falha ao carregar as carteiras.');
        } finally {
            console.log('[WalletContext] refreshAccounts: END');
            setLoading(false);
        }
    }, [user, profile?.stellar_address]);

    useEffect(() => {
        console.log('[WalletContext] useEffect mounted or refreshAccounts changed');
        refreshAccounts();
    }, [refreshAccounts]);

    const switchAccount = async (accountId: string) => {
        if (!user) return;
        const target = accounts.find(a => a.id === accountId);
        if (target) {
            setActiveAccount(target);
            localStorage.setItem(`@walletnow:active_account:${user.id}`, target.id);
            
            // Load secret key for the selected account into volatile memory
            try {
                let storageKey = `@walletnow:secret:${user.id}:${target.stellar_public_key}`;
                let rawStorage = localStorage.getItem(storageKey);
                
                // Fallback for default/legacy accounts
                if (!rawStorage && (target.is_default || target.account_type === 'legacy' || target.account_type === 'generated')) {
                    storageKey = `@walletnow:secret:${user.id}`;
                    rawStorage = localStorage.getItem(storageKey);
                }
                
                if (rawStorage) {
                    const vaultData = JSON.parse(rawStorage);
                    const encKey = await DeviceVault.generateEncryptionKey(user.id);
                    const plaintext = await DeviceVault.decryptSecret(vaultData.ciphertext, vaultData.iv, encKey);
                    DeviceVault.setVolatileSecret(plaintext);
                    console.log('[WalletContext] Switched account and decrypted secret into volatile memory.');
                }
            } catch (e) {
                console.error('[WalletContext] Erro ao descriptografar conta ao alternar:', e);
            }
            
            // Sync is_active flag silently
            await supabase.from('wallet_accounts').update({ is_active: false }).eq('user_id', user.id);
            await supabase.from('wallet_accounts').update({ is_active: true }).eq('id', target.id);
        }
    };

    const saveImportedAccount = async (publicKey: string, secretKey: string, label: string) => {
        if (!user) throw new Error("Usuário não autenticado");
        
        // Verifica se conta já existe para evitar duplicatas
        const { data: existing } = await supabase
            .from('wallet_accounts')
            .select('id')
            .eq('user_id', user.id)
            .eq('stellar_public_key', publicKey)
            .single();
            
        if (existing) {
            throw new Error("Esta conta já está vinculada ao seu usuário");
        }

        // Criptografa e persiste localmente
        const encKey = await DeviceVault.generateEncryptionKey(user.id);
        const encryptedData = await DeviceVault.encryptSecret(secretKey, encKey);
        localStorage.setItem(`@walletnow:secret:${user.id}:${publicKey}`, JSON.stringify(encryptedData));
        
        // Insere no banco (is_active = false — refreshAccounts decide o ativo via storedActiveId)
        const { error, data } = await supabase.from('wallet_accounts').insert({
            user_id: user.id,
            label,
            account_type: 'imported',
            stellar_public_key: publicKey,
            is_active: false,
            is_default: false
        }).select().single();

        if (error) throw error;
        
        // Carrega a chave na memória volátil e seta como conta ativa no localStorage
        DeviceVault.setVolatileSecret(secretKey);
        localStorage.setItem(`@walletnow:active_account:${user.id}`, data.id);
        
        // Recarrega a lista completa (com merge da conta legada)
        await refreshAccounts();
    };

    const importMnemonic = async (mnemonic: string, label: string) => {
        if (!user) throw new Error("Usuário não autenticado");
        if (!validateMnemonic(mnemonic)) throw new Error("Frase de recuperação inválida");
        
        const { publicKey, secretKey } = deriveKeypairFromMnemonic(mnemonic);
        await saveImportedAccount(publicKey, secretKey, label);
    };

    const importSecretKey = async (secretKey: string, label: string) => {
        if (!user) throw new Error("Usuário não autenticado");
        if (!isValidSecretKey(secretKey)) throw new Error("Chave secreta inválida");
        
        const keypair = Keypair.fromSecret(secretKey);
        const publicKey = keypair.publicKey();
        
        await saveImportedAccount(publicKey, secretKey, label);
    };

    return (
        <WalletContext.Provider value={{
            accounts,
            activeAccount,
            loading,
            error,
            refreshAccounts,
            switchAccount,
            importMnemonic,
            importSecretKey
        }}>
            {children}
        </WalletContext.Provider>
    );
};

export const useWallet = () => useContext(WalletContext);

