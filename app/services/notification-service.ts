import { notificationRepository } from '~/repositories/notification';
import { supabase } from '~/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { NotificationServiceInterface } from '~/types/notifications';
import { NotificationFragmentFragment } from '../types/graphql';
import { useNotificationStore } from '~/stores/notification-store';
import { useAuthStore } from '~/stores/auth-store';

/**
 * Service for handling notification functionality and realtime updates
 */
export class NotificationService implements NotificationServiceInterface {
  private channels = new Map<string, RealtimeChannel>();
  
  /**
   * Get the current user ID from auth state
   */
  private getCurrentUserId(): string | null {
    const authState = useAuthStore.getState();
    // Access user ID through the nested 'user' property containing UserFragment
    return authState.user?.user?.id || null;
  }
  
  /**
   * Get all notifications for the current user
   */
  async getNotifications(): Promise<NotificationFragmentFragment[]> {
    const store = useNotificationStore.getState();
    store.setLoading(true);
    
    try {
      const userId = this.getCurrentUserId();
      if (!userId) {
        store.setNotifications([]);
        return [];
      }
      
      const notifications = await notificationRepository.getNotifications(userId);
      store.setNotifications(notifications);
      return notifications;
    } catch (error) {
      console.error('Error fetching notifications:', error);
      store.setError(error instanceof Error ? error.message : 'Failed to fetch notifications');
      return [];
    } finally {
      store.setLoading(false);
    }
  }
  
  /**
   * Get unread notifications for the current user
   */
  async getUnreadNotifications(): Promise<NotificationFragmentFragment[]> {
    const store = useNotificationStore.getState();
    store.setLoading(true);
    
    try {
      const userId = this.getCurrentUserId();
      if (!userId) {
        store.setNotifications([]);
        return [];
      }
      
      const notifications = await notificationRepository.getUnreadNotifications(userId);
      return notifications;
    } catch (error) {
      console.error('Error fetching unread notifications:', error);
      store.setError(error instanceof Error ? error.message : 'Failed to fetch unread notifications');
      return [];
    } finally {
      store.setLoading(false);
    }
  }
  
  /**
   * Get unread notification count for the current user
   */
  async getUnreadCount(): Promise<number> {
    const store = useNotificationStore.getState();
    
    try {
      const userId = this.getCurrentUserId();
      if (!userId) {
        store.setUnreadCount(0);
        return 0;
      }
      
      const count = await notificationRepository.getUnreadCount(userId);
      store.setUnreadCount(count);
      return count;
    } catch (error) {
      console.error('Error getting unread notification count:', error);
      store.setError(error instanceof Error ? error.message : 'Failed to get unread count');
      return 0;
    }
  }
  
  /**
   * Mark a notification as read
   */
  async markAsRead(notificationId: string): Promise<boolean> {
    const store = useNotificationStore.getState();
    
    try {
      const userId = this.getCurrentUserId();
      if (!userId) return false;
      
      const success = await notificationRepository.markAsRead(notificationId, userId);
      
      if (success) {
        store.markAsRead(notificationId);
      }
      
      return success;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      store.setError(error instanceof Error ? error.message : 'Failed to mark notification as read');
      return false;
    }
  }
  
  /**
   * Mark all notifications as read for current user
   */
  async markAllAsRead(): Promise<boolean> {
    const store = useNotificationStore.getState();
    
    try {
      const userId = this.getCurrentUserId();
      if (!userId) return false;
      
      const success = await notificationRepository.markAllAsRead(userId);
      
      if (success) {
        store.markAllAsRead();
      }
      
      return success;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      store.setError(error instanceof Error ? error.message : 'Failed to mark all notifications as read');
      return false;
    }
  }
  
  /**
   * Delete a notification
   */
  async deleteNotification(notificationId: string): Promise<boolean> {
    const store = useNotificationStore.getState();
    
    try {
      const userId = this.getCurrentUserId();
      if (!userId) return false;
      
      const success = await notificationRepository.deleteNotification(notificationId, userId);
      
      if (success) {
        store.removeNotification(notificationId);
      }
      
      return success;
    } catch (error) {
      console.error('Error deleting notification:', error);
      store.setError(error instanceof Error ? error.message : 'Failed to delete notification');
      return false;
    }
  }
  
