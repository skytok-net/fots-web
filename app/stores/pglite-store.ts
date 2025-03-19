import { create } from 'zustand';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { vector } from '@electric-sql/pglite/vector';
import { uuid_ossp } from '@electric-sql/pglite/contrib/uuid_ossp';
import { migrate } from '../lib/pglite-migrations';
import { useEffect } from 'react';
import { PGliteSyncImpl } from '../lib/pglite-sync-impl';
import { PGliteInitializationError, PGliteMigrationError, PGliteQueryError, PGlitePerformanceWarning } from '../lib/pglite-errors';
import { measurePerformance, configurePGlitePerformance, withPerformanceTracking } from '../lib/pglite-performance';
import { checkSchemaVersion, updateSchemaVersion, CURRENT_SCHEMA_VERSION } from '../lib/pglite-version';

// Performance statistics interface
interface PerformanceStats {
  queryStats: {
    count: number;
    totalTime: number;
    slowQueries: number; // Queries exceeding threshold
    maxTime: number;
  };
  migrationStats: {
    lastMigrationTime: number | null;
    totalMigrations: number;
  };
  syncStats: {
    lastSyncTime: number | null;
    totalSyncs: number;
  };
}

interface PGliteState {
  client: PGlite | null;
  db: ReturnType<typeof drizzle> | null;
  isInitialized: boolean;
  isInitializing: boolean;
  error: Error | null;
  lastSyncTime: Record<string, Date>; // Track last sync time for each collection
  userId: string | null; // Track current user for data isolation
  syncInstance: PGliteSyncImpl | null; // Track sync instance
  schemaVersion: string | null; // Current database schema version
  performanceStats: PerformanceStats; // Performance monitoring stats
  initialize: () => Promise<void>;
  cleanup: () => Promise<void>;
  setUserId: (userId: string | null) => void;
  updateLastSyncTime: (collectionId: string) => void;
  setSyncInstance: (instance: PGliteSyncImpl | null) => void; // Set sync instance
  recordQueryPerformance: (durationMs: number) => void; // Record query performance
}

export const usePGliteStore = create<PGliteState>((set, get) => ({
  client: null,
  db: null,
  isInitialized: false,
  isInitializing: false,
  error: null,
  lastSyncTime: {},
  userId: null,
  syncInstance: null,
  schemaVersion: null,
  performanceStats: {
    queryStats: {
      count: 0,
      totalTime: 0,
      slowQueries: 0,
      maxTime: 0
    },
    migrationStats: {
      lastMigrationTime: null,
      totalMigrations: 0
    },
    syncStats: {
      lastSyncTime: null,
      totalSyncs: 0
    }
  },

  initialize: async () => {
    // Only initialize once
    if (get().isInitialized || get().isInitializing) {
      return;
    }

    try {
      set({ isInitializing: true });

      // Wrap the initialization in performance monitoring
      await measurePerformance('initialization', async () => {
        // Use the singleton instance from pglite.ts
        const client = await import('../lib/pglite').then(module => module.pglite.initialize());


        try {
          // Check schema version compatibility
          const versionCompatible = await checkSchemaVersion(client);
          
          // Run migrations with performance tracking
          await measurePerformance('migration', async () => {
            await migrate(client);
            
            // Update schema version after successful migration
            await updateSchemaVersion(client);
            
            // Update migration stats
            set(state => ({
              performanceStats: {
                ...state.performanceStats,
                migrationStats: {
                  lastMigrationTime: Date.now(),
                  totalMigrations: state.performanceStats.migrationStats.totalMigrations + 1
                }
              }
            }));
          });

          // Initialize drizzle
          const db = drizzle(client);
          
          // Get current schema version
          const schemaVersion = CURRENT_SCHEMA_VERSION;

          set({
            client,
            db,
            isInitialized: true,
            isInitializing: false,
            error: null,
            schemaVersion
          });

          console.log(`PGlite initialized successfully (schema v${schemaVersion})`);
        } catch (migrationError) {
          // Close client if migration fails
          await client.close().catch(closeError => {
            console.error("Error closing client after migration failure:", closeError);
          });
          
          throw migrationError instanceof Error 
            ? new PGliteMigrationError(migrationError.message, undefined, migrationError)
            : new PGliteMigrationError(String(migrationError));
        }
      });
    } catch (error) {
      console.error("Error initializing PGlite:", error);
      
      // Create a typed error
      const typedError = error instanceof Error 
        ? new PGliteInitializationError(error.message, error)
        : new PGliteInitializationError(String(error));
      
      set({
        error: typedError,
        isInitializing: false
      });
      
      throw typedError;
    }
  },

  cleanup: async () => {
    const { client, syncInstance } = get();
    
    // Unsubscribe from realtime updates if we have a sync instance
    if (syncInstance) {
      syncInstance.unsubscribeAll();
    }
    
    if (client) {
      try {
        // Clean up database connection
        await client.close();
        
        set({
          client: null,
          db: null,
          isInitialized: false,
          syncInstance: null,
          error: null
        });
      } catch (error) {
        console.error("Error cleaning up PGlite:", error);
      }
    }
  },

  setUserId: (userId: string | null) => {
    set({ userId });
  },

  updateLastSyncTime: (collectionId: string) => {
    set(state => ({
      lastSyncTime: {
        ...state.lastSyncTime,
        [collectionId]: new Date()
      }
    }));
  },
  
  // Add the setSyncInstance method
  setSyncInstance: (instance: PGliteSyncImpl | null) => {
    set({ syncInstance: instance });
  },
  
  // Record query performance metrics
  recordQueryPerformance: (durationMs: number) => {
    set(state => {
      const { queryStats } = state.performanceStats;
      
      return {
        performanceStats: {
          ...state.performanceStats,
          queryStats: {
            count: queryStats.count + 1,
            totalTime: queryStats.totalTime + durationMs,
            slowQueries: durationMs > 100 ? queryStats.slowQueries + 1 : queryStats.slowQueries,
            maxTime: Math.max(queryStats.maxTime, durationMs)
          }
        }
      };
    });
  }
}));

