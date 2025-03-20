// ~/routes/admin.tsx
import { Outlet } from '@remix-run/react';
import { AdminLayout } from '~/components/admin/admin-layout';
import { NavigationProvider } from '~/components/admin/navigation/navigation-provider';
import { EditorProvider } from '~/components/admin/editor/editor-context';

export default function AdminRoute() {
  return (
    <NavigationProvider navigationKey="admin">
      <EditorProvider>
        <AdminLayout>
          <Outlet />
        </AdminLayout>
      </EditorProvider>
    </NavigationProvider>
  );
}
