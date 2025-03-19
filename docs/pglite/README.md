# PGlite Implementation Plan for Browser-Side Caching with Supabase

This document outlines the strategy for implementing PGlite as a browser-side caching solution for the FOTS web application, with synchronization to Supabase.

## Overview

We'll implement PGlite as an in-browser PostgreSQL database to cache frequently accessed data, providing:

1. Improved performance for admin users
2. Reduced API calls to Supabase
3. Better offline support
4. Unified data model between server and client

## Architecture

![Architecture Diagram](https://mermaid.ink/img/pako:eNqFU81u2zAMfhWCpx3qOE2WpH_TLjsMG9Yh2aGXwWAk2hEqS4YkNwuC7L3HylKT7DAtBhxL_Phb4nGAjAmCHMqmYcKxP0I3qeQUBdMa_LdQ9dJDKVqmLbwvTvN8b_hQwlWvGQopDZNOxGrKXBq3e3c0tUdWw3QIhjCZ0GwLvT_u90wnE-YUJ3LJY4hq0Wo-MWNpCCzWVqyqGqQJ2h0oxO-LyQT2Gn20Suu1rRQAZ1_8SGHC-lmw97B5zF6BNhM28kkKZXCmgdRq0QpVgwt04vHcwYSZk-ooXbdAa-RRqoxrZ5j-iBdJHVXZLUkTWl5L5-h8_PfXuGfShSNm1DYTYUiZ6QJkZEeZQv8lHcQKbM1ctLzmSsYgrM0wRWcdkya4sXKGQqNXtHvI8jwTktLiS5AoWnMBztkzWWpnsbQR-q5DLnKRlzctdCuFZh3p3qxjXPFhJOgQjcpMd69HGRkvxKPO5vNsdpcvJu5JijJvH-K91hP4Fp0JLOPnXAUu0yKtUuAw-oOyUDKXyBSPt22ZNj6BsO5QdbfytnJMkbExxbLOsIGcdQajUNAoOaITGdnRXo6rnZ_rdmQiw5aONuoNCJSOltKgN7Qv40iKOVU9HxlPsVbr4lE1DM_lRauG4G0_whqcMTT3fNXw9QW3bG2DoDx28LIEeYPcQb6fJMhuIPfZNeQHSfIb-GBV1pAXxjH97U5-_QdN_RlV)

### Components

1. **PGlite Client**:
   - An in-browser PostgreSQL instance running in WebAssembly
   - Stores data in IndexedDB for persistence across sessions

2. **Synchronization Layer**:
   - Manages data fetching from Supabase
   - Handles conflict resolution
   - Tracks changes between sessions

3. **Schema Migration Manager**:
   - Initializes the PGlite database schema
   - Runs migrations to keep schema in sync with Supabase

## Implementation Plan

### Phase 1: PGlite Initialization

1. **Database Setup**
   ```typescript
   // Enhanced initialization with migration support
   import { PGlite } from '@electric-sql/pglite';
   import { drizzle } from 'drizzle-orm/pglite';
   import { vector } from '@electric-sql/pglite/vector';
   import { uuid_ossp } from '@electric-sql/pglite/contrib/uuid_ossp';
   import { migrate } from './pglite-migrations';

   export async function initPGlite() {
     // In-memory Postgres with IndexedDB persistence
     const client = new PGlite(
       "idb://fots-pgdata",
       {
         extensions: {
           vector,
           uuid_ossp
         }
       }
     );

     // Initialize database and run migrations
     await migrate(client);

     const db = drizzle(client);

     return {
       client,
       db,
     };
   }
   ```

2. **Migration Manager**
   ```typescript
   // app/lib/pglite-migrations.ts
   import type { PGlite } from '@electric-sql/pglite';
   
   const MIGRATIONS_TABLE = 'pglite_migrations';
   
   // Schema definitions for the tables we want to cache
   const MIGRATIONS = [
     {
       name: 'initial_setup',
       sql: `
         CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
           id SERIAL PRIMARY KEY,
           name TEXT NOT NULL UNIQUE,
           applied_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
         );
         
         -- Navigation tables
         CREATE TABLE IF NOT EXISTS navigation (
           id UUID PRIMARY KEY,
           name TEXT NOT NULL,
           key TEXT NOT NULL UNIQUE,
           data JSONB,
           created_at TIMESTAMP WITH TIME ZONE NOT NULL
         );
         
         CREATE TABLE IF NOT EXISTS navigation_items (
           id UUID PRIMARY KEY,
           navigation_id UUID NOT NULL REFERENCES navigation(id) ON DELETE CASCADE,
           parent_id UUID REFERENCES navigation_items(id) ON DELETE CASCADE,
           name TEXT NOT NULL,
           path TEXT,
           icon_name TEXT,
           tag TEXT,
           data JSONB,
           roles TEXT[],
           created_at TIMESTAMP WITH TIME ZONE NOT NULL,
           index INTEGER
         );
         
         -- Organizations tables
         CREATE TABLE IF NOT EXISTS organization_types (
           id UUID PRIMARY KEY,
           name TEXT NOT NULL,
           data JSONB,
           created_at TIMESTAMP WITH TIME ZONE NOT NULL
         );
         
         CREATE TABLE IF NOT EXISTS organizations (
           id UUID PRIMARY KEY,
           name TEXT NOT NULL,
           organization_type_id UUID REFERENCES organization_types(id),
           data JSONB,
           created_at TIMESTAMP WITH TIME ZONE NOT NULL
         );
         
         -- Products tables
         CREATE TABLE IF NOT EXISTS product_types (
           id UUID PRIMARY KEY,
           name TEXT NOT NULL,
           data JSONB,
           created_at TIMESTAMP WITH TIME ZONE NOT NULL
         );
         
         CREATE TABLE IF NOT EXISTS products (
           id UUID PRIMARY KEY,
           name TEXT NOT NULL,
           product_type_id UUID REFERENCES product_types(id),
           data JSONB,
           created_at TIMESTAMP WITH TIME ZONE NOT NULL
         );
         
         -- Stations table
         CREATE TABLE IF NOT EXISTS stations (
           id UUID PRIMARY KEY,
           name TEXT NOT NULL,
           data JSONB,
           created_at TIMESTAMP WITH TIME ZONE NOT NULL
         );
         
         -- Delivery locations table
         CREATE TABLE IF NOT EXISTS delivery_locations (
           id UUID PRIMARY KEY,
           name TEXT NOT NULL,
           data JSONB,
           created_at TIMESTAMP WITH TIME ZONE NOT NULL
         );
         
         -- Providers table
         CREATE TABLE IF NOT EXISTS providers (
           id UUID PRIMARY KEY,
           name TEXT NOT NULL,
           data JSONB,
           created_at TIMESTAMP WITH TIME ZONE NOT NULL
         );
         
         -- Cache metadata table
         CREATE TABLE IF NOT EXISTS cache_metadata (
           id TEXT PRIMARY KEY,
           last_updated TIMESTAMP WITH TIME ZONE NOT NULL,
           etag TEXT,
           data JSONB
         );
       `
     },
     // Add more migrations as needed
   ];
   
   export async function migrate(client: PGlite) {
     try {
       // Create migrations table if it doesn't exist
       await client.exec(`
         CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
           id SERIAL PRIMARY KEY,
           name TEXT NOT NULL UNIQUE,
           applied_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
         );
       `);
       
       // Get already applied migrations
       const result = await client.query(`
         SELECT name FROM ${MIGRATIONS_TABLE} ORDER BY id ASC
       `);
       
       const appliedMigrations = result.rows.map(row => row.name);
       
       // Apply pending migrations
       for (const migration of MIGRATIONS) {
         if (!appliedMigrations.includes(migration.name)) {
           console.log(`Applying migration: ${migration.name}`);
           await client.exec(migration.sql);
           
           // Record the migration
           await client.exec(`
             INSERT INTO ${MIGRATIONS_TABLE} (name)
             VALUES ('${migration.name}')
           `);
           
           console.log(`Migration applied: ${migration.name}`);
         }
       }
       
       console.log('All migrations applied successfully');
     } catch (error) {
       console.error('Error applying migrations:', error);
       throw error;
     }
   }
   ```

