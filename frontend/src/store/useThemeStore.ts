import { create } from 'zustand';

export type Theme = 'dark' | 'light';

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const getInitialTheme = (): Theme => {
  if (typeof window === 'undefined') return 'dark';
  const saved = localStorage.getItem('captionstudio_theme');
  if (saved === 'light' || saved === 'dark') {
    return saved;
  }
  return 'dark';
};

export const useThemeStore = create<ThemeState>((set, get) => {
  const initial = getInitialTheme();

  // Apply on initial script load
  if (typeof document !== 'undefined') {
    document.documentElement.classList.remove('dark', 'light');
    document.documentElement.classList.add(initial);
  }

  return {
    theme: initial,
    setTheme: (theme: Theme) => {
      localStorage.setItem('captionstudio_theme', theme);
      if (typeof document !== 'undefined') {
        document.documentElement.classList.remove('dark', 'light');
        document.documentElement.classList.add(theme);
      }
      set({ theme });
    },
    toggleTheme: () => {
      const next = get().theme === 'dark' ? 'light' : 'dark';
      get().setTheme(next);
    },
  };
});

