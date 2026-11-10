/**
 * @module src\App.tsx
 * @description WalletNow Protocol - Arquitetura de carteira inteligente e pagamentos Stellar.
 */
/**
 * @packageDocumentation
 * @module App
 *
 * WalletNow Web Application — Root Application Orchestrator
 *
 * Responsabilidade:
 * Configurar a árvore global de contextos (Auth, Wallet, Network, IntegrationEngine),
 * o roteador SPA (`react-router-dom`), os limites de erro defensivos (`AppErrorBoundary`)
 * e as rotas protegidas para autocustódia biométrica.
 *
 * @updated Setembro de 2026
 * @version 0.4.5-candidate
 * @license Apache-2.0
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import RootLayout from './components/layout/RootLayout';
import AppShell from './components/layout/AppShell';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Settings from './pages/Settings';
import Home from './pages/Home';
import SwapPage from './pages/SwapPage';
import YieldPage from './pages/YieldPage';
import LiquidityPage from './pages/LiquidityPage';
import RWAPage from './pages/RWAPage';
import PortfolioPage from './pages/PortfolioPage';
import ActivityPage from './pages/ActivityPage';
import { AuthProvider } from './contexts/AuthContext';
import { WalletProvider } from './contexts/WalletContext';
import { NetworkProvider } from './contexts/NetworkContext';
import { IntegrationEngineProvider } from './contexts/IntegrationEngineContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import QADebugPanel from './components/QADebugPanel';
import { AppErrorBoundary } from './components/system/AppErrorBoundary';
import DocsLayout from './pages/docs/DocsLayout';
import DocsRouter from './pages/docs/DocsRouter';

/**
 * WalletNow — Sprint H
 * Aplicação completa com AppShell, rotas dinâmicas e IntegrationEngine.
 *
 * Hierarquia de providers:
 * AppErrorBoundary
 *   → NetworkProvider
 *     → AuthProvider
 *       → WalletProvider
 *         → IntegrationEngineProvider (depende dos outros para bootstrapar)
 *           → BrowserRouter
 */
export default function App() {
  return (
    <AppErrorBoundary>
      <NetworkProvider>
      <AuthProvider>
      <WalletProvider>
      {/* IntegrationEngineProvider: bootstrapa o kernel de integrações */}
      <IntegrationEngineProvider>
      <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}>
        <Routes>
          {/* ─── Páginas públicas ────────────────────────────────────────── */}
          <Route path="/" element={<Landing />} />

          {/* ─── Developer Portal ────────────────────────────────────────── */}
          <Route path="/docs" element={<DocsLayout />}>
            <Route index element={<DocsRouter />} />
            <Route path="*" element={<DocsRouter />} />
          </Route>

          {/* ─── Login (sem AppShell) ────────────────────────────────────── */}
          <Route element={<RootLayout />}>
            <Route path="/login" element={<Login />} />
          </Route>

          {/* ─── App autenticado com AppShell ────────────────────────────── */}
          <Route element={<AppShell />}>
            <Route element={<ProtectedRoute />}>
              {/* Redireciona /dashboard legado para /home */}
              <Route path="/dashboard" element={<Navigate to="/home" replace />} />

              {/* Home dinâmica (novo Dashboard) */}
              <Route path="/home" element={<Home />} />

              {/* Swap */}
              <Route path="/swap" element={<SwapPage />} />

              {/* Yield & DeFi */}
              <Route path="/yield" element={<YieldPage />} />
              
              {/* Liquidity */}
              <Route path="/liquidity" element={<LiquidityPage />} />

              {/* Real World Assets */}
              <Route path="/rwa" element={<RWAPage />} />

              {/* Portfolio */}
              <Route path="/portfolio" element={<PortfolioPage />} />

              {/* Activity */}
              <Route path="/activity" element={<ActivityPage />} />

              {/* Settings */}
              <Route path="/settings" element={<Settings />} />
            </Route>
          </Route>

          {/* ─── Catch-all ───────────────────────────────────────────────── */}
          <Route path="*" element={<Landing />} />
        </Routes>
        <QADebugPanel />
      </BrowserRouter>
      </IntegrationEngineProvider>
      </WalletProvider>
      </AuthProvider>
      </NetworkProvider>
    </AppErrorBoundary>
  );
}
