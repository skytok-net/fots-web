import type { PGlite } from '@electric-sql/pglite';

// Define schema version to track migrations
const SCHEMA_VERSION = '1.0.0';
const MIGRATIONS_TABLE = 'pglite_migrations';
const SCHEMA_METADATA_TABLE = 'schema_metadata';

// Define migrations with version tracking
const MIGRATIONS = [
  {
    version: '1.0.0',
    name: 'initial_setup',
    sql: `
      CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        version TEXT NOT NULL,
        applied_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
      
      CREATE TABLE IF NOT EXISTS ${SCHEMA_METADATA_TABLE} (
        id TEXT PRIMARY KEY,
        version TEXT NOT NULL,
        last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
      
      -- User-specific data table
      CREATE TABLE IF NOT EXISTS user_data (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL,
        data_key TEXT NOT NULL,
        data JSONB,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        UNIQUE(user_id, data_key)
      );
      
      -- Cached users table
      CREATE TABLE IF NOT EXISTS cached_users (
        id UUID PRIMARY KEY,
        data JSONB NOT NULL,
        synced_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
      
      -- Navigation tables
      CREATE TABLE IF NOT EXISTS navigation (
        id UUID PRIMARY KEY,
        name TEXT NOT NULL,
        key TEXT NOT NULL UNIQUE,
        data JSONB,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE,
        synced_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
      
      CREATE TABLE IF NOT EXISTS navigation_items (
        id UUID PRIMARY KEY,
        navigation_id UUID NOT NULL REFERENCES navigation(id) ON DELETE CASCADE,
        parent_id UUID REFERENCES navigation_items(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        path TEXT,
        icon_name TEXT,
        slug TEXT,
        data JSONB,
        roles TEXT[],
        created_at TIMESTAMP WITH TIME ZONE NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE,
        index INTEGER,
        synced_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
      
      -- Organizations tables
      CREATE TABLE IF NOT EXISTS organization_types (
        id UUID PRIMARY KEY,
        name TEXT NOT NULL,
        data JSONB,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE,
        synced_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
      
      CREATE TABLE IF NOT EXISTS organizations (
        id UUID PRIMARY KEY,
        name TEXT NOT NULL,
        organization_type_id UUID REFERENCES organization_types(id),
        data JSONB,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE,
        synced_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
      
      -- Products tables
      CREATE TABLE IF NOT EXISTS product_types (
        id UUID PRIMARY KEY,
        name TEXT NOT NULL,
        data JSONB,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE,
        synced_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
      
      CREATE TABLE IF NOT EXISTS products (
        id UUID PRIMARY KEY,
        name TEXT NOT NULL,
        product_type_id UUID REFERENCES product_types(id),
        data JSONB,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE,
        synced_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
      
      -- Stations table
      CREATE TABLE IF NOT EXISTS stations (
        id UUID PRIMARY KEY,
        name TEXT NOT NULL,
        data JSONB,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE,
        synced_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
      
      -- Delivery locations table
      CREATE TABLE IF NOT EXISTS delivery_locations (
        id UUID PRIMARY KEY,
        name TEXT NOT NULL,
        data JSONB,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE,
        synced_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
      
      -- Providers table
      CREATE TABLE IF NOT EXISTS providers (
        id UUID PRIMARY KEY,
        name TEXT NOT NULL,
        data JSONB,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE,
        synced_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
      
      -- Cache metadata table
      CREATE TABLE IF NOT EXISTS cache_metadata (
        id TEXT PRIMARY KEY,
        last_updated TIMESTAMP WITH TIME ZONE NOT NULL,
        etag TEXT,
        data JSONB,
        expires_at TIMESTAMP WITH TIME ZONE
      );
    `
  },
  // Additional migrations would be added here with incremented versions
  {
    version: '1.0.1',
    name: 'add_user_preferences',
    sql: `
      CREATE TABLE IF NOT EXISTS user_preferences (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL UNIQUE,
        theme TEXT DEFAULT 'light',
        notifications BOOLEAN DEFAULT true,
        dashboard_layout JSONB,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `
  }
];

/**
 * Check if schema needs to be updated
 */
