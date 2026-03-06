/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import RootLayout from './components/layout/RootLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Settings from './pages/Settings';

/**
 * Componente Principal da Aplicação (App)
 * 
 * Este arquivo é o coração da navegação do nosso DApp (Decentralized Application).
 * Ele utiliza o `react-router-dom` para gerenciar as rotas (URLs) e renderizar
 * as telas corretas sem recarregar a página (Single Page Application - SPA).
 */
export default function App() {
  return (
    // BrowserRouter: Habilita o roteamento baseado na URL do navegador
    <BrowserRouter>
      {/* Routes: Container que agrupa todas as rotas possíveis da aplicação */}
      <Routes>
        
        {/* 
          O RootLayout atua como um "Wrapper" (Embrulho). 
          Todas as rotas aninhadas dentro dele herdarão seu layout base 
          (como o fundo escuro, padding padrão, etc).
        */}
        <Route element={<RootLayout />}>
          
          {/* Rota de Login/Onboarding (Ponto de entrada) */}
          <Route path="/" element={<Login />} />
          
          {/* Rota do Dashboard Principal (Saldo, Histórico, Botões de Ação) */}
          <Route path="/dashboard" element={<Dashboard />} />
          
          {/* Rota de Configurações e KYC (Identidade, Endereço Stellar) */}
          <Route path="/settings" element={<Settings />} />
          
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
