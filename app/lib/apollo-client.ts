import React from "react";
import { usePGliteStore } from "~/stores/pglite-store";
import { PGliteSyncImpl } from "./pglite-sync-impl";
import { graphql } from "./graphql-tag";

// Import Apollo Client components with index.js extension for better Vite compatibility
import { ApolloClient, InMemoryCache, ApolloLink } from "@apollo/client/core/index.js";
import { HttpLink } from "@apollo/client/link/http/index.js";
import { Observable } from "@apollo/client/utilities/index.js";
import { ApolloProvider, useQuery, useMutation, useLazyQuery, useApolloClient } from "@apollo/client/react/index.js";

// Define Operation type
type Operation = {
  query: any;
  variables?: Record<string, any>;
  operationName?: string;
  context?: Record<string, any>;
  extensions?: Record<string, any>;
};

// Re-export Apollo components for use throughout the app
export { 
  HttpLink, 
  ApolloClient, 
  InMemoryCache, 
  ApolloLink,
  ApolloProvider,
  useQuery,
  useMutation,
  useLazyQuery,
  useApolloClient,
  graphql
};

// Define a map of collection names to their corresponding GraphQL types
const COLLECTION_TO_TYPENAME_MAP: Record<string, string> = {
  'navigation': 'Navigation',
  'navigation_items': 'NavigationItem',
  'organization_types': 'OrganizationType',
  'organizations': 'Organization',
  'product_types': 'ProductType',
  'products': 'Product',
  'stations': 'Station',
  'delivery_locations': 'DeliveryLocation',
  'providers': 'Provider'
};

// Extract collection name from GraphQL operation
function extractCollectionName(operation: Operation): string | null {
  const operationDefinition = operation.query.definitions[0];
  
  if (
    operationDefinition.kind !== 'OperationDefinition' || 
    !operationDefinition.selectionSet || 
    !operationDefinition.selectionSet.selections || 
    !operationDefinition.selectionSet.selections.length
  ) {
    return null;
  }

  // Get the first selection (main query field)
  const mainSelection = operationDefinition.selectionSet.selections[0];
  
  if (mainSelection.kind !== 'Field' || !mainSelection.name) {
    return null;
  }
  
  // Extract collection name from the field name (remove "Collection" suffix)
  const fieldName = mainSelection.name.value;
  if (fieldName.endsWith('Collection')) {
    return fieldName.replace('Collection', '').toLowerCase();
  }
  
  return null;
}

// Ensure the collection is synced before querying
async function ensureCollectionSynced(collectionName: string, syncInstance: PGliteSyncImpl): Promise<void> {
  // Map collection name to sync method
  switch(collectionName) {
    case 'navigation':
      await syncInstance.syncNavigation();
      break;
    case 'organizationTypes':
    case 'organization_types':
      await syncInstance.syncOrganizationTypes();
      break;
    case 'organizations':
      await syncInstance.syncOrganizations();
      break;
    case 'productTypes':
    case 'product_types':
      await syncInstance.syncProductTypes();
      break;
    case 'products':
      await syncInstance.syncProducts();
      break;
    case 'stations':
      await syncInstance.syncStations();
      break;
    case 'deliveryLocations':
    case 'delivery_locations':
      await syncInstance.syncDeliveryLocations();
      break;
    case 'providers':
      await syncInstance.syncProviders();
      break;
  }
}

// Execute a local query against PGlite
async function executeLocalQuery(collectionName: string): Promise<unknown[]> {
  const store = usePGliteStore.getState();
  const { db } = store;
  
  if (!db) {
    return [];
  }

  // Dynamically import the tables we need
  const { 
    navigation, navigationItems, 
    organizationTypes, organizations,
    productTypes, products,
    stations, deliveryLocations, providers
  } = await import('~/schema/schema');
  
  // Query the appropriate table based on collection name
  switch(collectionName) {
    case 'navigation':
      return db.select().from(navigation);
    case 'navigationItems':
    case 'navigation_items':
      return db.select().from(navigationItems);
    case 'organizationTypes':
    case 'organization_types':
      return db.select().from(organizationTypes);
    case 'organizations':
      return db.select().from(organizations);
    case 'productTypes':
    case 'product_types':
      return db.select().from(productTypes);
    case 'products':
      return db.select().from(products);
    case 'stations':
      return db.select().from(stations);
    case 'deliveryLocations':
    case 'delivery_locations':
      return db.select().from(deliveryLocations);
    case 'providers':
      return db.select().from(providers);
    default:
      return [];
  }
}

