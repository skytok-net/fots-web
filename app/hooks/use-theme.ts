import { useCallback } from 'react';
import { useThemeStore } from '~/stores/theme-store';

export function useTheme() {
  const store = useThemeStore();

  const toggleTheme = useCallback(() => {
    store.toggleTheme();
  }, [store]);

  return {
    isDarkMode: store.isDarkMode,
    toggleTheme,
  };
}