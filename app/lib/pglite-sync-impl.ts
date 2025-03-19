import { pglite } from '~/lib/pglite';
import { eq } from 'drizzle-orm';
import { supabase } from './supabase';
import { RealtimeChannel } from '@supabase/supabase-js';
import { 
  navigation, navigationItems, 
  organizationTypes, organizations,
  productTypes, products,
  stations, deliveryLocations, providers,
  users, roles, permissions,
  userRoles, userPermissions, rolePermissions,
  notifications, notificationTypes,
  cacheMetadata
} from '~/schema/schema';
import { getClient } from './apollo-client';
import { graphql } from '~/lib/graphql-tag';

// Import GraphQL operations from their respective files
import { GET_ALL_NAVIGATION } from '~/graphql/navigation/operations';
import { GET_ALL_NOTIFICATIONS, UPDATE_NOTIFICATION_RECORD } from '~/graphql/notifications/operations';
import { GET_ORGANIZATIONS } from '~/graphql/organizations/operations';
import { GET_PRODUCTS, GET_PRODUCT_TYPES } from '~/graphql/products/operations';
import { GET_STATIONS } from '~/graphql/stations/operations';
import { GET_USERS, GET_ROLES, GET_PERMISSIONS, GET_USER_PERMISSIONS, GET_ROLE_PERMISSIONS } from '~/graphql/users/operations';

// Auth store interface
interface AuthUser {
  id?: string;
  did?: string;
  handle?: string;
}

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
}

