'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface Comment {
  id: string;
  battle_id: string;
  user_wallet: string;
  content: string;
  created_at: string;
  updated_at: string;
  // Joined from users table
  username?: string;
  avatar_url?: string;
}

interface UseCommentsReturn {
  comments: Comment[];
  isLoading: boolean;
  error: string | null;
  postComment: (content: string, walletAddress: string) => Promise<boolean>;
  deleteComment: (commentId: string, walletAddress: string) => Promise<boolean>;
  isPosting: boolean;
}

export function useComments(battleId: string): UseCommentsReturn {
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPosting, setIsPosting] = useState(false);

  // Fetch comments with user info
  const fetchComments = useCallback(async () => {
    if (!battleId) return;

    try {
      setIsLoading(true);
      setError(null);

      // Fetch comments and join with users table for username/avatar
      const { data, error: fetchError } = await supabase
        .from('battle_comments')
        .select(`
          id,
          battle_id,
          user_wallet,
          content,
          created_at,
          updated_at
        `)
        .eq('battle_id', battleId)
        .order('created_at', { ascending: false });

      if (fetchError) {
        console.error('Error fetching comments:', fetchError);
        setError('Failed to load comments');
        return;
      }

      // Fetch user info for each unique wallet
      const wallets = [...new Set((data || []).map(c => c.user_wallet))];

      let usersMap: Record<string, { username?: string; avatar_url?: string }> = {};

      if (wallets.length > 0) {
        const { data: usersData } = await supabase
          .from('users')
          .select('wallet_address, username, avatar_url')
          .in('wallet_address', wallets);

        usersMap = (usersData || []).reduce((acc, user) => {
          acc[user.wallet_address] = {
            username: user.username,
            avatar_url: user.avatar_url
          };
          return acc;
        }, {} as Record<string, { username?: string; avatar_url?: string }>);
      }

      // Merge comments with user info
      const commentsWithUsers: Comment[] = (data || []).map(comment => ({
        ...comment,
        username: usersMap[comment.user_wallet]?.username,
        avatar_url: usersMap[comment.user_wallet]?.avatar_url
      }));

      setComments(commentsWithUsers);
    } catch (err) {
      console.error('Error in fetchComments:', err);
      setError('Failed to load comments');
    } finally {
      setIsLoading(false);
    }
  }, [battleId]);

  // Initial fetch
  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  // Real-time subscription
  useEffect(() => {
    if (!battleId) return;

    const channel = supabase
      .channel(`comments-${battleId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'battle_comments',
          filter: `battle_id=eq.${battleId}`
        },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            // Fetch user info for new comment
            const newComment = payload.new as Comment;
            const { data: userData } = await supabase
              .from('users')
              .select('username, avatar_url')
              .eq('wallet_address', newComment.user_wallet)
              .single();

            const commentWithUser: Comment = {
              ...newComment,
              username: userData?.username,
              avatar_url: userData?.avatar_url
            };

            setComments(prev => [commentWithUser, ...prev]);
          } else if (payload.eventType === 'DELETE') {
            const deletedId = payload.old.id;
            setComments(prev => prev.filter(c => c.id !== deletedId));
          } else if (payload.eventType === 'UPDATE') {
            const updatedComment = payload.new as Comment;
            setComments(prev =>
              prev.map(c =>
                c.id === updatedComment.id
                  ? { ...c, ...updatedComment }
                  : c
              )
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [battleId]);

  // Post a new comment
  const postComment = useCallback(async (content: string, walletAddress: string): Promise<boolean> => {
    if (!battleId || !content.trim() || !walletAddress) {
      return false;
    }

    setIsPosting(true);
    setError(null);

    try {
      const { error: insertError } = await supabase
        .from('battle_comments')
        .insert({
          battle_id: battleId,
          user_wallet: walletAddress,
          content: content.trim()
        });

      if (insertError) {
        console.error('Error posting comment:', insertError);
        setError('Failed to post comment');
        return false;
      }

      return true;
    } catch (err) {
      console.error('Error in postComment:', err);
      setError('Failed to post comment');
      return false;
    } finally {
      setIsPosting(false);
    }
  }, [battleId]);

  // Delete a comment (only own comments)
  const deleteComment = useCallback(async (commentId: string, walletAddress: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase
        .from('battle_comments')
        .delete()
        .eq('id', commentId)
        .eq('user_wallet', walletAddress);

      if (deleteError) {
        console.error('Error deleting comment:', deleteError);
        setError('Failed to delete comment');
        return false;
      }

      return true;
    } catch (err) {
      console.error('Error in deleteComment:', err);
      setError('Failed to delete comment');
      return false;
    }
  }, []);

  return {
    comments,
    isLoading,
    error,
    postComment,
    deleteComment,
    isPosting
  };
}
