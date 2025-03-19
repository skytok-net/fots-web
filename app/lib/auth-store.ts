import { AuthState, AuthUser } from '~/types/notifications';

/**
 * Get the current authentication state
 * This is a simplified implementation - in a real application, 
 * this would likely use a more sophisticated state management approach
 */
export function getAuthState(): AuthState {
  if (typeof window === 'undefined') {
    // Server-side rendering - no auth state available
    return { user: null, isLoading: false };
  }
  
  try {
    // Try to get from localStorage as a fallback
    const storedState = localStorage.getItem('authState');
    if (storedState) {
      return JSON.parse(storedState);
    }
  } catch (e) {
    console.error('Error reading auth state:', e);
  }
  
  return { user: null, isLoading: false };
}

/**
 * Set the current authentication state
 * This is a simplified implementation
 */
export function setAuthState(user: AuthUser | null): void {
  if (typeof window === 'undefined') {
    return; // Cannot set auth state on server
  }
  
  const authState: AuthState = {
    user,
    isLoading: false
  };
  
  try {
    localStorage.setItem('authState', JSON.stringify(authState));
  } catch (e) {
    console.error('Error storing auth state:', e);
  }
}

/**
 * Clear the current authentication state (logout)
 */
export function clearAuthState(): void {
  if (typeof window === 'undefined') {
    return; // Cannot clear auth state on server
  }
  
  try {
    localStorage.removeItem('authState');
  } catch (e) {
    console.error('Error clearing auth state:', e);
  }
} 