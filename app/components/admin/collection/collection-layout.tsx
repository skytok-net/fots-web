// ~/components/admin/collection/collection-layout.tsx
import React, { useState } from 'react';
import { LayoutGrid, List, Table, Search, Plus } from 'lucide-react';
import { useEditor } from '~/hooks/use-editor';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '~/components/ui/tabs';
import { CollectionItem } from '~/components/admin/collection/grid-layout';

export type ViewType = 'grid' | 'list' | 'table';

export interface CollectionLayoutProps<T extends CollectionItem> {
  // Entity metadata
  entityType: string;
  title: string;
  
  // View options
  viewOptions?: ViewType[];
  defaultView?: ViewType;
  
  // Data state (provided by a hook)
  items: T[];
  isLoading: boolean;
  error: Error | null;
  
  // Search functionality
  searchQuery: string;
  onSearchChange: (query: string) => void;
  
  // Component references
  GridComponent: React.ComponentType<any>;
  ListComponent: React.ComponentType<any>;
  TableComponent: React.ComponentType<any>;
  
  // Editor config
  editorType?: 'slideout' | 'popup';
  
  // Optional handlers
  onCreateNew?: () => void;
}

export default function CollectionLayout<T extends CollectionItem>({
  entityType,
  title,
  viewOptions = ['grid', 'list', 'table'],
  defaultView = 'grid',
  items,
  isLoading,
  error,
  searchQuery,
  onSearchChange,
  GridComponent,
  ListComponent,
  TableComponent,
  editorType = 'slideout',
  onCreateNew
}: CollectionLayoutProps<T>) {
  const [viewType, setViewType] = useState<ViewType>(defaultView);
  const { openEditor } = useEditor();
  
  // Handle creating a new entity
  const handleCreate = () => {
    if (onCreateNew) {
      onCreateNew();
    } else {
      openEditor({
        mode: 'create',
        type: editorType,
        entityType
      });
    }
  };
  
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">{title}</h1>
        
        <div className="flex items-center gap-2">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-8"
            />
          </div>
          
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Add New
          </Button>
        </div>
      </div>
      
      {viewOptions.length > 1 && (
        <Tabs value={viewType} onValueChange={(v) => setViewType(v as ViewType)}>
          <TabsList>
            {viewOptions.includes('grid') && (
              <TabsTrigger value="grid">
                <LayoutGrid className="mr-2 h-4 w-4" />
                Grid
              </TabsTrigger>
            )}
            {viewOptions.includes('list') && (
              <TabsTrigger value="list">
                <List className="mr-2 h-4 w-4" />
                List
              </TabsTrigger>
            )}
            {viewOptions.includes('table') && (
              <TabsTrigger value="table">
                <Table className="mr-2 h-4 w-4" />
                Table
              </TabsTrigger>
            )}
          </TabsList>
        </Tabs>
      )}
      
      <div className="mt-4">
        {viewType === 'grid' && (
          <GridComponent 
            items={items}
            isLoading={isLoading}
            error={error}
            searchQuery={searchQuery}
          />
        )}
        {viewType === 'list' && (
          <ListComponent
            items={items}
            isLoading={isLoading}
            error={error}
            searchQuery={searchQuery}
          />
        )}
        {viewType === 'table' && (
          <TableComponent
            items={items}
            isLoading={isLoading}
            error={error}
            searchQuery={searchQuery}
          />
        )}
      </div>
    </div>
  );
}
