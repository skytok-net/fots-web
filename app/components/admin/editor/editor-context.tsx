// ~/components/admin/editor/editor-context.tsx
import React, { createContext, useContext, useState } from 'react';
import { EditorPortal } from './editor-portal';

type EditorMode = 'create' | 'edit' | 'view';
type EditorType = 'slideout' | 'popup';

type EditorContextState = {
  isOpen: boolean;
  mode: EditorMode;
  type: EditorType;
  entityType: string;
  entityId?: string;
  data?: Record<string, any>;
};

type EditorContextValue = EditorContextState & {
  openEditor: (config: Omit<EditorContextState, 'isOpen'>) => void;
  closeEditor: () => void;
};

const EditorContext = createContext<EditorContextValue | null>(null);

export function useEditor() {
  const context = useContext(EditorContext);
  if (!context) {
    throw new Error('useEditor must be used within an EditorProvider');
  }
  return context;
}

type EditorProviderProps = {
  children: React.ReactNode;
};

export function EditorProvider({ children }: EditorProviderProps) {
  const [state, setState] = useState<EditorContextState>({
    isOpen: false,
    mode: 'create',
    type: 'slideout',
    entityType: '',
  });

  const openEditor = (config: Omit<EditorContextState, 'isOpen'>) => {
    setState({ ...config, isOpen: true });
  };

  const closeEditor = () => {
    setState(prev => ({ ...prev, isOpen: false }));
  };

  return (
    <EditorContext.Provider 
      value={{ 
        ...state, 
        openEditor, 
        closeEditor 
      }}
    >
      {children}
      <EditorPortal />
    </EditorContext.Provider>
  );
}
