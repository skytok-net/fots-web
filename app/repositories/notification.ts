import { eq, and } from 'drizzle-orm';
import { notifications } from '~/schema/schema';
import { getClient } from '~/lib/apollo-client';
import { graphql } from '~/lib/graphql-tag';
import { BaseRepository } from './base';
import { NotificationFragmentFragment, NotificationFragmentFragmentDoc } from '~/types/graphql';
import { NotificationRepositoryInterface } from '~/types/notifications';

// Local database model type (differs from GraphQL fragment)
interface LocalNotification {
  id: string;
  notificationTypeId: string;
  userId: string;
  title: string;
  subtitle: string;
  iconUrl: string | null;
  messageMarkdown: string | null;
  isRead: boolean;
  data: unknown;
  createdAt: Date;
  syncedAt?: Date;
}

// Helper function to convert local notifications to GraphQL fragment format
function toNotificationFragment(notification: LocalNotification): NotificationFragmentFragment {
  return {
    __typename: 'Notifications',
    id: notification.id,
    notificationTypeId: notification.notificationTypeId,
    title: notification.title,
    subtitle: notification.subtitle,
    createdAt: notification.createdAt.toISOString(),
    data: notification.data,
    isRead: notification.isRead,
    iconUrl: notification.iconUrl,
    messageMarkdown: notification.messageMarkdown,
    notificationType: {
      __typename: 'NotificationTypes',
      id: notification.notificationTypeId,
      name: '', // This would need to be populated from types table
      schema: null,
      createdAt: notification.createdAt.toISOString(),
      iconUrl: notification.iconUrl
    }
  };
}

/**
 * Repository for handling notification operations
 */
export class NotificationRepository extends BaseRepository implements NotificationRepositoryInterface {
  private client = getClient();

  /**
   * Get all notifications for the current user
   */
  async getNotifications(userId: string): Promise<NotificationFragmentFragment[]> {
    try {
      const localNotifications = await this.db!
        .select()
        .from(notifications)
        .where(eq(notifications.userId, userId));
      
      return localNotifications.map(toNotificationFragment);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return [];
    }
  }

  /**
   * Get unread notifications for the current user
   */
  async getUnreadNotifications(userId: string): Promise<NotificationFragmentFragment[]> {
    try {
      const localNotifications = await this.db!
        .select()
        .from(notifications)
        .where(and(
          eq(notifications.userId, userId),
          eq(notifications.isRead, false)
        ));
      
      return localNotifications.map(toNotificationFragment);
    } catch (error) {
      console.error('Error fetching unread notifications:', error);
      return [];
    }
  }

  /**
   * Get unread notification count for the current user
   */
  async getUnreadCount(userId: string): Promise<number> {
    try {
      const unreadNotifications = await this.db!
        .select()
        .from(notifications)
        .where(and(
          eq(notifications.userId, userId),
          eq(notifications.isRead, false)
        ));
      
      return unreadNotifications.length;
    } catch (error) {
      console.error('Error getting unread notification count:', error);
      return 0;
    }
  }

