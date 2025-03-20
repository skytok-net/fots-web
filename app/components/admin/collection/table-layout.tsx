// ~/components/admin/collection/table-layout.tsx
import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table';
import { Skeleton } from '~/components/ui/skeleton';
import { useEditor } from '~/hooks/use-editor';
import { cn } from '~/lib/utils';

// Generic type for collection items
export type CollectionItem = {
  id: string;
  [key: string]: any;
};

// Column definition for table
export type TableColumn<T> = {
  header: string;
  accessorKey: keyof T | string;
  cell?: (item: T) => React.ReactNode;
  className?: string;
};

// Props for the table layout component
export interface TableLayoutProps<T extends CollectionItem> {
  // Data and loading state (provided by a hook)
  items: T[];
  isLoading: boolean;
  error: Error | null;
  
  // Column definitions
  columns: TableColumn<T>[];
  
  // UI customization
  className?: string;
  searchQuery?: string;
  
  // Entity metadata
  entityType: string;
  editorType?: 'slideout' | 'popup';
  
  // Row interaction
  onRowClick?: (item: T) => void;
  isRowClickable?: boolean;
  
  // Optional handlers for specific actions
  onEdit?: (item: T) => void;
  onView?: (item: T) => void;
  onDelete?: (item: T) => void;
}

export default function TableLayout<T extends CollectionItem>({
  items,
  columns,
  isLoading,
  error,
  className,
  searchQuery = '',
  entityType,
  editorType = 'slideout',
  onRowClick,
  isRowClickable = true,
  onEdit,
  onView,
  onDelete
}: TableLayoutProps<T>) {
  const { openEditor } = useEditor();

  // Handle loading state
  if (isLoading) {
    return (
      <div className={cn("w-full overflow-auto", className)}>
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column, i) => (
                <TableHead key={i} className={column.className}>
                  {column.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                {columns.map((column, j) => (
                  <TableCell key={j}>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
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

  // Default row click handler
  const handleRowClick = (item: T) => {
    if (onRowClick) {
      onRowClick(item);
    } else if (isRowClickable) {
      // Default behavior is to view the item
      openEditor({
        mode: 'view',
        type: editorType,
        entityType,
        entityId: item.id,
        data: item
      });
    }
  };

  // Helper to get cell value using accessorKey
  const getCellValue = (item: T, accessorKey: string) => {
    // Handle nested paths like "user.name"
    if (accessorKey.includes('.')) {
      return accessorKey.split('.').reduce((obj, key) => obj?.[key], item as any);
    }
    return item[accessorKey as keyof T];
  };

  return (
    <div className={cn("w-full overflow-auto", className)}>
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column, i) => (
              <TableHead key={i} className={column.className}>
                {column.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map(item => (
            <TableRow 
              key={item.id}
              onClick={() => handleRowClick(item)}
              className={isRowClickable ? "cursor-pointer hover:bg-muted" : undefined}
            >
              {columns.map((column, i) => (
                <TableCell key={i} className={column.className}>
                  {column.cell 
                    ? column.cell(item)
                    : getCellValue(item, column.accessorKey as string)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
