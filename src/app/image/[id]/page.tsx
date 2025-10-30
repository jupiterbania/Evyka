
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
        <div className="w-full h-screen flex items-center justify-center">
            <Skeleton className="w-full h-full" />
        </div>
      );
    }

    if (!photo) {
      return (
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">Image Not Found</h2>
            <p className="text-muted-foreground mb-6">The image you are looking for does not exist or may have been removed.</p>
            <Button asChild>
                <Link href="/#gallery">Back to Gallery</Link>
            </Button>
          </div>
      );
    }

    return (
        <div className="relative w-full h-screen">
          <Image
            src={photo.imageUrl}
            alt={photo.title}
            fill
            className="object-cover"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-center p-4">
            <div className="relative z-10 text-white">
                <h1 className="text-4xl md:text-6xl font-bold font-headline drop-shadow-lg">{photo.title}</h1>
                <p className="text-lg md:text-xl text-white/90 mt-4 max-w-prose drop-shadow-md">{photo.description}</p>
            </div>
          </div>
        </div>
    );
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow flex items-stretch justify-center">
        {renderContent()}
      </main>
      <Footer />
    </div>
  );
}
