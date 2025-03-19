import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
// Import extensions
import { vector } from '@electric-sql/pglite/vector';
import { uuid_ossp } from '@electric-sql/pglite/contrib/uuid_ossp';

// Create a singleton instance to prevent multiple initializations
let pgliteInstance: PGlite | null = null;
let drizzleInstance: ReturnType<typeof drizzle> | null = null;
let initializationPromise: Promise<PGlite> | null = null;

// Define initialization function for async creation
export async function createPGliteInstance() {
  // If we already have an instance or are in the process of creating one, return it
  if (pgliteInstance) {
    return pgliteInstance;
  }
  
  if (initializationPromise) {
    return initializationPromise;
  }
  
  // Create a new initialization promise
  initializationPromise = (async () => {
    try {
      // Use PGlite.create instead of new PGlite to properly handle WebAssembly loading
      const instance = await PGlite.create("idb://fots-pgdata", {
        extensions: {
          vector,
          uuid_ossp
        },
        // Enable debug in development
        debug: process.env.NODE_ENV !== 'production' ? 3 : undefined,
        // Use relaxed durability for better performance in browser
        relaxedDurability: true,
        // Increase timeout for extension loading
        initTimeout: 30000
      });
      
      // Store the instance
      pgliteInstance = instance;
      drizzleInstance = drizzle(instance);
      
      console.log('PGlite initialized successfully with extensions');
      return instance;
    } catch (error) {
      console.error('Failed to initialize PGlite:', error);
      // Clear the promise so we can try again
      initializationPromise = null;
      throw error;
    }
  })();
  
  return initializationPromise;
}

// Helper function to check if running in browser
const isBrowser = typeof window !== 'undefined';

// Configure headers for WASM loading if needed
if (isBrowser) {
  // These headers should be set in the server configuration (vite.config.ts)
  console.log('PGlite running in browser environment');
}

// Export the pglite object with getters to ensure we always use the latest instances
export const pglite = {
  // Use getters to always return the latest instance
  get client() {
    return pgliteInstance;
  },
  get db() {
    return drizzleInstance;
  },
  // Initialize and return the client
  initialize: async () => {
    if (!pgliteInstance) {
      return createPGliteInstance();
    }
    return pgliteInstance;
  },
  // Add utility methods
  isReady: async () => {
    if (!pgliteInstance) {
      return false;
    }
    
    try {
      // Test query to verify database is working
      await pgliteInstance.query('SELECT 1 as test');
      return true;
    } catch (error) {
      console.error('PGlite readiness check failed:', error);
      return false;
    }
  }
}
