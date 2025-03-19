import { userRepository } from '~/repositories/user';
import { supabase } from '~/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { UsersInsertInput, UsersUpdateInput, UserFragment } from '~/types/graphql';
import { useUserStore } from '~/stores/user-store';
import { useAuthStore } from '~/stores/auth-store';

/**
 * Service interface for user-related operations
 */
export interface UserServiceInterface {
  getCurrentUser(): Promise<UserFragment | null>;
  getUser(id: string): Promise<UserFragment | null>;
  getUsers(): Promise<UserFragment[]>;
  getUserByHandle(handle: string): Promise<UserFragment | null>;
  createUser(userInput: UsersInsertInput): Promise<UserFragment | Error>;
  updateUser(id: string, userInput: UsersUpdateInput): Promise<UserFragment | Error>;
  syncCurrentUser(): Promise<boolean>;
  syncUsers(): Promise<boolean>;
  subscribeToUserUpdates(): Promise<boolean>;
  unsubscribeFromUserUpdates(): void;
  cleanup(): void;
}

/**
 * Service for user operations with reactive state
 */
export class UserService implements UserServiceInterface {
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
   * Get the current authenticated user
   */
  async getCurrentUser(): Promise<UserFragment | null> {
    const store = useUserStore.getState();
    
    // If we already have the current user in the store, return it
    if (store.currentUser) {
      return store.currentUser;
    }
    
    const userId = this.getCurrentUserId();
    if (!userId) {
      return null;
    }
    
    store.setLoading(true);
    
    try {
      const user = await userRepository.getUser(userId);
      
      if (user) {
        store.setCurrentUser(user);
      }
      
      return user;
    } catch (error) {
      console.error('Error getting current user:', error);
      store.setError(error instanceof Error ? error : new Error('Failed to get current user'));
      return null;
    } finally {
      store.setLoading(false);
    }
  }
  
  /**
   * Get a user by ID
   */
  async getUser(id: string): Promise<UserFragment | null> {
    const store = useUserStore.getState();
    
    // Check if we have the user in the store
    const cachedUser = store.users.find(user => user.id === id);
    if (cachedUser) {
      return cachedUser;
    }
    
    store.setLoading(true);
    
    try {
      const user = await userRepository.getUser(id);
      
      if (user) {
        store.addUser(user);
      }
      
      return user;
    } catch (error) {
      console.error(`Error getting user ${id}:`, error);
      store.setError(error instanceof Error ? error : new Error(`Failed to get user ${id}`));
      return null;
    } finally {
      store.setLoading(false);
    }
  }
  
  /**
   * Get all users
   */
  async getUsers(): Promise<UserFragment[]> {
    const store = useUserStore.getState();
    
    // If we already have users in the store, return them
    if (store.users.length > 0) {
      return store.users;
    }
    
    store.setLoading(true);
    
    try {
      const users = await userRepository.getUsers();
      store.setUsers(users);
      return users;
    } catch (error) {
      console.error('Error getting users:', error);
      store.setError(error instanceof Error ? error : new Error('Failed to get users'));
      return [];
    } finally {
      store.setLoading(false);
    }
  }
  
  /**
   * Get a user by handle
   */
  async getUserByHandle(handle: string): Promise<UserFragment | null> {
    const store = useUserStore.getState();
    
    // Check if we have the user in the store
    const cachedUser = store.users.find(user => user.handle === handle);
    if (cachedUser) {
      return cachedUser;
    }
    
    store.setLoading(true);
    
    try {
      const user = await userRepository.getUserByHandle(handle);
      
      if (user) {
        store.addUser(user);
      }
      
      return user;
    } catch (error) {
      console.error(`Error getting user by handle ${handle}:`, error);
      store.setError(error instanceof Error ? error : new Error(`Failed to get user by handle ${handle}`));
      return null;
    } finally {
      store.setLoading(false);
    }
  }
  
  /**
   * Create a new user
   */
  async createUser(userInput: UsersInsertInput): Promise<UserFragment | Error> {
    const store = useUserStore.getState();
    store.setLoading(true);
    
    try {
      const result = await userRepository.createUser(userInput);
      
      if (!(result instanceof Error)) {
        store.addUser(result);
      }
      
      return result;
    } catch (error) {
      console.error('Error creating user:', error);
      const errorObj = error instanceof Error ? error : new Error('Failed to create user');
      store.setError(errorObj);
      return errorObj;
    } finally {
      store.setLoading(false);
    }
  }
  
