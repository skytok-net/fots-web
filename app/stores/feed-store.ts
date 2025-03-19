import { create } from 'zustand';
import { AtpAgent, AppBskyFeedDefs } from '@atproto/api';
import { useAuthStore } from './auth-store';

// Create a singleton AtpAgent instance outside the store
// This prevents repeated initialization
let feedAgentInstance: AtpAgent | null = null;
let subscriptionActive: boolean = false;
let pendingUpdates: AppBskyFeedDefs.FeedViewPost[] = [];
let updateTimeout: NodeJS.Timeout | null = null;

// Time in milliseconds between feed updates (2 minutes)
const UPDATE_INTERVAL = 2 * 60 * 1000;

/**
 * Initialize the feed ATP agent if it doesn't exist
 * This is separate from the user's agent and is used only for fetching the feed
 */
const getOrCreateFeedAgent = async (): Promise<AtpAgent> => {
  if (!feedAgentInstance) {
    feedAgentInstance = new AtpAgent({
      service: process.env.ATPROTO_SERVICE as string,
    });

    await feedAgentInstance.login({
      identifier: process.env.ATPROTO_FEED_HANDLE as string,
      password: process.env.ATPROTO_FEED_PASSWORD as string
    });
  }
  
  return feedAgentInstance;
};

/**
 * Get the user's ATP agent from the auth store
 * Returns null if the user is not authenticated
 */
const getUserAgent = (): AtpAgent | null => {
  const authStore = useAuthStore.getState();
  return authStore.isAuthenticated ? authStore.agent : null;
};

interface FeedState {
  posts: AppBskyFeedDefs.FeedViewPost[];
  loading: boolean;
  error: string | null;
  fetchPosts: () => Promise<void>;
  startSubscription: () => Promise<void>;
  stopSubscription: () => void;
  applyPendingUpdates: () => void;
  likePost: (uri: string, cid: string) => Promise<boolean>;
  repostPost: (uri: string, cid: string) => Promise<boolean>;
  replyToPost: (uri: string, cid: string, text: string) => Promise<boolean>;
}