// Convert database snake_case to GraphQL camelCase
function convertSnakeCaseToCamelCase(obj: Record<string, unknown>): Record<string, unknown> {
  if (!obj || typeof obj !== 'object') return obj;
  
  const result: Record<string, unknown> = {};
  
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      // Convert snake_case to camelCase
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      
      // Handle nested objects
      result[camelKey] = obj[key];
    }
  }
  
  return result;
}

// Format local database results to match GraphQL response format
function formatLocalResultAsGraphQL(collectionName: string, data: unknown[]): unknown {
  // Get the corresponding GraphQL typename
  const typeName = COLLECTION_TO_TYPENAME_MAP[collectionName] || 
                  COLLECTION_TO_TYPENAME_MAP[collectionName.replace(/([A-Z])/g, '_$1').toLowerCase()];
  
  if (!typeName) {
    console.warn(`No typeName found for collection: ${collectionName}`);
    return null;
  }
  
  // Format the result to match GraphQL response structure
  return {
    data: {
      [`${collectionName}Collection`]: {
        __typename: `${typeName}Collection`,
        edges: data.map(item => ({
          __typename: 'CollectionEdge',
          node: { 
            __typename: typeName,
            ...convertSnakeCaseToCamelCase(item as Record<string, unknown>)
          }
        }))
      }
    }
  };
}

// Query local PGlite database based on operation
async function queryLocalDatabase(collectionName: string): Promise<unknown> {
  const store = usePGliteStore.getState();
  const { syncInstance } = store;

  if (!syncInstance) {
    return null;
  }

  try {
    // Ensure data is synced before querying
    await ensureCollectionSynced(collectionName, syncInstance);
    
    // Execute appropriate local query based on collection
    const result = await executeLocalQuery(collectionName);
    
    // Format the result to match GraphQL structure
    if (result) {
      return formatLocalResultAsGraphQL(collectionName, result);
    }
    
    return null;
  } catch (error) {
    console.error(`Error querying local database for ${collectionName}:`, error);
    return null;
  }
}

// Sync network result to local database
async function syncResultToLocalDB(collectionName: string, result: Record<string, unknown>): Promise<void> {
  const store = usePGliteStore.getState();
  const { syncInstance } = store;
  
  if (!syncInstance || !result?.data) {
    return;
  }
  
  try {
    // Based on the collection, call the appropriate sync method
    switch(collectionName) {
      case 'navigation':
        await syncInstance.syncNavigation();
        break;
      case 'organizationTypes':
      case 'organization_types':
        await syncInstance.syncOrganizationTypes();
        break;
      case 'organizations':
        await syncInstance.syncOrganizations();
        break;
      case 'productTypes':
      case 'product_types':
        await syncInstance.syncProductTypes();
        break;
      case 'products':
        await syncInstance.syncProducts();
        break;
      case 'stations':
        await syncInstance.syncStations();
        break;
      case 'deliveryLocations':
      case 'delivery_locations':
        await syncInstance.syncDeliveryLocations();
        break;
      case 'providers':
        await syncInstance.syncProviders();
        break;
    }
  } catch (error) {
    console.error(`Error syncing result to local DB for ${collectionName}:`, error);
  }
}

