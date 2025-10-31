
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
import { Loader2 } from 'lucide-react';

export default function ImagePage() {
  const { id } = useParams();
  const imageId = Array.isArray(id) ? id[0] : id;

  const firestore = useFirestore();

  const imageDocRef = useMemoFirebase(
    () => (imageId ? doc(firestore, 'images', imageId) : null),
    [firestore, imageId]
  );
  const { data: photo, isLoading: isPhotoLoading } = useDoc<ImageType>(imageDocRef);

  const renderContent = () => {
    if (isPhotoLoading) {
      return (
        <div className="flex-grow flex flex-col items-center justify-center p-4 text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-muted-foreground mt-4">Loading image...</p>
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