export const useFeedStore = create<FeedState>((set, get) => ({
  posts: [],
  loading: false,
  error: null,
  
  fetchPosts: async () => {
    set({ loading: true });
    
    try {
      const agent = await getOrCreateFeedAgent();
      
      const response = await agent.getAuthorFeed({
        actor: process.env.ATPROTO_FEED_HANDLE as string,
        limit: 5,
      });
      
      set({ posts: response.data.feed, loading: false, error: null });
      
      // Start subscription if not already active
      if (!subscriptionActive) {
        get().startSubscription();
      }
    } catch (error) {
      console.error('Failed to fetch posts:', error);
      set({ error: 'Failed to fetch posts', loading: false });
    }
  },
  
  startSubscription: async () => {
    if (subscriptionActive) return;
    
    try {
      // Mark subscription as active
      subscriptionActive = true;
      
      console.log('Starting Bluesky feed subscription');
      
      // Set up the subscription using the Bluesky firehose/subscription API
      // This is a simplified implementation that would need to be replaced with
      // the actual subscription mechanism provided by the Bluesky API
      
      // For now, we'll use a WebSocket connection to the Bluesky firehose
      // In a real implementation, you would use the appropriate subscription API
      
      // Simulate receiving updates from the subscription
      // In a real implementation, this would be handled by the WebSocket connection
      const handleSubscriptionUpdate = (newPosts: AppBskyFeedDefs.FeedViewPost[]) => {
        if (!subscriptionActive) return;
        
        // Add new posts to pending updates
        pendingUpdates = [...pendingUpdates, ...newPosts];
        
        // Schedule an update if one isn't already scheduled
        if (!updateTimeout) {
          updateTimeout = setTimeout(() => {
            get().applyPendingUpdates();
            updateTimeout = null;
          }, UPDATE_INTERVAL);
        }
      };
      
      // In a real implementation, you would set up event listeners for the WebSocket connection
      // For example:
      // websocket.addEventListener('message', (event) => {
      //   const data = JSON.parse(event.data);
      //   if (data.type === 'post') {
      //     handleSubscriptionUpdate([data.post]);
      //   }
      // });
      
      // For now, we'll just log that the subscription is active
      console.log('Bluesky feed subscription active');
    } catch (error) {
      console.error('Failed to start subscription:', error);
      subscriptionActive = false;
    }
  },
  
  stopSubscription: () => {
    subscriptionActive = false;
    
    // Clear any pending update timeout
    if (updateTimeout) {
      clearTimeout(updateTimeout);
      updateTimeout = null;
    }
    
    // In a real implementation, you would close the WebSocket connection
    // For example:
    // if (websocket) {
    //   websocket.close();
    //   websocket = null;
    // }
    
    console.log('Stopped Bluesky feed subscription');
  },
  
  applyPendingUpdates: () => {
    if (pendingUpdates.length === 0) return;
    
    // Merge pending updates with current posts
    const currentPosts = get().posts;
    const updatedPosts = [...pendingUpdates, ...currentPosts];
    
    // Sort by indexedAt (newest first)
    updatedPosts.sort((a, b) => {
      return new Date(b.post.indexedAt).getTime() - new Date(a.post.indexedAt).getTime();
    });
    
    // Update the store
    set({ posts: updatedPosts });
    
    // Clear pending updates
    pendingUpdates = [];
    
    console.log(`Applied ${updatedPosts.length - currentPosts.length} pending updates to feed`);
  },
  
  likePost: async (uri: string, cid: string): Promise<boolean> => {
    const userAgent = getUserAgent();
    
    if (!userAgent) {
      console.error('Cannot like post: User not authenticated');
      return false;
    }
    
    try {
      // Create a like record
      const response = await userAgent.like(uri, cid);
      
      // Update the post in the store to reflect the like
      const posts = get().posts;
      const updatedPosts = posts.map(post => {
        if (post.post.uri === uri) {
          return {
            ...post,
            post: {
              ...post.post,
              likeCount: (post.post.likeCount || 0) + 1,
              viewer: {
                ...post.post.viewer,
                like: response.uri,
              }
            }
          };
        }
        return post;
      });
      
      set({ posts: updatedPosts });
      return true;
    } catch (error) {
      console.error('Failed to like post:', error);
      return false;
    }
  },
  
  repostPost: async (uri: string, cid: string): Promise<boolean> => {
    const userAgent = getUserAgent();
    
    if (!userAgent) {
      console.error('Cannot repost: User not authenticated');
      return false;
    }
    
    try {
      // Create a repost record
      const response = await userAgent.repost(uri, cid);
      
      // Update the post in the store to reflect the repost
      const posts = get().posts;
      const updatedPosts = posts.map(post => {
        if (post.post.uri === uri) {
          return {
            ...post,
            post: {
              ...post.post,
              repostCount: (post.post.repostCount || 0) + 1,
              viewer: {
                ...post.post.viewer,
                repost: response.uri,
              }
            }
          };
        }
        return post;
      });
      
      set({ posts: updatedPosts });
      return true;
    } catch (error) {
      console.error('Failed to repost:', error);
      return false;
    }
  },
  
  replyToPost: async (uri: string, cid: string, text: string): Promise<boolean> => {
    const userAgent = getUserAgent();
    
    if (!userAgent) {
      console.error('Cannot reply: User not authenticated');
      return false;
    }
    
    try {
      // Create a reply record
      const response = await userAgent.post({
        text,
        reply: {
          root: { uri, cid },
          parent: { uri, cid }
        }
      });
      
      // Update the post in the store to reflect the reply
      const posts = get().posts;
      const updatedPosts = posts.map(post => {
        if (post.post.uri === uri) {
          return {
            ...post,
            post: {
              ...post.post,
              replyCount: (post.post.replyCount || 0) + 1
            }
          };
        }
        return post;
      });
      
      set({ posts: updatedPosts });
      return true;
    } catch (error) {
      console.error('Failed to reply to post:', error);
      return false;
    }
  }
}));