  /**
   * Update a user
   */
  async updateUser(id: string, userInput: UsersUpdateInput): Promise<UserFragment | Error> {
    const store = useUserStore.getState();
    store.setLoading(true);
    
    try {
      const result = await userRepository.updateUser(id, userInput);
      
      if (!(result instanceof Error)) {
        store.updateUser(id, result);
      }
      
      return result;
    } catch (error) {
      console.error(`Error updating user ${id}:`, error);
      const errorObj = error instanceof Error ? error : new Error(`Failed to update user ${id}`);
      store.setError(errorObj);
      return errorObj;
    } finally {
      store.setLoading(false);
    }
  }
  
  /**
   * Sync the current user data
   */
  async syncCurrentUser(): Promise<boolean> {
    const store = useUserStore.getState();
    const userId = this.getCurrentUserId();
    
    if (!userId) {
      return false;
    }
    
    store.setLoading(true);
    
    try {
      const success = await userRepository.syncUser(userId);
      
      if (success) {
        const user = await userRepository.getUser(userId);
        if (user) {
          store.setCurrentUser(user);
        }
      }
      
      return success;
    } catch (error) {
      console.error('Error syncing current user:', error);
      store.setError(error instanceof Error ? error : new Error('Failed to sync current user'));
      return false;
    } finally {
      store.setLoading(false);
    }
  }
  
  /**
   * Sync all users
   */
  async syncUsers(): Promise<boolean> {
    const store = useUserStore.getState();
    store.setLoading(true);
    
    try {
      const success = await userRepository.syncUsers();
      
      if (success) {
        const users = await userRepository.getUsers();
        store.setUsers(users);
        
        // Update current user if it exists
        const userId = this.getCurrentUserId();
        if (userId) {
          const currentUser = users.find(user => user.id === userId);
          if (currentUser) {
            store.setCurrentUser(currentUser);
          }
        }
      }
      
      return success;
    } catch (error) {
      console.error('Error syncing users:', error);
      store.setError(error instanceof Error ? error : new Error('Failed to sync users'));
      return false;
    } finally {
      store.setLoading(false);
    }
  }
  
  /**
   * Subscribe to user updates
   */
  async subscribeToUserUpdates(): Promise<boolean> {
    const store = useUserStore.getState();
    
    try {
      // Subscribe to updates for all users
      if (!this.channels.has('users')) {
        const channel = supabase
          .channel('users-realtime')
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'users'
          }, async (payload) => {
            console.log('User change detected:', payload);
            
            if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
              // Get the full user data
              if (payload.new && payload.new.id) {
                const userId = payload.new.id;
                const user = await userRepository.syncUser(userId);
                
                if (user) {
                  // If this is the current user, update current user as well
                  const currentUserId = this.getCurrentUserId();
                  if (currentUserId === userId) {
                    const currentUser = await userRepository.getUser(userId);
                    if (currentUser) {
                      store.setCurrentUser(currentUser);
                    }
                  }
                }
              }
            } else if (payload.eventType === 'DELETE') {
              if (payload.old && payload.old.id) {
                store.removeUser(payload.old.id);
              }
            }
          })
          .subscribe();
        
        this.channels.set('users', channel);
      }
      
      // If logged in, also subscribe to current user's updates specifically
      const userId = this.getCurrentUserId();
      if (userId && !this.channels.has(`user-${userId}`)) {
        const channel = supabase
          .channel(`user-${userId}`)
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'users',
            filter: `id=eq.${userId}`
          }, async () => {
            // Sync current user on any change
            await this.syncCurrentUser();
          })
          .subscribe();
        
        this.channels.set(`user-${userId}`, channel);
      }
      
      // Initial sync
      await this.syncUsers();
      
      return true;
    } catch (error) {
      console.error('Error subscribing to user updates:', error);
      store.setError(error instanceof Error ? error : new Error('Failed to subscribe to user updates'));
      return false;
    }
  }
  
  /**
   * Unsubscribe from user updates
   */
  unsubscribeFromUserUpdates(): void {
    for (const [key, channel] of this.channels.entries()) {
      supabase.removeChannel(channel);
      this.channels.delete(key);
    }
  }
  
  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.unsubscribeFromUserUpdates();
    useUserStore.getState().reset();
  }
}

// Export singleton instance
export const userService = new UserService(); 