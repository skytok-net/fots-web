import { usePGliteStore, getPGlitePerformanceMetrics } from '~/stores/pglite-store';
import { PGliteSync } from './pglite-sync';
import { useAuthStore } from '~/stores/auth-store';
import { PGliteInitializationError, PGliteSyncError, PGliteQueryError } from './pglite-errors';
import { measurePerformance } from './pglite-performance';

// Singleton flag to prevent multiple initializations
let isInitializing = false;

/**
 * Initialize PGlite on application startup
 * @returns A promise that resolves when initialization is complete
 */
export async function initializePGlite(): Promise<void> {
  // Check if already initializing or initialized
  if (isInitializing || usePGliteStore.getState().isInitialized) {
    return;
  }
  
  isInitializing = true;
  
  try {
    console.log('Initializing PGlite database...');
    
    // Initialize PGlite with performance tracking
    await measurePerformance('initialization', async () => {
      await usePGliteStore.getState().initialize();
    });
    
    // Log schema version after initialization
    const { schemaVersion } = usePGliteStore.getState();
    console.log(`PGlite initialized with schema version: ${schemaVersion}`);
    
    // Get auth status from auth-store
    const authState = useAuthStore.getState();
    
    if (authState.isAuthenticated && authState.agent?.session?.did) {
      // Set current user using the DID from AT authentication
      usePGliteStore.getState().setUserId(authState.agent.session.did);
      
      // Sync initial data and set up realtime subscriptions
      await syncInitialData();
    }
  } catch (error) {
    // Convert to a typed error if not already
    const typedError = error instanceof Error 
      ? new PGliteInitializationError(error.message, error)
      : new PGliteInitializationError(String(error));
    
    console.error('Error during PGlite initialization:', typedError);
    throw typedError;
  } finally {
    isInitializing = false;
  }
}

/**
 * Sync initial data on startup
 * @returns A promise that resolves when essential data is synced
 */
async function syncInitialData(): Promise<void> {
  const { client, db, userId } = usePGliteStore.getState();
  
  if (!client || !db || !userId) {
    console.warn('Cannot sync data: PGlite not initialized or user not logged in');
    return;
  }
  
  try {
    // Create sync instance with performance tracking
    const sync = new PGliteSync();
    
    // First sync essential navigation data immediately with performance tracking
    await measurePerformance('sync-navigation', async () => {
      await sync.syncNavigation();
    });
    
    // Then sync all other data in the background
    setTimeout(async () => {
      try {
        await measurePerformance('sync-all', async () => {
          await sync.syncAll();
        });
        
        console.log('Background data sync completed');
        
        // Update sync stats
        const pgLiteStore = usePGliteStore.getState();
        pgLiteStore.performanceStats.syncStats.lastSyncTime = Date.now();
        pgLiteStore.performanceStats.syncStats.totalSyncs++;
        
        // After initial sync, set up realtime subscriptions
        await sync.subscribeToRealtimeChanges();
      } catch (syncError) {
        // Convert to a typed error if not already
        const typedError = syncError instanceof Error 
          ? new PGliteSyncError(syncError.message, 'background-sync', syncError)
          : new PGliteSyncError(String(syncError), 'background-sync');
        
        console.error('Error during background sync:', typedError);
      }
    }, 100);
    
    // Store the sync instance in the PGlite store for later reference
    usePGliteStore.getState().setSyncInstance(sync);
  } catch (error) {
    // Convert to a typed error if not already
    const typedError = error instanceof Error 
      ? new PGliteSyncError(error.message, 'initial-sync', error)
      : new PGliteSyncError(String(error), 'initial-sync');
    
    console.error('Error syncing initial data:', typedError);
    throw typedError;
  }
}

/**
 * Handle user login/logout events
 */
export function setupAuthListeners(): void {
  // Subscribe to auth store changes
  useAuthStore.subscribe((state, prevState) => {
    const pgLiteStore = usePGliteStore.getState();
    
    // Check for authentication state changes
    if (!prevState.isAuthenticated && state.isAuthenticated && state.agent?.session?.did) {
      console.log('User authenticated, setting up PGlite user data');
      // User signed in
      pgLiteStore.setUserId(state.agent.session.did);
      syncInitialData().catch(error => {
        console.error('Failed to sync data after authentication:', error);
      });
    } else if (prevState.isAuthenticated && !state.isAuthenticated) {
      console.log('User signed out, cleaning up PGlite user data');
      // User signed out
      
      // Unsubscribe from all realtime updates
      if (pgLiteStore.syncInstance) {
        pgLiteStore.syncInstance.unsubscribeAll();
      }
      
      // Clear user's reference to sync instance
      pgLiteStore.setSyncInstance(null);
      
      // Clear user ID reference
      pgLiteStore.setUserId(null);
      
      // Clear user-specific data
      clearUserSpecificData().catch(error => {
        console.error('Failed to clear user data after logout:', error);
      });
    }
  });
}

/**
 * Clear user-specific data on logout
 * @returns A promise that resolves when user data is cleared
 */
async function clearUserSpecificData(): Promise<void> {
  const { client } = usePGliteStore.getState();
  
  if (!client) {
    return;
  }
  
  return measurePerformance('clear-user-data', async () => {
    try {
      // Begin transaction
      await client.exec('BEGIN');
      
      try {
        // Delete user-specific data
        await client.exec(`DELETE FROM user_preferences`);
        await client.exec(`DELETE FROM user_data`);
        
        // You could also delete sensitive data from other tables if needed
        // For example: await client.exec(`DELETE FROM sensitive_table`);
        
        // Commit transaction
        await client.exec('COMMIT');
        
        console.log('User-specific data cleared successfully');
      } catch (error) {
        // Rollback transaction on error
        await client.exec('ROLLBACK');
        throw error;
      }
    } catch (error) {
      const typedError = error instanceof Error 
        ? new PGliteQueryError(error.message, 'DELETE user data', [], error)
        : new PGliteQueryError(String(error), 'DELETE user data');
      
      console.error('Error clearing user-specific data:', typedError);
      throw typedError;
    }
  });
}

/**
 * Get performance metrics for PGlite operations
 * @returns Performance statistics for PGlite operations
 */
export function getPGliteMetrics() {
  return getPGlitePerformanceMetrics();
}