// Simple mock for getAuthState if the real implementation is not available
// This should be replaced with the actual implementation from your codebase
function getAuthState(): AuthState {
  if (typeof window === 'undefined') {
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
 * PGlite Synchronization Service using Drizzle ORM
 * Handles data synchronization between Supabase and local PGlite database
 */
export class PGliteSyncImpl {
  private db = pglite.db;
  private client = pglite.client;
  private channels: Map<string, RealtimeChannel> = new Map();
  private isSubscribed = false;

  constructor() {
    // This ensures channels are properly cleaned up when the window/component unloads
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => this.unsubscribeAll());
    }
  }

  /**
   * Get unread notification count for current user
   */
  async getUnreadNotificationCount(): Promise<number> {
    try {
      // Get current user from auth store
      const currentUserId = await this.getCurrentUser();
      
      if (!currentUserId) {
        return 0;
      }
      
      // First fetch the user's unread notifications
      const userNotifications = await this.db
        .select({
          id: notifications.id
        })
        .from(notifications)
        .where(eq(notifications.userId, currentUserId));
      
      // Then filter them client-side for unread ones
      // This is a workaround for chained where issues in the ORM
      const unreadCount = userNotifications.filter(n => {
        const notif = n as unknown as { isRead: boolean };
        return notif.isRead === false;
      }).length;
      
      return unreadCount;
    } catch (error) {
      console.error('Error getting unread notification count:', error);
      return 0;
    }
  }

  /**
   * Get current user from auth store
   * @returns The current user's ID or null if not logged in
   */
  private async getCurrentUser(): Promise<string | null> {
    try {
      // Get auth state from the auth store
      const authState = getAuthState();
      
      if (!authState || !authState.user) {
        return null;
      }
      
      // Return user ID directly from auth state if available
      if (authState.user.id) {
        return authState.user.id;
      }
      
      // If we only have the DID, look up the corresponding user record
      if (authState.user.did) {
        // Get the user record that matches this DID
        const userRecords = await this.db
          .select()
          .from(users)
          .where(eq(users.did, authState.user.did));
        
        if (userRecords.length === 0) {
          console.log(`No user found with DID: ${authState.user.did}`);
          return null;
        }
        
        return userRecords[0].id;
      }
      
      return null;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }

  /**
   * Subscribe to realtime changes for all tables
   * This will automatically update the local database when remote changes occur
   */
  async subscribeToRealtimeChanges(): Promise<void> {
    if (this.isSubscribed) {
      console.log('Already subscribed to realtime changes');
      return;
    }

    try {
      // Get the current user to set up filtered subscriptions
      const currentUserId = await this.getCurrentUser();

      // Subscribe to each table's changes
      this.subscribeToTable('navigation');
      this.subscribeToTable('navigation_items');
      this.subscribeToTable('organization_types');
      this.subscribeToTable('organizations');
      this.subscribeToTable('product_types');
      this.subscribeToTable('products');
      this.subscribeToTable('stations');
      this.subscribeToTable('delivery_locations');
      this.subscribeToTable('providers');
      
      // Subscribe to user-related tables
      if (currentUserId) {
        // For the current user's own data, we use a filtered subscription
        this.subscribeToUserData(currentUserId);
        this.subscribeToUserRolesData(currentUserId);
        this.subscribeToUserPermissionsData(currentUserId);
        this.subscribeToUserNotifications(currentUserId);
      }
      
      // Check if user has admin role to set up admin-specific subscriptions
      const isAdmin = await this.checkUserIsAdmin(currentUserId || undefined);
      
      if (isAdmin) {
        // Admins need to see changes to all users, roles, permissions, etc.
        this.subscribeToTable('users');
        this.subscribeToTable('roles');
        this.subscribeToTable('permissions');
        this.subscribeToTable('user_roles');
        this.subscribeToTable('user_permissions');
        this.subscribeToTable('role_permissions');
        this.subscribeToTable('notification_types');
      }

      this.isSubscribed = true;
      console.log('Subscribed to realtime changes for all tables');
    } catch (error) {
      console.error('Error subscribing to realtime changes:', error);
    }
  }

  /**
   * Subscribe to realtime changes for a specific table
   */
  private subscribeToTable(tableName: string): void {
    // Don't create duplicate subscriptions
    if (this.channels.has(tableName)) {
      return;
    }

    // Create channel
    const channel = supabase
      .channel(`schema-db-changes:${tableName}`)
      .on('postgres_changes', {
        event: '*', // Listen for all events (INSERT, UPDATE, DELETE)
        schema: 'public',
        table: tableName
      }, (payload) => this.handleRealtimeChange(tableName, payload))
      .subscribe((status) => {
        console.log(`Subscription status for ${tableName}:`, status);
      });

    this.channels.set(tableName, channel);
  }

  /**
   * Handle realtime change from Supabase
   */
  private async handleRealtimeChange(tableName: string, payload: {
    schema: string;
    table: string;
    commit_timestamp: string;
    eventType: 'INSERT' | 'UPDATE' | 'DELETE';
    new: Record<string, unknown>;
    old: Record<string, unknown>;
  }): Promise<void> {
    console.log(`Realtime change detected in ${tableName}:`, payload);

    try {
      // Get the collection ID for cache operations
      const collectionId = this.getCollectionIdFromTable(tableName);
      
      // Handle different event types differently for efficiency
      switch (payload.eventType) {
        case 'DELETE':
          // For DELETE operations, we need to remove the record from local DB
          if (payload.old && payload.old.id) {
            await this.handleDeleteRecord(tableName, payload.old.id as string);
          } else {
            // If we don't have the ID, do a full resync
            await this.invalidateCache(collectionId);
            await this.syncCollectionById(collectionId);
          }
          break;
          
        case 'INSERT':
        case 'UPDATE':
          // For navigation items, always do a full navigation sync
          if (tableName === 'navigation' || tableName === 'navigation_items') {
            await this.invalidateCache('navigation');
            await this.syncNavigation();
            break;
          }
          
          // For simple reference tables, we can try to update just the specific record
          if (payload.new && payload.new.id) {
            await this.handleUpsertRecord(tableName, payload.new);
          } else {
            // Fall back to full resync if needed
            await this.invalidateCache(collectionId);
            await this.syncCollectionById(collectionId);
          }
          break;
          
        default:
          // For any other event, do a full resync
          await this.invalidateCache(collectionId);
          await this.syncCollectionById(collectionId);
      }
    } catch (error) {
      console.error(`Error handling realtime change for ${tableName}:`, error);
      // Fall back to full table sync on error
      try {
        await this.invalidateCache(this.getCollectionIdFromTable(tableName));
        await this.syncCollectionById(this.getCollectionIdFromTable(tableName));
      } catch (fallbackError) {
        console.error(`Failed to fallback sync for ${tableName}:`, fallbackError);
      }
    }
  }
  
  /**
   * Sync a collection by its ID
   */
  private async syncCollectionById(collectionId: string): Promise<void> {
    switch (collectionId) {
      case 'navigation':
        await this.syncNavigation();
        break;
      case 'organization_types':
        await this.syncOrganizationTypes();
        break;
      case 'organizations':
        await this.syncOrganizations();
        break;
      case 'product_types':
        await this.syncProductTypes();
        break;
      case 'products':
        await this.syncProducts();
        break;
      case 'stations':
        await this.syncStations();
        break;
      case 'delivery_locations':
        await this.syncDeliveryLocations();
        break;
      case 'providers':
        await this.syncProviders();
        break;
      case 'users':
        await this.syncUsers();
        break;
      case 'roles':
        await this.syncRoles();
        break;
      case 'permissions':
        await this.syncPermissions();
        break;
      case 'user_roles':
        await this.syncUserRoles();
        break;
      case 'user_permissions':
        await this.syncUserPermissions();
        break;
      case 'role_permissions':
        await this.syncRolePermissions();
        break;
      case 'notification_types':
        await this.syncNotificationTypes();
        break;
      case 'notifications':
        await this.syncNotifications();
        break;
      default:
        console.log(`No sync handler for collection: ${collectionId}`);
    }
  }
  
  /**
   * Handle deletion of a specific record
   */
  private async handleDeleteRecord(tableName: string, id: string): Promise<void> {
    try {
      // Start a transaction
      await this.client.exec('BEGIN');
      
      try {
        // Delete the record based on table name
        switch (tableName) {
          case 'organization_types':
            await this.db.delete(organizationTypes).where(eq(organizationTypes.id, id));
            break;
          case 'organizations':
            await this.db.delete(organizations).where(eq(organizations.id, id));
            break;
          case 'product_types':
            await this.db.delete(productTypes).where(eq(productTypes.id, id));
            break;
          case 'products':
            await this.db.delete(products).where(eq(products.id, id));
            break;
          case 'stations':
            await this.db.delete(stations).where(eq(stations.id, id));
            break;
          case 'delivery_locations':
            await this.db.delete(deliveryLocations).where(eq(deliveryLocations.id, id));
            break;
          case 'providers':
            await this.db.delete(providers).where(eq(providers.id, id));
            break;
          case 'users':
            await this.db.delete(users).where(eq(users.id, id));
            break;
          case 'roles':
            await this.db.delete(roles).where(eq(roles.id, id));
            break;
          case 'permissions':
            await this.db.delete(permissions).where(eq(permissions.id, id));
            break;
          case 'user_roles':
            await this.db.delete(userRoles).where(eq(userRoles.id, id));
            break;
          case 'user_permissions':
            await this.db.delete(userPermissions).where(eq(userPermissions.id, id));
            break;
          case 'role_permissions':
            await this.db.delete(rolePermissions).where(eq(rolePermissions.id, id));
            break;
          case 'notification_types':
            await this.db.delete(notificationTypes).where(eq(notificationTypes.id, id));
            break;
          case 'notifications':
            await this.db.delete(notifications).where(eq(notifications.id, id));
            break;
          default:
            // For unsupported tables, throw to trigger full resync
            throw new Error(`Direct delete not supported for table: ${tableName}`);
        }
        
        // Commit the transaction
        await this.client.exec('COMMIT');
        console.log(`Deleted record ${id} from ${tableName} successfully`);
      } catch (error) {
        // Rollback on error
        await this.client.exec('ROLLBACK');
        throw error;
      }
    } catch (error) {
      console.error(`Error deleting record from ${tableName}:`, error);
      throw error;
    }
  }
  
  /**
   * Handle insert or update of a specific record
   */
  private async handleUpsertRecord(tableName: string, record: Record<string, unknown>): Promise<void> {
    try {
      // Start a transaction
      await this.client.exec('BEGIN');
      
      try {
        // Format dates for created/updated fields
        const formattedRecord = this.formatRecordForUpsert(tableName, record);
        
        // Upsert the record based on table name
        switch (tableName) {
          case 'organization_types':
            // Type casting to specific table schema type
            await this.db
              .insert(organizationTypes)
              .values(formattedRecord as typeof organizationTypes.$inferInsert)
              .onConflictDoUpdate({
                target: organizationTypes.id,
                set: formattedRecord as typeof organizationTypes.$inferInsert
              });
            break;
          case 'organizations':
            await this.db
              .insert(organizations)
              .values(formattedRecord as typeof organizations.$inferInsert)
              .onConflictDoUpdate({
                target: organizations.id,
                set: formattedRecord as typeof organizations.$inferInsert
              });
            break;
          case 'product_types':
            await this.db
              .insert(productTypes)
              .values(formattedRecord as typeof productTypes.$inferInsert)
              .onConflictDoUpdate({
                target: productTypes.id,
                set: formattedRecord as typeof productTypes.$inferInsert
              });
            break;
          case 'products':
            await this.db
              .insert(products)
              .values(formattedRecord as typeof products.$inferInsert)
              .onConflictDoUpdate({
                target: products.id,
                set: formattedRecord as typeof products.$inferInsert
              });
            break;
          case 'stations':
            await this.db
              .insert(stations)
              .values(formattedRecord as typeof stations.$inferInsert)
              .onConflictDoUpdate({
                target: stations.id,
                set: formattedRecord as typeof stations.$inferInsert
              });
            break;
          case 'delivery_locations':
            await this.db
              .insert(deliveryLocations)
              .values(formattedRecord as typeof deliveryLocations.$inferInsert)
              .onConflictDoUpdate({
                target: deliveryLocations.id,
                set: formattedRecord as typeof deliveryLocations.$inferInsert
              });
            break;
          case 'providers':
            await this.db
              .insert(providers)
              .values(formattedRecord as typeof providers.$inferInsert)
              .onConflictDoUpdate({
                target: providers.id,
                set: formattedRecord as typeof providers.$inferInsert
              });
            break;
          case 'users':
            await this.db
              .insert(users)
              .values(formattedRecord as typeof users.$inferInsert)
              .onConflictDoUpdate({
                target: users.id,
                set: formattedRecord as typeof users.$inferInsert
              });
            break;
          case 'roles':
            await this.db
              .insert(roles)
              .values(formattedRecord as typeof roles.$inferInsert)
              .onConflictDoUpdate({
                target: roles.id,
                set: formattedRecord as typeof roles.$inferInsert
              });
            break;
          case 'permissions':
            await this.db
              .insert(permissions)
              .values(formattedRecord as typeof permissions.$inferInsert)
              .onConflictDoUpdate({
                target: permissions.id,
                set: formattedRecord as typeof permissions.$inferInsert
              });
            break;
          case 'user_roles':
            await this.db
              .insert(userRoles)
              .values(formattedRecord as typeof userRoles.$inferInsert)
              .onConflictDoUpdate({
                target: userRoles.id,
                set: formattedRecord as typeof userRoles.$inferInsert
              });
            break;
          case 'user_permissions':
            await this.db
              .insert(userPermissions)
              .values(formattedRecord as typeof userPermissions.$inferInsert)
              .onConflictDoUpdate({
                target: userPermissions.id,
                set: formattedRecord as typeof userPermissions.$inferInsert
              });
            break;
          case 'role_permissions':
            await this.db
              .insert(rolePermissions)
              .values(formattedRecord as typeof rolePermissions.$inferInsert)
              .onConflictDoUpdate({
                target: rolePermissions.id,
                set: formattedRecord as typeof rolePermissions.$inferInsert
              });
            break;
          case 'notification_types':
            await this.db
              .insert(notificationTypes)
              .values(formattedRecord as typeof notificationTypes.$inferInsert)
              .onConflictDoUpdate({
                target: notificationTypes.id,
                set: formattedRecord as typeof notificationTypes.$inferInsert
              });
            break;
          case 'notifications':
            await this.db
              .insert(notifications)
              .values(formattedRecord as typeof notifications.$inferInsert)
              .onConflictDoUpdate({
                target: notifications.id,
                set: formattedRecord as typeof notifications.$inferInsert
              });
            break;
          default:
            // For unsupported tables, throw to trigger full resync
            throw new Error(`Direct upsert not supported for table: ${tableName}`);
        }
        
        // Commit the transaction
        await this.client.exec('COMMIT');
        console.log(`Upserted record ${record.id} in ${tableName} successfully`);
      } catch (error) {
        // Rollback on error
        await this.client.exec('ROLLBACK');
        throw error;
      }
    } catch (error) {
      console.error(`Error upserting record in ${tableName}:`, error);
      throw error;
    }
  }
  
  /**
   * Format a record for upsert operation
   */
  private formatRecordForUpsert(tableName: string, record: Record<string, unknown>): Record<string, unknown> {
    // Create a new object for the formatted record
    const formatted: Record<string, unknown> = {
      ...record,
      syncedAt: new Date() // Always add the latest sync time
    };
    
    // Convert date strings to Date objects
    if (typeof formatted.createdAt === 'string') {
      formatted.createdAt = new Date(formatted.createdAt);
    }
    
    if (typeof formatted.updatedAt === 'string') {
      formatted.updatedAt = new Date(formatted.updatedAt);
    } else if (formatted.updatedAt === null) {
      // Handle null updatedAt correctly
      formatted.updatedAt = null;
    }
    
    return formatted;
  }

  /**
   * Unsubscribe from all realtime changes
   */
  unsubscribeAll(): void {
    for (const [tableName, channel] of this.channels.entries()) {
      channel.unsubscribe();
      console.log(`Unsubscribed from ${tableName} changes`);
    }
    
    this.channels.clear();
    this.isSubscribed = false;
  }

  /**
   * Unsubscribe from a specific table's realtime changes
   */
  unsubscribeFromTable(tableName: string): void {
    const channel = this.channels.get(tableName);
    
    if (channel) {
      channel.unsubscribe();
      this.channels.delete(tableName);
      console.log(`Unsubscribed from ${tableName} changes`);
    }
  }

  /**
   * Convert table name to collection ID used in cache metadata
   */
  private getCollectionIdFromTable(tableName: string): string {
    // Most collections use the same ID as table name
    // Exception is navigation_items which is part of navigation
    if (tableName === 'navigation_items') {
      return 'navigation';
    }
    return tableName;
  }

  /**
   * Invalidate cache for a collection to force resync
   */
  private async invalidateCache(collectionId: string): Promise<void> {
    try {
      await this.db
        .delete(cacheMetadata)
        .where(eq(cacheMetadata.id, collectionId));
      
      console.log(`Cache invalidated for ${collectionId}`);
    } catch (error) {
      console.error(`Error invalidating cache for ${collectionId}:`, error);
    }
  }

  /**
   * Check if a data collection needs to be synced
   */
  private async needsSync(collectionId: string): Promise<boolean> {
    try {
      // Using Drizzle ORM for querying
      const records = await this.db
        .select()
        .from(cacheMetadata)
        .where(eq(cacheMetadata.id, collectionId));
      
      if (records.length === 0) {
        return true; // No cache record, needs sync
      }
      
      const record = records[0];
      const lastUpdated = new Date(record.lastUpdated);
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
  private async updateCacheMetadata(collectionId: string, etag?: string, data?: Record<string, unknown>): Promise<void> {
    try {
      // Using Drizzle ORM for inserting/updating
      await this.db
        .insert(cacheMetadata)
        .values({
          id: collectionId,
          lastUpdated: new Date(),
          etag: etag || null,
          data: data || null
        })
        .onConflictDoUpdate({
          target: cacheMetadata.id,
          set: {
            lastUpdated: new Date(),
            etag: etag || null,
            data: data || null
          }
        });
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
      
      // Fetch navigation using the imported query from operations.ts
      const navResult = await apolloClient.query({
        query: GET_ALL_NAVIGATION
      });
      
      // Extract navigation and items
      const navigations = navResult.data.navigationCollection.edges.map((edge: { node: unknown }) => edge.node);
      
      // Begin transaction
      await this.client.exec('BEGIN');
      
      try {
        // Clear existing data - still using SQL because Drizzle doesn't support truncate yet
        await this.client.exec('DELETE FROM navigation_items');
        await this.client.exec('DELETE FROM navigation');
        
        // Insert navigation records using Drizzle ORM
        for (const nav of navigations) {
          const navItem = nav as {
            id: string;
            name: string;
            key: string;
            data: Record<string, unknown> | null;
            createdAt: string;
            navigationItemsCollection?: {
              edges: Array<{ node: unknown }>;
            };
          };
          
          await this.db.insert(navigation).values({
            id: navItem.id,
            name: navItem.name,
            key: navItem.key,
            data: navItem.data,
            createdAt: new Date(navItem.createdAt),
            syncedAt: new Date()
          });
          
          // Insert navigation items
          if (navItem.navigationItemsCollection?.edges) {
            const items = navItem.navigationItemsCollection.edges.map((itemEdge: { node: unknown }) => {
              const item = itemEdge.node as {
                id: string;
                navigationId: string;
                parentId: string | null;
                name: string;
                path: string | null;
                iconName: string | null;
                tag: string | null;
                data: Record<string, unknown> | null;
                roles: string[] | null;
                createdAt: string;
                index: number | null;
              };
              return {
                id: item.id,
                navigationId: navItem.id,
                parentId: item.parentId,
                name: item.name,
                path: item.path,
                iconName: item.iconName,
                tag: item.tag,
                data: item.data,
                roles: item.roles,
                createdAt: new Date(item.createdAt),
                index: item.index,
                syncedAt: new Date()
              };
            });
            
            // Batch insert for better performance
            if (items.length > 0) {
              await this.db.insert(navigationItems).values(items);
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
   * Sync organization types
   */
  async syncOrganizationTypes(): Promise<void> {
    if (!(await this.needsSync('organization_types'))) {
      console.log('Organization types cache is up to date');
      return;
    }
    
    try {
      const apolloClient = getClient();
      
      // Fetch organization types
      const result = await apolloClient.query({
        query: graphql`
          query OrganizationTypes {
            organizationTypesCollection {
              edges {
                node {
                  id
                  name
                  data
                  createdAt
                  updatedAt
                }
              }
            }
          }
        `
      });
      
      const types = result.data.organizationTypesCollection.edges.map((edge: { node: unknown }) => edge.node);
      
      // Begin transaction
      await this.client.exec('BEGIN');
      
      try {
        // Clear existing data
        await this.db.delete(organizationTypes);
        
        // Insert organization types using Drizzle
        if (types.length > 0) {
          const records = types.map((type: Record<string, unknown>) => ({
            id: type.id as string,
            name: type.name as string,
            data: type.data,
            createdAt: new Date(type.createdAt as string),
            updatedAt: type.updatedAt ? new Date(type.updatedAt as string) : null,
            syncedAt: new Date()
          }));
          
          await this.db.insert(organizationTypes).values(records);
        }
        
        // Update cache metadata
        await this.updateCacheMetadata('organization_types', undefined, {
          count: types.length,
          timestamp: new Date().toISOString()
        });
        
        // Commit transaction
        await this.client.exec('COMMIT');
        console.log('Organization types sync completed successfully');
      } catch (error) {
        // Rollback transaction on error
        await this.client.exec('ROLLBACK');
        throw error;
      }
    } catch (error) {
      console.error('Error syncing organization types:', error);
      throw error;
    }
  }
  
  /**
   * Sync organizations
   */
  async syncOrganizations(): Promise<void> {
    if (!(await this.needsSync('organizations'))) {
      console.log('Organizations cache is up to date');
      return;
    }
    
    try {
      const apolloClient = getClient();
      
      // Fetch organizations
      const result = await apolloClient.query({
        query: graphql`
          query Organizations {
            organizationsCollection {
              edges {
                node {
                  id
                  name
                  organizationTypeId
                  data
                  createdAt
                  updatedAt
                }
              }
            }
          }
        `
      });
      
      const orgs = result.data.organizationsCollection.edges.map((edge: { node: unknown }) => edge.node);
      
      // Begin transaction
      await this.client.exec('BEGIN');
      
      try {
        // Clear existing data
        await this.db.delete(organizations);
        
        // Insert organizations using Drizzle
        if (orgs.length > 0) {
          const records = orgs.map((org: Record<string, unknown>) => ({
            id: org.id as string,
            name: org.name as string,
            organizationTypeId: org.organizationTypeId as string,
            data: org.data,
            createdAt: new Date(org.createdAt as string),
            updatedAt: org.updatedAt ? new Date(org.updatedAt as string) : null,
            syncedAt: new Date()
          }));
          
          await this.db.insert(organizations).values(records);
        }
        
        // Update cache metadata
        await this.updateCacheMetadata('organizations', undefined, {
          count: orgs.length,
          timestamp: new Date().toISOString()
        });
        
        // Commit transaction
        await this.client.exec('COMMIT');
        console.log('Organizations sync completed successfully');
      } catch (error) {
        // Rollback transaction on error
        await this.client.exec('ROLLBACK');
        throw error;
      }
    } catch (error) {
      console.error('Error syncing organizations:', error);
      throw error;
    }
  }

  /**
   * Sync product types
   */
  async syncProductTypes(): Promise<void> {
    if (!(await this.needsSync('product_types'))) {
      console.log('Product types cache is up to date');
      return;
    }
    
    try {
      const apolloClient = getClient();
      
      // Fetch product types
      const result = await apolloClient.query({
        query: graphql`
          query ProductTypes {
            productTypesCollection {
              edges {
                node {
                  id
                  name
                  data
                  createdAt
                  updatedAt
                }
              }
            }
          }
        `
      });
      
      const types = result.data.productTypesCollection.edges.map((edge: { node: unknown }) => edge.node);
      
      // Begin transaction
      await this.client.exec('BEGIN');
      
      try {
        // Clear existing data
        await this.db.delete(productTypes);
        
        // Insert product types using Drizzle
        if (types.length > 0) {
          const records = types.map((type: Record<string, unknown>) => ({
            id: type.id as string,
            name: type.name as string,
            data: type.data,
            createdAt: new Date(type.createdAt as string),
            updatedAt: type.updatedAt ? new Date(type.updatedAt as string) : null,
            syncedAt: new Date()
          }));
          
          await this.db.insert(productTypes).values(records);
        }
        
        // Update cache metadata
        await this.updateCacheMetadata('product_types', undefined, {
          count: types.length,
          timestamp: new Date().toISOString()
        });
        
        // Commit transaction
        await this.client.exec('COMMIT');
        console.log('Product types sync completed successfully');
      } catch (error) {
        // Rollback transaction on error
        await this.client.exec('ROLLBACK');
        throw error;
      }
    } catch (error) {
      console.error('Error syncing product types:', error);
      throw error;
    }
  }
  
  /**
   * Sync products
   */
  async syncProducts(): Promise<void> {
    if (!(await this.needsSync('products'))) {
      console.log('Products cache is up to date');
      return;
    }
    
    try {
      const apolloClient = getClient();
      
      // Fetch products
      const result = await apolloClient.query({
        query: graphql`
          query Products {
            productsCollection {
              edges {
                node {
                  id
                  name
                  productTypeId
                  data
                  createdAt
                  updatedAt
                }
              }
            }
          }
        `
      });
      
      const items = result.data.productsCollection.edges.map((edge: { node: unknown }) => edge.node);
      
      // Begin transaction
      await this.client.exec('BEGIN');
      
      try {
        // Clear existing data
        await this.db.delete(products);
        
        // Insert products using Drizzle
        if (items.length > 0) {
          const records = items.map((item: Record<string, unknown>) => ({
            id: item.id as string,
            name: item.name as string,
            productTypeId: item.productTypeId as string,
            data: item.data,
            createdAt: new Date(item.createdAt as string),
            updatedAt: item.updatedAt ? new Date(item.updatedAt as string) : null,
            syncedAt: new Date()
          }));
          
          await this.db.insert(products).values(records);
        }
        
        // Update cache metadata
        await this.updateCacheMetadata('products', undefined, {
          count: items.length,
          timestamp: new Date().toISOString()
        });
        
        // Commit transaction
        await this.client.exec('COMMIT');
        console.log('Products sync completed successfully');
      } catch (error) {
        // Rollback transaction on error
        await this.client.exec('ROLLBACK');
        throw error;
      }
    } catch (error) {
      console.error('Error syncing products:', error);
      throw error;
    }
  }
  
  /**
   * Sync stations
   */
  async syncStations(): Promise<void> {
    if (!(await this.needsSync('stations'))) {
      console.log('Stations cache is up to date');
      return;
    }
    
    try {
      const apolloClient = getClient();
      
      // Fetch stations
      const result = await apolloClient.query({
        query: graphql`
          query Stations {
            stationsCollection {
              edges {
                node {
                  id
                  name
                  data
                  createdAt
                  updatedAt
                }
              }
            }
          }
        `
      });
      
      const items = result.data.stationsCollection.edges.map((edge: { node: unknown }) => edge.node);
      
      // Begin transaction
      await this.client.exec('BEGIN');
      
      try {
        // Clear existing data
        await this.db.delete(stations);
        
        // Insert stations using Drizzle
        if (items.length > 0) {
          const records = items.map((item: Record<string, unknown>) => ({
            id: item.id as string,
            name: item.name as string,
            data: item.data,
            createdAt: new Date(item.createdAt as string),
            updatedAt: item.updatedAt ? new Date(item.updatedAt as string) : null,
            syncedAt: new Date()
          }));
          
          await this.db.insert(stations).values(records);
        }
        
        // Update cache metadata
        await this.updateCacheMetadata('stations', undefined, {
          count: items.length,
          timestamp: new Date().toISOString()
        });
        
        // Commit transaction
        await this.client.exec('COMMIT');
        console.log('Stations sync completed successfully');
      } catch (error) {
        // Rollback transaction on error
        await this.client.exec('ROLLBACK');
        throw error;
      }
    } catch (error) {
      console.error('Error syncing stations:', error);
      throw error;
    }
  }
  
  /**
   * Sync delivery locations
   */
  async syncDeliveryLocations(): Promise<void> {
    if (!(await this.needsSync('delivery_locations'))) {
      console.log('Delivery locations cache is up to date');
      return;
    }
    
    try {
      const apolloClient = getClient();
      
      // Fetch delivery locations
      const result = await apolloClient.query({
        query: graphql`
          query DeliveryLocations {
            deliveryLocationsCollection {
              edges {
                node {
                  id
                  name
                  data
                  createdAt
                  updatedAt
                }
              }
            }
          }
        `
      });
      
      const items = result.data.deliveryLocationsCollection.edges.map((edge: { node: unknown }) => edge.node);
      
      // Begin transaction
      await this.client.exec('BEGIN');
      
      try {
        // Clear existing data
        await this.db.delete(deliveryLocations);
        
        // Insert delivery locations using Drizzle
        if (items.length > 0) {
          const records = items.map((item: Record<string, unknown>) => ({
            id: item.id as string,
            name: item.name as string,
            data: item.data,
            createdAt: new Date(item.createdAt as string),
            updatedAt: item.updatedAt ? new Date(item.updatedAt as string) : null,
            syncedAt: new Date()
          }));
          
          await this.db.insert(deliveryLocations).values(records);
        }
        
        // Update cache metadata
        await this.updateCacheMetadata('delivery_locations', undefined, {
          count: items.length,
          timestamp: new Date().toISOString()
        });
        
        // Commit transaction
        await this.client.exec('COMMIT');
        console.log('Delivery locations sync completed successfully');
      } catch (error) {
        // Rollback transaction on error
        await this.client.exec('ROLLBACK');
        throw error;
      }
    } catch (error) {
      console.error('Error syncing delivery locations:', error);
      throw error;
    }
  }
  
  /**
   * Sync providers
   */
  async syncProviders(): Promise<void> {
    if (!(await this.needsSync('providers'))) {
      console.log('Providers cache is up to date');
      return;
    }
    
    try {
      const apolloClient = getClient();
      
      // Fetch providers
      const result = await apolloClient.query({
        query: graphql`
          query Providers {
            providersCollection {
              edges {
                node {
                  id
                  name
                  data
                  createdAt
                  updatedAt
                }
              }
            }
          }
        `
      });
      
      const items = result.data.providersCollection.edges.map((edge: { node: unknown }) => edge.node);
      
      // Begin transaction
      await this.client.exec('BEGIN');
      
      try {
        // Clear existing data
        await this.db.delete(providers);
        
        // Insert providers using Drizzle
        if (items.length > 0) {
          const records = items.map((item: Record<string, unknown>) => ({
            id: item.id as string,
            name: item.name as string,
            data: item.data,
            createdAt: new Date(item.createdAt as string),
            updatedAt: item.updatedAt ? new Date(item.updatedAt as string) : null,
            syncedAt: new Date()
          }));
          
          await this.db.insert(providers).values(records);
        }
        
        // Update cache metadata
        await this.updateCacheMetadata('providers', undefined, {
          count: items.length,
          timestamp: new Date().toISOString()
        });
        
        // Commit transaction
        await this.client.exec('COMMIT');
        console.log('Providers sync completed successfully');
      } catch (error) {
        // Rollback transaction on error
        await this.client.exec('ROLLBACK');
        throw error;
      }
    } catch (error) {
      console.error('Error syncing providers:', error);
      throw error;
    }
  }
  
  /**
   * Sync all data
   */
  async syncAll(): Promise<void> {
    try {
      // Get current user info to determine admin status for proper syncing
      const currentUserId = await this.getCurrentUser();
      const isAdmin = await this.checkUserIsAdmin(currentUserId || undefined);
      
      console.log(`Syncing data for ${isAdmin ? 'admin user' : 'regular user'}`);
      
      // Start with essential data for the UI
      await this.syncNavigation();
      
      // Then sync all reference data types
      await Promise.allSettled([
        this.syncOrganizationTypes(),
        this.syncProductTypes(),
        this.syncStations(),
        this.syncDeliveryLocations(),
        this.syncProviders(),
        this.syncRoles(),
        this.syncPermissions(),
        this.syncNotificationTypes()
      ]);
      
      // After types are loaded, sync their items
      await Promise.allSettled([
        this.syncOrganizations(),
        this.syncProducts()
      ]);
      
      // Sync user data - for admins this will include all users,
      // for regular users just their own data
      await Promise.allSettled([
        this.syncUsers(),
        this.syncUserRoles(),
        this.syncUserPermissions(),
        this.syncRolePermissions(),
        this.syncNotifications()
      ]);
      
      console.log('All data synced successfully');
    } catch (error) {
      console.error('Error syncing all data:', error);
    }
  }

  /**
   * Check if the current user has admin role
   */
  private async checkUserIsAdmin(userId?: string): Promise<boolean> {
    if (!userId) return false;
    
    try {
      // Query user roles to check for admin role
      const { data, error } = await supabase
        .from('user_roles')
        .select('role_id, roles!inner(key)')
        .eq('user_id', userId)
        .eq('roles.key', 'admin')
        .maybeSingle();
      
      if (error) throw error;
      
      return !!data; // Return true if data exists (user has admin role)
    } catch (error) {
      console.error('Error checking admin status:', error);
      return false;
    }
  }
  
  /**
   * Subscribe to a specific user's data
   */
  private subscribeToUserData(userId: string): void {
    const channelName = `user-data:${userId}`;
    
    // Don't create duplicate subscriptions
    if (this.channels.has(channelName)) {
      return;
    }
    
    // Create filtered channel for this specific user's data
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', {
        event: '*', // Listen for all events
        schema: 'public',
        table: 'users',
        filter: `id=eq.${userId}` // Only changes to this user
      }, (payload) => this.handleRealtimeChange('users', payload))
      .subscribe((status) => {
        console.log(`Subscription status for ${channelName}:`, status);
      });
    
    this.channels.set(channelName, channel);
  }
  
  /**
   * Subscribe to a specific user's roles
   */
  private subscribeToUserRolesData(userId: string): void {
    const channelName = `user-roles:${userId}`;
    
    // Don't create duplicate subscriptions
    if (this.channels.has(channelName)) {
      return;
    }
    
    // Create filtered channel for this specific user's roles
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'user_roles',
        filter: `user_id=eq.${userId}`
      }, (payload) => this.handleRealtimeChange('user_roles', payload))
      .subscribe((status) => {
        console.log(`Subscription status for ${channelName}:`, status);
      });
    
    this.channels.set(channelName, channel);
  }
  
  /**
   * Subscribe to a specific user's permissions
   */
  private subscribeToUserPermissionsData(userId: string): void {
    const channelName = `user-permissions:${userId}`;
    
    // Don't create duplicate subscriptions
    if (this.channels.has(channelName)) {
      return;
    }
    
    // Create filtered channel for this specific user's permissions
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'user_permissions',
        filter: `user_id=eq.${userId}`
      }, (payload) => this.handleRealtimeChange('user_permissions', payload))
      .subscribe((status) => {
        console.log(`Subscription status for ${channelName}:`, status);
      });
    
    this.channels.set(channelName, channel);
  }
  
  /**
   * Subscribe to a specific user's notifications
   */
  private subscribeToUserNotifications(userId: string): void {
    const channelName = `user-notifications:${userId}`;
    
    // Don't create duplicate subscriptions
    if (this.channels.has(channelName)) {
      return;
    }
    
    // Create filtered channel for this specific user's notifications
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`
      }, (payload) => this.handleNotificationChange(payload))
      .subscribe((status) => {
        console.log(`Subscription status for ${channelName}:`, status);
      });
    
    this.channels.set(channelName, channel);
  }

  /**
   * Handle notification change specifically - optimized for read status updates
   */
  private async handleNotificationChange(payload: {
    schema: string;
    table: string;
    commit_timestamp: string;
    eventType: 'INSERT' | 'UPDATE' | 'DELETE';
    new: Record<string, unknown>;
    old: Record<string, unknown>;
  }): Promise<void> {
    console.log(`Notification change detected:`, payload);

    try {
      // For notification read state updates, we can optimize by just updating that field
      if (payload.eventType === 'UPDATE' && 
          payload.new && payload.new.id && 
          payload.old && payload.old.id &&
          payload.new.is_read !== payload.old.is_read) {
            
        // This is just a read status update, handle it efficiently
        await this.handleNotificationReadUpdate(
          payload.new.id as string, 
          !!payload.new.is_read
        );
        return;
      }
      
      // For other changes, use the standard handler
      await this.handleRealtimeChange('notifications', payload);
    } catch (error) {
      console.error('Error handling notification change:', error);
      // Fall back to full table sync on error
      try {
        await this.invalidateCache('notifications');
        await this.syncNotifications();
      } catch (fallbackError) {
        console.error('Failed to fallback sync for notifications:', fallbackError);
      }
    }
  }
  
  /**
   * Efficiently update notification read status
   */
  private async handleNotificationReadUpdate(id: string, isRead: boolean): Promise<void> {
    try {
      // Start a transaction
      await this.client.exec('BEGIN');
      
      try {
        // Just update the read status field
        await this.db
          .update(notifications)
          .set({ 
            isRead: isRead,
            syncedAt: new Date()
          })
          .where(eq(notifications.id, id));
        
        // Commit the transaction
        await this.client.exec('COMMIT');
        console.log(`Updated notification ${id} read status to ${isRead}`);
      } catch (error) {
        // Rollback on error
        await this.client.exec('ROLLBACK');
        throw error;
      }
    } catch (error) {
      console.error(`Error updating notification read status:`, error);
      throw error;
    }
  }
  
  /**
   * Sync roles data
   */
  async syncRoles(): Promise<void> {
    if (!(await this.needsSync('roles'))) {
      console.log('Roles cache is up to date');
      return;
    }
    
    try {
      const apolloClient = getClient();
      
      // Fetch roles
      const result = await apolloClient.query({
        query: graphql`
          query Roles {
            rolesCollection {
              edges {
                node {
                  id
                  name
                  key
                  createdAt
                }
              }
            }
          }
        `
      });
      
      const items = result.data.rolesCollection.edges.map((edge: { node: unknown }) => edge.node);
      
      // Begin transaction
      await this.client.exec('BEGIN');
      
      try {
        // Clear existing data
        await this.db.delete(roles);
        
        // Insert roles using Drizzle
        if (items.length > 0) {
          const records = items.map((item: Record<string, unknown>) => ({
            id: item.id as string,
            name: item.name as string,
            key: item.key as string,
            createdAt: new Date(item.createdAt as string),
            syncedAt: new Date()
          }));
          
          await this.db.insert(roles).values(records);
        }
        
        // Update cache metadata
        await this.updateCacheMetadata('roles', undefined, {
          count: items.length,
          timestamp: new Date().toISOString()
        });
        
        // Commit transaction
        await this.client.exec('COMMIT');
        console.log('Roles sync completed successfully');
      } catch (error) {
        // Rollback transaction on error
        await this.client.exec('ROLLBACK');
        throw error;
      }
    } catch (error) {
      console.error('Error syncing roles:', error);
      throw error;
    }
  }
  
  /**
   * Sync permissions data
   */
  async syncPermissions(): Promise<void> {
    if (!(await this.needsSync('permissions'))) {
      console.log('Permissions cache is up to date');
      return;
    }
    
    try {
      const apolloClient = getClient();
      
      // Fetch permissions
      const result = await apolloClient.query({
        query: graphql`
          query Permissions {
            permissionsCollection {
              edges {
                node {
                  id
                  name
                  key
                  metadata
                  createdAt
                }
              }
            }
          }
        `
      });
      
      const items = result.data.permissionsCollection.edges.map((edge: { node: unknown }) => edge.node);
      
      // Begin transaction
      await this.client.exec('BEGIN');
      
      try {
        // Clear existing data
        await this.db.delete(permissions);
        
        // Insert permissions using Drizzle
        if (items.length > 0) {
          const records = items.map((item: Record<string, unknown>) => ({
            id: item.id as string,
            name: item.name as string,
            key: item.key as string,
            metadata: item.metadata,
            createdAt: new Date(item.createdAt as string),
            syncedAt: new Date()
          }));
          
          await this.db.insert(permissions).values(records);
        }
        
        // Update cache metadata
        await this.updateCacheMetadata('permissions', undefined, {
          count: items.length,
          timestamp: new Date().toISOString()
        });
        
        // Commit transaction
        await this.client.exec('COMMIT');
        console.log('Permissions sync completed successfully');
      } catch (error) {
        // Rollback transaction on error
        await this.client.exec('ROLLBACK');
        throw error;
      }
    } catch (error) {
      console.error('Error syncing permissions:', error);
      throw error;
    }
  }
  
  /**
   * Sync users data - optimized for the current user
   */
  async syncUsers(): Promise<void> {
    if (!(await this.needsSync('users'))) {
      console.log('Users cache is up to date');
      return;
    }
    
    try {
      const apolloClient = getClient();
      
      // Get current user from auth store to determine if we should sync all users or just the current one
      const currentUserId = await this.getCurrentUser();
      const isAdmin = await this.checkUserIsAdmin(currentUserId || undefined);
      
      // Create a filter to either get all users (for admins) or just the current user
      const filter = isAdmin ? {} : { id: { eq: currentUserId } };
      
      // Skip if not admin and no current user ID
      if (!isAdmin && !currentUserId) {
        console.log('No current user and not admin, skipping user sync');
        return;
      }
      
      // Fetch users with appropriate filter
      const result = await apolloClient.query({
        query: graphql`
          query Users($filter: UsersFilter) {
            usersCollection(filter: $filter) {
              edges {
                node {
                  id
                  firstName
                  lastName
                  email
                  handle
                  did
                  pdsUrl
                  primaryStationId
                  stripeCustomerId
                  metadata
                  createdAt
                  updatedAt
                }
              }
            }
          }
        `,
        variables: { filter }
      });
      
      const items = result.data.usersCollection.edges.map((edge: { node: unknown }) => edge.node);
      
      // Begin transaction
      await this.client.exec('BEGIN');
      
      try {
        // For admins, clear all data; for regular users, only delete their own record
        if (isAdmin) {
          await this.db.delete(users);
        } else if (currentUserId) {
          await this.db.delete(users).where(eq(users.id, currentUserId));
        }
        
        // Insert users using Drizzle
        if (items.length > 0) {
          const records = items.map((item: Record<string, unknown>) => ({
            id: item.id as string,
            firstName: item.firstName as string,
            lastName: item.lastName as string,
            email: item.email as string,
            handle: item.handle as string,
            did: item.did as string,
            pdsUrl: item.pdsUrl as string,
            primaryStationId: item.primaryStationId as string,
            stripeCustomerId: item.stripeCustomerId as string,
            metadata: item.metadata,
            createdAt: new Date(item.createdAt as string),
            updatedAt: item.updatedAt ? new Date(item.updatedAt as string) : null,
            syncedAt: new Date()
          }));
          
          await this.db.insert(users).values(records);
        }
        
        // Update cache metadata
        await this.updateCacheMetadata('users', undefined, {
          count: items.length,
          timestamp: new Date().toISOString()
        });
        
        // Commit transaction
        await this.client.exec('COMMIT');
        console.log('Users sync completed successfully');
      } catch (error) {
        // Rollback transaction on error
        await this.client.exec('ROLLBACK');
        throw error;
      }
    } catch (error) {
      console.error('Error syncing users:', error);
      throw error;
    }
  }
  
  /**
   * Sync user roles - optimized for the current user
   */
  async syncUserRoles(): Promise<void> {
    if (!(await this.needsSync('user_roles'))) {
      console.log('User roles cache is up to date');
      return;
    }
    
    try {
      const apolloClient = getClient();
      
      // Get current user ID to determine if we should sync all user roles or just the current one
      const currentUserId = await this.getCurrentUser();
      const isAdmin = await this.checkUserIsAdmin(currentUserId || undefined);
      
      // Skip if not admin and no current user ID
      if (!isAdmin && !currentUserId) {
        console.log('No current user and not admin, skipping user roles sync');
        return;
      }
      
      // Create a filter to either get all user roles (for admins) or just the current user's roles
      const filter = isAdmin ? {} : { userId: { eq: currentUserId } };
      
      // Fetch user roles with appropriate filter
      const result = await apolloClient.query({
        query: graphql`
          query UserRoles($filter: UserRolesFilter) {
            userRolesCollection(filter: $filter) {
              edges {
                node {
                  id
                  userId
                  roleId
                  createdAt
                }
              }
            }
          }
        `,
        variables: { filter }
      });
      
      const items = result.data.userRolesCollection.edges.map((edge: { node: unknown }) => edge.node);
      
      // Begin transaction
      await this.client.exec('BEGIN');
      
      try {
        // For admins, clear all data; for regular users, only delete their own records
        if (isAdmin) {
          await this.db.delete(userRoles);
        } else if (currentUserId) {
          await this.db.delete(userRoles).where(eq(userRoles.userId, currentUserId));
        }
        
        // Insert user roles using Drizzle
        if (items.length > 0) {
          const records = items.map((item: Record<string, unknown>) => ({
            id: item.id as string,
            userId: item.userId as string,
            roleId: item.roleId as string,
            createdAt: new Date(item.createdAt as string),
            syncedAt: new Date()
          }));
          
          await this.db.insert(userRoles).values(records);
        }
        
        // Update cache metadata
        await this.updateCacheMetadata('user_roles', undefined, {
          count: items.length,
          timestamp: new Date().toISOString()
        });
        
        // Commit transaction
        await this.client.exec('COMMIT');
        console.log('User roles sync completed successfully');
      } catch (error) {
        // Rollback transaction on error
        await this.client.exec('ROLLBACK');
        throw error;
      }
    } catch (error) {
      console.error('Error syncing user roles:', error);
      throw error;
    }
  }
  
  /**
   * Sync user permissions - optimized for the current user
   */
  async syncUserPermissions(): Promise<void> {
    if (!(await this.needsSync('user_permissions'))) {
      console.log('User permissions cache is up to date');
      return;
    }
    
    try {
      const apolloClient = getClient();
      
      // Get current user ID to determine if we should sync all user permissions or just the current one
      const currentUserId = await this.getCurrentUser();
      const isAdmin = await this.checkUserIsAdmin(currentUserId || undefined);
      
      // Skip if not admin and no current user ID
      if (!isAdmin && !currentUserId) {
        console.log('No current user and not admin, skipping user permissions sync');
        return;
      }
      
      // Create a filter to either get all user permissions (for admins) or just the current user's permissions
      const filter = isAdmin ? {} : { userId: { eq: currentUserId } };
      
      // Fetch user permissions with appropriate filter
      const result = await apolloClient.query({
        query: graphql`
          query UserPermissions($filter: UserPermissionsFilter) {
            userPermissionsCollection(filter: $filter) {
              edges {
                node {
                  id
                  userId
                  permissionId
                  enabled
                  metadata
                  createdAt
                }
              }
            }
          }
        `,
        variables: { filter }
      });
      
      const items = result.data.userPermissionsCollection.edges.map((edge: { node: unknown }) => edge.node);
      
      // Begin transaction
      await this.client.exec('BEGIN');
      
      try {
        // For admins, clear all data; for regular users, only delete their own records
        if (isAdmin) {
          await this.db.delete(userPermissions);
        } else if (currentUserId) {
          await this.db.delete(userPermissions).where(eq(userPermissions.userId, currentUserId));
        }
        
        // Insert user permissions using Drizzle
        if (items.length > 0) {
          const records = items.map((item: Record<string, unknown>) => ({
            id: item.id as string,
            userId: item.userId as string,
            permissionId: item.permissionId as string,
            enabled: item.enabled as boolean,
            metadata: item.metadata,
            createdAt: new Date(item.createdAt as string),
            syncedAt: new Date()
          }));
          
          await this.db.insert(userPermissions).values(records);
        }
        
        // Update cache metadata
        await this.updateCacheMetadata('user_permissions', undefined, {
          count: items.length,
          timestamp: new Date().toISOString()
        });
        
        // Commit transaction
        await this.client.exec('COMMIT');
        console.log('User permissions sync completed successfully');
      } catch (error) {
        // Rollback transaction on error
        await this.client.exec('ROLLBACK');
        throw error;
      }
    } catch (error) {
      console.error('Error syncing user permissions:', error);
      throw error;
    }
  }
  
  /**
   * Sync role permissions
   */
  async syncRolePermissions(): Promise<void> {
    if (!(await this.needsSync('role_permissions'))) {
      console.log('Role permissions cache is up to date');
      return;
    }
    
    try {
      const apolloClient = getClient();
      
      // Fetch role permissions
      const result = await apolloClient.query({
        query: graphql`
          query RolePermissions {
            rolePermissionsCollection {
              edges {
                node {
                  id
                  roleId
                  permissionId
                  enabled
                  metadata
                  createdAt
                }
              }
            }
          }
        `
      });
      
      const items = result.data.rolePermissionsCollection.edges.map((edge: { node: unknown }) => edge.node);
      
      // Begin transaction
      await this.client.exec('BEGIN');
      
      try {
        // Clear existing data
        await this.db.delete(rolePermissions);
        
        // Insert role permissions using Drizzle
        if (items.length > 0) {
          const records = items.map((item: Record<string, unknown>) => ({
            id: item.id as string,
            roleId: item.roleId as string,
            permissionId: item.permissionId as string,
            enabled: item.enabled as boolean,
            metadata: item.metadata,
            createdAt: new Date(item.createdAt as string),
            syncedAt: new Date()
          }));
          
          await this.db.insert(rolePermissions).values(records);
        }
        
        // Update cache metadata
        await this.updateCacheMetadata('role_permissions', undefined, {
          count: items.length,
          timestamp: new Date().toISOString()
        });
        
        // Commit transaction
        await this.client.exec('COMMIT');
        console.log('Role permissions sync completed successfully');
      } catch (error) {
        // Rollback transaction on error
        await this.client.exec('ROLLBACK');
        throw error;
      }
    } catch (error) {
      console.error('Error syncing role permissions:', error);
      throw error;
    }
  }
  
  /**
   * Sync notification types
   */
  async syncNotificationTypes(): Promise<void> {
    if (!(await this.needsSync('notification_types'))) {
      console.log('Notification types cache is up to date');
      return;
    }
    
    try {
      const apolloClient = getClient();
      
      // Fetch notification types
      const result = await apolloClient.query({
        query: graphql`
          query NotificationTypes {
            notificationTypesCollection {
              edges {
                node {
                  id
                  name
                  key
                  schema
                  iconUrl
                  createdAt
                }
              }
            }
          }
        `
      });
      
      const items = result.data.notificationTypesCollection.edges.map((edge: { node: unknown }) => edge.node);
      
      // Begin transaction
      await this.client.exec('BEGIN');
      
      try {
        // Clear existing data
        await this.db.delete(notificationTypes);
        
        // Insert notification types using Drizzle
        if (items.length > 0) {
          const records = items.map((item: Record<string, unknown>) => ({
            id: item.id as string,
            name: item.name as string,
            key: item.key as string,
            schema: item.schema,
            iconUrl: item.iconUrl as string,
            createdAt: new Date(item.createdAt as string),
            syncedAt: new Date()
          }));
          
          await this.db.insert(notificationTypes).values(records);
        }
        
        // Update cache metadata
        await this.updateCacheMetadata('notification_types', undefined, {
          count: items.length,
          timestamp: new Date().toISOString()
        });
        
        // Commit transaction
        await this.client.exec('COMMIT');
        console.log('Notification types sync completed successfully');
      } catch (error) {
        // Rollback transaction on error
        await this.client.exec('ROLLBACK');
        throw error;
      }
    } catch (error) {
      console.error('Error syncing notification types:', error);
      throw error;
    }
  }

  /**
   * Sync notifications - optimized for the current user
   * Always focused on current user notifications, admins don't sync all notifications
   */
  async syncNotifications(): Promise<void> {
    if (!(await this.needsSync('notifications'))) {
      console.log('Notifications cache is up to date');
      return;
    }
    
    try {
      // Get current user from AT Protocol
      const currentUserId = await this.getCurrentUser();
      
      if (!currentUserId) {
        console.log('No current user, skipping notifications sync');
        return;
      }
      
      const apolloClient = getClient();
      
      // Always filter to current user's notifications only
      const filter = { userId: { eq: currentUserId } };
      
      // Fetch notifications for current user using the imported query from operations.ts
      const result = await apolloClient.query({
        query: GET_ALL_NOTIFICATIONS,
        variables: { filter }
      });
      
      const items = result.data.notificationsCollection.edges.map((edge: { node: unknown }) => edge.node);
      
      // Begin transaction
      await this.client.exec('BEGIN');
      
      try {
        // Only delete current user's notifications
        await this.db.delete(notifications).where(eq(notifications.userId, currentUserId));
        
        // Insert notifications using Drizzle
        if (items.length > 0) {
          const records = items.map((item: Record<string, unknown>) => ({
            id: item.id as string,
            notificationTypeId: item.notificationTypeId as string,
            userId: item.userId as string,
            title: item.title as string,
            subtitle: item.subtitle as string,
            iconUrl: item.iconUrl as string,
            messageMarkdown: item.messageMarkdown as string,
            isRead: item.isRead as boolean,
            data: item.data,
            createdAt: new Date(item.createdAt as string),
            syncedAt: new Date()
          }));
          
          await this.db.insert(notifications).values(records);
        }
        
        // Update cache metadata
        await this.updateCacheMetadata('notifications', undefined, {
          count: items.length,
          timestamp: new Date().toISOString(),
          userId: currentUserId // Store the user ID for whom we synced
        });
        
        // Commit transaction
        await this.client.exec('COMMIT');
        console.log(`Notifications sync completed for user ${currentUserId}`);
      } catch (error) {
        // Rollback transaction on error
        await this.client.exec('ROLLBACK');
        throw error;
      }
    } catch (error) {
      console.error('Error syncing notifications:', error);
      throw error;
    }
  }

  /**
   * Mark a notification as read and sync to backend
   */
  async markNotificationAsRead(notificationId: string): Promise<void> {
    try {
      // Get the current user ID 
      const currentUserId = await this.getCurrentUser();
      
      if (!currentUserId) {
        throw new Error('User not authenticated');
      }
      
      // Update both local database and backend
      await this.client.exec('BEGIN');
      
      try {
        // First check if the notification belongs to the current user
        const notificationResults = await this.db
          .select()
          .from(notifications)
          .where(eq(notifications.id, notificationId));
        
        if (notificationResults.length === 0) {
          throw new Error('Notification not found');
        }
        
        const notification = notificationResults[0];
        
        // Verify ownership
        if (notification.userId !== currentUserId) {
          throw new Error('Cannot mark notification as read - not owned by current user');
        }
        
        // Update locally
        await this.db
          .update(notifications)
          .set({ 
            isRead: true,
            syncedAt: new Date()
          })
          .where(eq(notifications.id, notificationId));
          
        // Import the UpdateNotificationRecord mutation from the notifications.graphql file
        const UPDATE_NOTIFICATION_RECORD = graphql`
          mutation UpdateNotificationRecord($id: UUID!, $input: NotificationsUpdateInput!) {
            updateNotificationsCollection(set: $input, filter: {id: {eq: $id}}) {
              records {
                id
                isRead
              }
            }
          }
        `;
        
        // Update on backend using the imported mutation
        const apolloClient = getClient();
        await apolloClient.mutate({
          mutation: UPDATE_NOTIFICATION_RECORD,
          variables: {
            id: notificationId,
            input: {
              isRead: true
            }
          }
        });
        
        await this.client.exec('COMMIT');
        console.log(`Marked notification ${notificationId} as read`);
      } catch (error) {
        await this.client.exec('ROLLBACK');
        throw error;
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }
  
  /**
   * Update the subscriptions for the current user
   */
  async updateCurrentUserSubscriptions(): Promise<void> {
    try {
      // Get current user ID
      const currentUserId = await this.getCurrentUser();
      
      if (currentUserId) {
        // Set up user-specific subscriptions
        this.subscribeToUserData(currentUserId);
        this.subscribeToUserRolesData(currentUserId);
        this.subscribeToUserPermissionsData(currentUserId);
        this.subscribeToUserNotifications(currentUserId);
        
        console.log(`Updated subscriptions for user ${currentUserId}`);
      } else {
        console.log('No user logged in, skipping user-specific subscriptions');
      }
    } catch (error) {
      console.error('Error updating user subscriptions:', error);
    }
  }
}
