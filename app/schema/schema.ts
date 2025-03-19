import { pgTable, serial, text, timestamp, uuid, boolean, jsonb, integer } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import { relations } from 'drizzle-orm';

// User Data
export const userData = pgTable('user_data', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull(),
  dataKey: text('data_key').notNull(),
  data: jsonb('data'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
});

// Cached Users
export const cachedUsers = pgTable('cached_users', {
  id: uuid('id').primaryKey(),
  data: jsonb('data').notNull(),
  syncedAt: timestamp('synced_at', { withTimezone: true }).defaultNow().notNull()
});

// Navigation
export const navigation = pgTable('navigation', {
  id: uuid('id').primaryKey(),
  name: text('name').notNull(),
  key: text('key').notNull().unique(),
  data: jsonb('data'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }),
  syncedAt: timestamp('synced_at', { withTimezone: true }).defaultNow().notNull()
});

// Navigation Items
export const navigationItems = pgTable('navigation_items', {
  id: uuid('id').primaryKey(),
  navigationId: uuid('navigation_id').notNull(),
  parentId: uuid('parent_id'),
  name: text('name').notNull(),
  path: text('path'),
  iconName: text('icon_name'),
  tag: text('tag'),
  data: jsonb('data'),
  roles: jsonb('roles').$type<string[]>(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }),
  index: integer('index'),
  syncedAt: timestamp('synced_at', { withTimezone: true }).defaultNow().notNull()
});

// Define relations after table definitions to avoid circular references
export const navigationRelations = relations(navigation, ({ many }) => ({
  items: many(navigationItems)
}));

export const navigationItemsRelations = relations(navigationItems, ({ one, many }) => ({
  navigation: one(navigation, {
    fields: [navigationItems.navigationId],
    references: [navigation.id]
  }),
  parent: one(navigationItems, {
    fields: [navigationItems.parentId],
    references: [navigationItems.id]
  }),
  children: many(navigationItems)
}));

// Organization Types
export const organizationTypes = pgTable('organization_types', {
  id: uuid('id').primaryKey(),
  name: text('name').notNull(),
  data: jsonb('data'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }),
  syncedAt: timestamp('synced_at', { withTimezone: true }).defaultNow().notNull()
});

// Organizations
export const organizations = pgTable('organizations', {
  id: uuid('id').primaryKey(),
  name: text('name').notNull(),
  organizationTypeId: uuid('organization_type_id'),
  data: jsonb('data'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }),
  syncedAt: timestamp('synced_at', { withTimezone: true }).defaultNow().notNull()
});

export const organizationsRelations = relations(organizations, ({ one }) => ({
  type: one(organizationTypes, {
    fields: [organizations.organizationTypeId],
    references: [organizationTypes.id]
  })
}));

// Product Types
export const productTypes = pgTable('product_types', {
  id: uuid('id').primaryKey(),
  name: text('name').notNull(),
  data: jsonb('data'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }),
  syncedAt: timestamp('synced_at', { withTimezone: true }).defaultNow().notNull()
});

// Products
export const products = pgTable('products', {
  id: uuid('id').primaryKey(),
  name: text('name').notNull(),
  productTypeId: uuid('product_type_id'),
  data: jsonb('data'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }),
  syncedAt: timestamp('synced_at', { withTimezone: true }).defaultNow().notNull()
});

export const productsRelations = relations(products, ({ one }) => ({
  type: one(productTypes, {
    fields: [products.productTypeId],
    references: [productTypes.id]
  })
}));

// Stations
export const stations = pgTable('stations', {
  id: uuid('id').primaryKey(),
  name: text('name').notNull(),
  data: jsonb('data'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }),
  syncedAt: timestamp('synced_at', { withTimezone: true }).defaultNow().notNull()
});

// Delivery Locations
export const deliveryLocations = pgTable('delivery_locations', {
  id: uuid('id').primaryKey(),
  name: text('name').notNull(),
  data: jsonb('data'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }),
  syncedAt: timestamp('synced_at', { withTimezone: true }).defaultNow().notNull()
});

// Providers
export const providers = pgTable('providers', {
  id: uuid('id').primaryKey(),
  name: text('name').notNull(),
  data: jsonb('data'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }),
  syncedAt: timestamp('synced_at', { withTimezone: true }).defaultNow().notNull()
});

// Users
export const users = pgTable('users', {
  id: uuid('id').primaryKey(),
  firstName: text('first_name'),
  lastName: text('last_name'),
  email: text('email'),
  handle: text('handle'),
  did: text('did'),
  pdsUrl: text('pds_url'),
  primaryStationId: uuid('primary_station_id'),
  stripeCustomerId: text('stripe_customer_id'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }),
  syncedAt: timestamp('synced_at', { withTimezone: true }).defaultNow().notNull()
});

