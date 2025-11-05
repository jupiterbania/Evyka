'use client';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { ImageCard } from '@/components/image-card';
import Image from 'next/image';
import type { Media as MediaType, SiteSettings } from '@/lib/types';
import { useCollection, useFirestore, useMemoFirebase, useDoc, useUser } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { useMemo, useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader2, AlertTriangle, ImageIcon, Video } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';


export default function Home() {
  const firestore = useFirestore();
  const { user } = useUser();
  const galleryRef = useRef<HTMLElement>(null);
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const mediaCollection = useMemoFirebase(() => firestore ? collection(firestore, 'media') : null, [firestore]);
  const { data: media, isLoading } = useCollection<MediaType>(mediaCollection);

  const initialFilter = searchParams.get('filter') === 'nude' ? 'nude' : 'image';
  const [filter, setFilter] = useState<'image' | 'nude'>(initialFilter);

  const sortedMedia = useMemo(() => {
    if (!media) return [];
    return [...media].sort((a, b) => {
      const timeA = a.uploadDate?.toMillis() || 0;
      const timeB = b.uploadDate?.toMillis() || 0;
      return timeB - timeA;
    });
  }, [media]);

  const filteredMedia = useMemo(() => {
    // Show only non-reel images
    if (filter === 'image') {
      return sortedMedia.filter(item => item.mediaType === 'image' && !item.isNude);
    }
    // Nudes can be images or videos/reels
    if (filter === 'nude') {
      return sortedMedia.filter(item => item.isNude);
    }
    return [];
  }, [sortedMedia, filter]);


  const settingsDocRef = useMemoFirebase(() => firestore ? doc(firestore, 'settings', 'main') : null, [firestore]);
  const { data: settings } = useDoc<SiteSettings>(settingsDocRef);
  
  const heroImageUrl = settings?.heroImageUrl;
  const heroImageHint = settings?.heroImageHint;

  // State for age gate
  const [isAgeGateOpen, setAgeGateOpen] = useState(false);
  const [isAgeConfirmed, setAgeConfirmed] = useState(false);
  
  // State for pagination
  const [currentPage, setCurrentPage] = useState(1);
  const imagesPerPage = 16;
  const totalPages = Math.ceil((filteredMedia?.length || 0) / imagesPerPage);
  const maxPageNumbersToShow = 4;

  const paginatedMedia = useMemo(() => {
    const startIndex = (currentPage - 1) * imagesPerPage;
    const endIndex = startIndex + imagesPerPage;
    return filteredMedia.slice(startIndex, endIndex);
  }, [filteredMedia, currentPage, imagesPerPage]);

  const goToPage = (page: number) => {
    setCurrentPage(page);
    galleryRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const goToNextPage = () => {
    goToPage(Math.min(currentPage + 1, totalPages));
  };

  const goToPreviousPage = () => {
    goToPage(Math.max(currentPage - 1, 1));
  };
  
  const getPaginationGroup = () => {
    if (totalPages <= maxPageNumbersToShow) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    let startPage = Math.max(2, currentPage - 1);
    let endPage = startPage + maxPageNumbersToShow - 3;

    if (currentPage === 1) {
        startPage = 1;
        endPage = maxPageNumbersToShow -1;
    }

    if (endPage > totalPages -1) {
        endPage = totalPages -1;
        startPage = endPage - (maxPageNumbersToShow-3);
    }

    const pages: (number | string)[] = [1];
    if (startPage > 2) {
      pages.push('...');
    }
    
    for (let i = startPage; i <= endPage; i++) {
        if(i > 1 && i < totalPages) pages.push(i);
    }
    
    if (endPage < totalPages - 1) {
        pages.push('...');
    }

    if(totalPages > 1) pages.push(totalPages);
    return pages;
  };

  const handleNudesClick = () => {
    if (isAgeConfirmed) {
      setFilter('nude');
      router.replace('/?filter=nude', { scroll: false });
    } else {
      setAgeGateOpen(true);
    }
  };

  const handleAgeConfirm = () => {
    setAgeConfirmed(true);
    setFilter('nude');
    router.replace('/?filter=nude', { scroll: false });
    setAgeGateOpen(false);
  };
  
  useEffect(() => {
    const filterParam = searchParams.get('filter');
    if (filterParam === 'nude') {
      if (isAgeConfirmed) {
        setFilter('nude');
      } else {
        setAgeGateOpen(true);
      }
    } else {
      setFilter('image');
    }
  }, [searchParams, isAgeConfirmed]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filter]);


  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow">
        <section ref={galleryRef} id="gallery" className="py-8 sm:py-12 scroll-mt-20">
          <div className="container px-4 sm:px-6">
            <div className="flex flex-col sm:flex-row items-center justify-between mb-6 sm:mb-8 gap-4">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight font-headline">
                Explore Gallery
              </h2>
            </div>
            
            {isLoading ? (
              <div className="flex flex-col items-center justify-center min-h-[30vh]">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="mt-4 text-muted-foreground">Loading Gallery...</p>
              </div>
            ) : paginatedMedia.length === 0 ? (
              <p className="col-span-full text-center text-muted-foreground min-h-[30vh] flex items-center justify-center">
                No media in this category yet.
              </p>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                  {paginatedMedia.map((item, index) => (
                    <ImageCard key={item.id} media={item} index={index} />
                  ))}
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-8 sm:mt-12">
                    <Button onClick={goToPreviousPage} disabled={currentPage === 1} variant="outline">
                      Previous
                    </Button>
                    <nav className="flex items-center gap-1">
                      {getPaginationGroup().map((item, index) =>
                        typeof item === 'number' ? (
                          <Button
                            key={index}
                            onClick={() => goToPage(item)}
                            variant={currentPage === item ? 'default' : 'outline'}
                            className={cn(
                              'h-9 w-9 p-0',
                              currentPage === item && 'pointer-events-none'
                            )}
                          >
                            {item}
                          </Button>
                        ) : (
                          <span key={index} className="px-2">
                            {item}
                          </span>
                        )
                      )}
                    </nav>
                    <Button onClick={goToNextPage} disabled={currentPage === totalPages} variant="outline">
                      Next
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      </main>
      <Footer />

      <AlertDialog open={isAgeGateOpen} onOpenChange={setAgeGateOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Age Verification</AlertDialogTitle>
            <AlertDialogDescription>
              You must be 18 years or older to view this content. Please confirm your age.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => router.replace('/', { scroll: false })}>No, take me back</AlertDialogCancel>
            <AlertDialogAction onClick={handleAgeConfirm}>
              Yes, I am 18+
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
