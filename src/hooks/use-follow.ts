
import { useState, useEffect, useCallback } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { useFirestore, useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { toggleFollow } from '@/ai/flows/toggle-follow-flow';

export const useFollow = (targetUserId?: string) => {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowLoading, setIsFollowLoading] = useState(false);

  useEffect(() => {
    if (!user || !targetUserId || !firestore) {
      setIsFollowing(false);
      return;
    }
    
    const followDocRef = doc(firestore, 'users', user.uid, 'following', targetUserId);
    getDoc(followDocRef).then(doc => {
      setIsFollowing(doc.exists());
    }).catch(err => {
      console.error("Error checking initial follow status:", err);
    });
  }, [user, targetUserId, firestore]);

  const handleFollowToggle = useCallback(async () => {
    if (!user || !targetUserId) {
      toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in to follow users.' });
      return;
    }
    if (user.uid === targetUserId) {
      toast({ variant: 'destructive', title: 'Error', description: 'You cannot follow yourself.'});
      return;
    }

    const previousState = isFollowing;
    // Optimistic UI update for instant feedback
    setIsFollowing(!previousState);
    setIsFollowLoading(true);

    try {
      const result = await toggleFollow({
        currentUserId: user.uid,
        targetUserId: targetUserId,
      });

      // Sync with server's source of truth. Usually this will be the same as the optimistic update.
      setIsFollowing(result.isFollowing);
      
    } catch (error: any) {
      // If server fails, revert the optimistic update and show an error
      setIsFollowing(previousState);
      console.error('Failed to toggle follow:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update follow status. Please try again.',
      });
    } finally {
      setIsFollowLoading(false);
    }
  }, [user, targetUserId, firestore, isFollowing, toast]);

  return { isFollowing, isFollowLoading, handleFollowToggle };
};
