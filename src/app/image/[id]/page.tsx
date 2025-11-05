
'use client';

import { useParams } from 'next/navigation';
import { useDoc, useFirestore, useMemoFirebase, useCollection } from '@/firebase';
import { doc, Timestamp, collection } from 'firebase/firestore';
import type { Media as MediaType } from '@/lib/types';
import Image from 'next/image';
import { Header } from '@/components/header';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, Heart, MessageCircle, Send, Share2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { ImageCard } from '@/components/image-card';


// --- Time-based Like Calculation Logic ---

/**
 * Generates a pseudo-random but deterministic number from a string (like a media ID).
 * This ensures the same ID always produces the same base like count.
 * @param seed The string to use as a seed.
 * @returns A number between 0 and 1.
 */
const seededRandom = (seed: string): number => {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  const result = (hash & 0x7fffffff) / 0x7fffffff;
  return result;
};


// Calculate the number of likes based on the time since upload.
const calculateLikes = (uploadDate: Timestamp, mediaId: string): number => {
    // Use a deterministic random number based on media ID for the base.
    const baseLikes = Math.floor(seededRandom(mediaId) * 450) + 50; // Random base between 50 and 500
    const now = Date.now();
    const uploadTime = uploadDate.toDate().getTime();
    const elapsedMs = Math.max(0, now - uploadTime);
    const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;

    // Stop calculating new likes after 7 days.
    if (elapsedMs > sevenDaysInMs) {
        return baseLikes + calculateLikesForDuration(sevenDaysInMs);
    }
    
    return baseLikes + calculateLikesForDuration(elapsedMs);
};

const calculateLikesForDuration = (durationMs: number): number => {
    let likes = 0;
    const intervals = [
        { duration: 60 * 60 * 1000, ratePerMinute: 2 }, // 1 hour at 2 likes/min
        { duration: 2 * 60 * 60 * 1000, ratePerHour: 1 }, // Next 2 hours at 1 like/hr (2 likes every 2 hours)
        { duration: 4 * 60 * 60 * 1000, ratePerHour: 0.5 }, // Next 4 hours at 0.5 likes/hr (2 likes every 4 hours)
        { duration: 8 * 60 * 60 * 1000, ratePerHour: 0.25 }, // Next 8 hours at 0.25 likes/hr (2 likes every 8 hours)
        { duration: 24 * 60 * 60 * 1000, ratePerHour: 0.125 }, // Next 24 hours at ~3 likes/day
        { duration: Infinity, ratePerHour: 0.05 }, // Remainder of the week
    ];

    let elapsed = 0;
    for (const interval of intervals) {
        const intervalDuration = Math.min(durationMs - elapsed, interval.duration);
        
        if (intervalDuration <= 0) break;
        
        if (interval.ratePerMinute) {
            likes += (intervalDuration / (60 * 1000)) * interval.ratePerMinute;
        } else if (interval.ratePerHour) {
            likes += (intervalDuration / (60 * 60 * 1000)) * interval.ratePerHour;
        }
        
        elapsed += intervalDuration;
    }

    return Math.floor(likes);
};

// Calculate initial comments based on a percentage of likes.
const calculateInitialComments = (likes: number): number => {
  const minPercentage = 0.05; // 5%
  const maxPercentage = 0.10; // 10%
  const percentage = Math.random() * (maxPercentage - minPercentage) + minPercentage;
  return Math.floor(likes * percentage);
};

