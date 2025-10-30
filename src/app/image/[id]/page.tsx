
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
        <div className="w-full max-w-5xl mx-auto">
            <Skeleton className="aspect-video w-full" />
            <div className="mt-4 space-y-2">
                <Skeleton className="h-8 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
            </div>
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
      <div className="w-full max-w-5xl mx-auto">
        <div className="relative aspect-video w-full rounded-lg overflow-hidden border">
          <Image
            src={photo.imageUrl}
            alt={photo.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 80vw"
          />
        </div>
        <div className="mt-6">
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
            <div>
                <h1 className="text-3xl font-bold font-headline">{photo.title}</h1>
                <p className="text-muted-foreground mt-2 max-w-prose">{photo.description}</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow container mx-auto px-4 sm:px-6 py-8 sm:py-12 flex items-center justify-center">
        {renderContent()}
      </main>
      <Footer />
    </div>
  );
}