// Create a PGlite link that attempts to resolve queries from local database first
const createPGliteLink = () => {
  return new ApolloLink((operation, forward) => {
    // Extract the collection name from the operation
    const collectionName = extractCollectionName(operation);
    
    if (!collectionName) {
      // If we can't determine the collection, pass through to network
      return forward(operation);
    }

    // Return an Observable to handle the query
    return new Observable(observer => {
      let isActive = true;
      let cleanup: (() => void) | undefined;
      
      const process = async () => {
        try {
          // Try to resolve from local database first
          const localResult = await queryLocalDatabase(collectionName);
          
          if (localResult && isActive) {
            observer.next(localResult);
            observer.complete();
            return;
          }
          
          // If not available locally, pass to next link in chain
          const subscription = forward(operation).subscribe({
            next: result => {
              if (isActive) {
                // Sync the network result to local database
                syncResultToLocalDB(collectionName, result as Record<string, unknown>);
                observer.next(result);
              }
            },
            error: err => {
              if (isActive) observer.error(err);
            },
            complete: () => {
              if (isActive) observer.complete();
            }
          });
          
          // Return a cleanup function
          return () => {
            isActive = false;
            if (subscription) subscription.unsubscribe();
          };
        } catch (error) {
          if (isActive) {
            // If local processing fails, try network
            console.error("Error in PGlite link:", error);
            const subscription = forward(operation).subscribe({
              next: result => {
                if (isActive) observer.next(result);
              },
              error: err => {
                if (isActive) observer.error(err);
              },
              complete: () => {
                if (isActive) observer.complete();
              }
            });
            
            return () => {
              isActive = false;
              if (subscription) subscription.unsubscribe();
            };
          }
        }
      };
      
      // Start processing
      process().then(cleanupFn => {
        cleanup = cleanupFn;
      });
      
      // Return unsubscribe function
      return () => {
        isActive = false;
        if (cleanup && typeof cleanup === 'function') {
          cleanup();
        }
      };
    });
  });
};

// Create Apollo client with our custom links
function makeClient() {
  // Create our PGlite link
  const pgliteLink = createPGliteLink();
  
  // Determine if we're in a browser environment
  const isBrowser = typeof window !== 'undefined';
  
  // Create links array starting with PGlite link
  const links = [pgliteLink];
  
  // Only add HTTP link in browser environment to avoid SSR issues
  if (isBrowser) {
    // Create HTTP link for Supabase GraphQL server
    const httpLink = new HttpLink({
      uri: `${process.env.SUPABASE_URL || 'https://ihgnfpdshxlylqiqcbav.supabase.co'}/graphql/v1`,
      headers: {
        apikey: process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImloZ25mcGRzaHhseWxxaXFjYmF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU0NzkwMDIsImV4cCI6MjA1MTA1NTAwMn0.c_wUchivUiPu4oOJQRfIS3xnGz3_Gl5brR6O6Lrbbk4',
        Authorization: `Bearer ${process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImloZ25mcGRzaHhseWxxaXFjYmF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU0NzkwMDIsImV4cCI6MjA1MTA1NTAwMn0.c_wUchivUiPu4oOJQRfIS3xnGz3_Gl5brR6O6Lrbbk4'}`
      }
    });
    
    // Add HTTP link to links array
    links.push(httpLink);
  }
  
  // Combine links
  const link = ApolloLink.from(links);
  
  // Create and configure the Apollo Client
  return new ApolloClient({
    ssrMode: !isBrowser, // Enable SSR mode when not in browser
    cache: new InMemoryCache({
      typePolicies: {
        Query: {
          fields: {
            // Add type policies as needed
          }
        }
      }
    }),
    defaultOptions: {
      watchQuery: {
        fetchPolicy: 'cache-and-network',
        errorPolicy: 'all'
      },
      query: {
        fetchPolicy: 'cache-first',
        errorPolicy: 'all'
      },
      mutate: {
        errorPolicy: 'all'
      }
    },
    link
  });
}

// Singleton instance of Apollo Client
let client: ReturnType<typeof makeClient> | null = null;

// Get or create Apollo Client
export function getClient() {
  // For SSR, always create a new client
  if (typeof window === 'undefined') return makeClient();
  
  // For client, use singleton pattern
  if (!client) client = makeClient();
  
  return client;
}

// Helper function for executing queries
export const query = async (options: Parameters<ReturnType<typeof makeClient>['query']>[0]) => {
  const client = getClient();
  return client.query(options);
};

// React component to preload the Apollo Client
export const PreloadQuery = (props: { children: React.ReactNode }) => {
  getClient(); // Ensure client is initialized
  return React.createElement(React.Fragment, null, props.children);
};