export default function ImagePage() {
  const { id } = useParams();
  const { toast } = useToast();
  const mediaId = Array.isArray(id) ? id[0] : id;

  const firestore = useFirestore();

  const mediaDocRef = useMemoFirebase(
    () => (firestore && mediaId ? doc(firestore, 'media', mediaId) : null),
    [firestore, mediaId]
  );
  const { data: media, isLoading: isMediaLoading } = useDoc<MediaType>(mediaDocRef);

  const mediaCollection = useMemoFirebase(() => firestore ? collection(firestore, 'media') : null, [firestore]);
  const { data: allMedia, isLoading: isAllMediaLoading } = useCollection<MediaType>(mediaCollection);

  const recommendedMedia = useMemo(() => {
    if (!allMedia || !media) return [];
  
    // 1. Filter out the current item
    const otherMedia = allMedia.filter(item => item.id !== media.id);
  
    // 2. Determine the context (nude or not nude)
    const isNudeContext = media.isNude;
  
    // 3. Create the primary pool based on the context
    const recommendationPool = otherMedia.filter(item => !!item.isNude === isNudeContext);
  
    // 4. Prioritize same media type within the pool
    const sameType = recommendationPool.filter(item => item.mediaType === media.mediaType);
    const otherType = recommendationPool.filter(item => item.mediaType !== media.mediaType);
  
    // 5. Shuffle and take 8
    const shuffled = [...sameType, ...otherType].sort(() => 0.5 - Math.random());
    
    return shuffled.slice(0, 8);
  }, [allMedia, media]);

  const [likeCount, setLikeCount] = useState<number | null>(null);
  const [commentCount, setCommentCount] = useState<number | null>(null);
  
  const initialCounts = useMemo(() => {
    if (media?.uploadDate) {
      const initialLikes = calculateLikes(media.uploadDate, media.id);
      const initialComments = calculateInitialComments(initialLikes);
      return { initialLikes, initialComments };
    }
    return { initialLikes: 0, initialComments: 0 };
  }, [media?.uploadDate, media?.id]);

  useEffect(() => {
    if (!media) return;

    setLikeCount(initialCounts.initialLikes);
    setCommentCount(initialCounts.initialComments);

    const interval = setInterval(() => {
        if (media.uploadDate) {
            const currentLikes = calculateLikes(media.uploadDate, media.id);
            setLikeCount(currentLikes);

            if(initialCounts.initialLikes > 0){
                const growthFactor = currentLikes / initialCounts.initialLikes;
                setCommentCount(Math.floor(initialCounts.initialComments * growthFactor));
            }
        }
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [media, initialCounts]);

  const formatCount = (count: number | null): string => {
    if (count === null) return '...';
    if (count >= 1000) {
      return (count / 1000).toFixed(1) + 'k';
    }
    return count.toLocaleString();
  };
  
  const handleShare = async (e: React.MouseEvent) => {
    if (!media) return;
    e.stopPropagation();
    const shareData = {
      title: media.title,
      text: `Check out this item on EVYKA: ${media.title}`,
      url: window.location.href
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareData.url);
        toast({
          title: 'Link Copied',
          description: 'A shareable link has been copied to your clipboard.',
        });
      }
    } catch (error: any) {
      if (error.name === 'NotAllowedError') {
        await navigator.clipboard.writeText(shareData.url);
        toast({
          title: 'Link Copied',
          description: 'Sharing was blocked, so the link was copied instead.',
        });
      } else {
        console.error('Share failed:', error);
        toast({
          variant: 'destructive',
          title: 'Share Failed',
          description: 'Could not share the media at this time.',
        });
      }
    }
  };


  const renderContent = () => {
    if (isMediaLoading) {
      return (
        <div className="flex-grow flex flex-col items-center justify-center p-4 text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-muted-foreground mt-4">Loading ...</p>
        </div>
      );
    }

    if (!media) {
      return (
          <div className="flex-grow flex items-center justify-center text-center">
            <div>
                <h2 className="text-2xl font-bold mb-4">Media Not Found</h2>
                <p className="text-muted-foreground mb-6">The item you are looking for does not exist or may have been removed.</p>
                <Button asChild>
                    <Link href="/#gallery">Back to Gallery</Link>
                </Button>
            </div>
          </div>
      );
    }
    
    const renderMediaContent = () => {
        if (media.mediaType === 'video') {
            let videoSrc = media.mediaUrl;
            const isGoogleDrive = media.mediaUrl.includes('drive.google.com');

            if (isGoogleDrive) {
                videoSrc = media.mediaUrl.replace('/view?usp=drivesdk', '').replace('/view', '').replace('file/d/', 'file/d/') + '/preview';
            }
            
            return (
                <div className="relative w-full h-[80vh] max-w-7xl bg-black">
                    {isGoogleDrive ? (
                        <iframe
                            src={videoSrc}
                            allow="autoplay"
                            className="w-full h-full object-contain"
                            frameBorder="0"
                        />
                    ) : (
                        <video
                            src={videoSrc}
                            controls
                            autoPlay
                            className="w-full h-full object-contain"
                        />
                    )}
                </div>
            )
        }
        return (
            <div className="relative w-full h-[75vh] max-w-7xl">
              <Image
                src={media.mediaUrl}
                alt={media.title}
                fill
                className="object-contain"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              />
            </div>
        )
    };
    
    return (
      <>
        <div className="flex-grow flex flex-col items-center justify-start pt-8">
          {renderMediaContent()}
          <div className="w-full max-w-4xl mx-auto p-4 sm:p-6 md:p-8 text-center">
              <h1 className="text-3xl md:text-5xl font-bold font-headline">{media.title}</h1>
              <p className="text-lg md:text-xl text-muted-foreground mt-4 max-w-prose mx-auto">{media.description}</p>
              <div className="flex justify-center items-center gap-4 mt-6">
                 <Button variant="ghost" className="h-auto px-2 py-1" asChild>
                      <a href="https://www.effectivegatecpm.com/zfpu3dtsu?key=f16f8220857452f455eed8c64dfabf18" target="_blank" rel="noopener noreferrer">
                          <Heart className="h-5 w-5" />
                          <span className="ml-2 text-base font-semibold">{formatCount(likeCount)}</span>
                      </a>
                  </Button>
                  <Button variant="ghost" className="h-auto px-2 py-1" asChild>
                       <a href="https://www.effectivegatecpm.com/zfpu3dtsu?key=f16f8220857452f455eed8c64dfabf18" target="_blank" rel="noopener noreferrer">
                          <MessageCircle className="h-5 w-5" />
                          <span className="ml-2 text-base font-semibold">{formatCount(commentCount)}</span>
                      </a>
                  </Button>
                   <Button variant="ghost" size="icon" asChild>
                      <a href="https://www.effectivegatecpm.com/zfpu3dtsu?key=f16f8220857452f455eed8c64dfabf18" target="_blank" rel="noopener noreferrer">
                          <Send className="h-5 w-5" />
                          <span className="sr-only">Message</span>
                      </a>
                  </Button>
                   <Button variant="ghost" size="icon" onClick={handleShare}>
                      <Share2 className="h-5 w-5" />
                      <span className="sr-only">Share</span>
                  </Button>
              </div>
          </div>
        </div>

        {recommendedMedia.length > 0 && (
          <section className="py-8 sm:py-12 bg-muted/50">
            <div className="container px-4 sm:px-6">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight font-headline text-center mb-6 sm:mb-8">
                You Might Also Like
              </h2>
              <div className="max-w-md mx-auto space-y-8">
                {isAllMediaLoading
                  ? Array.from({ length: 4 }).map((_, i) => (
                      <Skeleton key={i} className="w-full h-96 rounded-lg" />
                    ))
                  : recommendedMedia.map((item, index) => <ImageCard key={item.id} media={item} layout="feed" index={index} />)}
              </div>
            </div>
          </section>
        )}
      </>
    );
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow flex flex-col items-stretch justify-center">
        {renderContent()}
      </main>
    </div>
  );
}