### Phase 2: Data Synchronization with Supabase

1. **GraphQL-based Synchronization Service**
   ```typescript
   // app/lib/pglite-sync.ts
   import { PGlite } from '@electric-sql/pglite';
   import { drizzle } from 'drizzle-orm/pglite';
   import { getClient } from './apollo-client';
   import { gql } from '@apollo/client';
   import { AdminNavigation, TopNavigation } from '../graphql/navigation/navigation.graphql';
   
   export class PGliteSync {
     private client: PGlite;
     private db: ReturnType<typeof drizzle>;
     
     constructor(pgClient: PGlite, db: ReturnType<typeof drizzle>) {
       this.client = pgClient;
       this.db = db;
     }
     
     /**
      * Check if a data collection needs to be synced
      */
     private async needsSync(collectionId: string): Promise<boolean> {
       try {
         const result = await this.client.query(`
           SELECT last_updated, etag FROM cache_metadata WHERE id = $1
         `, [collectionId]);
         
         if (result.rows.length === 0) {
           return true; // No cache record, needs sync
         }
         
         const record = result.rows[0];
         const lastUpdated = new Date(record.last_updated);
         const now = new Date();
         
         // Check if cache is older than 15 minutes
         const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000);
         
         return lastUpdated < fifteenMinutesAgo;
       } catch (error) {
         console.error('Error checking sync status:', error);
         return true; // On error, assume we need to sync
       }
     }
     
     /**
      * Update cache metadata after sync
      */
     private async updateCacheMetadata(collectionId: string, etag?: string, data?: any): Promise<void> {
       try {
         await this.client.exec(`
           INSERT INTO cache_metadata (id, last_updated, etag, data)
           VALUES ($1, NOW(), $2, $3)
           ON CONFLICT (id) DO UPDATE SET
             last_updated = NOW(),
             etag = $2,
             data = $3
         `, [collectionId, etag || null, data ? JSON.stringify(data) : null]);
       } catch (error) {
         console.error('Error updating cache metadata:', error);
       }
     }
     
     /**
      * Sync navigation data
      */
     async syncNavigation(): Promise<void> {
       if (!(await this.needsSync('navigation'))) {
         console.log('Navigation cache is up to date');
         return;
       }
       
       try {
         const apolloClient = getClient();
         
         // Fetch admin navigation
         const adminNavResult = await apolloClient.query({
           query: AdminNavigation,
         });
         
         // Fetch top navigation
         const topNavResult = await apolloClient.query({
           query: TopNavigation,
         });
         
         // Extract navigation and items
         const navigations = [
           ...adminNavResult.data.navigationCollection.edges.map((edge: any) => edge.node),
           ...topNavResult.data.navigationCollection.edges.map((edge: any) => edge.node),
         ];
         
         // Begin transaction
         await this.client.exec('BEGIN');
         
         try {
           // Clear existing data
           await this.client.exec('DELETE FROM navigation_items');
           await this.client.exec('DELETE FROM navigation');
           
           // Insert navigation records
           for (const nav of navigations) {
             await this.client.exec(`
               INSERT INTO navigation (id, name, key, data, created_at)
               VALUES ($1, $2, $3, $4, $5)
             `, [
               nav.id, 
               nav.name, 
               nav.key, 
               JSON.stringify(nav.data), 
               new Date(nav.createdAt)
             ]);
             
             // Insert navigation items
             if (nav.navigationItemsCollection?.edges) {
               for (const itemEdge of nav.navigationItemsCollection.edges) {
                 const item = itemEdge.node;
                 
                 await this.client.exec(`
                   INSERT INTO navigation_items (
                     id, navigation_id, parent_id, name, path, 
                     icon_name, tag, data, roles, created_at, index
                   )
                   VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                 `, [
                   item.id,
                   nav.id,
                   item.parentId,
                   item.name,
                   item.path,
                   item.iconName,
                   item.tag,
                   JSON.stringify(item.data),
                   Array.isArray(item.roles) ? JSON.stringify(item.roles) : null,
                   new Date(item.createdAt),
                   item.index
                 ]);
               }
             }
           }
           
           // Update cache metadata
           await this.updateCacheMetadata('navigation', undefined, {
             count: navigations.length,
             timestamp: new Date().toISOString()
           });
           
           // Commit transaction
           await this.client.exec('COMMIT');
           console.log('Navigation sync completed successfully');
         } catch (error) {
           // Rollback transaction on error
           await this.client.exec('ROLLBACK');
           throw error;
         }
       } catch (error) {
         console.error('Error syncing navigation:', error);
         throw error;
       }
     }
     
     /**
      * Sync organization types and organizations
      */
     async syncOrganizations(): Promise<void> {
       // Similar implementation as syncNavigation but for organizations
       // ...
     }
     
     /**
      * Sync product types and products
      */
     async syncProducts(): Promise<void> {
       // Similar implementation as syncNavigation but for products
       // ...
     }
     
     /**
      * Sync stations
      */
     async syncStations(): Promise<void> {
       // Similar implementation as syncNavigation but for stations
       // ...
     }
     
     /**
      * Sync delivery locations
      */
     async syncDeliveryLocations(): Promise<void> {
       // Similar implementation as syncNavigation but for delivery locations
       // ...
     }
     
     /**
      * Sync providers
      */
     async syncProviders(): Promise<void> {
       // Similar implementation as syncNavigation but for providers
       // ...
     }
     
     /**
      * Sync all data
      */
     async syncAll(): Promise<void> {
       try {
         await this.syncNavigation();
         await this.syncOrganizations();
         await this.syncProducts();
         await this.syncStations();
         await this.syncDeliveryLocations();
         await this.syncProviders();
         
         console.log('All data synced successfully');
       } catch (error) {
         console.error('Error syncing all data:', error);
       }
     }
   }
   ```

