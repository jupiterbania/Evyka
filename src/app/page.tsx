
'use client';
import { Header } from '@/components/header';
import { ImageCard } from '@/components/image-card';
import Image from 'next/image';
import type { Media as MediaType, SiteSettings, User as AppUser, Follow } from '@/lib/types';
import { useCollection, useFirestore, useMemoFirebase, useDoc, useUser } from '@/firebase';
import { collection, doc, query, where, getDocs, orderBy, limit, Query, collectionGroup } from 'firebase/firestore';
import { useMemo, useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"


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
  const { user, isUserLoading } = useUser();
  const galleryRef = useRef<HTMLElement>(null);
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const mediaCollection = useMemoFirebase(() => firestore ? query(collection(firestore, 'media'), orderBy('uploadDate', 'desc')) : null, [firestore]);
  const { data: media, isLoading } = useCollection<MediaType>(mediaCollection);
  
  const [followingIds, setFollowingIds] = useState<string[] | null>(null);

  const [activeTab, setActiveTab] = useState('for-you');

  const followingMediaQuery = useMemoFirebase(() => {
    if (firestore && followingIds && followingIds.length > 0) {
      return query(
        collection(firestore, 'media'),
        where('authorId', 'in', followingIds),
        orderBy('uploadDate', 'desc')
      );
    }
    return null;
  }, [firestore, followingIds]);

  const { data: followingMedia, isLoading: isFollowingMediaLoading } = useCollection<MediaType>(followingMediaQuery);


  useEffect(() => {
    if (user && firestore) {
      const getFollowing = async () => {
        const followingCol = collection(firestore, 'users', user.uid, 'following');
        const snapshot = await getDocs(followingCol);
        const ids = snapshot.docs.map(doc => doc.id);
        setFollowingIds(ids);
      };
      getFollowing();
    } else {
      setFollowingIds([]); // Empty array for non-logged-in users
    }
  }, [user, firestore]);
  
  const initialFilter = searchParams.get('filter') === 'nude' ? 'nude' : 'all';
  const [filter, setFilter] = useState<'all' | 'nude'>(initialFilter);

  const sortedMedia = useMemo(() => {
    const sourceMedia = activeTab === 'following' ? (followingIds?.length === 0 ? [] : followingMedia) : media;
    if (!sourceMedia) return [];
    return sourceMedia;
  }, [media, followingMedia, activeTab, followingIds]);

  const filteredMedia = useMemo(() => {
    if (filter === 'all') {
      return sortedMedia.filter(item => !item.isNude);
    }
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
  const imagesPerPage = 10;
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
      setFilter('all');
    }
  }, [searchParams, isAgeConfirmed]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filter, activeTab]);

  const renderContent = () => {
    const isFeedLoading = isLoading || isUserLoading || (activeTab === 'following' && (isFollowingMediaLoading || followingIds === null));
    if (isFeedLoading) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[50vh]">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">Loading Feed...</p>
        </div>
      );
    }

    return (
       <>
        {paginatedMedia.length === 0 ? (
          <p className="col-span-full text-center text-muted-foreground min-h-[30vh] flex items-center justify-center">
            {activeTab === 'following' ? "You're not following anyone yet, or they haven't posted." : "No media in this category yet."}
          </p>
        ) : (
          <>
            <div className="max-w-md mx-auto space-y-8">
              {paginatedMedia.map((item, index) => (
                <ImageCard key={item.id} media={item} index={index} layout="feed" />
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
      </>
    );
  }


  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow">
        <section ref={galleryRef} id="gallery" className="py-8 sm:py-12 scroll-mt-20">
          <div className="container px-4 sm:px-6">
            <div className="flex justify-center mb-6 sm:mb-8">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-auto">
                    <TabsList>
                        <TabsTrigger value="following" disabled={!user}>Following</TabsTrigger>
                        <TabsTrigger value="for-you">For You</TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>
            
            {renderContent()}

          </div>
        </section>
      </main>

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

    