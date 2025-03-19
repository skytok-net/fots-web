/**
 * Schema version management for PGlite
 */
import { PGlite } from '@electric-sql/pglite';
import { PGliteSchemaVersionError } from './pglite-errors';
import { measurePerformance } from './pglite-performance';

// Current schema version of the application
export const CURRENT_SCHEMA_VERSION = '1.0.0';

// Version table name
const VERSION_TABLE = 'schema_version';

/**
 * Ensure the version table exists
 */
async function ensureVersionTable(client: PGlite): Promise<void> {
  await client.exec(`
    CREATE TABLE IF NOT EXISTS ${VERSION_TABLE} (
      id INTEGER PRIMARY KEY,
      version TEXT NOT NULL,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

/**
 * Get the current schema version from the database
 * Returns null if no version is set
 */
export async function getSchemaVersion(client: PGlite): Promise<string | null> {
  await ensureVersionTable(client);
  
  const result = await client.query(`
    SELECT version FROM ${VERSION_TABLE} 
    ORDER BY id DESC LIMIT 1
  `);
  
  return result.rows.length > 0 ? (result.rows[0] as { version: string }).version : null;
}

/**
 * Set the schema version in the database
 */
export async function setSchemaVersion(client: PGlite, version: string): Promise<void> {
  await ensureVersionTable(client);
  
  await client.exec(`
    INSERT INTO ${VERSION_TABLE} (id, version) 
    VALUES (
      COALESCE((SELECT MAX(id) + 1 FROM ${VERSION_TABLE}), 1),
      '${version}'
    )
  `);
}

/**
 * Check if the database schema version is compatible with the application
 * Throws an error if versions are incompatible
 */
export async function checkSchemaVersion(client: PGlite): Promise<boolean> {
  return measurePerformance('versionCheck', async () => {
    const dbVersion = await getSchemaVersion(client);
    
    // If no version in DB, this is a new database
    if (!dbVersion) {
      await setSchemaVersion(client, CURRENT_SCHEMA_VERSION);
      return true;
    }
    
    // Simple version check - in a real app, you might want to implement
    // semver comparison to check compatibility between versions
    if (dbVersion !== CURRENT_SCHEMA_VERSION) {
      throw new PGliteSchemaVersionError(dbVersion, CURRENT_SCHEMA_VERSION);
    }
    
    return true;
  });
}

/**
 * Update the schema version after successful migrations
 */
export async function updateSchemaVersion(client: PGlite): Promise<void> {
  await setSchemaVersion(client, CURRENT_SCHEMA_VERSION);
}
