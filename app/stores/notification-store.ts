import { create } from 'zustand';
import { NotificationFragmentFragment } from '../types/graphql';

interface NotificationState {
  notifications: NotificationFragmentFragment[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  
  // Action setters
  setNotifications: (notifications: NotificationFragmentFragment[]) => void;
  setUnreadCount: (count: number) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Status updaters
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  addNotification: (notification: NotificationFragmentFragment) => void;
  removeNotification: (notificationId: string) => void;
  reset: () => void;
}

const initialState = {
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  error: null,
};

export const useNotificationStore = create<NotificationState>((set) => ({
  ...initialState,
  
  // Setters
  setNotifications: (notifications) => set({ notifications }),
  setUnreadCount: (unreadCount) => set({ unreadCount }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  
  // Status updaters
  markAsRead: (notificationId) => set((state) => ({
    notifications: state.notifications.map((notification) => 
      notification.id === notificationId 
        ? { ...notification, isRead: true } 
        : notification
    ),
    unreadCount: Math.max(0, state.unreadCount - 1)
  })),
  
  markAllAsRead: () => set((state) => ({
    notifications: state.notifications.map((notification) => ({ 
      ...notification, 
      isRead: true 
    })),
    unreadCount: 0
  })),
  
  addNotification: (notification) => set((state) => {
    // Don't add duplicates
    if (state.notifications.some((n) => n.id === notification.id)) {
      return state;
    }
    
    // Calculate new unread count
    const newUnreadCount = notification.isRead 
      ? state.unreadCount 
      : state.unreadCount + 1;
    
    return {
      notifications: [notification, ...state.notifications],
      unreadCount: newUnreadCount
    };
  }),
  
  removeNotification: (notificationId) => set((state) => {
    const notification = state.notifications.find((n) => n.id === notificationId);
    const unreadAdjustment = notification && !notification.isRead ? 1 : 0;
    
    return {
      notifications: state.notifications.filter((n) => n.id !== notificationId),
      unreadCount: Math.max(0, state.unreadCount - unreadAdjustment)
    };
  }),
  
  reset: () => set(initialState)
})); 