2. **Supabase API-based Sync Alternative**
   ```typescript
   // app/lib/pglite-supabase-sync.ts
   import { PGlite } from '@electric-sql/pglite';
   import { drizzle } from 'drizzle-orm/pglite';
   import { supabase } from './supabase';
   
   export class PGliteSupabaseSync {
     private client: PGlite;
     private db: ReturnType<typeof drizzle>;
     
     constructor(pgClient: PGlite, db: ReturnType<typeof drizzle>) {
       this.client = pgClient;
       this.db = db;
     }
     
     // Similar methods as in PGliteSync but using Supabase API instead of GraphQL
     // ...
   }
   ```

### Phase 3: Data Access Layer and Hooks

1. **PGlite Repository**
   ```typescript
   // app/repositories/pglite-repository.ts
   import { pglite } from '../lib/pglite';
   
   export class PGliteRepository {
     /**
      * Get all navigation items
      */
     async getNavigation(key?: string) {
       try {
         let query = `
           SELECT n.*, 
             (
               SELECT json_agg(json_build_object(
                 'id', ni.id,
                 'navigation_id', ni.navigation_id,
                 'parent_id', ni.parent_id,
                 'name', ni.name,
                 'path', ni.path,
                 'icon_name', ni.icon_name,
                 'tag', ni.tag,
                 'data', ni.data,
                 'roles', ni.roles,
                 'created_at', ni.created_at,
                 'index', ni.index
               ))
               FROM navigation_items ni
               WHERE ni.navigation_id = n.id
               ORDER BY ni.index
             ) as items
           FROM navigation n
         `;
         
         const params = [];
         
         if (key) {
           query += ' WHERE n.key = $1';
           params.push(key);
         }
         
         const result = await pglite.client.query(query, params);
         return result.rows;
       } catch (error) {
         console.error('Error fetching navigation from PGlite:', error);
         return [];
       }
     }
     
     /**
      * Get organizations with their types
      */
     async getOrganizations() {
       // Implementation to fetch organizations from PGlite
       // ...
     }
     
     // Other repository methods for different entity types
     // ...
   }
   ```