// Roles
export const roles = pgTable('roles', {
  id: uuid('id').primaryKey(),
  name: text('name').notNull(),
  key: text('key').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  syncedAt: timestamp('synced_at', { withTimezone: true }).defaultNow().notNull()
});

// Permissions
export const permissions = pgTable('permissions', {
  id: uuid('id').primaryKey(),
  name: text('name').notNull(),
  key: text('key').notNull().unique(),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  syncedAt: timestamp('synced_at', { withTimezone: true }).defaultNow().notNull()
});

// User Roles
export const userRoles = pgTable('user_roles', {
  id: uuid('id').primaryKey(),
  userId: uuid('user_id').notNull(),
  roleId: uuid('role_id').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  syncedAt: timestamp('synced_at', { withTimezone: true }).defaultNow().notNull()
});

// User Permissions
export const userPermissions = pgTable('user_permissions', {
  id: uuid('id').primaryKey(),
  userId: uuid('user_id').notNull(),
  permissionId: uuid('permission_id').notNull(),
  enabled: boolean('enabled').default(true).notNull(),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  syncedAt: timestamp('synced_at', { withTimezone: true }).defaultNow().notNull()
});

// Role Permissions
export const rolePermissions = pgTable('role_permissions', {
  id: uuid('id').primaryKey(),
  roleId: uuid('role_id').notNull(),
  permissionId: uuid('permission_id').notNull(),
  enabled: boolean('enabled').default(true).notNull(),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  syncedAt: timestamp('synced_at', { withTimezone: true }).defaultNow().notNull()
});

// Notification Types
export const notificationTypes = pgTable('notification_types', {
  id: uuid('id').primaryKey(),
  name: text('name').notNull(),
  key: text('key').notNull().unique(),
  schema: jsonb('schema'),
  iconUrl: text('icon_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  syncedAt: timestamp('synced_at', { withTimezone: true }).defaultNow().notNull()
});

// Notifications
export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey(),
  notificationTypeId: uuid('notification_type_id').notNull(),
  userId: uuid('user_id').notNull(),
  title: text('title').notNull(),
  subtitle: text('subtitle').notNull(),
  iconUrl: text('icon_url'),
  messageMarkdown: text('message_markdown'),
  isRead: boolean('is_read').default(false).notNull(),
  data: jsonb('data'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  syncedAt: timestamp('synced_at', { withTimezone: true }).defaultNow().notNull()
});

// Define relations for new tables
export const usersRelations = relations(users, ({ one, many }) => ({
  primaryStation: one(stations, {
    fields: [users.primaryStationId],
    references: [stations.id]
  }),
  userRoles: many(userRoles),
  userPermissions: many(userPermissions),
  notifications: many(notifications)
}));

export const rolesRelations = relations(roles, ({ many }) => ({
  userRoles: many(userRoles),
  rolePermissions: many(rolePermissions)
}));

export const permissionsRelations = relations(permissions, ({ many }) => ({
  userPermissions: many(userPermissions),
  rolePermissions: many(rolePermissions)
}));

export const userRolesRelations = relations(userRoles, ({ one }) => ({
  user: one(users, {
    fields: [userRoles.userId],
    references: [users.id]
  }),
  role: one(roles, {
    fields: [userRoles.roleId],
    references: [roles.id]
  })
}));

export const userPermissionsRelations = relations(userPermissions, ({ one }) => ({
  user: one(users, {
    fields: [userPermissions.userId],
    references: [users.id]
  }),
  permission: one(permissions, {
    fields: [userPermissions.permissionId],
    references: [permissions.id]
  })
}));

export const rolePermissionsRelations = relations(rolePermissions, ({ one }) => ({
  role: one(roles, {
    fields: [rolePermissions.roleId],
    references: [roles.id]
  }),
  permission: one(permissions, {
    fields: [rolePermissions.permissionId],
    references: [permissions.id]
  })
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  notificationType: one(notificationTypes, {
    fields: [notifications.notificationTypeId],
    references: [notificationTypes.id]
  }),
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id]
  })
}));

export const notificationTypesRelations = relations(notificationTypes, ({ many }) => ({
  notifications: many(notifications)
}));

// Cache Metadata
export const cacheMetadata = pgTable('cache_metadata', {
  id: text('id').primaryKey(),
  lastUpdated: timestamp('last_updated', { withTimezone: true }).notNull(),
  etag: text('etag'),
  data: jsonb('data'),
  expiresAt: timestamp('expires_at', { withTimezone: true })
});

// User Preferences
export const userPreferences = pgTable('user_preferences', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull().unique(),
  theme: text('theme').default('light'),
  notifications: boolean('notifications').default(true),
  dashboardLayout: jsonb('dashboard_layout'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
});

