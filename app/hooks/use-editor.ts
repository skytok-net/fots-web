// ~/hooks/use-editor.ts
import { useCallback } from 'react';
import { useEditorStore } from '~/stores/editor-store';

export type EditorMode = 'create' | 'edit' | 'view';
export type EditorType = 'slideout' | 'popup';

export interface EditorConfig {
  mode: EditorMode;
  type: EditorType;
  entityType: string;
  entityId?: string;
  data?: Record<string, any>;
}

export function useEditor() {
  const { 
    isOpen, 
    mode, 
    type, 
    entityType, 
    entityId, 
    data,
    setIsOpen,
    setEditorState 
  } = useEditorStore();

  const openEditor = useCallback((config: EditorConfig) => {
    setEditorState({
      isOpen: true,
      mode: config.mode,
      type: config.type,
      entityType: config.entityType,
      entityId: config.entityId,
      data: config.data
    });
  }, [setEditorState]);

  const closeEditor = useCallback(() => {
    setIsOpen(false);
  }, [setIsOpen]);

  return {
    isOpen,
    mode,
    type,
    entityType,
    entityId,
    data,
    openEditor,
    closeEditor
  };
}
