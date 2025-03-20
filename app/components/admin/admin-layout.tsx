// ~/components/admin/admin-layout.tsx
import React from 'react';
import { Outlet } from '@remix-run/react';
import { NavigationProvider } from './navigation/navigation-provider';
import { AdminHeader } from './admin-header';
import { NavigationTree } from './navigation/navigation-tree';
import { EditorProvider } from './editor/editor-context';
import { 
  SidebarProvider, 
  Sidebar, 
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarInset
} from '~/components/ui/sidebar';

interface AdminLayoutProps {
  children?: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <NavigationProvider navigationKey="admin">
      <EditorProvider>
        <SidebarProvider defaultOpen={true}>
          <Sidebar>
            <SidebarHeader>
              <div className="flex items-center gap-2 px-2">
                <img 
                  src="/logo.svg" 
                  alt="Logo" 
                  className="h-8 w-8" 
                />
                <span className="text-lg font-bold">Admin</span>
              </div>
            </SidebarHeader>
            <SidebarContent>
              <NavigationTree />
            </SidebarContent>
            <SidebarFooter>
              {/* Footer content */}
            </SidebarFooter>
          </Sidebar>
          
          <SidebarInset>
            <AdminHeader />
            <div className="p-4">
              {children || <Outlet />}
            </div>
          </SidebarInset>
        </SidebarProvider>
      </EditorProvider>
    </NavigationProvider>
  );
}
