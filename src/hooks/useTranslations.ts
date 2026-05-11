import { useState, useEffect } from 'react';
import { landingTranslations, type LangKey } from '../i18n/landingTranslations';

const LANG_KEY = '@walletnow:lang';

export function useTranslations() {
  const [lang, setLang] = useState<LangKey>(() => {
    try {
      const saved = localStorage.getItem(LANG_KEY) as LangKey | null;
      if (saved && ['en', 'pt', 'es'].includes(saved)) return saved;
    } catch { /* noop */ }
    return 'en';
  });

  useEffect(() => {
    try {
      localStorage.setItem(LANG_KEY, lang);
    } catch { /* noop */ }
  }, [lang]);

  const t = landingTranslations[lang];

  return { lang, setLang, t };
}
