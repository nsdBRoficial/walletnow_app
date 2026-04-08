import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { WalletFactory } from '../services/walletFactory';

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
}

// Criando o contexto com valores padrão (null)
const AuthContext = createContext<AuthContextProps>({
    session: null,
    user: null,
    profile: null,
    loading: true, // Começamos no estado 'carregando' até termos certeza da sessão
});

/**
 * Componente Provedor de Autenticação.
 * Ele abraça toda a aplicação e expõe o estado de logado.
 */
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState<boolean>(true);

    /**
     * Função interna principal que busca o Perfil da database.
     * Se for o 1º acesso (stellar_address = null), ela aciona a WalletFactory!
     */
    const loadProfileAndWallet = async (userId: string) => {
        try {
            // 1. Buscamos o registro atual na database 'profiles'
            // O Supabase associa cada método de login (Google vs Magic Link) a um UUID (id) independente 
            // a não ser que a opção "Link Identities" esteja ativada no Painel Auth do Supabase!
            // Por isso, se você logar no Google com um email que já logou via Link, ele pode vir limpo (novo UUID).
            let { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .maybeSingle(); // Usa maybeSingle para não lançar erro vermelho se a linha for recém-nascida

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
                        console.log(`🔗 Identidade Fundida Automática: O navegador conectou em ${userId} mas a UI usará a bagagem de ${masterProfile.id} pois já possui KYC.`);
                        // Substituímos os "dados vazios" recém nascidos pelos dados plenos do perfil antigo!
                        data = masterProfile;
                    } else if (!data) {
                        // Caso a inserção do banco falhou e data for falsy
                        data = masterProfile;
                    }
                }
            }

            if (error) {
                console.error('Erro ao buscar profile do BD:', error);
                return;
            }

            // Fallback de Segurança: Se o banco não rodou o Trigger, nós forçamos a inserção do usuário!
            if (!data) {
                console.warn('⚠️ Perfil não encontrado na base. Forçando a inserção (Upsert)...');
                const { data: newProfile, error: insertError } = await supabase
                    .from('profiles')
                    .upsert([{ id: userId }])
                    .select()
                    .single();

                if (insertError) {
                    console.error('Erro fatal tentando criar perfil:', insertError);
                    return;
                }
                data = newProfile;
            }

            // 2. A MÁGICA WaaS OCCORRE AQUI: O usuário não possui endereço ainda?
            if (data && !data.stellar_address) {
                console.log("Detectado primeiro acesso. Provisionando carteira Stellar...");

                // Pede a Factory para criar e persistir tanto na DB quanto localmente
                const newAddress = await WalletFactory.provisionWalletForUser(userId);

                // Atualizamos a variavel de mémoria imediatamente para o React usar na UI
                if (newAddress) {
                    data.stellar_address = newAddress;
                }
            }

            // 3. Verificação de Posse da Chave (Auditoria v0.9)
            const hasSecretKey = !!WalletFactory.getSecretKey(userId);
            if (data?.stellar_address && !hasSecretKey) {
                console.error("🚨 [Security-Audit] Usuário possui endereço Stellar no DB mas perdeu a Chave Secreta localmente!");
                console.warn("Dica: Para testes, limpe o campo 'stellar_address' no Supabase para regenerar a carteira neste navegador.");
            }

            // 4. Atualiza o State global que distribuirá os dados aos componentes
            setProfile(data as UserProfile);

        } catch (err) {
            console.error('Falha severa ao carregar/provisionar profile:', err);
        } finally {
            // Libera a tela (tira do Loading) somente após a wallet ter sido criada
            setLoading(false);
        }
    };

    useEffect(() => {
        /**
         * Passo 1: Buscar a sessão inicial caso o usuário já estivesse logado
         */
        supabase.auth.getSession().then(({ data: { session }, error }) => {
            if (error) {
                console.error('Erro ao buscar sessão:', error.message);
                setLoading(false);
                return;
            }

            setSession(session);
            setUser(session?.user ?? null);

            // Carregaremos as carteiras se o token for valido
            if (session?.user) {
                loadProfileAndWallet(session.user.id);
            } else {
                setLoading(false);
            }
        });

        /**
         * Passo 2: Ovir mudanças globais de estado (Ex: Login em Popup finalizado)
         */
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);

            if (session?.user) {
                // Toda vez que detectarmos um Login real, rechecamos a Factory
                loadProfileAndWallet(session.user.id);
            } else {
                setProfile(null);
                setLoading(false);
            }
        });

        // Limpeza de memória (boas práticas para evitar memory leaks)
        return () => subscription.unsubscribe();
    }, []);

    return (
        <AuthContext.Provider value={{ session, user, profile, loading }}>
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
