// ~/stores/navigation-store.ts
import { create } from 'zustand';
import { getClient } from '~/lib/apollo-client';
import { graphql } from '~/lib/apollo-client';

const GET_NAVIGATION_ITEMS = graphql`
  query GetNavigationItems($key: String!) {
    navigationCollection(filter: { key: { eq: $key } }) {
      edges {
        node {
          id
          name
          key
          navigationItemsCollection {
            edges {
              node {
                id
                name
                iconName
                path
                index
                parentId
                roles
                data
                slug
                navigationId
              }
            }
          }
        }
      }
    }
  }
`;

export type NavigationItem = {
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

type NavigationState = {
  items: NavigationItem[];
  flatItems: Record<string, NavigationItem>;
  slugToIdMap: Record<string, string>;
  activeItemId: string | null;
  activeSlug: string | null;
  isLoading: boolean;
  error: Error | null;
  initialized: boolean;
  setActiveItemId: (id: string) => void;
  setActiveBySlug: (slug: string) => void;
  fetchNavigationItems: (key: string) => Promise<void>;
};

export const useNavigationStore = create<NavigationState>((set, get) => ({
  items: [],
  flatItems: {},
  slugToIdMap: {},
  activeItemId: null,
  activeSlug: null,
  isLoading: false,
  error: null,
  initialized: false,
  
  setActiveItemId: (id) => {
    const item = get().flatItems[id];
    set({ 
      activeItemId: id,
      activeSlug: item?.slug || null
    });
  },
  
  setActiveBySlug: (slug) => {
    const id = get().slugToIdMap[slug];
    if (id) {
      set({ activeItemId: id, activeSlug: slug });
    }
  },
  
  fetchNavigationItems: async (key) => {
    if (get().isLoading) return;
    
    set({ isLoading: true, error: null });
    
    try {
      const client = getClient();
      const { data } = await client.query({
        query: GET_NAVIGATION_ITEMS,
        variables: { key }
      });
      
      const navigationData = data.navigationCollection.edges[0]?.node;
      if (!navigationData) {
        throw new Error(`Navigation with key "${key}" not found`);
      }
      
      const rawItems = navigationData.navigationItemsCollection.edges.map(
        (edge: any) => edge.node
      );
      
      // Build flat map and slug-to-id map
      const flatItems: Record<string, NavigationItem> = {};
      const slugToIdMap: Record<string, string> = {};
      
      rawItems.forEach((item: NavigationItem) => {
        flatItems[item.id] = { ...item, children: [] };
        slugToIdMap[item.slug] = item.id;
      });
      
      // Build tree structure
      const rootItems: NavigationItem[] = [];
      
      Object.values(flatItems).forEach(item => {
        if (item.parentId && flatItems[item.parentId]) {
          if (!flatItems[item.parentId].children) {
            flatItems[item.parentId].children = [];
          }
          flatItems[item.parentId].children!.push(item);
        } else if (!item.parentId) {
          rootItems.push(item);
        }
      });
      
      // Sort items by index
      const sortByIndex = (items: NavigationItem[]) => {
        items.sort((a, b) => a.index - b.index);
        items.forEach(item => {
          if (item.children && item.children.length > 0) {
            sortByIndex(item.children);
          }
        });
        return items;
      };
      
      set({ 
        items: sortByIndex(rootItems), 
        flatItems,
        slugToIdMap,
        isLoading: false,
        initialized: true
      });
    } catch (error) {
      console.error("Failed to fetch navigation items:", error);
      set({ 
        error: error instanceof Error ? error : new Error(String(error)),
        isLoading: false
      });
    }
  }
}));