// Configure performance monitoring
configurePGlitePerformance({
  enabled: process.env.NODE_ENV !== 'production' || process.env.ENABLE_PGLITE_PERFORMANCE === 'true',
  thresholds: {
    query: 100,       // 100ms for queries
    migration: 1000,  // 1s for migrations
    sync: 2000,       // 2s for sync operations
    initialization: 3000, // 3s for initialization
  },
  logToConsole: process.env.NODE_ENV !== 'production',
  onPerformanceWarning: (warning: PGlitePerformanceWarning) => {
    // Record slow queries in the store
    if (warning.operationType === 'query') {
      usePGliteStore.getState().recordQueryPerformance(warning.durationMs);
    }
    
    // You could send these warnings to a monitoring service in production
    if (process.env.NODE_ENV === 'production' && warning.durationMs > warning.threshold * 2) {
      // Example: sendToMonitoringService(warning);
    }
  }
});

// Create a hook to ensure PGlite is initialized
export function usePGlite() {
  const { 
    isInitialized, 
    isInitializing, 
    initialize, 
    error,
    schemaVersion,
    performanceStats,
    ...rest 
  } = usePGliteStore();
  
  // Initialize PGlite if not already initialized
  useEffect(() => {
    if (!isInitialized && !isInitializing) {
      initialize().catch(err => {
        console.error("Failed to initialize PGlite in hook:", err);
      });
    }
  }, [isInitialized, isInitializing, initialize]);
  
  return { 
    isInitialized, 
    isInitializing, 
    initialize, 
    error,
    schemaVersion,
    performanceStats,
    ...rest 
  };
}

// Export a function to get performance metrics
export function getPGlitePerformanceMetrics() {
  const { performanceStats } = usePGliteStore.getState();
  
  const avgQueryTime = performanceStats.queryStats.count > 0
    ? performanceStats.queryStats.totalTime / performanceStats.queryStats.count
    : 0;
    
  return {
    ...performanceStats,
    queryStats: {
      ...performanceStats.queryStats,
      avgTime: avgQueryTime
    }
  };
} 