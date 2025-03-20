// ~/lib/component-registry.ts
import React, { lazy } from 'react';

// Define component types
type ComponentType = 
  | 'collection'
  | 'editor'
  | 'detail'
  | 'custom';

// Component registry for dynamic loading
const componentRegistry: Record<string, Record<string, React.ComponentType<any>>> = {
  collection: {},
  editor: {},
  detail: {},
  custom: {}
};

// Register a component
export function registerComponent(
  type: ComponentType,
  key: string,
  component: React.ComponentType<any>
) {
  if (!componentRegistry[type]) {
    componentRegistry[type] = {};
  }
  
  componentRegistry[type][key] = component;
}

// Get a component
export function getComponent(type: ComponentType, key: string) {
  if (!componentRegistry[type] || !componentRegistry[type][key]) {
    return null;
  }
  
  return componentRegistry[type][key];
}

// Initialize with standard components
export function initializeRegistry() {
  // Register standard collection components
  registerComponent('collection', 'default', lazy(() => import('~/components/admin/collection/collection-layout')));
  
  // Register entity-specific components
  registerComponent('collection', 'products', lazy(() => import('~/components/admin/entities/products/products-collection')));
  registerComponent('collection', 'orders', lazy(() => import('~/components/admin/entities/orders/orders-collection')));
  registerComponent('collection', 'providers', lazy(() => import('~/components/admin/entities/providers/providers-collection')));
  
  // Register editor components
  registerComponent('editor', 'products', lazy(() => import('~/components/admin/entities/products/product-editor')));
  registerComponent('editor', 'orders', lazy(() => import('~/components/admin/entities/orders/order-editor')));
  registerComponent('editor', 'providers', lazy(() => import('~/components/admin/entities/providers/provider-editor')));
}
