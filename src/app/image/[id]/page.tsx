
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
import { Loader2 } from 'lucide-react';

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
    if (!imageId || !photo) return;

    // Check if user is returning from the ad URL
    const isUnlocking = sessionStorage.getItem(`unlocking_${imageId}`);
    if (isUnlocking === 'true') {
        sessionStorage.removeItem(`unlocking_${imageId}`); // Clean up the flag
        sessionStorage.setItem(`unlocked_${imageId}`, 'true'); // Set permanent unlock
        setHasUnlocked(true);
        return;
    }
    
    // Check for existing unlock status
    const isUnlocked = sessionStorage.getItem(`unlocked_${imageId}`);
    if (isUnlocked === 'true') {
      setHasUnlocked(true);
      return;
    }

    // If ad-gated and not unlocked, redirect immediately
    if (photo.isAdGated && !isUnlocked) {
        handleWatchAd();
    }

  }, [imageId, photo]);

  const handleWatchAd = () => {
    if (!imageId || isRedirecting) return;

    setIsRedirecting(true);
    // Set a flag to indicate we are starting the ad process
    sessionStorage.setItem(`unlocking_${imageId}`, 'true');
    // Redirect to the ad provider
    window.location.href = `https://www.effectivegatecpm.com/rqgi4kseb?key=7466724a8386072866c53caa673b3d9f`;
  };
  
  const renderContent = () => {
    if (isPhotoLoading || isRedirecting) {
      return (
        <div className="flex-grow flex flex-col items-center justify-center p-4 text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-muted-foreground mt-4">
                {isRedirecting ? "Redirecting to our partner..." : "Loading image..."}
            </p>
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

    // If ad-gated and still not unlocked (e.g., redirect is pending), show loading.
    if (photo.isAdGated && !hasUnlocked) {
         return (
            <div className="flex-grow flex flex-col items-center justify-center p-4 text-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="text-muted-foreground mt-4">
                    Preparing content...
                </p>
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
