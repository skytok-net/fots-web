import { NotificationFragmentFragment } from '~/types/graphql';

/**
 * Notification object interface
 */
export interface Notification {
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

/**
 * Repository interface for notifications
 */
export interface NotificationRepositoryInterface {
  getNotifications(userId: string): Promise<NotificationFragmentFragment[]>;
  getUnreadNotifications(userId: string): Promise<NotificationFragmentFragment[]>;
  getUnreadCount(userId: string): Promise<number>;
  markAsRead(notificationId: string, userId: string): Promise<boolean>;
  markAllAsRead(userId: string): Promise<boolean>;
  deleteNotification(notificationId: string, userId: string): Promise<boolean>;
  syncNotificationsForUser(userId: string): Promise<boolean>;
  handleReadStatusUpdate(id: string, isRead: boolean): Promise<boolean>;
}

/**
 * Service interface for handling notification operations
 */
export interface NotificationServiceInterface {
  getNotifications(): Promise<NotificationFragmentFragment[]>;
  getUnreadNotifications(): Promise<NotificationFragmentFragment[]>;
  getUnreadCount(): Promise<number>;
  markAsRead(notificationId: string): Promise<boolean>;
  markAllAsRead(): Promise<boolean>;
  deleteNotification(notificationId: string): Promise<boolean>;
  syncNotifications(): Promise<boolean>;
  subscribeToNotifications(): Promise<boolean>;
  unsubscribeFromNotifications(): void;
  cleanup(): void;
}

/**
 * Auth state interface
 */
export interface AuthUser {
  id?: string;
  did?: string;
  handle?: string;
}

export interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
}

/**
 * Auth store interface
 */
export interface AuthStoreInterface {
  getAuthState(): AuthState;
} 