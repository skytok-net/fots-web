import { create } from 'zustand';
import { AtpAgent, AppBskyFeedDefs } from '@atproto/api';
import { useAuthStore } from './auth-store';

// Create a singleton AtpAgent instance outside the store
// This prevents repeated initialization
let feedAgentInstance: AtpAgent | null = null;
let subscriptionInstance: any = null; // Will hold the subscription reference
let isInitializing: boolean = false;
let pendingUpdates: AppBskyFeedDefs.FeedViewPost[] = [];
let updateTimeout: NodeJS.Timeout | null = null;
let retryCount: number = 0;
const MAX_RETRIES = 3;

// Time in milliseconds between feed updates (30 seconds)
const UPDATE_INTERVAL = 30 * 1000;

/**
 * Handle new posts from the subscription
 */
const handleSubscriptionUpdate = (newPosts: AppBskyFeedDefs.FeedViewPost[]) => {
  if (!newPosts || newPosts.length === 0) return;
  
  // Add new posts to pending updates
  pendingUpdates = [...pendingUpdates, ...newPosts];
  
  // Schedule an update if one isn't already scheduled
  if (!updateTimeout) {
    updateTimeout = setTimeout(() => {
      if (useFeedStore.getState().initialized) {
        useFeedStore.getState().applyPendingUpdates();
      }
      updateTimeout = null;
    }, 2000); // Apply updates after a short delay to batch multiple updates
  }
};

/**
 * Initialize the feed ATP agent if it doesn't exist
 * This is separate from the user's agent and is used only for fetching the feed
 * Returns null if initialization fails after MAX_RETRIES
 */
const initializeFeedAgent = async (): Promise<AtpAgent | null> => {
  if (feedAgentInstance) return feedAgentInstance;
  
  if (isInitializing) {
    // Wait for the ongoing initialization to complete
    let attempts = 0;
    while (isInitializing && attempts < 10) {
      await new Promise(resolve => setTimeout(resolve, 500));
      attempts++;
    }
    
    if (feedAgentInstance) return feedAgentInstance;
  }
  
  isInitializing = true;
  
  try {
    feedAgentInstance = new AtpAgent({
      service: process.env.ATPROTO_SERVICE as string,
    });

    await feedAgentInstance.login({
      identifier: process.env.ATPROTO_FEED_HANDLE as string,
      password: process.env.ATPROTO_FEED_PASSWORD as string
    });
    
    // Reset retry count on successful login
    retryCount = 0;
    return feedAgentInstance;
  } catch (error) {
    console.error('Failed to initialize feed agent:', error);
    feedAgentInstance = null;
    
    if (retryCount < MAX_RETRIES) {
      retryCount++;
      console.log(`Retrying feed agent initialization (${retryCount}/${MAX_RETRIES})...`);
      return initializeFeedAgent();
    }
    
    return null;
  } finally {
    isInitializing = false;
  }
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
  initialized: boolean;
  fetchPosts: () => Promise<void>;
  startSubscription: () => Promise<void>;
  stopSubscription: () => void;
  applyPendingUpdates: () => void;
  likePost: (uri: string, cid: string) => Promise<boolean>;
  repostPost: (uri: string, cid: string) => Promise<boolean>;
  replyToPost: (uri: string, cid: string, text: string) => Promise<boolean>;
  initialize: () => Promise<void>;
}

