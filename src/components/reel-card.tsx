
'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import type { Media as MediaType, User as UserType } from '@/lib/types';
import { Loader2, Volume2, VolumeX, Play, Heart, MessageCircle, Send, Share2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useInView } from 'react-intersection-observer';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { Button } from './ui/button';
import { useToast } from '@/hooks/use-toast';

type ReelCardProps = {
  reel: MediaType;
};

export function ReelCard({ reel }: ReelCardProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isWaiting, setIsWaiting] = useState(false);
  const { toast } = useToast();

  const firestore = useFirestore();

  const authorDocRef = useMemoFirebase(
    () => (firestore && reel.authorId ? doc(firestore, 'users', reel.authorId) : null),
    [firestore, reel.authorId]
  );
  const { data: author } = useDoc<UserType>(authorDocRef);

  const { ref, inView } = useInView({
    threshold: 0.7,
  });

  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      if (inView) {
        setIsWaiting(true);
        video.play().then(() => {
          setIsPlaying(true);
          setIsWaiting(false);
        }).catch((error) => {
          setIsPlaying(false);
          setIsWaiting(false);
        });
      } else {
        video.pause();
        setIsPlaying(false);
        video.currentTime = 0;
      }
    }
  }, [inView]);


  const handleVideoClick = () => {
    const video = videoRef.current;
    if (video) {
      if (video.paused) {
        video.play();
        setIsPlaying(true);
      } else {
        video.pause();
        setIsPlaying(false);
      }
    }
  };

  const handleToggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (video) {
        video.muted = !video.muted;
        setIsMuted(video.muted);
    }
  };

  const handleWaiting = () => {
    if (inView) setIsWaiting(true);
  }

  const handlePlaying = () => {
    setIsWaiting(false);
    setIsPlaying(true);
  }
  
  const handlePause = () => {
    setIsPlaying(false);
  }

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const shareData = {
      title: reel.title,
      text: `Check out this reel on EVYKA: ${reel.title}`,
      url: window.location.origin + '/image/' + reel.id
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
        console.error('Share failed:', error);
        toast({
          variant: 'destructive',
          title: 'Share Failed',
          description: 'Could not share the reel at this time.',
        });
    }
  };
  
  const getInitials = (name?: string | null) => {
    if (!name) return 'U';
    return name.substring(0, 2).toUpperCase();
  };

  let videoSrc = reel.mediaUrl;
  const isGoogleDrive = reel.mediaUrl.includes('drive.google.com');

  if (isGoogleDrive) {
    videoSrc = reel.mediaUrl.replace('/view?usp=drivesdk', '').replace('/view', '').replace('file/d/', 'file/d/') + '/preview';
  }

  return (
    <div ref={ref} className="relative h-full w-full snap-center flex items-center justify-center bg-black">
      <video
        ref={videoRef}
        src={videoSrc}
        loop
        playsInline
        muted={isMuted}
        className="h-full w-full object-contain"
        onClick={handleVideoClick}
        onWaiting={handleWaiting}
        onPlaying={handlePlaying}
        onPause={handlePause}
        preload="auto"
      />
      
      {isWaiting && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none">
          <Loader2 className="h-12 w-12 text-white animate-spin" />
        </div>
      )}

      {!isPlaying && !isWaiting && (
         <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none" onClick={handleVideoClick}>
          <Play className="h-20 w-20 text-white/70" />
        </div>
      )}

      <div className="absolute bottom-0 left-0 right-0 p-4 z-10 bg-gradient-to-t from-black/50 to-transparent pointer-events-none">
        <div className="flex items-center gap-2">
            <Avatar className="h-9 w-9 border-2 border-white/50">
              <AvatarImage src={author?.profileImageUrl || ''} />
              <AvatarFallback>{getInitials(author?.username)}</AvatarFallback>
            </Avatar>
            <p className="font-bold text-white drop-shadow-md">{author?.username}</p>
        </div>
        <h3 className="font-semibold text-white text-lg mt-2 drop-shadow-md">{reel.title}</h3>
        <p className="text-white/90 text-sm drop-shadow-md max-w-sm">{reel.description}</p>
      </div>
      
      <div className="absolute bottom-20 right-2 flex flex-col gap-4 z-10">
        <Button variant="ghost" size="icon" className="h-12 w-12 flex-col gap-1 text-white hover:text-white hover:bg-white/20">
          <Heart className="h-7 w-7" />
          <span className="text-xs">Like</span>
        </Button>
        <Button variant="ghost" size="icon" className="h-12 w-12 flex-col gap-1 text-white hover:text-white hover:bg-white/20">
          <MessageCircle className="h-7 w-7" />
           <span className="text-xs">Comment</span>
        </Button>
        <Button variant="ghost" size="icon" className="h-12 w-12 flex-col gap-1 text-white hover:text-white hover:bg-white/20" onClick={handleShare}>
          <Share2 className="h-7 w-7" />
           <span className="text-xs">Share</span>
        </Button>
      </div>

      <button onClick={handleToggleMute} className="absolute top-4 right-4 z-10 p-2 bg-black/30 rounded-full">
        {isMuted ? <VolumeX className="h-6 w-6 text-white" /> : <Volume2 className="h-6 w-6 text-white" />}
      </button>
    </div>
  );
}
