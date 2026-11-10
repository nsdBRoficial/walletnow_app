/**
 * @module src/contexts/LandingContext.tsx
 * @description Contexto React (LandingContext) para gerenciamento de estado reativo e provisão de serviços na árvore de componentes (exporta: Lang, Theme, LandingProvider, useLanding).
 */
/**
 * LandingContext
 *
 * Gerencia preferências de idioma (EN | PT) e tema (dark | light) da Landing Page.
 * Persiste ambas as preferências no localStorage.
 *
 * Defaults: lang = 'en', theme = 'dark'
 */

import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { landingTranslations } from '../i18n/landingTranslations';

export type Lang = 'en' | 'pt' | 'es';
export type Theme = 'dark' | 'light';

interface LandingContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  /** Objeto de traduções para o idioma ativo */
  t: typeof landingTranslations['en'];
}

const LandingContext = createContext<LandingContextValue | null>(null);

const LS_LANG_KEY = 'wn_landing_lang';
const LS_THEME_KEY = 'wn_landing_theme';

export function LandingProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const stored = localStorage.getItem(LS_LANG_KEY);
    if (stored === 'pt' || stored === 'es') return stored as Lang;
    return 'en';
  });

  const [theme, setThemeState] = useState<Theme>(() => {
    const stored = localStorage.getItem(LS_THEME_KEY);
    return (stored === 'light' ? 'light' : 'dark') as Theme;
  });

  const setLang = (l: Lang) => {
    setLangState(l);
    localStorage.setItem(LS_LANG_KEY, l);
  };

  const setTheme = (t: Theme) => {
    setThemeState(t);
    localStorage.setItem(LS_THEME_KEY, t);
  };

  const t = useMemo(() => landingTranslations[lang] ?? landingTranslations['en'], [lang]);

  const value = useMemo(
    () => ({ lang, setLang, theme, setTheme, t }),
    [lang, theme, t]
  );

  return <LandingContext.Provider value={value}>{children}</LandingContext.Provider>;
}

/** Hook para consumir o contexto da Landing */
export function useLanding(): LandingContextValue {
  const ctx = useContext(LandingContext);
  if (!ctx) throw new Error('useLanding must be used inside <LandingProvider>');
  return ctx;
}
