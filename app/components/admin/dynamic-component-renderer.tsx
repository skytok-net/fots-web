// ~/components/admin/dynamic-component-renderer.tsx
import React, { Suspense } from 'react';
import { useNavigationContext } from '~/components/admin/navigation/navigation-provider';
import { getComponent } from '~/lib/component-registry';
import { Skeleton } from '~/components/ui/skeleton';

type DynamicComponentRendererProps = {
  slug?: string;
};

export function DynamicComponentRenderer({ slug }: DynamicComponentRendererProps) {
  const { flatItems, slugToIdMap, activeItemId, activeSlug } = useNavigationContext();
  
  // Use provided slug or active slug from navigation context
  const itemSlug = slug || activeSlug;
  const itemId = itemSlug ? slugToIdMap[itemSlug] : activeItemId;
  
  if (!itemId || !flatItems[itemId]) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <p className="text-muted-foreground">Select an item from the sidebar</p>
      </div>
    );
  }
  
  const item = flatItems[itemId];
  
  // Determine component type from item data
  const componentType = item.data?.componentType || 'collection';
  const entityType = item.slug;
  
  // Try to get entity-specific component
  let Component = getComponent(componentType as any, entityType);
  
  // Fall back to default component for the type
  if (!Component) {
    Component = getComponent(componentType as any, 'default');
  }
  
  if (!Component) {
    return (
      <div className="rounded-md border border-destructive bg-destructive/10 p-4">
        <p className="text-destructive">
          No component found for type: {componentType} and entity: {entityType}
        </p>
      </div>
    );
  }
  
  return (
    <Suspense fallback={<Skeleton className="h-[400px] w-full" />}>
      <Component item={item} entityType={entityType} />
    </Suspense>
  );
}
