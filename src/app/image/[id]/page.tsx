
'use client';

import { useParams } from 'next/navigation';
import { useDoc, useFirestore, useUser, useMemoFirebase, useCollection } from '@/firebase';
import { doc, collection, query, where } from 'firebase/firestore';
import type { Image as ImageType, Purchase, User } from '@/lib/types';
import Image from 'next/image';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Lock } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function ImagePage() {
  const { id } = useParams();
  const imageId = Array.isArray(id) ? id[0] : id;

  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const imageDocRef = useMemoFirebase(
    () => (imageId ? doc(firestore, 'images', imageId) : null),
    [firestore, imageId]
  );
  const { data: photo, isLoading: isPhotoLoading } = useDoc<ImageType>(imageDocRef);

  const userDocRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [firestore, user]);
  const { data: userData } = useDoc<User>(userDocRef);
  const isSubscribed = userData?.subscriptionStatus === 'active';

  const purchasesCollection = useMemoFirebase(
    () =>
      user && imageId
        ? query(
            collection(firestore, 'users', user.uid, 'purchases'),
            where('imageId', '==', imageId)
          )
        : null,
    [firestore, user, imageId]
  );
  const { data: purchases, isLoading: isPurchaseLoading } =
    useCollection<Purchase>(purchasesCollection);

  const designatedAdminEmail = 'jupiterbania472@gmail.com';
  const isAdmin = user?.email === designatedAdminEmail;

  const isPurchased = (purchases?.length ?? 0) > 0;
  const isFree = photo?.price === 0;
  
  const hasAccess = isPurchased || isFree || isAdmin || isSubscribed;
  const isLoading = isUserLoading || isPhotoLoading || isPurchaseLoading;

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="w-full max-w-4xl mx-auto">
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
    
    if (!hasAccess) {
      return (
        <div className="text-center">
            <Lock className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h2 className="text-2xl font-bold mb-4">Access Denied</h2>
            <p className="text-muted-foreground mb-6">You must purchase this image or subscribe to view it.</p>
            <Button asChild>
                <Link href="/#gallery">Back to Gallery</Link>
            </Button>
        </div>
      );
    }

    return (
        <div className="w-full max-w-4xl mx-auto">
            <div className="relative aspect-video w-full rounded-lg overflow-hidden border">
                <Image 
                    src={photo.imageUrl}
                    alt={photo.title}
                    fill
                    className="object-contain"
                    sizes="(max-width: 768px) 100vw, 80vw"
                />
            </div>
            <div className="mt-4">
                <h1 className="text-3xl font-bold font-headline">{photo.title}</h1>
                <p className="text-muted-foreground mt-2">{photo.description}</p>
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
