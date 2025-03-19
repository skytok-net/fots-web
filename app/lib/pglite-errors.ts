/**
 * Custom error types for PGlite operations
 */

// Base PGlite error class
export class PGliteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PGliteError';
  }
}

// Initialization errors
export class PGliteInitializationError extends PGliteError {
  constructor(message: string, public originalError?: Error) {
    super(`PGlite initialization failed: ${message}`);
    this.name = 'PGliteInitializationError';
  }
}

// Migration errors
export class PGliteMigrationError extends PGliteError {
  constructor(message: string, public migrationVersion?: string, public originalError?: Error) {
    super(`PGlite migration failed${migrationVersion ? ` at version ${migrationVersion}` : ''}: ${message}`);
    this.name = 'PGliteMigrationError';
  }
}

// Schema version errors
export class PGliteSchemaVersionError extends PGliteError {
  constructor(public currentVersion: string, public requiredVersion: string) {
    super(`PGlite schema version mismatch: current ${currentVersion}, required ${requiredVersion}`);
    this.name = 'PGliteSchemaVersionError';
  }
}

// Query errors
export class PGliteQueryError extends PGliteError {
  constructor(message: string, public query?: string, public params?: any[], public originalError?: Error) {
    super(`PGlite query failed: ${message}`);
    this.name = 'PGliteQueryError';
  }
}

// Sync errors
export class PGliteSyncError extends PGliteError {
  constructor(message: string, public syncType?: string, public originalError?: Error) {
    super(`PGlite sync failed${syncType ? ` during ${syncType}` : ''}: ${message}`);
    this.name = 'PGliteSyncError';
  }
}

// Performance threshold exceeded
export class PGlitePerformanceWarning extends PGliteError {
  constructor(message: string, public operationType: string, public durationMs: number, public threshold: number) {
    super(`PGlite performance warning: ${message}`);
    this.name = 'PGlitePerformanceWarning';
  }
}
