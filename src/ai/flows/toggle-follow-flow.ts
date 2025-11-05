
'use server';
/**
 * @fileOverview A server-side flow for handling the follow/unfollow logic using the Firebase Admin SDK.
 *
 * - toggleFollow - A function that handles the entire follow/unfollow transaction.
 * - ToggleFollowInput - The input type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import * as admin from 'firebase-admin';

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
    // Initialize Firebase Admin SDK if not already initialized
    if (!admin.apps.length) {
      admin.initializeApp();
    }
    const db = admin.firestore();

    if (currentUserId === targetUserId) {
        throw new Error("Users cannot follow themselves.");
    }

    try {
      const newFollowingState = await db.runTransaction(async (transaction) => {
        const currentUserFollowingRef = db.collection('users').doc(currentUserId).collection('following').doc(targetUserId);
        const followingDoc = await transaction.get(currentUserFollowingRef);
        
        const isCurrentlyFollowing = followingDoc.exists;

        const currentUserRef = db.collection('users').doc(currentUserId);
        const targetUserRef = db.collection('users').doc(targetUserId);
        const targetUserFollowerRef = db.collection('users').doc(targetUserId).collection('followers').doc(currentUserId);
        
        const timestamp = admin.firestore.Timestamp.now(); // Use admin timestamp
        const increment = admin.firestore.FieldValue.increment;

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
