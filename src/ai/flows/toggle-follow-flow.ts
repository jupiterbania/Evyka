'use server';
/**
 * @fileOverview A flow for toggling the follow state between two users.
 *
 * - toggleFollow - A function that handles the follow/unfollow logic.
 * - ToggleFollowInput - The input type for the function.
 * - ToggleFollowOutput - The return type for the function.
 */

import { z } from 'zod';
import { getFirestore, doc, getDoc, writeBatch, serverTimestamp, increment, runTransaction } from 'firebase/firestore';
import { getFirebaseApp } from '@/firebase/server-init';


const ToggleFollowInputSchema = z.object({
  currentUserId: z.string().describe('The ID of the user initiating the action.'),
  targetUserId: z.string().describe('The ID of the user to be followed or unfollowed.'),
});
export type ToggleFollowInput = z.infer<typeof ToggleFollowInputSchema>;

const ToggleFollowOutputSchema = z.object({
  success: z.boolean(),
  newState: z.enum(['followed', 'unfollowed']),
  message: z.string(),
});
export type ToggleFollowOutput = z.infer<typeof ToggleFollowOutputSchema>;

export async function toggleFollow(input: ToggleFollowInput): Promise<ToggleFollowOutput> {
  const { currentUserId, targetUserId } = input;
  
  if (currentUserId === targetUserId) {
    throw new Error('Users cannot follow themselves.');
  }

  const app = getFirebaseApp();
  const firestore = getFirestore(app);

  const currentUserFollowingRef = doc(firestore, 'users', currentUserId, 'following', targetUserId);
  const targetUserFollowerRef = doc(firestore, 'users', targetUserId, 'followers', currentUserId);
  const currentUserRef = doc(firestore, 'users', currentUserId);
  const targetUserRef = doc(firestore, 'users', targetUserId);

  try {
    const followingDoc = await getDoc(currentUserFollowingRef);
    const batch = writeBatch(firestore);

    if (followingDoc.exists()) {
      // --- Unfollow Logic ---
      batch.delete(currentUserFollowingRef);
      batch.delete(targetUserFollowerRef);
      batch.update(currentUserRef, { followingCount: increment(-1) });
      batch.update(targetUserRef, { followerCount: increment(-1) });
      
      await batch.commit();
      
      return {
        success: true,
        newState: 'unfollowed',
        message: 'Successfully unfollowed user.',
      };
    } else {
      // --- Follow Logic ---
      const timestamp = serverTimestamp();
      batch.set(currentUserFollowingRef, { userId: targetUserId, followedAt: timestamp });
      batch.set(targetUserFollowerRef, { userId: currentUserId, followedAt: timestamp });
      batch.update(currentUserRef, { followingCount: increment(1) });
      batch.update(targetUserRef, { followerCount: increment(1) });

      await batch.commit();

      return {
        success: true,
        newState: 'followed',
        message: 'Successfully followed user.',
      };
    }
  } catch (error: any) {
    console.error('Error in toggleFollow:', error);
    // Provide a more generic but helpful error message to the client
    throw new Error(`Failed to update follow status. Please try again.`);
  }
}
