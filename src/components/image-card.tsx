
'use client';

import type { Media as MediaType } from '@/lib/types';
import Image from 'next/image';
import { useState, useRef, useEffect, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from './ui/button';
import {
  MoreVertical,
  Edit,
  Trash2,
  Share2,
  PlayCircle,
  Upload,
  Heart,
  MessageCircle,
  Send,
  Loader2,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
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
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogHeader,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from './ui/dialog';
import {
  useFirestore,
  useUser,
  useAuth,
} from '@/firebase';
import {
  doc,
  Timestamp,
} from 'firebase/firestore';
import {
  deleteDocumentNonBlocking,
  updateDocumentNonBlocking,
} from '@/firebase/non-blocking-updates';
import { initiateAnonymousSignIn } from '@/firebase/non-blocking-login';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { uploadMedia } from '@/ai/flows/upload-media-flow';
import { cn } from '@/lib/utils';
import { Checkbox } from './ui/checkbox';

type ImageCardProps = {
  media: MediaType;
  index?: number;
  showAdminControls?: boolean;
};

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

export function ImageCard({ media: mediaItem, index = 0, showAdminControls = false }: ImageCardProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);

  const [likeCount, setLikeCount] = useState<number | null>(null);
  const [commentCount, setCommentCount] = useState<number | null>(null);
  const [baseCommentCount, setBaseCommentCount] = useState(0);
  
  const [isEditDialogOpen, setEditDialogOpen] = useState(false);
  const [mediaToEdit, setMediaToEdit] = useState<Partial<MediaType> & { id: string } | null>(null);
  const [mediaToDelete, setMediaToDelete] = useState<MediaType | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);


  // Memoize the initial likes and comments so they are stable per card
  const initialCounts = useMemo(() => {
    if (mediaItem.uploadDate) {
      const initialLikes = calculateLikes(mediaItem.uploadDate, mediaItem.id);
      const initialComments = calculateInitialComments(initialLikes);
      return { initialLikes, initialComments };
    }
    return { initialLikes: 0, initialComments: 0 };
  }, [mediaItem.uploadDate, mediaItem.id]);


  useEffect(() => {
    setLikeCount(initialCounts.initialLikes);
    setCommentCount(initialCounts.initialComments);
    setBaseCommentCount(initialCounts.initialComments); // Store base for consistent growth

    const interval = setInterval(() => {
        if (mediaItem.uploadDate) {
            const currentLikes = calculateLikes(mediaItem.uploadDate, mediaItem.id);
            setLikeCount(currentLikes);

            // Grow comments proportionally to likes
            if(initialCounts.initialLikes > 0){
                const growthFactor = currentLikes / initialCounts.initialLikes;
                setCommentCount(Math.floor(initialCounts.initialComments * growthFactor));
            }
        }
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [mediaItem.uploadDate, mediaItem.id, initialCounts]);

  useEffect(() => {
    const video = videoRef.current;
    if (video) {
        const handleTimeUpdate = () => {
            if (video.currentTime >= 3) {
                video.currentTime = 0;
            }
        };
        video.addEventListener('timeupdate', handleTimeUpdate);

        // Attempt to play the video. This might be blocked by the browser.
        const playPromise = video.play();
        if (playPromise !== undefined) {
            playPromise.catch(error => {
                // Autoplay was prevented.
                // You can optionally show a play button to the user here.
                console.log("Autoplay was prevented for video: ", mediaItem.id);
            });
        }

        return () => {
            video.removeEventListener('timeupdate', handleTimeUpdate);
        };
    }
  }, [videoRef, mediaItem.id]);

  const isOwner = user && user.uid === mediaItem.authorId;

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMediaToEdit(mediaItem);
    setEditDialogOpen(true);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMediaToDelete(mediaItem);
  };
  
  const confirmDelete = () => {
    if (!mediaToDelete || !firestore) return;
    const docRef = doc(firestore, 'media', mediaToDelete.id);
    deleteDocumentNonBlocking(docRef);

    toast({
        title: "Media Deleted",
        description: "The media has been successfully removed.",
        variant: "destructive",
      });
    setMediaToDelete(null);
  }
  
  const handleSaveEdit = async () => {
    if (!mediaToEdit || !firestore) return;
    setIsUpdating(true);

    const docRef = doc(firestore, 'media', mediaToEdit.id);
    
    try {
      await updateDocumentNonBlocking(docRef, {
        title: mediaToEdit.title,
        description: mediaToEdit.description,
        isNude: mediaToEdit.isNude,
        isReel: mediaToEdit.isReel,
      });

      toast({
          title: "Media Updated",
          description: "The media details have been successfully updated.",
      });
      setEditDialogOpen(false);
      setMediaToEdit(null);
    } catch(error: any) {
        toast({
          variant: 'destructive',
          title: 'Update Failed',
          description: error.message || 'An unknown error occurred.',
        });
    } finally {
        setIsUpdating(false);
    }
  }


  const formatCount = (count: number | null): string => {
    if (count === null) return '...';
    if (count >= 1000) {
      return (count / 1000).toFixed(1) + 'k';
    }
    return count.toLocaleString();
  };


  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const shareData = {
      title: mediaItem.title,
      text: `Check out this item on EVYKA: ${mediaItem.title}`,
      url: window.location.origin + '/image/' + mediaItem.id
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
  
  const handleCardClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!user) {
      initiateAnonymousSignIn(auth);
    }
    router.push(`/image/${mediaItem.id}`);
  };

  const isVideo = mediaItem.mediaType === 'video';
  const isGoogleDrive = isVideo && mediaItem.mediaUrl.includes('drive.google.com');


  const renderMedia = () => {
    if (isVideo) {
      const showVideoElement = !isGoogleDrive || (isGoogleDrive && !!mediaItem.thumbnailUrl);
      const posterUrl = isGoogleDrive ? mediaItem.thumbnailUrl : mediaItem.thumbnailUrl || undefined;

      return (
        <>
          {showVideoElement ? (
            <video
              ref={videoRef}
              src={mediaItem.mediaUrl}
              poster={posterUrl}
              muted
              loop
              playsInline
              className="object-cover w-full h-full transition-all duration-300 ease-in-out"
            />
          ) : (
            <div className="w-full h-full bg-black flex items-center justify-center">
              {/* Placeholder for GDrive video without thumbnail */}
            </div>
          )}
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
            <PlayCircle className="h-16 w-16 text-white/90" />
          </div>
        </>
      );
    }

    return (
        <Image
          src={mediaItem.mediaUrl}
          alt={mediaItem.title}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover transition-all duration-300 ease-in-out group-hover:scale-105"
          data-ai-hint="photo"
        />
    );
  };

  return (
    <>
      <Card 
        className={cn(
          "group overflow-hidden flex flex-col cursor-pointer",
          "opacity-0 animate-fade-in-up"
        )}
        style={{ animationDelay: `${index * 50}ms` }}
        onClick={handleCardClick}
      >
        <CardHeader className="p-0 relative">
          <div className="relative aspect-[3/4] w-full overflow-hidden bg-card rounded-t-lg">
              {renderMedia()}
          </div>
          {showAdminControls && isOwner && (
            <div className="absolute top-2 right-2">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                    <Button variant="secondary" size="icon" className="h-8 w-8 rounded-full" onClick={(e) => e.stopPropagation()}>
                        <MoreVertical className="h-4 w-4" />
                    </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenuItem onClick={handleEditClick}>
                            <Edit className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleDeleteClick} className="text-destructive focus:text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
          )}
        </CardHeader>
        <CardContent className="p-4 flex-grow flex flex-col">
            <div className="flex-grow">
              <CardTitle className="text-base leading-tight mb-1 truncate hover:underline">
              {mediaItem.title}
              </CardTitle>
            </div>
        </CardContent>
        <CardFooter className="p-4 pt-0 flex justify-between items-center mt-auto">
            <Button variant="ghost" size="sm" className="h-auto p-2 flex items-center" asChild>
                <a href="https://www.effectivegatecpm.com/zfpu3dtsu?key=f16f8220857452f455eed8c64dfabf18" target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                    <Heart className="h-4 w-4" />
                    <span className="ml-1 text-sm font-semibold">{formatCount(likeCount)}</span>
                </a>
            </Button>
            <div className="flex items-center">
                <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8" onClick={handleShare}>
                    <Share2 className="h-4 w-4" />
                    <span className="sr-only">Share</span>
                </Button>
            </div>
        </CardFooter>
      </Card>
      
      <AlertDialog open={!!mediaToDelete} onOpenChange={(open) => !open && setMediaToDelete(null)}>
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the media from the platform.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={(e) => { e.stopPropagation(); setMediaToDelete(null); }}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">
                Delete
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent onClick={(e) => e.stopPropagation()}>
            <DialogHeader>
            <DialogTitle>Edit Media</DialogTitle>
            <DialogDescription>
                Update the details for this media item.
            </DialogDescription>
            </DialogHeader>
            {mediaToEdit && <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-4">
                <div className="grid w-full items-center gap-1.5">
                    <Label htmlFor="edit-title">Title</Label>
                    <Input id="edit-title" value={mediaToEdit.title || ''} onChange={(e) => setMediaToEdit(p => p ? {...p, title: e.target.value} : null)} />
                </div>
                <div className="grid w-full items-center gap-1.5">
                    <Label htmlFor="edit-description">Description</Label>
                    <Textarea id="edit-description" value={mediaToEdit.description || ''} onChange={(e) => setMediaToEdit(p => p ? {...p, description: e.target.value} : null)} />
                </div>
                <div className="flex items-center space-x-2 mt-2">
                    <Checkbox id="isReel" checked={!!mediaToEdit.isReel} onCheckedChange={(checked) => setMediaToEdit(p => p ? {...p, isReel: !!checked} : null) } />
                    <Label htmlFor="isReel">Mark as Reel</Label>
                </div>
                <div className="flex items-center space-x-2 mt-2">
                    <Checkbox id="isNude" checked={!!mediaToEdit.isNude} onCheckedChange={(checked) => setMediaToEdit(p => p ? {...p, isNude: !!checked} : null) } />
                    <Label htmlFor="isNude">Mark as 18+ Content</Label>
                </div>
            </div>}
            <DialogFooter className="flex-col-reverse sm:flex-row pt-4 border-t">
                <DialogClose asChild>
                    <Button type="button" variant="secondary" onClick={(e) => { e.stopPropagation(); setEditDialogOpen(false)}}>Cancel</Button>
                </DialogClose>
                <Button onClick={handleSaveEdit} disabled={isUpdating}>
                    {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isUpdating ? 'Saving...' : 'Save Changes'}
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
