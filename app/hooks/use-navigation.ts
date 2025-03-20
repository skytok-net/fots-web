// ~/hooks/use-navigation.ts
import { useEffect } from 'react';
import { useParams } from '@remix-run/react';
import { useNavigationStore } from '~/stores/navigation-store';

export function useNavigation(navigationKey: string = 'admin') {
  const params = useParams();
  const { 
    items, 
    flatItems,
    slugToIdMap,
    activeItemId,
    activeSlug,
    isLoading, 
    error, 
    initialized,
    setActiveItemId,
    setActiveBySlug,
    fetchNavigationItems 
  } = useNavigationStore();

  // Load navigation items on mount
  useEffect(() => {
    if (!initialized && !isLoading) {
      fetchNavigationItems(navigationKey);
    }
  }, [initialized, isLoading, fetchNavigationItems, navigationKey]);

  // Set active item based on route params
  useEffect(() => {
    if (params.slug && slugToIdMap[params.slug]) {
      setActiveBySlug(params.slug);
    }
  }, [params.slug, slugToIdMap, setActiveBySlug]);

  // Get active item and its ancestors
  const activeItem = activeItemId ? flatItems[activeItemId] : null;
  
  const getAncestors = (item: typeof activeItem): string[] => {
    if (!item || !item.parentId) return [];
    const parent = flatItems[item.parentId];
    return [...getAncestors(parent), item.parentId];
  };
  
  const activeAncestors = activeItem ? getAncestors(activeItem) : [];

  return {
    items,
    flatItems,
    slugToIdMap,
    activeItemId,
    activeSlug,
    activeItem,
    activeAncestors,
    isLoading,
    error,
    initialized,
    setActiveItemId,
    setActiveBySlug
  };
}