async function needsSchemaUpdate(client: PGlite): Promise<boolean> {
  try {
    // First check if schema metadata table exists
    const query = `
      SELECT EXISTS (
        SELECT FROM pg_tables 
        WHERE tablename = '${SCHEMA_METADATA_TABLE}'
      )
    `;
    
    // Using inline parameters to avoid type issues
    const tableCheck = await client.query(query);
    
    const exists = (tableCheck.rows[0] as { exists: boolean }).exists;
    if (!exists) {
      return true; // Table doesn't exist, needs update
    }
    
    // Check current schema version
    const result = await client.query(`
      SELECT version FROM ${SCHEMA_METADATA_TABLE}
      WHERE id = 'schema_version'
    `);
    
    if (result.rows.length === 0) {
      return true; // No version info, needs update
    }
    
    const currentVersion = (result.rows[0] as { version: string }).version;
    return currentVersion !== SCHEMA_VERSION;
  } catch (error) {
    console.error('Error checking schema version:', error);
    return true; // On error, assume we need to update
  }
}

/**
 * Update schema metadata
 */
async function updateSchemaMetadata(client: PGlite): Promise<void> {
  try {
    // Using inline parameters to avoid type issues
    await client.exec(`
      INSERT INTO ${SCHEMA_METADATA_TABLE} (id, version)
      VALUES ('schema_version', '${SCHEMA_VERSION}')
      ON CONFLICT (id) DO UPDATE SET
        version = '${SCHEMA_VERSION}',
        last_updated = NOW()
    `);
  } catch (error) {
    console.error('Error updating schema metadata:', error);
    throw error;
  }
}

/**
 * Check schema changes from remote server and generate migrations
 */
async function checkRemoteSchemaChanges(): Promise<void> {
  // This would connect to Supabase and check if schema has changed
  // For now, we're using a static migration list
  // This is where you would implement schema diff detection
  return;
}

/**
 * Run database migrations
 */
export async function migrate(client: PGlite): Promise<void> {
  try {
    // Create migrations table if it doesn't exist
    await client.exec(`
      CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        version TEXT NOT NULL,
        applied_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);
    
    // Get already applied migrations
    const result = await client.query(`
      SELECT name, version FROM ${MIGRATIONS_TABLE} ORDER BY id ASC
    `);
    
    const appliedMigrations = result.rows.map(row => ({
      name: (row as { name: string }).name,
      version: (row as { version: string }).version
    }));
    
    // Apply pending migrations in order
    for (const migration of MIGRATIONS) {
      if (!appliedMigrations.some(m => m.name === migration.name)) {
        console.log(`Applying migration: ${migration.name} (${migration.version})`);
        
        // Begin transaction
        await client.exec('BEGIN');
        
        try {
          // Apply migration
          await client.exec(migration.sql);
          
          // Record the migration - using inline parameters to avoid type issues
          await client.exec(`
            INSERT INTO ${MIGRATIONS_TABLE} (name, version)
            VALUES ('${migration.name}', '${migration.version}')
          `);
          
          // Commit transaction
          await client.exec('COMMIT');
          
          console.log(`Migration applied: ${migration.name}`);
        } catch (error) {
          // Rollback transaction on error
          await client.exec('ROLLBACK');
          console.error(`Error applying migration ${migration.name}:`, error);
          throw error;
        }
      }
    }
    
    // Update schema metadata
    await updateSchemaMetadata(client);
    
    console.log('All migrations applied successfully');
  } catch (error) {
    console.error('Error applying migrations:', error);
    throw error;
  }
}

/**
 * Check and apply schema updates
 */
export async function checkAndApplyUpdates(client: PGlite): Promise<void> {
  try {
    const needsUpdate = await needsSchemaUpdate(client);
    
    if (needsUpdate) {
      console.log('Schema update required, checking for changes...');
      
      // Check for changes from remote schema
      await checkRemoteSchemaChanges();
      
      // Apply migrations
      await migrate(client);
    } else {
      console.log('Schema is up to date');
    }
  } catch (error) {
    console.error('Error checking and applying updates:', error);
    throw error;
  }
} 