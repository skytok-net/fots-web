'use client';

import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { AppBskyFeedDefs } from '@atproto/api';
import { formatFeedPost } from '~/hooks/use-feed';
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar';
import { Button } from '~/components/ui/button';
import { Heart, MessageCircle, Repeat2 } from 'lucide-react';
import { Card, CardContent, CardHeader } from '~/components/ui/card';

type FeedItemProps = {
  post: AppBskyFeedDefs.FeedViewPost;
  onLike?: (uri: string, cid: string) => void;
  onRepost?: (uri: string, cid: string) => void;
  onReply?: (uri: string, cid: string) => void;
  onClick?: (post: AppBskyFeedDefs.FeedViewPost) => void;
  title?: string;
  content?: string;
  author?: {
    name: string;
    avatar?: string;
  };
  date?: string;
};

export function FeedItem({ 
  post, 
  onLike, 
  onRepost, 
  onReply, 
  onClick,
  title,
  content,
  author,
  date
}: FeedItemProps) {
  if (post) {
    const formattedPost = formatFeedPost(post);
    const { author: postAuthor, record, indexedAt, likeCount, repostCount, replyCount } = formattedPost;
    
    const postText = typeof record?.text === 'string' ? record.text : '';
    
    const postDate = indexedAt ? formatDistanceToNow(new Date(indexedAt), { addSuffix: true }) : '';
    
    const firstInitial = postAuthor.displayName ? postAuthor.displayName[0].toUpperCase() : postAuthor.handle[0].toUpperCase();
    
    return (
      <Card 
        className="w-full mb-4 overflow-hidden bg-gray-50 dark:bg-gray-800 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
        onClick={() => onClick && onClick(post)}
      >
        <CardHeader className="flex flex-row items-start gap-3 pt-4 border-none bg-gray-100 dark:bg-gray-700">
          <Avatar className="h-10 w-10">
            <AvatarImage src={postAuthor.avatar} alt={postAuthor.displayName || postAuthor.handle} />
            <AvatarFallback>{firstInitial}</AvatarFallback>
          </Avatar>
          
          <div className="flex flex-col">
            <p className="font-semibold text-gray-900 dark:text-gray-100">{postAuthor.displayName || postAuthor.handle}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">@{postAuthor.handle}</p>
          </div>
          
          <p className="ml-auto text-xs text-gray-500 dark:text-gray-400">{postDate}</p>
        </CardHeader>
        
        <CardContent className="pt-4 text-gray-700 dark:text-gray-300">
          <p className="whitespace-pre-wrap">{postText}</p>
        </CardContent>
        
        {(onLike || onRepost || onReply) && (
          <div className="px-6 py-3 bg-gray-100 dark:bg-gray-700 border-none">
            <div className="flex items-center gap-6 text-gray-500 dark:text-gray-400">
              {onReply && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="flex items-center gap-1 p-0 h-auto hover:text-gray-700 dark:hover:text-gray-200"
                  onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                    e.stopPropagation();
                    onReply(formattedPost.uri, formattedPost.cid);
                  }}
                >
                  <MessageCircle className="h-4 w-4" />
                  <span className="text-xs">{replyCount > 0 ? replyCount : null}</span>
                </Button>
              )}
              
              {onRepost && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="flex items-center gap-1 p-0 h-auto hover:text-gray-700 dark:hover:text-gray-200"
                  onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                    e.stopPropagation();
                    onRepost(formattedPost.uri, formattedPost.cid);
                  }}
                >
                  <Repeat2 className="h-4 w-4" />
                  <span className="text-xs">{repostCount > 0 ? repostCount : null}</span>
                </Button>
              )}
              
              {onLike && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="flex items-center gap-1 p-0 h-auto hover:text-gray-700 dark:hover:text-gray-200"
                  onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                    e.stopPropagation();
                    onLike(formattedPost.uri, formattedPost.cid);
                  }}
                >
                  <Heart className="h-4 w-4" />
                  <span className="text-xs">{likeCount > 0 ? likeCount : null}</span>
                </Button>
              )}
            </div>
          </div>
        )}
      </Card>
    );
  }
  
  return (
    <Card className="w-full mb-4 overflow-hidden bg-gray-50 dark:bg-gray-800 shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center gap-3 border-none bg-gray-100 dark:bg-gray-700 pb-3">
        {author && (
          <>
            <Avatar className="h-8 w-8">
              <AvatarImage src={author.avatar} alt={author.name} />
              <AvatarFallback>{author.name[0].toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <p className="font-semibold text-gray-900 dark:text-gray-100">{author.name}</p>
              {date && <p className="text-xs text-gray-500 dark:text-gray-400">{date}</p>}
            </div>
          </>
        )}
        {!author && title && (
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
        )}
      </CardHeader>
      
      <CardContent className="pt-4 text-gray-700 dark:text-gray-300">
        {author ? (
          <p className="whitespace-pre-wrap">{content}</p>
        ) : (
          <>
            {title && <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">{title}</h3>}
            {content && <p className="whitespace-pre-wrap">{content}</p>}
          </>
        )}
      </CardContent>
    </Card>
  );
}