
import { useState, useEffect } from 'react';
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
    // No need to check on mount if user is not logged in or target is missing
    if (!user || !targetUserId || !firestore) {
      setIsFollowing(false);
      return;
    }
    
    // Initial check is still client-side for speed
    setIsFollowLoading(true);
    const followDocRef = doc(firestore, 'users', user.uid, 'following', targetUserId);
    getDoc(followDocRef)
      .then(doc => {
        setIsFollowing(doc.exists());
      })
      .catch(err => {
        console.error("Error checking follow status:", err);
        // Don't show a toast for a simple read error
      })
      .finally(() => {
        setIsFollowLoading(false);
      });
  }, [user, targetUserId, firestore]);

  const handleFollowToggle = async () => {
    if (!user || !targetUserId) {
      toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in to follow users.' });
      return;
    }
    if (user.uid === targetUserId) {
      toast({ variant: 'destructive', title: 'Error', description: 'You cannot follow yourself.'});
      return;
    }

    setIsFollowLoading(true);

    try {
      // Optimistically update the UI
      const previousState = isFollowing;
      setIsFollowing(!previousState);

      const result = await toggleFollow({
        currentUserId: user.uid,
        targetUserId: targetUserId,
      });

      // The server is the source of truth, so sync with its response.
      setIsFollowing(result.isFollowing);
      toast({ title: result.isFollowing ? 'Successfully followed user.' : 'Unfollowed user.' });

    } catch (error: any) {
      // If server fails, revert the optimistic update and show an error
      setIsFollowing(isFollowing);
      console.error('Failed to toggle follow:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update follow status. Please try again.',
      });
    } finally {
      setIsFollowLoading(false);
    }
  };

  return { isFollowing, isFollowLoading, handleFollowToggle };
};