  /**
   * Sync notifications for current user
   */
  async syncNotifications(): Promise<boolean> {
    const store = useNotificationStore.getState();
    store.setLoading(true);
    
    try {
      const userId = this.getCurrentUserId();
      if (!userId) return false;
      
      const success = await notificationRepository.syncNotificationsForUser(userId);
      
      // Refresh notification state after sync
      if (success) {
        const notifications = await notificationRepository.getNotifications(userId);
        store.setNotifications(notifications);
        
        const unreadCount = await notificationRepository.getUnreadCount(userId);
        store.setUnreadCount(unreadCount);
      }
      
      return success;
    } catch (error) {
      console.error('Error syncing notifications:', error);
      store.setError(error instanceof Error ? error.message : 'Failed to sync notifications');
      return false;
    } finally {
      store.setLoading(false);
    }
  }
  
  /**
   * Subscribe to realtime notifications for current user
   */
  async subscribeToNotifications(): Promise<boolean> {
    const store = useNotificationStore.getState();
    
    try {
      const userId = this.getCurrentUserId();
      if (!userId) return false;
      
      // If already subscribed, return early
      if (this.channels.has(userId)) {
        return true;
      }
      
      // Create a channel for this user's notifications
      const channel = supabase
        .channel(`notifications-${userId}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        }, async (payload) => {
          console.log('Notification change detected:', payload);
          
          if (payload.eventType === 'INSERT') {
            // Handle new notification
            if (payload.new) {
              // Get the full notification to ensure we have all fields
              const notificationId = payload.new.id;
              const notifications = await notificationRepository.getNotifications(userId);
              const newNotification = notifications.find(n => n.id === notificationId);
              
              if (newNotification) {
                store.addNotification(newNotification);
              }
            }
          } else if (payload.eventType === 'UPDATE') {
            // Handle notification update
            if (payload.new && payload.old) {
              if (payload.new.is_read !== payload.old.is_read) {
                // Just update read status
                await notificationRepository.handleReadStatusUpdate(
                  payload.new.id, 
                  payload.new.is_read
                );
                
                if (payload.new.is_read) {
                  store.markAsRead(payload.new.id);
                }
              } else {
                // Get the updated notification
                const notificationId = payload.new.id;
                const notifications = await notificationRepository.getNotifications(userId);
                const updatedNotification = notifications.find(n => n.id === notificationId);
                
                if (updatedNotification) {
                  // Remove old and add updated
                  store.removeNotification(notificationId);
                  store.addNotification(updatedNotification);
                }
              }
            }
          } else if (payload.eventType === 'DELETE') {
            // Handle notification deletion
            if (payload.old) {
              store.removeNotification(payload.old.id);
            }
          }
        })
        .subscribe();
      
      // Store the channel for later unsubscribe
      this.channels.set(userId, channel);
      
      // Initial sync with the store
      await this.syncNotifications();
      
      console.log(`Subscribed to notifications for user ${userId}`);
      return true;
    } catch (error) {
      console.error('Error subscribing to notifications:', error);
      store.setError(error instanceof Error ? error.message : 'Failed to subscribe to notifications');
      return false;
    }
  }
  
  /**
   * Unsubscribe from notifications
   */
  unsubscribeFromNotifications(): void {
    const userId = this.getCurrentUserId();
    if (!userId) return;
    
    const channel = this.channels.get(userId);
    if (channel) {
      supabase.removeChannel(channel);
      this.channels.delete(userId);
      console.log(`Unsubscribed from notifications for user ${userId}`);
    }
  }
  
  /**
   * Cleanup resources
   */
  cleanup(): void {
    // Unsubscribe from all channels
    for (const [userId, channel] of this.channels.entries()) {
      supabase.removeChannel(channel);
      console.log(`Cleaned up notification channel for user ${userId}`);
    }
    
    this.channels.clear();
    
    // Reset store state
    useNotificationStore.getState().reset();
  }
}

// Export singleton instance
export const notificationService = new NotificationService(); 