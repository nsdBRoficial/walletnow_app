import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/**
 * Rota Protegida (Guarda de Rota)
 * 
 * Este componente intercepta a navegação para rotas sensíveis (como /dashboard ou /settings).
 * Se o usuário não estiver logado, ele é redirecionado para o Login (/) silenciosamente.
 * Se estiver logado, o <Outlet /> renderiza a tela que ele estava tentando acessar.
 */
export const ProtectedRoute: React.FC = () => {
    const { session, loading } = useAuth();

    // Enquanto verificamos se há sessão, podemos exibir um Skeleton ou tela vazia.
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#0A0A0A]">
                {/* Placeholder de Loading com a identidade visual da WalletNow */}
                <div className="w-10 h-10 border-4 border-[#00E676] border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    // Se não tem sessão ativa, joga de volta para o Onboarding (Login)
    if (!session) {
        return <Navigate to="/login" replace />;
    }

    // Usuário autenticado, permite o acesso.
    return <Outlet />;
};
