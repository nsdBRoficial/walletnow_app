/**
 * @module src/contexts/AuthContext.tsx
 * @description Contexto React (AuthContext) para gerenciamento de estado reativo e provisão de serviços na árvore de componentes (exporta: UserProfile, AuthProvider, useAuth).
 */
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { WalletFactory } from '../services/walletFactory';
import { DeviceVault } from '../security/deviceVault';
import { MnemonicVault } from '../security/mnemonicVault';

/**
 * Tipagem do Perfil do Usuário armazenado na nossa Database
 */
export interface UserProfile {
    id: string;
    email: string;
    stellar_address: string | null;
    full_name?: string | null;
    cpf?: string | null;
    whatsapp?: string | null;
    birth_date?: string | null;
    address?: string | null;
    kyc_verified?: boolean;
    kyczk_hash?: string | null;
}

/**
 * Propriedades do nosso contexto de autenticação global.
 */
interface AuthContextProps {
    session: Session | null;
    user: User | null;
    profile: UserProfile | null;
    loading: boolean;
    authError: string | null;
}

// Criando o contexto com valores padrão (null)
const AuthContext = createContext<AuthContextProps>({
    session: null,
    user: null,
    profile: null,
    loading: true, // Começamos no estado 'carregando' até termos certeza da sessão
    authError: null,
});

