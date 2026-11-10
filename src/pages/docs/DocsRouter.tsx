/**
 * @module src\pages\docs\DocsRouter.tsx
 * @description WalletNow Protocol - Arquitetura de carteira inteligente e pagamentos Stellar.
 */
/**
 * WalletNow Developer Portal — DocsRouter
 *
 * Todas as sub-rotas do portal com lazy loading.
 */

import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// ─── Lazy pages ───────────────────────────────────────────────────────────────

const DocsHero = lazy(() => import('./pages/DocsHero'));
const WhyWalletNow = lazy(() => import('./pages/WhyWalletNow'));
const HowItWorks = lazy(() => import('./pages/HowItWorks'));
const Playground = lazy(() => import('./pages/Playground'));
const QuickStart = lazy(() => import('./pages/QuickStart'));
const Tutorial = lazy(() => import('./pages/Tutorial'));
const SDKReference = lazy(() => import('./pages/SDKReference'));
const CloudAPI = lazy(() => import('./pages/CloudAPI'));
const Architecture = lazy(() => import('./pages/Architecture'));
const WhyNotYourself = lazy(() => import('./pages/WhyNotYourself'));
const Examples = lazy(() => import('./pages/Examples'));
const Recipes = lazy(() => import('./pages/Recipes'));
const TestnetKit = lazy(() => import('./pages/TestnetKit'));
const AIAgents = lazy(() => import('./pages/AIAgents'));

const DashboardPreview = lazy(() => import('./pages/DashboardPreview'));
const Pricing = lazy(() => import('./pages/Pricing'));
const RoadmapPage = lazy(() => import('./pages/RoadmapPage'));
const StatusPage = lazy(() => import('./pages/StatusPage'));
const FAQ = lazy(() => import('./pages/FAQ'));

// ─── Loading fallback ─────────────────────────────────────────────────────────

function DocsPageLoader() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '40vh',
      gap: '12px',
      color: 'var(--text-tertiary)',
      fontFamily: "'Inter', sans-serif",
      fontSize: '14px',
    }}>
      <div style={{
        width: 20,
        height: 20,
        border: '2px solid var(--border-subtle)',
        borderTop: '2px solid var(--accent)',
        borderRadius: '50%',
        animation: 'docspin 0.7s linear infinite',
      }} />
      Loading…
      <style>{`@keyframes docspin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ─── Router ───────────────────────────────────────────────────────────────────

export default function DocsRouter() {
  return (
    <Suspense fallback={<DocsPageLoader />}>
      <Routes>
        <Route index element={<DocsHero />} />
        <Route path="why" element={<WhyWalletNow />} />
        <Route path="how-it-works" element={<HowItWorks />} />
        <Route path="playground" element={<Playground />} />
        <Route path="quick-start" element={<QuickStart />} />
        <Route path="tutorial" element={<Tutorial />} />
        <Route path="sdk" element={<SDKReference />} />
        <Route path="cloud-api" element={<CloudAPI />} />
        <Route path="architecture" element={<Architecture />} />
        <Route path="why-not-yourself" element={<WhyNotYourself />} />
        <Route path="examples" element={<Examples />} />
        <Route path="recipes" element={<Recipes />} />
        <Route path="testnet-kit" element={<TestnetKit />} />
        <Route path="ai-agents" element={<AIAgents />} />
        <Route path="dashboard" element={<DashboardPreview />} />
        <Route path="pricing" element={<Pricing />} />
        <Route path="roadmap" element={<RoadmapPage />} />
        <Route path="status" element={<StatusPage />} />
        <Route path="faq" element={<FAQ />} />
        {/* Catch-all → home */}
        <Route path="*" element={<Navigate to="/docs" replace />} />
      </Routes>
    </Suspense>
  );
}
