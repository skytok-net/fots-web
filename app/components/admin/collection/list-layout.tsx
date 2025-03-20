// ~/components/admin/collection/list-layout.tsx
import React from 'react';
import { Skeleton } from '~/components/ui/skeleton';
import { useEditor } from '~/hooks/use-editor';
import { cn } from '~/lib/utils';

// Generic type for collection items
export type CollectionItem = {
  id: string;
  [key: string]: any;
};

// Props for the list layout component
export interface ListLayoutProps<T extends CollectionItem> {
  // Data and loading state (provided by a hook)
  items: T[];
  isLoading: boolean;
  error: Error | null;
  
  // UI customization
  className?: string;
  searchQuery?: string;
  
  // Component to render each item
  ItemComponent: React.ComponentType<{
    item: T;
    onEdit: (item: T) => void;
    onView: (item: T) => void;
    onDelete?: (item: T) => void;
  }>;
  
  // Entity metadata
  entityType: string;
  editorType?: 'slideout' | 'popup';
  
  // Optional handlers for overriding default behavior
  onEdit?: (item: T) => void;
  onView?: (item: T) => void;
  onDelete?: (item: T) => void;
}

export default function ListLayout<T extends CollectionItem>({
  items,
  isLoading,
  error,
  className,
  searchQuery = '',
  ItemComponent,
  entityType,
  editorType = 'slideout',
  onEdit,
  onView,
  onDelete
}: ListLayoutProps<T>) {
  const { openEditor } = useEditor();

  // Handle loading state
  if (isLoading) {
    return (
      <div className={cn("flex flex-col gap-2", className)}>
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-md" />
        ))}
      </div>
    );
  }

  // Handle error state
  if (error) {
    return (
      <div className="rounded-md border border-destructive bg-destructive/10 p-4">
        <p className="text-destructive">Error loading data: {error.message}</p>
      </div>
    );
  }

  // Handle empty state
  if (items.length === 0) {
    return (
      <div className="flex h-[200px] flex-col items-center justify-center rounded-md border border-dashed p-8 text-center">
        <p className="text-sm text-muted-foreground">No items found</p>
        {searchQuery && (
          <p className="mt-1 text-xs text-muted-foreground">
            Try adjusting your search query
          </p>
        )}
      </div>
    );
  }

  // Default handlers that use the editor context
  const handleEdit = (item: T) => {
    if (onEdit) {
      onEdit(item);
    } else {
      openEditor({
        mode: 'edit',
        type: editorType,
        entityType,
        entityId: item.id,
        data: item
      });
    }
  };

  const handleView = (item: T) => {
    if (onView) {
      onView(item);
    } else {
      openEditor({
        mode: 'view',
        type: editorType,
        entityType,
        entityId: item.id,
        data: item
      });
    }
  };

  const handleDeleteItem = (item: T) => {
    if (onDelete) {
      onDelete(item);
    } else {
      // Default delete behavior could be implemented here
      // or left to be implemented by the consumer
    }
  };

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {items.map(item => (
        <ItemComponent
          key={item.id}
          item={item}
          onEdit={() => handleEdit(item)}
          onView={() => handleView(item)}
          onDelete={() => handleDeleteItem(item)}
        />
      ))}
    </div>
  );
}
