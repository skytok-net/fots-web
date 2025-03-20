// ~/components/admin/navigation/navigation-provider.tsx
import React, { createContext, useContext, useEffect } from 'react';
import { useNavigation } from '~/hooks/use-navigation';

type NavigationContextType = {
  items: NavigationItem[];
  flatItems: Record<string, NavigationItem>;
  slugToIdMap: Record<string, string>;
  activeItemId: string | null;
  activeSlug: string | null;
  activeItem: NavigationItem | null;
  activeAncestors: string[];
  isLoading: boolean;
  error: Error | null;
  initialized: boolean;
  setActiveItemId: (id: string) => void;
  setActiveBySlug: (slug: string) => void;
};

type NavigationItem = {
  id: string;
  name: string;
  iconName?: string | null;
  path: string;
  index: number;
  parentId?: string | null;
  roles?: string[] | null;
  data?: Record<string, any> | null;
  slug: string;
  navigationId: string;
  children?: NavigationItem[];
};

const NavigationContext = createContext<NavigationContextType | null>(null);

export function useNavigationContext() {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigationContext must be used within a NavigationProvider');
  }
  return context;
}

type NavigationProviderProps = {
  navigationKey?: string;
  children: React.ReactNode;
};

export function NavigationProvider({ 
  navigationKey = 'admin', 
  children 
}: NavigationProviderProps) {
  const navigation = useNavigation(navigationKey);
  
  // Wait for navigation to be initialized before rendering children
  if (!navigation.initialized && navigation.isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Loading navigation...</p>
        </div>
      </div>
    );
  }
  
  return (
    <NavigationContext.Provider value={navigation}>
      {children}
    </NavigationContext.Provider>
  );
}
