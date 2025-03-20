import { useEffect } from 'react';
import { useFeed } from '~/hooks/use-feed';
import { AppBskyFeedDefs } from '@atproto/api';
import { FeedItem } from './feed-item';
import { useAuthStore } from '~/stores/auth-store';

export function Feed() {
  const { posts, loading, error, fetchPosts, likePost, repostPost, replyToPost } = useFeed();
  const { isAuthenticated } = useAuthStore();

  // Fetch posts on initial load
  useEffect(() => {
    fetchPosts();
    
    // Set up a refresh interval (every 5 minutes)
    const refreshInterval = setInterval(() => {
      fetchPosts();
    }, 5 * 60 * 1000);
    
    return () => {
      clearInterval(refreshInterval);
    };
  }, [fetchPosts]);

  if (loading) {
    return <div>Loading posts...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <section className="py-12 bg-white dark:bg-gray-800 w-full">
      <div className="w-full max-w-[1200px] mx-auto px-4 sm:px-6">
        <h2 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8 text-gray-800 dark:text-white">
          Latest Updates
        </h2>
        <div className="space-y-6">
          {posts.map((post: AppBskyFeedDefs.FeedViewPost) => (
            <FeedItem
              key={post.post.uri}
              post={post}
              onClick={(post) => console.log('Post clicked:', post.post.uri)}
              onLike={isAuthenticated ? (uri, cid) => likePost(uri, cid) : undefined}
              onRepost={isAuthenticated ? (uri, cid) => repostPost(uri, cid) : undefined}
              onReply={isAuthenticated ? (uri, cid) => {
                // In a real app, you would show a reply dialog here
                const text = prompt('Enter your reply:');
                if (text) {
                  replyToPost(uri, cid, text);
                }
              } : undefined}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
