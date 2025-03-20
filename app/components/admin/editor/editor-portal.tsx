// ~/components/admin/editor/editor-portal.tsx
import React from 'react';
import { useEditor } from './editor-context';
import { 
  Sheet, 
  SheetContent
} from '~/components/ui/sheet';
import {
  Dialog,
  DialogContent
} from '~/components/ui/dialog';

// Registry of editor components by entity type
const ENTITY_EDITORS: Record<string, React.ComponentType<any>> = {
  // Will be populated with lazy-loaded components
};

export function EditorPortal() {
  const { isOpen, type, entityType, mode, closeEditor } = useEditor();
  
  // No editor component registered for this entity type
  if (!entityType || !ENTITY_EDITORS[entityType]) {
    return null;
  }
  
  const EditorComponent = ENTITY_EDITORS[entityType];
  
  // Use Sheet for slideout editors
  if (type === 'slideout') {
    return (
      <Sheet open={isOpen} onOpenChange={closeEditor}>
        <SheetContent className="w-full sm:max-w-md md:max-w-lg">
          <EditorComponent mode={mode} onClose={closeEditor} />
        </SheetContent>
      </Sheet>
    );
  }
  
  // Use Dialog for popup editors
  return (
    <Dialog open={isOpen} onOpenChange={closeEditor}>
      <DialogContent className="sm:max-w-[425px] md:max-w-2xl">
        <EditorComponent mode={mode} onClose={closeEditor} />
      </DialogContent>
    </Dialog>
  );
}
