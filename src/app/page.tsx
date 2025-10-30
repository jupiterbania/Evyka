'use client';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { ImageCard } from '@/components/image-card';
import Image from 'next/image';
import type { Image as ImageType, SiteSettings } from '@/lib/types';
import { useCollection, useFirestore, useMemoFirebase, useDoc } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { placeholderImages } from '@/lib/placeholder-images';

export default function Home() {
  const firestore = useFirestore();
  const imagesCollection = useMemoFirebase(() => collection(firestore, 'images'), [firestore]);
  const { data: photos, isLoading } = useCollection<ImageType>(imagesCollection);

  const settingsDocRef = useMemoFirebase(() => doc(firestore, 'settings', 'main'), [firestore]);
  const { data: settings } = useDoc<SiteSettings>(settingsDocRef);
  
  const defaultHero = placeholderImages[0];
  const heroImageUrl = settings?.heroImageUrl || defaultHero.imageUrl;
  const heroImageHint = settings?.heroImageHint || defaultHero.imageHint;

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow">
        <section className="relative w-full h-[50vh] sm:h-[40vh] flex items-center justify-center text-center text-white overflow-hidden">
          <Image
            src={heroImageUrl}
            alt="Misty mountains"
            fill
            className="object-cover"
            data-ai-hint={heroImageHint}
            priority
          />
          <div className="absolute inset-0 bg-black/50" />
          <div className="relative z-10 p-4">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white drop-shadow-md font-headline">
              WELCOME TO MY EXCLUSIVE CONTENT
            </h1>
          </div>
        </section>
        <section id="gallery" className="py-8 sm:py-12">
          <div className="container px-4 sm:px-6">
            <div className="flex flex-col sm:flex-row items-center justify-between mb-6 sm:mb-8 gap-4">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight font-headline">
                Explore Gallery
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
              {isLoading && Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="aspect-[3/4] bg-muted animate-pulse rounded-lg" />
              ))}
              {!isLoading && photos?.length === 0 && (
                <p className="col-span-full text-center text-muted-foreground">No images have been uploaded yet.</p>
              )}
              {photos?.map(photo => (
                <ImageCard key={photo.id} photo={photo} />
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
