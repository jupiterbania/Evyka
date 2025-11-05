'use server';
/**
 * @fileOverview A server-side flow for handling the follow/unfollow logic.
 *
 * - toggleFollow - A function that handles the entire follow/unfollow transaction.
 * - ToggleFollowInput - The input type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { getFirebaseApp } from '@/firebase/server-init';
import { getFirestore, doc, runTransaction, increment, serverTimestamp } from 'firebase/firestore';

// Initialize Firestore for the server
const db = getFirestore(getFirebaseApp());

const ToggleFollowInputSchema = z.object({
  currentUserId: z.string().describe('The ID of the user performing the action.'),
  targetUserId: z.string().describe('The ID of the user to be followed or unfollowed.'),
});
export type ToggleFollowInput = z.infer<typeof ToggleFollowInputSchema>;

export async function toggleFollow(input: ToggleFollowInput): Promise<{ success: boolean; isFollowing: boolean }> {
  return toggleFollowFlow(input);
}

const toggleFollowFlow = ai.defineFlow(
  {
    name: 'toggleFollowFlow',
    inputSchema: ToggleFollowInputSchema,
    outputSchema: z.object({ success: z.boolean(), isFollowing: z.boolean() }),
  },
  async ({ currentUserId, targetUserId }) => {
    if (currentUserId === targetUserId) {
        throw new Error("Users cannot follow themselves.");
    }

    try {
      const newFollowingState = await runTransaction(db, async (transaction) => {
        const currentUserFollowingRef = doc(db, 'users', currentUserId, 'following', targetUserId);
        const followingDoc = await transaction.get(currentUserFollowingRef);
        
        const isCurrentlyFollowing = followingDoc.exists();

        const currentUserRef = doc(db, 'users', currentUserId);
        const targetUserRef = doc(db, 'users', targetUserId);
        const targetUserFollowerRef = doc(db, 'users', targetUserId, 'followers', currentUserId);
        const timestamp = serverTimestamp();

        if (isCurrentlyFollowing) {
          // --- Unfollow Logic ---
          transaction.delete(currentUserFollowingRef);
          transaction.delete(targetUserFollowerRef);
          transaction.update(currentUserRef, { followingCount: increment(-1) });
          transaction.update(targetUserRef, { followerCount: increment(-1) });
          return false; // New state is: not following
        } else {
          // --- Follow Logic ---
          transaction.set(currentUserFollowingRef, { userId: targetUserId, followedAt: timestamp });
          transaction.set(targetUserFollowerRef, { userId: currentUserId, followedAt: timestamp });
          transaction.update(currentUserRef, { followingCount: increment(1) });
          transaction.update(targetUserRef, { followerCount: increment(1) });
          return true; // New state is: following
        }
      });
      
      return { success: true, isFollowing: newFollowingState };
      
    } catch (error: any) {
        console.error('toggleFollowFlow failed:', error);
        // We throw the error so the client-side can catch it.
        throw new Error(`Failed to update follow status: ${error.message}`);
    }
  }
);