2. **React Hooks**
   ```typescript
   // app/hooks/use-pglite-data.ts
   import { useState, useEffect } from 'react';
   import { pglite } from '../lib/pglite';
   import { PGliteSync } from '../lib/pglite-sync';
   import { PGliteRepository } from '../repositories/pglite-repository';
   
   // Cache initialized flag to prevent multiple initializations
   let isPGliteInitialized = false;
   
   /**
    * Initialize PGlite and sync data
    */
   export async function initializePGlite() {
     if (isPGliteInitialized) {
       return;
     }
     
     try {
       const sync = new PGliteSync(pglite.client, pglite.db);
       await sync.syncAll();
       isPGliteInitialized = true;
     } catch (error) {
       console.error('Error initializing PGlite:', error);
     }
   }
   
   /**
    * Hook to access navigation data from PGlite
    */
   export function useNavigation(key?: string) {
     const [navigation, setNavigation] = useState<any[]>([]);
     const [loading, setLoading] = useState(true);
     const [error, setError] = useState<Error | null>(null);
     
     useEffect(() => {
       let isMounted = true;
       
       const fetchData = async () => {
         try {
           setLoading(true);
           
           // Initialize PGlite if needed
           await initializePGlite();
           
           // Get navigation data
           const repository = new PGliteRepository();
           const data = await repository.getNavigation(key);
           
           if (isMounted) {
             setNavigation(data);
             setError(null);
           }
         } catch (err) {
           if (isMounted) {
             setError(err as Error);
           }
         } finally {
           if (isMounted) {
             setLoading(false);
           }
         }
       };
       
       fetchData();
       
       return () => {
         isMounted = false;
       };
     }, [key]);
     
     return { navigation, loading, error };
   }
   
   // Other data hooks
   // ...
   ```

## Fallback Strategy

In case of PGlite initialization failure or errors during synchronization, we'll implement a failover strategy to use the original GraphQL or Supabase API directly:

```typescript
// app/hooks/use-fallback-data.ts
import { useState, useEffect } from 'react';
import { getClient } from '../lib/apollo-client';
import { AdminNavigation, TopNavigation } from '../graphql/navigation/navigation.graphql';

/**
 * Hook to fetch navigation data directly from GraphQL as a fallback
 */
export function useFallbackNavigation(key?: string) {
  const [navigation, setNavigation] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  useEffect(() => {
    let isMounted = true;
    
    const fetchData = async () => {
      try {
        setLoading(true);
        
        const apolloClient = getClient();
        let result;
        
        if (key === 'admin') {
          result = await apolloClient.query({
            query: AdminNavigation,
          });
        } else if (key === 'top') {
          result = await apolloClient.query({
            query: TopNavigation,
          });
        } else {
          // Fetch all navigation
          // ...
        }
        
        if (isMounted && result) {
          const data = result.data.navigationCollection.edges.map((edge: any) => edge.node);
          setNavigation(data);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError(err as Error);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    
    fetchData();
    
    return () => {
      isMounted = false;
    };
  }, [key]);
  
  return { navigation, loading, error };
}

// Other fallback hooks
// ...
```

## Change Detection Strategy

To detect changes between sessions, we'll use a combination of approaches:

1. **ETags**: Store ETags from Supabase API responses to check if data has changed.
2. **Timestamp-Based**: Check last sync time and refresh data periodically.
3. **Version Tracking**: Track version numbers or timestamps for each entity type.

```typescript
// app/lib/pglite-change-detection.ts
import { PGlite } from '@electric-sql/pglite';

export class ChangeDetector {
  private client: PGlite;
  
  constructor(client: PGlite) {
    this.client = client;
  }
  
  /**
   * Check if entity collection has changed since last sync
   */
  async hasChanged(collectionId: string): Promise<boolean> {
    try {
      // Get last sync info
      const result = await this.client.query(`
        SELECT last_updated, etag, data FROM cache_metadata WHERE id = $1
      `, [collectionId]);
      
      if (result.rows.length === 0) {
        return true; // No previous sync, assume changed
      }
      
      // Here we would make a HEAD request to Supabase to check ETag
      // or get latest timestamp to compare
      
      // For now, check if it's been more than 15 minutes since last sync
      const lastUpdated = new Date(result.rows[0].last_updated);
      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
      
      return lastUpdated < fifteenMinutesAgo;
    } catch (error) {
      console.error('Error checking for changes:', error);
      return true; // On error, assume changed
    }
  }
}
```

## Recommended Method: GraphQL vs Supabase API

After analysis, we recommend using **GraphQL** for syncing data between Supabase and PGlite for the following reasons:

1. **Efficient Data Loading**: GraphQL allows fetching exactly the data structure needed with nested relationships in a single request
2. **Reduced Data Transfer**: Only necessary fields are transferred, reducing bandwidth usage
3. **Typing and Schema**: The GraphQL schema provides strong typing and validation
4. **Existing Setup**: The project already has GraphQL queries defined for the entities we need to cache
5. **Batch Operations**: Can fetch multiple entity types in a single request if needed

The Supabase REST API would be a viable alternative in cases where:
- GraphQL endpoint has performance issues
- Simplicity is preferred over flexibility
- Direct table access through REST API is more straightforward for certain operations

## Conclusion and Next Steps

This implementation plan provides a robust strategy for using PGlite as a client-side caching solution with Supabase. The approach offers significant performance benefits for admin users while maintaining data consistency with the backend.

### Next Steps

1. Implement the PGlite initialization and migration system
2. Develop the synchronization layer starting with navigation data
3. Create React hooks for accessing cached data
4. Test with admin dashboard components
5. Expand to other entity types (organizations, products, etc.)
6. Implement change detection and periodic refresh strategies
7. Add error handling and fallback mechanisms

By following this plan, the FOTS web application will deliver a more responsive user experience with reduced server load and better offline capabilities. 

## Detailed Implementation Guide

### PGlite Initialization and Migration System

#### 1. Zustand Store for PGlite State Management

To manage PGlite's state across the application, we'll create a Zustand store:

```typescript
// app/stores/pgliteStore.ts
import { create } from 'zustand';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { vector } from '@electric-sql/pglite/vector';
import { uuid_ossp } from '@electric-sql/pglite/contrib/uuid_ossp';
import { migrate } from '../lib/pglite-migrations';

interface PGliteState {
  client: PGlite | null;
  db: ReturnType<typeof drizzle> | null;
  isInitialized: boolean;
  isInitializing: boolean;
  error: Error | null;
  lastSyncTime: Record<string, Date>; // Track last sync time for each collection
  userId: string | null; // Track current user for data isolation
  initialize: () => Promise<void>;
  cleanup: () => Promise<void>;
  setUserId: (userId: string | null) => void;
  updateLastSyncTime: (collectionId: string) => void;
}

export const usePGliteStore = create<PGliteState>((set, get) => ({
  client: null,
  db: null,
  isInitialized: false,
  isInitializing: false,
  error: null,
  lastSyncTime: {},
  userId: null,

  initialize: async () => {
    // Only initialize once
    if (get().isInitialized || get().isInitializing) {
      return;
    }

    try {
      set({ isInitializing: true });

      // Create client with IndexedDB persistence
      const client = new PGlite(
        "idb://fots-pgdata",
        {
          extensions: {
            vector,
            uuid_ossp
          }
        }
      );

      // Initialize database and run migrations
      await migrate(client);

      // Initialize drizzle
      const db = drizzle(client);

      set({
        client,
        db,
        isInitialized: true,
        isInitializing: false,
        error: null
      });

      console.log("PGlite initialized successfully");
    } catch (error) {
      console.error("Error initializing PGlite:", error);
      set({
        error: error as Error,
        isInitializing: false
      });
    }
  },

  cleanup: async () => {
    const { client } = get();
    if (client) {
      try {
        // Clean up database connection
        await client.close();
        
        set({
          client: null,
          db: null,
          isInitialized: false,
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
  }
}));

// Create a hook to ensure PGlite is initialized
export function usePGlite() {
  const { isInitialized, isInitializing, initialize, ...rest } = usePGliteStore();
  
  // Initialize PGlite if not already initialized
  useEffect(() => {
    if (!isInitialized && !isInitializing) {
      initialize();
    }
  }, [isInitialized, isInitializing, initialize]);
  
  return { isInitialized, isInitializing, initialize, ...rest };
}
```

