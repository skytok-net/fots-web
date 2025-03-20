// ~/components/admin/navigation/navigation-item.tsx
import React from 'react';
import { Link } from '@remix-run/react';
import * as LucideIcons from 'lucide-react';
import { useNavigationContext } from '~/components/admin/navigation/navigation-provider';
import type { NavigationItem as NavItemType } from '~/stores/navigation-store';
import { 
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton
} from '~/components/ui/sidebar';

type NavigationItemProps = {
  item: NavItemType;
};

export function NavigationItem({ item }: NavigationItemProps) {
  const { activeItemId, activeAncestors } = useNavigationContext();
  
  const isActive = activeItemId === item.id;
  const isExpanded = activeAncestors.includes(item.id);
  const hasChildren = item.children && item.children.length > 0;
  
  // Get Lucide icon component dynamically
  const IconComponent = item.iconName 
    ? (LucideIcons as Record<string, any>)[item.iconName] 
    : undefined;
  
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={isActive}
        tooltip={item.name}
      >
        <Link to={`/admin/${item.slug}`}>
          {IconComponent && <IconComponent className="h-4 w-4" />}
          <span>{item.name}</span>
        </Link>
      </SidebarMenuButton>
      
      {hasChildren && isExpanded && (
        <SidebarMenuSub>
          {item.children!.map(child => (
            <SidebarMenuSubItem key={child.id}>
              <SidebarMenuSubButton
                asChild
                isActive={activeItemId === child.id}
              >
                <Link to={`/admin/${child.slug}`}>
                  {child.name}
                </Link>
              </SidebarMenuSubButton>
            </SidebarMenuSubItem>
          ))}
        </SidebarMenuSub>
      )}
    </SidebarMenuItem>
  );
}