/**
 * AuthProvider
 * 
 * [PT-BR] Provedor de Autenticação que orquestra a sessão do banco (Supabase) e sincroniza as chaves do cliente (WalletFactory).
 * A validação de posse da chave (Device Bind / Assinatura Bio-criptográfica) simula princípios de Passkeys.
 * Garante que logins OAuth não possam realizar operações on-chain caso a private-key local não esteja presente (Zero-Knowledge proof baseada em client).
 * 
 * [EN-US] Authentication Provider orchestrating the DB session (Supabase) and synchronizing client keys (WalletFactory).
 * Key possession validation (Device Bind / Bio-cryptographic signature) simulates Passkey principles.
 * Ensures OAuth logins cannot perform on-chain ops if the local private key is missing (Zero-Knowledge client-based proof).
 */
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [authError, setAuthError] = useState<string | null>(null);

    /**
     * Função interna principal que busca o Perfil da database.
     * Se for o 1º acesso (stellar_address = null), ela aciona a WalletFactory!
     */
    const loadProfileAndWallet = async (userId: string) => {
        try {
            setAuthError(null);
            console.log(`[WalletNow][Onboarding] Iniciando carga de perfil para o usuário: ${userId}`);
            
            // 1. Buscamos o registro atual na database 'profiles'
            // O Supabase associa cada método de login (Google vs Magic Link) a um UUID (id) independente 
            // a não ser que a opção "Link Identities" esteja ativada no Painel Auth do Supabase!
            // Por isso, se você logar no Google com um email que já logou via Link, ele pode vir limpo (novo UUID).
            const { data: initialData, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .maybeSingle(); // Usa maybeSingle para não lançar erro vermelho se a linha for recém-nascida
            let data = initialData;

            // [AUTO-LINKING OAUTH FIX PRO]
            // O trigger de banco de dados (handle_new_user) cria uma linha vazia assim que o usuário loga, 
            // então `data` raramente será nulo.
            // Para forçar a fusão de contas duplicadas de OAuth (Google) e Magic Link,
            // vamos escanear a base procurando se existe QUALQUER OUTRA linha com este email que JÁ tenha KYC Verificado,
            // e forçaremos a UI a adotar ela como Perfil Mestre!
            if (user && user.email) {
                const { data: existingProfiles } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('email', user.email)
                    .order('kyc_verified', { ascending: false }); // Traz os perfis verificados (true) no topo da lista

                if (existingProfiles && existingProfiles.length > 0) {
                    const masterProfile = existingProfiles[0]; // Pega o perfil mais "rico"

                    // Se o perfil mestre detectado for diferente do esqueleto recém-criado para este fluxo de login:
                    if (masterProfile.id !== userId && masterProfile.kyc_verified) {
                        console.log(`[WalletNow][Onboarding] 🔗 Identidade Fundida Automática: O navegador conectou em ${userId} mas a UI usará a bagagem de ${masterProfile.id} pois já possui KYC.`);
                        // Substituímos os "dados vazios" recém nascidos pelos dados plenos do perfil antigo!
                        data = masterProfile;
                    } else if (!data) {
                        // Caso a inserção do banco falhou e data for falsy
                        data = masterProfile;
                    }
                }
            }

            if (error) {
                console.error('[WalletNow][Onboarding] Erro fatal ao buscar profile do BD:', error);
                throw new Error('Falha de comunicação com o banco de dados.');
            }

            // Fallback de Segurança: Se o banco não rodou o Trigger, nós forçamos a inserção do usuário!
            if (!data) {
                console.warn('[WalletNow][Onboarding] ⚠️ Perfil não encontrado na base. Forçando a inserção (Upsert)...');
                const { data: newProfile, error: insertError } = await supabase
                    .from('profiles')
                    .upsert([{ id: userId }])
                    .select()
                    .single();

                if (insertError) {
                    console.error('[WalletNow][Onboarding] Erro fatal tentando criar perfil:', insertError);
                    throw new Error('Não foi possível registrar o perfil.');
                }
                data = newProfile;
            }

            // 2. A MÁGICA WaaS OCCORRE AQUI: O usuário não possui endereço ainda?
            if (data && !data.stellar_address) {
                console.log("[WalletNow][Onboarding] Detectado primeiro acesso. Provisionando carteira Stellar...");

                // Pede a Factory para criar e persistir tanto na DB quanto localmente
                const newAddress = await WalletFactory.provisionWalletForUser(userId);

                // Atualizamos a variavel de mémoria imediatamente para o React usar na UI
                if (newAddress) {
                    data.stellar_address = newAddress;
                    console.log("[WalletNow][Onboarding] Carteira gerada e vinculada com sucesso.");
                } else {
                    throw new Error('Falha crítica na geração da carteira Stellar.');
                }
            }

            // 2.5 DESTRANCAR COFRE LOCAL: Antes de checar a posse, descriptografa a Secret (se já existir no device)
            if (data?.stellar_address) {
                await WalletFactory.unlockWallet(userId);
            }

            // 3. Verificação de Posse da Chave (Auditoria v0.9) - FAIL SAFE CRÍTICO
            const hasSecretKey = !!WalletFactory.getSecretKey(userId);
            if (data?.stellar_address && !hasSecretKey) {
                console.error("[WalletNow][Onboarding][FAIL-SAFE] 🚨 Inconsistência Crítica Detectada: O banco de dados possui uma Public Key, mas o armazenamento local não contém a Secret Key.");
                console.error("[WalletNow][Onboarding][FAIL-SAFE] 🚨 Abortando fluxo para prevenir duplicação ou sobrescrita irreversível da carteira original.");
                
                // Remove a sessão atual para que o usuário não prossiga quebrado
                await supabase.auth.signOut();
                DeviceVault.clearSensitiveMemory();
                MnemonicVault.clearSensitiveMnemonicMemory();
                
                setAuthError("Sua identidade blockchain não foi encontrada neste dispositivo. O login foi bloqueado para proteger seus fundos.");
                return; // Encerra a função impedindo a entrada.
            }

            // 4. Atualiza o State global que distribuirá os dados aos componentes
            setProfile(data as UserProfile);
            console.log("[WalletNow][Onboarding] Processo de carregamento finalizado com sucesso.");

        } catch (err: any) {
            console.error('[WalletNow][Onboarding] Falha severa ao carregar/provisionar profile:', err);
            setAuthError(err.message || 'Ocorreu um erro crítico durante a inicialização.');
            await supabase.auth.signOut();
        } finally {
            // Libera a tela (tira do Loading) somente após a wallet ter sido criada
            console.log("[WalletNow][AuthContext] loadProfileAndWallet: finally block. Setting loading to false.");
            setLoading(false);
        }
    };

    useEffect(() => {
        /**
         * Passo 1: Buscar a sessão inicial caso o usuário já estivesse logado
         */
        console.log('[WalletNow][AuthContext] useEffect: Iniciando verificação de sessão...');
        supabase.auth.getSession().then(({ data: { session }, error }) => {
            console.log('[WalletNow][AuthContext] getSession returned:', { sessionExists: !!session, error });
            if (error) {
                console.error('Erro ao buscar sessão:', error.message);
                setLoading(false);
                return;
            }

            setSession(session);
            setUser(session?.user ?? null);

            // Carregaremos as carteiras se o token for valido
            if (session?.user) {
                console.log('[WalletNow][AuthContext] User exists in session. Calling loadProfileAndWallet...');
                loadProfileAndWallet(session.user.id);
            } else {
                console.log('[WalletNow][AuthContext] No user in session. Setting loading to false.');
                setLoading(false);
            }
        });

        /**
         * Passo 2: Ovir mudanças globais de estado (Ex: Login em Popup finalizado)
         */
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            console.log('[WalletNow][AuthContext] onAuthStateChange event:', _event);
            setSession(session);
            setUser(session?.user ?? null);

            if (session?.user) {
                // Toda vez que detectarmos um Login real, rechecamos a Factory
                console.log('[WalletNow][AuthContext] onAuthStateChange: User authenticated, calling loadProfileAndWallet...');
                loadProfileAndWallet(session.user.id);
            } else {
                console.log('[WalletNow][AuthContext] onAuthStateChange: No user, clearing memory and setting loading to false.');
                DeviceVault.clearSensitiveMemory();
                MnemonicVault.clearSensitiveMnemonicMemory();
                setProfile(null);
                setLoading(false);
            }
        });

        // Limpeza de memória (boas práticas para evitar memory leaks)
        return () => subscription.unsubscribe();
    }, []);

    return (
        <AuthContext.Provider value={{ session, user, profile, loading, authError }}>
            {/* Renderizamos a aplicação (filhos) apenas quando não estamos no primeiro carregamento do token. Isso evita piscadas de tela indesejadas (FOUC). */}
            {!loading && children}
        </AuthContext.Provider>
    );
};

/**
 * Hook customizado incrivelmente útil para acessar auth.
 * Exemplo de uso: const { user, session, profile } = useAuth();
 */
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth deve ser usado dentro de um AuthProvider.');
    }
    return context;
};
