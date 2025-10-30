'use client';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { ImageCard } from '@/components/image-card';
import { generateAllPhotos } from '@/lib/placeholder-data';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import type { Photo } from '@/lib/types';

export default function Home() {
  const [photos, setPhotos] = useState<Photo[]>([]);

  useEffect(() => {
    setPhotos(generateAllPhotos());
  }, []);

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow">
        <section className="relative w-full h-[40vh] flex items-center justify-center text-center text-white overflow-hidden">
          <Image
            src="https://images.unsplash.com/photo-1629471197009-c50487351414?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHwxMHx8bWlzdHklMjBtb3VudGFpbnN8ZW58MHx8fHwxNzYxNzkyMDg2fDA&ixlib=rb-4.1.0&q=80&w=1080"
            alt="Misty mountains"
            fill
            className="object-cover"
            data-ai-hint="misty mountains"
          />
          <div className="absolute inset-0 bg-black/50" />
          <div className="relative z-10 p-4">
            <h1 className="text-3xl font-bold tracking-tight text-white drop-shadow-md sm:text-4xl md:text-5xl font-headline">
              WELCOME TO MY EXCLUSIVE CONTENT
            </h1>
          </div>
        </section>
        <section id="gallery" className="py-12">
          <div className="container px-4 sm:px-6">
            <div className="flex flex-col sm:flex-row items-center justify-between mb-8 gap-4">
              <h2 className="text-3xl font-bold tracking-tight font-headline">
                Explore Gallery
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {photos.map(photo => (
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
