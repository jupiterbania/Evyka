'use client';

import { useState, useEffect } from 'react';
import {
  Query,
  onSnapshot,
  DocumentData,
  FirestoreError,
  QuerySnapshot,
  collectionGroup,
  Firestore,
} from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import type { WithId, UseCollectionResult } from './use-collection';


/**
 * React hook to subscribe to a Firestore collection group in real-time.
 * Handles nullable queries.
 *
 * IMPORTANT! YOU MUST MEMOIZE the inputted query or BAD THINGS WILL HAPPEN.
 * Use useMemoFirebase to memoize it per React guidance.
 *
 * @template T Optional type for document data. Defaults to any.
 * @param {Query<DocumentData> | null | undefined} memoizedQuery - The memoized Firestore Query. Waits if null/undefined.
 * @returns {UseCollectionResult<T>} Object with data, isLoading, error.
 */
export function useCollectionGroup<T = any>(
  memoizedQuery: (Query<DocumentData> & { __memo?: boolean }) | null | undefined
): UseCollectionResult<T> {
  type ResultItemType = WithId<T>;
  type StateDataType = ResultItemType[] | null;

  const [data, setData] = useState<StateDataType>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<FirestoreError | Error | null>(null);

  useEffect(() => {
    if (!memoizedQuery) {
      setData(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    const unsubscribe = onSnapshot(
      memoizedQuery,
      (snapshot: QuerySnapshot<DocumentData>) => {
        const results: ResultItemType[] = snapshot.docs.map(doc => ({
          ...(doc.data() as T),
          id: doc.id,
        }));
        setData(results);
        setError(null);
        setIsLoading(false);
      },
      (err: FirestoreError) => {
        console.error("useCollectionGroup error:", err);
        setError(err);
        setData(null);
        setIsLoading(false);
        // Assuming a global error emitter exists
        errorEmitter.emit('permission-error', err as any);
      }
    );

    return () => unsubscribe();
  }, [memoizedQuery]);

  if(memoizedQuery && !memoizedQuery.__memo) {
    throw new Error('Query passed to useCollectionGroup was not properly memoized using useMemoFirebase');
  }

  return { data, isLoading, error };
}
