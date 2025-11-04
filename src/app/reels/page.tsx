
'use client';

import { useMemo } from 'react';
import { collection, query, where } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import type { Media as MediaType } from '@/lib/types';
import { Header } from '@/components/header';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ReelCard } from '@/components/reel-card';

export default function ReelsPage() {
  const firestore = useFirestore();

  const reelsQuery = useMemoFirebase(
    () =>
      firestore
        ? query(
            collection(firestore, 'media'),
            where('isReel', '==', true)
          )
        : null,
    [firestore]
  );

  const { data: reels, isLoading } = useCollection<MediaType>(reelsQuery);

  const sortedReels = useMemo(() => {
    if (!reels) return [];
    return [...reels].sort((a, b) => (b.uploadDate?.toMillis() || 0) - (a.uploadDate?.toMillis() || 0));
  }, [reels]);

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex-grow flex flex-col items-center justify-center p-4 text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-muted-foreground mt-4">Loading Reels...</p>
        </div>
      );
    }

    if (!sortedReels || sortedReels.length === 0) {
      return (
        <div className="flex-grow flex flex-col items-center justify-center p-4 text-center">
          <h2 className="text-2xl font-bold mb-4">No Reels Yet</h2>
          <p className="text-muted-foreground mb-6">
            Check back later for new short videos!
          </p>
          <Button asChild>
            <Link href="/">Back to Home</Link>
          </Button>
        </div>
      );
    }
    
    return (
      <div className="relative h-full w-full overflow-y-auto snap-y snap-mandatory">
        {sortedReels.map((reel) => (
          <ReelCard key={reel.id} reel={reel} />
        ))}
      </div>
    );
  };

  return (
    <div className="h-screen w-screen bg-black flex flex-col">
      <Header />
      <main className="flex-1 min-h-0">
        {renderContent()}
      </main>
    </div>
  );
}
