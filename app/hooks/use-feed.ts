import { useCallback, useEffect } from 'react';
import { useFeedStore } from '~/stores/feed-store';
import { AppBskyFeedDefs } from '@atproto/api';

// Type for the feed view post from AT Protocol
type FeedViewPost = AppBskyFeedDefs.FeedViewPost;

export function useFeed() {
  const store = useFeedStore();

  const fetchPosts = useCallback(async () => {
    return store.fetchPosts();
  }, [store]);

  // Start subscription when the hook is first used
  useEffect(() => {
    // Start subscription on mount
    store.startSubscription();
    
    // Clean up subscription on unmount
    return () => {
      store.stopSubscription();
    };
  }, [store]);

  return {
    posts: store.posts,
    loading: store.loading,
    error: store.error,
    fetchPosts,
    likePost: store.likePost,
    repostPost: store.repostPost,
    replyToPost: store.replyToPost,
  };
}


/**
 * Helper function to format a feed post for display
 * @param post The feed post to format
 * @returns Formatted post data
 */
export function formatFeedPost(post: FeedViewPost) {
  const { post: postView, reason } = post;
  
  // Check if it's a repost and has a valid reason with 'by' property
  const isRepost = !!reason;
  const isReasonRepost = isRepost && reason && '$type' in reason && 
    (reason.$type === 'app.bsky.feed.defs#reasonRepost' || 
     (typeof reason.$type === 'string' && reason.$type.includes('Repost')));
  
  // Ensure record has a default structure with a text property
  const record = postView.record || { text: '' };
  
  // Process embed data if it exists
  let processedEmbed = null;
  if (postView.embed) {
    // Check if embed has images
    if ('images' in postView.embed && Array.isArray(postView.embed.images)) {
      processedEmbed = {
        ...postView.embed,
        images: postView.embed.images
      };
    } else {
      // If no images, just pass through the embed
      processedEmbed = postView.embed;
    }
  }
  
  return {
    cid: postView.cid,
    uri: postView.uri,
    author: {
      did: postView.author.did,
      handle: postView.author.handle,
      displayName: postView.author.displayName || '',
      avatar: postView.author.avatar || '',
    },
    record,
    indexedAt: postView.indexedAt,
    likeCount: postView.likeCount || 0,
    repostCount: postView.repostCount || 0,
    replyCount: postView.replyCount || 0,
    isRepost,
    isReasonRepost,
    reason,
    embed: processedEmbed,
  };
}