#### 2. Schema and Migration System

Create a robust migration system that can detect and apply schema changes:

```typescript
// app/lib/pglite-migrations.ts
import type { PGlite } from '@electric-sql/pglite';
import { supabase } from './supabase';

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
        tag TEXT,
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
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM pg_tables 
        WHERE tablename = $1
      )
    `, [SCHEMA_METADATA_TABLE]);
    
    if (!tableCheck.rows[0].exists) {
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
    
    const currentVersion = result.rows[0].version;
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
    await client.exec(`
      INSERT INTO ${SCHEMA_METADATA_TABLE} (id, version)
      VALUES ('schema_version', $1)
      ON CONFLICT (id) DO UPDATE SET
        version = $1,
        last_updated = NOW()
    `, [SCHEMA_VERSION]);
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
      name: row.name,
      version: row.version
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
          
          // Record the migration
          await client.exec(`
            INSERT INTO ${MIGRATIONS_TABLE} (name, version)
            VALUES ($1, $2)
          `, [migration.name, migration.version]);
          
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
```

#### 3. Application Startup Sequence

To ensure smooth initialization without hydration issues:

```typescript
// app/lib/pglite-init.ts
import { usePGliteStore } from '../stores/pgliteStore';
import { PGliteSync } from './pglite-sync';
import { supabase } from './supabase';

// Singleton flag to prevent multiple initializations
let isInitializing = false;

/**
 * Initialize PGlite on application startup
 */
export async function initializePGlite(): Promise<void> {
  // Check if already initializing or initialized
  if (isInitializing || usePGliteStore.getState().isInitialized) {
    return;
  }
  
  isInitializing = true;
  
  try {
    // Initialize PGlite
    await usePGliteStore.getState().initialize();
    
    // Get auth status
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.user?.id) {
      // Set current user
      usePGliteStore.getState().setUserId(session.user.id);
      
      // Sync initial data
      await syncInitialData();
    }
  } catch (error) {
    console.error('Error during PGlite initialization:', error);
  } finally {
    isInitializing = false;
  }
}

/**
 * Sync initial data on startup
 */
async function syncInitialData(): Promise<void> {
  const { client, db, userId } = usePGliteStore.getState();
  
  if (!client || !db || !userId) {
    console.warn('Cannot sync data: PGlite not initialized or user not logged in');
    return;
  }
  
  try {
    const sync = new PGliteSync(client, db);
    
    // Start with essential data for the UI
    await sync.syncNavigation();
    
    // Then load other data in the background
    setTimeout(async () => {
      await Promise.allSettled([
        sync.syncOrganizationTypes(),
        sync.syncProductTypes(),
        sync.syncStations(),
      ]);
      
      // After types are loaded, load their items
      await Promise.allSettled([
        sync.syncOrganizations(),
        sync.syncProducts(),
        sync.syncDeliveryLocations(),
        sync.syncProviders()
      ]);
      
      console.log('Background data sync completed');
    }, 100);
  } catch (error) {
    console.error('Error syncing initial data:', error);
  }
}

/**
 * Handle user login/logout events
 */
export function setupAuthListeners(): void {
  supabase.auth.onAuthStateChange((event, session) => {
    const store = usePGliteStore.getState();
    
    if (event === 'SIGNED_IN' && session?.user?.id) {
      // User signed in
      store.setUserId(session.user.id);
      syncInitialData();
    } else if (event === 'SIGNED_OUT') {
      // User signed out
      store.setUserId(null);
      
      // Optional: clear user-specific data here if needed
      clearUserSpecificData();
    }
  });
}

/**
 * Clear user-specific data on logout
 */
async function clearUserSpecificData(): Promise<void> {
  const { client } = usePGliteStore.getState();
  
  if (!client) {
    return;
  }
  
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
      
      console.log('User-specific data cleared');
    } catch (error) {
      // Rollback transaction on error
      await client.exec('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Error clearing user-specific data:', error);
  }
}
```

#### 4. Sample User Repository Implementation

Here's a sample implementation of a user repository that utilizes PGlite for caching:

```typescript
// app/repositories/user-repository.ts
import { usePGliteStore } from '../stores/pgliteStore';
import { supabase } from '../lib/supabase';
import { getClient } from '../lib/apollo-client';
import { gql } from '@apollo/client';

// GraphQL queries
const GET_USER = gql`
  query GetUser($id: UUID!) {
    userByID(id: $id) {
      id
      email
      name
      role
      data
      createdAt
      updatedAt
    }
  }
`;