// Migrations Table
export const pgliteMigrations = pgTable('pglite_migrations', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
  version: text('version').notNull(),
  appliedAt: timestamp('applied_at', { withTimezone: true }).defaultNow().notNull()
});

// Schema Metadata
export const schemaMetadata = pgTable('schema_metadata', {
  id: text('id').primaryKey(),
  version: text('version').notNull(),
  lastUpdated: timestamp('last_updated', { withTimezone: true }).defaultNow().notNull()
});

// ZOD Schemas for validation
export const insertUserDataSchema = createInsertSchema(userData);
export const selectUserDataSchema = createSelectSchema(userData);

export const insertNavigationSchema = createInsertSchema(navigation);
export const selectNavigationSchema = createSelectSchema(navigation);

export const insertNavigationItemsSchema = createInsertSchema(navigationItems);
export const selectNavigationItemsSchema = createSelectSchema(navigationItems);

export const insertOrganizationTypesSchema = createInsertSchema(organizationTypes);
export const selectOrganizationTypesSchema = createSelectSchema(organizationTypes);

export const insertOrganizationsSchema = createInsertSchema(organizations);
export const selectOrganizationsSchema = createSelectSchema(organizations);

export const insertProductTypesSchema = createInsertSchema(productTypes);
export const selectProductTypesSchema = createSelectSchema(productTypes);

export const insertProductsSchema = createInsertSchema(products);
export const selectProductsSchema = createSelectSchema(products);

export const insertStationsSchema = createInsertSchema(stations);
export const selectStationsSchema = createSelectSchema(stations);

export const insertDeliveryLocationsSchema = createInsertSchema(deliveryLocations);
export const selectDeliveryLocationsSchema = createSelectSchema(deliveryLocations);

export const insertProvidersSchema = createInsertSchema(providers);
export const selectProvidersSchema = createSelectSchema(providers);

export const insertCacheMetadataSchema = createInsertSchema(cacheMetadata);
export const selectCacheMetadataSchema = createSelectSchema(cacheMetadata);

export const insertUserPreferencesSchema = createInsertSchema(userPreferences);
export const selectUserPreferencesSchema = createSelectSchema(userPreferences);

export const insertUsersSchema = createInsertSchema(users);
export const selectUsersSchema = createSelectSchema(users);

export const insertRolesSchema = createInsertSchema(roles);
export const selectRolesSchema = createSelectSchema(roles);

export const insertPermissionsSchema = createInsertSchema(permissions);
export const selectPermissionsSchema = createSelectSchema(permissions);

export const insertUserRolesSchema = createInsertSchema(userRoles);
export const selectUserRolesSchema = createSelectSchema(userRoles);

export const insertUserPermissionsSchema = createInsertSchema(userPermissions);
export const selectUserPermissionsSchema = createSelectSchema(userPermissions);

export const insertRolePermissionsSchema = createInsertSchema(rolePermissions);
export const selectRolePermissionsSchema = createSelectSchema(rolePermissions);

export const insertNotificationTypesSchema = createInsertSchema(notificationTypes);
export const selectNotificationTypesSchema = createSelectSchema(notificationTypes);

export const insertNotificationsSchema = createInsertSchema(notifications);
export const selectNotificationsSchema = createSelectSchema(notifications);

// Type declarations for TypeScript
export type Navigation = z.infer<typeof selectNavigationSchema>;
export type NavigationItem = z.infer<typeof selectNavigationItemsSchema>;
export type OrganizationType = z.infer<typeof selectOrganizationTypesSchema>;
export type Organization = z.infer<typeof selectOrganizationsSchema>;
export type ProductType = z.infer<typeof selectProductTypesSchema>;
export type Product = z.infer<typeof selectProductsSchema>;
export type Station = z.infer<typeof selectStationsSchema>;
export type DeliveryLocation = z.infer<typeof selectDeliveryLocationsSchema>;
export type Provider = z.infer<typeof selectProvidersSchema>;
export type CacheMetadata = z.infer<typeof selectCacheMetadataSchema>;
export type UserPreference = z.infer<typeof selectUserPreferencesSchema>;
export type User = z.infer<typeof selectUsersSchema>;
export type Role = z.infer<typeof selectRolesSchema>;
export type Permission = z.infer<typeof selectPermissionsSchema>;
export type UserRole = z.infer<typeof selectUserRolesSchema>;
export type UserPermission = z.infer<typeof selectUserPermissionsSchema>;
export type RolePermission = z.infer<typeof selectRolePermissionsSchema>;
export type NotificationType = z.infer<typeof selectNotificationTypesSchema>;
export type Notification = z.infer<typeof selectNotificationsSchema>; 