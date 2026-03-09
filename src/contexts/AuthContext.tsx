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

            // [AUTO-LINKING OAUTH FIX]
            // Se não encontrou dados e o usuário acabou de logar via OAuth (Google),
            // Vamos verificar silenciosamente se JÁ EXISTE um profile com esse mesmo e-mail na base de dados
            // criado por outro provedor (Magic Link). Se existir, adotaremos a conta antiga como mestre.
            if (!data && user && user.email) {
                const { data: existingProfile } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('email', user.email)
                    .maybeSingle();

                if (existingProfile) {
                    console.log(`🔗 Identidade Fundida Automática: O e-mail ${user.email} logou como ${user.id} mas assumirá o perfil mestre herdado ${existingProfile.id}.`);
                    // Não alteramos a sessão root do Supabase (para evitar logout), 
                    // apenas entregamos para a UI os dados ricos do ID antigo (Selo KYC de volta)!
                    data = existingProfile;
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

            // 3. Atualiza o State global que distribuirá os dados aos componentes
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
