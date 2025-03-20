// ~/stores/editor-store.ts
import { create } from 'zustand';

export type EditorMode = 'create' | 'edit' | 'view';
export type EditorType = 'slideout' | 'popup';

interface EditorState {
  isOpen: boolean;
  mode: EditorMode;
  type: EditorType;
  entityType: string;
  entityId?: string;
  data?: Record<string, any>;
  setIsOpen: (isOpen: boolean) => void;
  setEditorState: (state: Partial<Omit<EditorState, 'setIsOpen' | 'setEditorState'>>) => void;
  reset: () => void;
}

const initialState = {
  isOpen: false,
  mode: 'create' as EditorMode,
  type: 'slideout' as EditorType,
  entityType: '',
  entityId: undefined,
  data: undefined,
};

export const useEditorStore = create<EditorState>((set) => ({
  ...initialState,
  
  setIsOpen: (isOpen: boolean) => set({ isOpen }),
  
  setEditorState: (state) => set((current) => ({
    ...current,
    ...state,
  })),
  
  reset: () => set(initialState),
}));