  /**
   * Mark a notification as read
   */
  async markAsRead(notificationId: string, userId: string): Promise<boolean> {
    try {
      // Get PGlite client from underlying pglite instance for transaction support
      const pgliteClient = this.db!.$client;
      
      // Start transaction
      await pgliteClient.exec('BEGIN');

      try {
        // First check if the notification belongs to the current user
        const notificationResults = await this.db!
          .select()
          .from(notifications)
          .where(eq(notifications.id, notificationId));
        
        if (notificationResults.length === 0) {
          throw new Error('Notification not found');
        }
        
        const notification = notificationResults[0];
        
        // Verify ownership
        if (notification.userId !== userId) {
          throw new Error('Cannot mark notification as read - not owned by current user');
        }
        
        // Update locally
        await this.db!
          .update(notifications)
          .set({ 
            isRead: true,
            syncedAt: new Date()
          })
          .where(eq(notifications.id, notificationId));
          
        // Update on backend
        await this.client.mutate({
          mutation: graphql`
            mutation UpdateNotification($id: UUID!, $input: NotificationsUpdateInput!) {
              updateNotificationsCollection(set: $input, filter: {id: {eq: $id}}) {
                records {
                  id
                  isRead
                }
              }
            }
          `,
          variables: {
            id: notificationId,
            input: {
              isRead: true
            }
          }
        });
        
        await pgliteClient.exec('COMMIT');
        console.log(`Marked notification ${notificationId} as read`);
        return true;
      } catch (error) {
        await pgliteClient.exec('ROLLBACK');
        throw error;
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return false;
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string): Promise<boolean> {
    try {
      // Get PGlite client from underlying pglite instance for transaction support
      const pgliteClient = this.db!.$client;
      
      // Start transaction
      await pgliteClient.exec('BEGIN');

      try {
        // Update locally
        await this.db!
          .update(notifications)
          .set({ 
            isRead: true,
            syncedAt: new Date()
          })
          .where(and(
            eq(notifications.userId, userId),
            eq(notifications.isRead, false)
          ));
          
        // Update on backend
        await this.client.mutate({
          mutation: graphql`
            mutation UpdateAllNotifications($userId: UUID!, $input: NotificationsUpdateInput!) {
              updateNotificationsCollection(set: $input, filter: {userId: {eq: $userId}, isRead: {eq: false}}) {
                affectedCount
              }
            }
          `,
          variables: {
            userId,
            input: {
              isRead: true
            }
          }
        });
        
        await pgliteClient.exec('COMMIT');
        console.log(`Marked all notifications as read for user ${userId}`);
        return true;
      } catch (error) {
        await pgliteClient.exec('ROLLBACK');
        throw error;
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      return false;
    }
  }

  /**
   * Delete a notification
   */
  async deleteNotification(notificationId: string, userId: string): Promise<boolean> {
    try {
      // Get PGlite client from underlying pglite instance for transaction support
      const pgliteClient = this.db!.$client;
      
      // Start transaction
      await pgliteClient.exec('BEGIN');

      try {
        // First check if the notification belongs to the current user
        const notificationResults = await this.db!
          .select()
          .from(notifications)
          .where(eq(notifications.id, notificationId));
        
        if (notificationResults.length === 0) {
          throw new Error('Notification not found');
        }
        
        const notification = notificationResults[0];
        
        // Verify ownership
        if (notification.userId !== userId) {
          throw new Error('Cannot delete notification - not owned by current user');
        }
        
        // Delete locally
        await this.db!
          .delete(notifications)
          .where(eq(notifications.id, notificationId));
          
        // Delete on backend
        await this.client.mutate({
          mutation: graphql`
            mutation DeleteNotification($id: UUID!) {
              deleteFromNotificationsCollection(filter: {id: {eq: $id}}) {
                affectedCount
              }
            }
          `,
          variables: {
            id: notificationId
          }
        });
        
        await pgliteClient.exec('COMMIT');
        console.log(`Deleted notification ${notificationId}`);
        return true;
      } catch (error) {
        await pgliteClient.exec('ROLLBACK');
        throw error;
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
      return false;
    }
  }

  /**
   * Sync notifications from the server for a specific user
   */
  async syncNotificationsForUser(userId: string): Promise<boolean> {
    try {
      // Get PGlite client from underlying pglite instance for transaction support
      const pgliteClient = this.db!.$client;
      
      // Always filter to current user's notifications only
      const filter = { userId: { eq: userId } };
      
      // Fetch notifications for current user
      const result = await this.client.query({
        query: graphql`
          query Notifications($filter: NotificationsFilter) {
            notificationsCollection(filter: $filter, orderBy: [{createdAt: DescNullsLast}]) {
              edges {
                node {
                  ...Notification
                  notificationType {
                    id
                    iconUrl
                    name
                    schema
                    createdAt
                  }
                }
              }
            }
          }
          ${NotificationFragmentFragmentDoc}
        `,
        variables: { filter }
      });
      
      const items = result.data.notificationsCollection.edges.map((edge: { node: NotificationFragmentFragment }) => edge.node);
      
      // Begin transaction
      await pgliteClient.exec('BEGIN');
      
      try {
        // Only delete current user's notifications
        await this.db!.delete(notifications).where(eq(notifications.userId, userId));
        
        // Insert notifications using Drizzle
        if (items.length > 0) {
          const records = items.map((item: NotificationFragmentFragment) => ({
            id: item.id,
            notificationTypeId: item.notificationTypeId,
            userId: userId, // Ensure we use the passed userId
            title: item.title,
            subtitle: item.subtitle,
            iconUrl: item.iconUrl || null,
            messageMarkdown: item.messageMarkdown || null,
            isRead: item.isRead,
            data: item.data || null,
            createdAt: new Date(item.createdAt),
            syncedAt: new Date()
          }));
          
          await this.db!.insert(notifications).values(records);
        }
        
        // Commit transaction
        await pgliteClient.exec('COMMIT');
        console.log(`Notifications sync completed for user ${userId}`);
        return true;
      } catch (error) {
        // Rollback transaction on error
        await pgliteClient.exec('ROLLBACK');
        throw error;
      }
    } catch (error) {
      console.error('Error syncing notifications:', error);
      return false;
    }
  }

  /**
   * Handle notification read update
   */
  async handleReadStatusUpdate(id: string, isRead: boolean): Promise<boolean> {
    try {
      // Get PGlite client from underlying pglite instance for transaction support
      const pgliteClient = this.db!.$client;
      
      // Start a transaction
      await pgliteClient.exec('BEGIN');
      
      try {
        // Just update the read status field
        await this.db!
          .update(notifications)
          .set({ 
            isRead: isRead,
            syncedAt: new Date()
          })
          .where(eq(notifications.id, id));
        
        // Commit the transaction
        await pgliteClient.exec('COMMIT');
        console.log(`Updated notification ${id} read status to ${isRead}`);
        return true;
      } catch (error) {
        // Rollback on error
        await pgliteClient.exec('ROLLBACK');
        throw error;
      }
    } catch (error) {
      console.error(`Error updating notification read status:`, error);
      return false;
    }
  }
}

// Export singleton instance
export const notificationRepository = new NotificationRepository(); 