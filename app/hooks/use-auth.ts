import { useCallback } from 'react';
import { useAuthStore } from '~/stores/auth-store';

export function useAuth() {
  const store = useAuthStore();

  const login = useCallback(async (identifier: string, password: string, service: string) => {
    return store.login(identifier, password, service);
  }, [store]);

  const logout = useCallback(() => {
    store.logout();
  }, [store]);

  return {
    isAuthenticated: store.isAuthenticated,
    agent: store.agent,
    user: store.user,
    login,
    logout,
  };
}