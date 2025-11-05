
import { useState, useEffect } from 'react';
import { doc, getDoc, writeBatch, increment, serverTimestamp } from 'firebase/firestore';
import { useFirestore, useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';

export const useFollow = (targetUserId?: string) => {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowLoading, setIsFollowLoading] = useState(false);

  useEffect(() => {
    if (user && targetUserId && firestore) {
      setIsFollowLoading(true);
      const followDocRef = doc(firestore, 'users', user.uid, 'following', targetUserId);
      getDoc(followDocRef)
        .then(doc => {
          setIsFollowing(doc.exists());
        })
        .finally(() => {
          setIsFollowLoading(false);
        });
    }
  }, [user, targetUserId, firestore]);

  const handleFollowToggle = async () => {
    if (!user || !targetUserId || !firestore || user.uid === targetUserId) {
      toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in to follow users.' });
      return;
    }

    setIsFollowLoading(true);
    const currentUserId = user.uid;

    const currentUserRef = doc(firestore, 'users', currentUserId);
    const targetUserRef = doc(firestore, 'users', targetUserId);
    const currentUserFollowingRef = doc(firestore, 'users', currentUserId, 'following', targetUserId);
    const targetUserFollowerRef = doc(firestore, 'users', targetUserId, 'followers', currentUserId);
    const timestamp = serverTimestamp();

    const batch = writeBatch(firestore);

    if (isFollowing) {
      // Unfollow Logic
      batch.delete(currentUserFollowingRef);
      batch.delete(targetUserFollowerRef);
      batch.update(currentUserRef, { followingCount: increment(-1) });
      batch.update(targetUserRef, { followerCount: increment(-1) });
    } else {
      // Follow Logic
      batch.set(currentUserFollowingRef, { userId: targetUserId, followedAt: timestamp });
      batch.set(targetUserFollowerRef, { userId: currentUserId, followedAt: timestamp });
      batch.update(currentUserRef, { followingCount: increment(1) });
      batch.update(targetUserRef, { followerCount: increment(1) });
    }

    batch.commit()
      .then(() => {
        const wasFollowing = isFollowing;
        setIsFollowing(!wasFollowing);
        toast({ title: wasFollowing ? 'Unfollowed user.' : 'Successfully followed user.' });
      })
      .catch((serverError) => {
        const error = new FirestorePermissionError(
          isFollowing ? 'unfollow' : 'follow',
          `batch write on users/${currentUserId} and users/${targetUserId}`,
          {
            currentUserRef: currentUserRef.path,
            targetUserRef: targetUserRef.path,
            isFollowing,
          },
          serverError
        );
        errorEmitter.emit('permission-error', error);
      })
      .finally(() => {
        setIsFollowLoading(false);
      });
  };

  return { isFollowing, isFollowLoading, handleFollowToggle };
};
