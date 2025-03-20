// ~/components/admin/navigation/navigation-tree.tsx
import React from 'react';
import { useNavigationContext } from './navigation-provider';
import { NavigationItem } from './navigation-item';
import { 
  SidebarMenu,
  SidebarMenuSkeleton
} from '~/components/ui/sidebar';

export function NavigationTree() {
  const { items, isLoading, error } = useNavigationContext();
  
  if (isLoading) {
    return (
      <SidebarMenu>
        {Array.from({ length: 5 }).map((_, i) => (
          <SidebarMenuSkeleton key={i} showIcon />
        ))}
      </SidebarMenu>
    );
  }
  
  if (error) {
    return (
      <div className="p-2 text-sm text-destructive">
        Failed to load navigation: {error.message}
      </div>
    );
  }
  
  return (
    <SidebarMenu>
      {items.map(item => (
        <NavigationItem key={item.id} item={item} />
      ))}
    </SidebarMenu>
  );
}