const GET_USERS = gql`
  query GetUsers {
    users {
      id
      email
      name
      role
      createdAt
    }
  }
`;

export class UserRepository {
  /**
   * Get user by ID with caching
   */
  async getUserById(id: string): Promise<any> {
    const { client, isInitialized } = usePGliteStore.getState();
    
    // If PGlite is not initialized, fallback to direct API
    if (!isInitialized || !client) {
      return this.getUserByIdDirect(id);
    }
    
    try {
      // Try to get from cache first
      const cachedResult = await client.query(`
        SELECT data, synced_at FROM cached_users WHERE id = $1
      `, [id]);
      
      if (cachedResult.rows.length > 0) {
        const cachedUser = cachedResult.rows[0];
        const synced_at = new Date(cachedUser.synced_at);
        const now = new Date();
        
        // If cache is fresh (less than 5 minutes old), use it
        if (now.getTime() - synced_at.getTime() < 5 * 60 * 1000) {
          return JSON.parse(cachedUser.data);
        }
      }
      
      // Cache miss or stale, get from API
      const user = await this.getUserByIdDirect(id);
      
      // Cache the result
      if (user) {
        await client.exec(`
          INSERT INTO cached_users (id, data, synced_at)
          VALUES ($1, $2, NOW())
          ON CONFLICT (id) DO UPDATE SET
            data = $2,
            synced_at = NOW()
        `, [id, JSON.stringify(user)]);
      }
      
      return user;
    } catch (error) {
      console.error('Error in getUserById:', error);
      
      // Fallback to direct API on error
      return this.getUserByIdDirect(id);
    }
  }
  
  /**
   * Get user directly from API (no cache)
   */
  private async getUserByIdDirect(id: string): Promise<any> {
    try {
      const apolloClient = getClient();
      const result = await apolloClient.query({
        query: GET_USER,
        variables: { id }
      });
      
      return result.data.userByID;
    } catch (error) {
      console.error('Error fetching user directly:', error);
      throw error;
    }
  }
  
  /**
   * Get all users with caching for non-sensitive list data
   */
  async getUsers(): Promise<any[]> {
    const { client, isInitialized } = usePGliteStore.getState();
    
    // If PGlite is not initialized, fallback to direct API
    if (!isInitialized || !client) {
      return this.getUsersDirect();
    }
    
    try {
      // Try to get from cache first
      const cachedResult = await client.query(`
        SELECT data, synced_at FROM cache_metadata WHERE id = 'users_list'
      `);
      
      if (cachedResult.rows.length > 0) {
        const cachedData = cachedResult.rows[0];
        const synced_at = new Date(cachedData.synced_at);
        const now = new Date();
        
        // If cache is fresh (less than 15 minutes old), use it
        if (now.getTime() - synced_at.getTime() < 15 * 60 * 1000) {
          return JSON.parse(cachedData.data);
        }
      }
      
      // Cache miss or stale, get from API
      const users = await this.getUsersDirect();
      
      // Cache the result
      if (users) {
        await client.exec(`
          INSERT INTO cache_metadata (id, data, last_updated, expires_at)
          VALUES ('users_list', $1, NOW(), NOW() + INTERVAL '15 minutes')
          ON CONFLICT (id) DO UPDATE SET
            data = $1,
            last_updated = NOW(),
            expires_at = NOW() + INTERVAL '15 minutes'
        `, [JSON.stringify(users)]);
      }
      
      return users;
    } catch (error) {
      console.error('Error in getUsers:', error);
      
      // Fallback to direct API on error
      return this.getUsersDirect();
    }
  }
  
  /**
   * Get users directly from API (no cache)
   */
  private async getUsersDirect(): Promise<any[]> {
    try {
      const apolloClient = getClient();
      const result = await apolloClient.query({
        query: GET_USERS
      });
      
      return result.data.users;
    } catch (error) {
      console.error('Error fetching users directly:', error);
      throw error;
    }
  }
  
  /**
   * Example of handling user-specific preferences with PGlite
   */
  async getUserPreferences(userId: string): Promise<any> {
    const { client, isInitialized } = usePGliteStore.getState();
    
    if (!isInitialized || !client) {
      // Fallback to API or default preferences
      return { theme: 'light', notifications: true };
    }
    
    try {
      const result = await client.query(`
        SELECT * FROM user_preferences WHERE user_id = $1
      `, [userId]);
      
      if (result.rows.length > 0) {
        return result.rows[0];
      }
      
      // No preferences found, create default
      const defaultPreferences = { 
        theme: 'light', 
        notifications: true,
        dashboard_layout: {} 
      };
      
      await client.exec(`
        INSERT INTO user_preferences (user_id, theme, notifications, dashboard_layout)
        VALUES ($1, $2, $3, $4)
      `, [
        userId, 
        defaultPreferences.theme, 
        defaultPreferences.notifications,
        JSON.stringify(defaultPreferences.dashboard_layout)
      ]);
      
      return defaultPreferences;
    } catch (error) {
      console.error('Error getting user preferences:', error);
      return { theme: 'light', notifications: true };
    }
  }
  
