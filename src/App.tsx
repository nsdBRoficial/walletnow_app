/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import RootLayout from './components/layout/RootLayout';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Settings from './pages/Settings';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';

/**
 * Componente Principal da Aplicação (App)
 * 
 * Este arquivo é o coração da navegação do nosso DApp (Decentralized Application).
 * Ele utiliza o `react-router-dom` para gerenciar as rotas (URLs) e renderizar
 * as telas corretas sem recarregar a página (Single Page Application - SPA).
 */
export default function App() {
  return (
    // Envolve a aplicação com o estado global de Autenticação (Supabase)
    <AuthProvider>
      {/* BrowserRouter: Habilita o roteamento baseado na URL com Base Dinâmica (Vite/Vercel/Hostinger) */}
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        {/* Routes: Container que agrupa todas as rotas possíveis da aplicação */}
        <Routes>

          {/* 
            O RootLayout atua como "Wrapper" apenas para as páginas do App (Dashboard/Settings)
            A Landing Page é injetada FORA do RootLayout para ter tela cheia sem paddings/navbars.
          */}
          
          <Route path="/" element={<Landing />} />

          <Route element={<RootLayout />}>
            {/* Rota de Login/Onboarding */}
            <Route path="/login" element={<Login />} />

            {/* 🚀 Grupo de Rotas Protegidas (Exige Login para acessar) */}
            <Route element={<ProtectedRoute />}>
              {/* Rota do Dashboard Principal (Saldo, Histórico, Botões de Ação) */}
              <Route path="/dashboard" element={<Dashboard />} />

              {/* Rota de Configurações e KYC (Identidade, Endereço Stellar) */}
              <Route path="/settings" element={<Settings />} />
            </Route>

          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
