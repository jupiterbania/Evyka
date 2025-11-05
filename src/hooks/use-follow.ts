
'use client';

import { useState, useEffect, useCallback } from 'react';
import { doc, getDoc, runTransaction, increment, serverTimestamp } from 'firebase/firestore';
import { useFirestore, useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export const useFollow = (targetUserId?: string) => {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowLoading, setIsFollowLoading] = useState(true);

  useEffect(() => {
    setIsFollowing(false);
    setIsFollowLoading(true);

    if (!user || !targetUserId || !firestore) {
      setIsFollowLoading(false);
      return;
    }
    
    const followDocRef = doc(firestore, 'users', user.uid, 'following', targetUserId);
    getDoc(followDocRef).then(doc => {
      setIsFollowing(doc.exists());
    }).catch(err => {
      console.error("Error checking initial follow status:", err);
    }).finally(() => {
        setIsFollowLoading(false);
    });
  }, [user, targetUserId, firestore]);

  const handleFollowToggle = useCallback(async () => {
    if (!user || !targetUserId || !firestore) {
      toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in to follow users.' });
      return;
    }
    if (user.uid === targetUserId) {
      toast({ variant: 'destructive', title: 'Error', description: 'You cannot follow yourself.'});
      return;
    }

    setIsFollowLoading(true);

    try {
      await runTransaction(firestore, async (transaction) => {
        const currentUserId = user.uid;
        const currentUserRef = doc(firestore, 'users', currentUserId);
        const targetUserRef = doc(firestore, 'users', targetUserId);
        const currentUserFollowingRef = doc(firestore, 'users', currentUserId, 'following', targetUserId);
        const targetUserFollowerRef = doc(firestore, 'users', targetUserId, 'followers', currentUserId);

        const followingDoc = await transaction.get(currentUserFollowingRef);
        
        if (followingDoc.exists()) {
          // --- Unfollow Logic ---
          transaction.delete(currentUserFollowingRef);
          transaction.delete(targetUserFollowerRef);
          transaction.update(currentUserRef, { followingCount: increment(-1) });
          transaction.update(targetUserRef, { followerCount: increment(-1) });
        } else {
          // --- Follow Logic ---
          const timestamp = serverTimestamp();
          transaction.set(currentUserFollowingRef, { userId: targetUserId, followedAt: timestamp });
          transaction.set(targetUserFollowerRef, { userId: currentUserId, followedAt: timestamp });
          transaction.update(currentUserRef, { followingCount: increment(1) });
          transaction.update(targetUserRef, { followerCount: increment(1) });
        }
      });
      
      // Success
      setIsFollowing(prev => !prev);
      toast({ title: isFollowing ? 'Unfollowed user.' : 'Successfully followed user.' });

    } catch (error: any) {
      // This is where we create and emit the contextual error.
      const permissionError = new FirestorePermissionError(
        isFollowing ? 'unfollow' : 'follow', // Operation type
        `batch write on users/${user.uid} and users/${targetUserId}`, // Path
        { // Resource data
          currentUserId: user.uid,
          targetUserId: targetUserId,
        },
        error
      );
      errorEmitter.emit('permission-error', permissionError);
    } finally {
        setIsFollowLoading(false);
    }
  }, [user, targetUserId, firestore, isFollowing, toast]);

  return { isFollowing, isFollowLoading, handleFollowToggle };
};