  /**
   * Update user preferences
   */
  async updateUserPreferences(userId: string, preferences: any): Promise<void> {
    const { client, isInitialized } = usePGliteStore.getState();
    
    if (!isInitialized || !client) {
      console.warn('Cannot update preferences: PGlite not initialized');
      return;
    }
    
    try {
      await client.exec(`
        UPDATE user_preferences
        SET theme = $1, notifications = $2, dashboard_layout = $3, updated_at = NOW()
        WHERE user_id = $4
      `, [
        preferences.theme,
        preferences.notifications,
        JSON.stringify(preferences.dashboard_layout || {}),
        userId
      ]);
    } catch (error) {
      console.error('Error updating user preferences:', error);
    }
  }
}
```

#### 5. Updated Application Entry Point

Here's how to modify the application entry point to initialize PGlite:

```typescript
// app/entry.client.tsx (update to include PGlite initialization)
import * as React from 'react';
import { useState, useEffect } from 'react';
import { RemixBrowser } from '@remix-run/react';
import { hydrateRoot } from 'react-dom/client';
import { CacheProvider } from '@emotion/react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import ClientStyleContext from './contexts/client-style-context';
import createEmotionCache from './utils/create-emotion-cache';
import theme from './theme';
import { initializePGlite, setupAuthListeners } from './lib/pglite-init';

function ClientCacheProvider({ children }: { children: React.ReactNode }) {
  const [cache, setCache] = useState(createEmotionCache());

  useEffect(() => {
    // Initialize PGlite when component mounts in the browser
    const initPGlite = async () => {
      try {
        await initializePGlite();
        setupAuthListeners();
      } catch (error) {
        console.error('Error initializing PGlite:', error);
      }
    };
    
    initPGlite();
  }, []);

  // Rest of the existing function...
}

hydrateRoot(
  document,
  <ClientCacheProvider>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <RemixBrowser />
    </ThemeProvider>
  </ClientCacheProvider>
);
```

### Managing User Sessions and Data Isolation

When dealing with user sessions, it's important to handle what data should change when a user logs out and another logs in:

1. **User-Specific Data**:
   - User preferences (theme, notifications, dashboard settings)
   - Private data (messages, personal notes, etc.)
   - These should be cleared on logout

2. **Shared/Common Data**:
   - Reference data (product types, organization types)
   - Navigation structures
   - These can be preserved between sessions

In our implementation:

1. We track the current user ID in the PGlite store
2. We clear user-specific data tables on logout
3. We maintain session-agnostic reference data across logins
4. We refresh data on new login to ensure it's up to date

### Schema Change Detection and Migration Strategy

To detect schema changes and apply migrations:

1. **Version Tracking**:
   - We maintain a schema version in the PGlite database
   - Each migration has a version number
   - We compare local version with current application version

2. **Automatic Migration**:
   - Migrations are applied in order based on version
   - Only unapplied migrations are executed
   - Each migration is wrapped in a transaction for atomicity

3. **Schema Synchronization**:
   - In a more advanced implementation, you could fetch the schema from Supabase
   - Compare it with the local schema to detect changes
   - Generate migrations dynamically based on differences

### Startup Sequence

The startup sequence is designed to be smooth with no hydration issues:

1. **Initialization Timing**:
   - PGlite is initialized on the client side only after hydration
   - We use a singleton flag to prevent multiple initializations
   - Initialization happens within a useEffect hook

2. **Staged Data Loading**:
   - Critical data (navigation) is loaded immediately
   - Other reference data is loaded in the background
   - This ensures the UI can render quickly

3. **Fallback Handling**:
   - All data access has a fallback to direct API calls
   - If PGlite fails to initialize, the application continues to work

4. **Zustand for State Management**:
   - Zustand provides a central store for PGlite state
   - Components can react to initialization status changes
   - Loading states are tracked for UI feedback

### Performance Optimization Techniques

For optimal performance:

1. **Tiered Caching Strategy**:
   - Frequently accessed data gets longer cache expiration
   - User-specific data is cached with shorter TTL
   - Critical reference data is kept permanently

2. **Background Syncing**:
   - Non-critical data is synced in the background
   - We use setTimeout to avoid blocking the main thread
   - This improves perceived performance

3. **Selective Data Loading**:
   - Only sync data that's likely to be needed
   - Load details on demand when specific items are accessed
   - This reduces initial data transfer size

4. **Cache Invalidation**:
   - Use timestamps to track when data was synced
   - Implement ETag support for efficient invalidation
   - Expire cache based on data type and usage patterns

By implementing this system, you'll have a robust PGlite initialization and migration system that provides fast access to data, handles user sessions appropriately, and ensures the application remains responsive even when offline. 