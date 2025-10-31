
'use client';

import { useParams } from 'next/navigation';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { Image as ImageType } from '@/lib/types';
import Image from 'next/image';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { useState, useEffect } from 'react';
import { Video } from 'lucide-react';

export default function ImagePage() {
  const { id } = useParams();
  const imageId = Array.isArray(id) ? id[0] : id;
  const [hasUnlocked, setHasUnlocked] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

  const firestore = useFirestore();

  const imageDocRef = useMemoFirebase(
    () => (imageId ? doc(firestore, 'images', imageId) : null),
    [firestore, imageId]
  );
  const { data: photo, isLoading: isPhotoLoading } = useDoc<ImageType>(imageDocRef);

  useEffect(() => {
    if (!imageId) return;

    // Check if user is returning from the ad URL
    const isUnlocking = sessionStorage.getItem(`unlocking_${imageId}`);
    if (isUnlocking === 'true') {
        sessionStorage.removeItem(`unlocking_${imageId}`); // Clean up the flag
        sessionStorage.setItem(`unlocked_${imageId}`, 'true'); // Set permanent unlock
        setHasUnlocked(true);
        return; // Early exit to show unlocked content
    }
    
    // Check for existing unlock status
    const isUnlocked = sessionStorage.getItem(`unlocked_${imageId}`);
    if (isUnlocked === 'true') {
      setHasUnlocked(true);
    }
  }, [imageId]);

  const handleWatchAd = () => {
    if (!imageId) return;

    setIsRedirecting(true);
    // Set a flag to indicate we are starting the ad process
    sessionStorage.setItem(`unlocking_${imageId}`, 'true');
    // Redirect to the ad provider
    window.location.href = `https://www.effectivegatecpm.com/rqgi4kseb?key=7466724a8386072866c53caa673b3d9f`;
  };
  
  const renderContent = () => {
    if (isPhotoLoading) {
      return (
        <div className="flex flex-col flex-grow items-center justify-center p-4">
            <Skeleton className="w-full h-[75vh] max-w-7xl" />
            <div className="w-full max-w-4xl text-center mt-8">
                <Skeleton className="h-12 w-3/4 mx-auto" />
                <Skeleton className="h-6 w-full max-w-prose mx-auto mt-4" />
            </div>
        </div>
      );
    }

    if (!photo) {
      return (
          <div className="flex-grow flex items-center justify-center text-center">
            <div>
                <h2 className="text-2xl font-bold mb-4">Image Not Found</h2>
                <p className="text-muted-foreground mb-6">The image you are looking for does not exist or may have been removed.</p>
                <Button asChild>
                    <Link href="/#gallery">Back to Gallery</Link>
                </Button>
            </div>
          </div>
      );
    }

    const needsAd = photo.isAdGated && !hasUnlocked;

    if (needsAd) {
        return (
            <div className="flex-grow flex flex-col items-center justify-center text-center p-4">
                 <div className="relative w-full max-w-4xl aspect-[4/3] rounded-lg overflow-hidden shadow-2xl">
                    <Image
                        src={photo.imageUrl}
                        alt={photo.title}
                        fill
                        className="object-cover blur-2xl scale-110"
                        sizes="(max-width: 1024px) 100vw, 1024px"
                    />
                     <div className="absolute inset-0 bg-black/30 flex flex-col items-center justify-center text-white p-8">
                        <Video className="w-16 h-16 mb-4 text-white/80" />
                        <h2 className="text-2xl sm:text-3xl font-bold mb-2">Watch ad to unlock image</h2>
                        <p className="text-base sm:text-lg mb-6 text-white/90">This content is available for free after a short ad.</p>
                        <Button size="lg" onClick={handleWatchAd} disabled={isRedirecting}>
                            {isRedirecting ? 'Redirecting...' : 'Watch Ad'}
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    return (
      <div className="flex-grow flex flex-col items-center justify-start p-4 pt-8">
        <div className="relative w-full h-[75vh] max-w-7xl">
          <Image
            src={photo.imageUrl}
            alt={photo.title}
            fill
            className="object-contain"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        </div>
        <div className="w-full max-w-4xl mx-auto p-4 sm:p-6 md:p-8 text-center">
            <h1 className="text-3xl md:text-5xl font-bold font-headline">{photo.title}</h1>
            <p className="text-lg md:text-xl text-muted-foreground mt-4 max-w-prose mx-auto">{photo.description}</p>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow flex flex-col items-stretch justify-center">
        {renderContent()}
      </main>
      <Footer />
    </div>
  );
}
