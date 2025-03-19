import { PGliteSyncImpl } from './pglite-sync-impl';

/**
 * Re-export PGliteSyncImpl as PGliteSync for backward compatibility 
 * This allows existing code to use the new implementation without changes
 */
export const PGliteSync = PGliteSyncImpl; 