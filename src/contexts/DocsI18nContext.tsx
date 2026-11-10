/**
 * @module src/contexts/DocsI18nContext.tsx
 * @description Contexto React (DocsI18nContext) para gerenciamento de estado reativo e provisão de serviços na árvore de componentes (exporta: DocsI18nProvider, useDocsI18n).
 */
/**
 * WalletNow Developer Portal — i18n Context
 *
 * Lightweight context for EN/PT-BR toggling inside the docs portal.
 * Follows the same pattern as LandingContext (no external lib).
 */

import React, { createContext, useContext, useState, useCallback } from 'react';
import { docsTranslations, type DocsLang, type DocsTranslations } from '../i18n/docsTranslations';

interface DocsI18nContextValue {
  lang: DocsLang;
  t: DocsTranslations;
  toggleLang: () => void;
  setLang: (lang: DocsLang) => void;
}

const DocsI18nContext = createContext<DocsI18nContextValue | null>(null);

export function DocsI18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<DocsLang>('en');

  const setLang = useCallback((next: DocsLang) => {
    setLangState(next);
  }, []);

  const toggleLang = useCallback(() => {
    setLangState((prev) => {
      if (prev === 'en') return 'pt';
      if (prev === 'pt') return 'es';
      return 'en';
    });
  }, []);

  const t = docsTranslations[lang] as DocsTranslations;

  return (
    <DocsI18nContext.Provider value={{ lang, t, toggleLang, setLang }}>
      {children}
    </DocsI18nContext.Provider>
  );
}

export function useDocsI18n(): DocsI18nContextValue {
  const ctx = useContext(DocsI18nContext);
  if (!ctx) throw new Error('useDocsI18n must be used inside <DocsI18nProvider>');
  return ctx;
}
