import { useState, useEffect } from 'react';

const THEME_KEY = '@walletnow:theme';
type Theme = 'light' | 'dark';

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const saved = localStorage.getItem(THEME_KEY);
      if (saved === 'light' || saved === 'dark') return saved;
    } catch { /* noop */ }
    
    // Default to light as per user requirement, but respect system preference if not set
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch { /* noop */ }
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  return { theme, toggleTheme, setTheme };
}