export const useFeedStore = create<FeedState>((set, get) => ({
  posts: [],
  loading: false,
  error: null,
  initialized: false,
  
  initialize: async () => {
    // Only initialize if not already initialized and not currently loading
    if (get().initialized || get().loading) return;
    
    set({ loading: true });
    
    try {
      const agent = await initializeFeedAgent();
      
      if (!agent) {
        set({ 
          error: 'Failed to initialize feed after multiple attempts', 
          loading: false 
        });
        return;
      }
      
      // Only fetch posts if we don't have any
      if (get().posts.length === 0) {
        const response = await agent.getAuthorFeed({
          actor: process.env.ATPROTO_FEED_HANDLE as string,
          limit: 10,
        });
        
        set({ 
          posts: response.data.feed, 
          loading: false, 
          error: null,
          initialized: true 
        });
      } else {
        set({ 
          loading: false, 
          error: null,
          initialized: true 
        });
      }
      
      // Start subscription
      await get().startSubscription();
    } catch (error) {
      console.error('Failed to initialize feed store:', error);
      set({ 
        error: 'Failed to initialize feed', 
        loading: false,
        initialized: false
      });
    }
  },
  
  fetchPosts: async () => {
    // Don't fetch if already loading or if we have posts and are initialized
    if (get().loading || (get().posts.length > 0 && get().initialized)) return;
    
    set({ loading: true });
    
    try {
      const agent = await initializeFeedAgent();
      
      if (!agent) {
        set({ 
          error: 'Failed to initialize feed agent', 
          loading: false 
        });
        return;
      }
      
      const response = await agent.getAuthorFeed({
        actor: process.env.ATPROTO_FEED_HANDLE as string,
        limit: 10,
      });
      
      set({ 
        posts: response.data.feed, 
        loading: false, 
        error: null,
        initialized: true
      });
    } catch (error) {
      console.error('Failed to fetch posts:', error);
      
      // Check if error is due to authentication
      if (error instanceof Error && 
          (error.message.includes('auth') || error.message.includes('token') || 
           error.message.includes('unauthorized') || error.message.includes('unauthenticated'))) {
        
        // Clear the agent instance to force re-login
        feedAgentInstance = null;
        
        // Try to initialize again
        await get().initialize();
      } else {
        set({ 
          error: 'Failed to fetch posts', 
          loading: false 
        });
      }
    }
  },
  
  startSubscription: async () => {
    // Don't start if already subscribed or not initialized
    if (subscriptionInstance || !get().initialized) return;
    
    try {
      const agent = await initializeFeedAgent();
      
      if (!agent) {
        set({ error: 'Failed to initialize feed agent for subscription' });
        return;
      }
      
      console.log('Starting Bluesky feed subscription');
      
      // In a real implementation, you would use the AT Protocol's subscription API
      // This is a placeholder for the actual subscription implementation
      // In a real app, you would connect to the AT Protocol's firehose or subscription endpoint
      // For example:
      // const firehoseUrl = 'wss://bsky.social/xrpc/com.atproto.sync.subscribeRepos';
      // const websocket = new WebSocket(firehoseUrl);
      // websocket.onmessage = (event) => {
      //   const data = JSON.parse(event.data);
      //   // Process the data and call handleSubscriptionUpdate
      // };
      
      // For now, simulate subscription with polling
      subscriptionInstance = setInterval(async () => {
        if (!get().initialized) return;
        
        try {
          const latestAgent = await initializeFeedAgent();
          if (!latestAgent) return;
          
          const response = await latestAgent.getAuthorFeed({
            actor: process.env.ATPROTO_FEED_HANDLE as string,
            limit: 5,
          });
          
          const newPosts = response.data.feed;
          
          // Process new posts
          handleSubscriptionUpdate(newPosts);
        } catch (error) {
          console.error('Error in subscription polling:', error);
          
          // Check if error is due to authentication
          if (error instanceof Error && 
              (error.message.includes('auth') || error.message.includes('token') || 
               error.message.includes('unauthorized') || error.message.includes('unauthenticated'))) {
            
            // Clear the agent instance to force re-login
            feedAgentInstance = null;
            
            // Try to initialize again
            await initializeFeedAgent();
          }
        }
      }, UPDATE_INTERVAL);
      
      console.log('Bluesky feed subscription active');
    } catch (error) {
      console.error('Failed to start subscription:', error);
      
      // Clean up any partial subscription
      if (subscriptionInstance) {
        if (typeof subscriptionInstance.close === 'function') {
          subscriptionInstance.close();
        } else if (typeof subscriptionInstance === 'number') {
          clearInterval(subscriptionInstance);
        }
        subscriptionInstance = null;
      }
      
      // Check if error is due to authentication
      if (error instanceof Error && 
          (error.message.includes('auth') || error.message.includes('token') || 
           error.message.includes('unauthorized') || error.message.includes('unauthenticated'))) {
        
        // Clear the agent instance to force re-login
        feedAgentInstance = null;
        
        // Try to initialize again
        await get().initialize();
      }
    }
  },
  
  stopSubscription: () => {
    if (!subscriptionInstance) return;
    
    // Clean up subscription based on its type
    if (typeof subscriptionInstance.close === 'function') {
      subscriptionInstance.close();
    } else if (typeof subscriptionInstance === 'number') {
      clearInterval(subscriptionInstance);
    }
    
    subscriptionInstance = null;
    
    // Clear any pending update timeout
    if (updateTimeout) {
      clearTimeout(updateTimeout);
      updateTimeout = null;
    }
    
    console.log('Stopped Bluesky feed subscription');
  },
  
  applyPendingUpdates: () => {
    if (pendingUpdates.length === 0) return;
    
    // Merge pending updates with current posts, avoiding duplicates
    const currentPosts = get().posts;
    const currentUris = new Set(currentPosts.map(post => post.post.uri));
    
    // Filter out posts that already exist in the current posts
    const uniqueNewPosts = pendingUpdates.filter(post => !currentUris.has(post.post.uri));
    
    if (uniqueNewPosts.length === 0) {
      pendingUpdates = [];
      return;
    }
    
    const updatedPosts = [...uniqueNewPosts, ...currentPosts];
    
    // Sort by indexedAt (newest first)
    updatedPosts.sort((a, b) => {
      return new Date(b.post.indexedAt).getTime() - new Date(a.post.indexedAt).getTime();
    });
    
    // Update the store
    set({ posts: updatedPosts });
    
    // Clear pending updates
    pendingUpdates = [];
    
    console.log(`Applied ${uniqueNewPosts.length} new updates to feed`);
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
