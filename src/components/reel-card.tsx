
'use client';

import { useState, useRef, useEffect } from 'react';
import type { Media as MediaType } from '@/lib/types';
import { Loader2, Volume2, VolumeX, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useInView } from 'react-intersection-observer';

type ReelCardProps = {
  reel: MediaType;
};

export function ReelCard({ reel }: ReelCardProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isWaiting, setIsWaiting] = useState(false);

  const { ref, inView } = useInView({
    threshold: 0.5, // Trigger when 50% of the video is visible
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
          console.error("Autoplay failed:", error);
          setIsPlaying(false);
          setIsWaiting(false);
        });
      } else {
        video.pause();
        setIsPlaying(false);
        video.currentTime = 0; // Reset video to the beginning when it's not in view
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
    if (inView) {
        setIsWaiting(true);
    }
  }

  const handlePlaying = () => {
    setIsWaiting(false);
    setIsPlaying(true);
  }
  
  const handlePause = () => {
    setIsPlaying(false);
  }

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
      
      {/* Loading Spinner */}
      {isWaiting && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none">
          <Loader2 className="h-12 w-12 text-white animate-spin" />
        </div>
      )}

      {/* Play Button Overlay */}
      {!isPlaying && !isWaiting && (
         <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none">
          <Play className="h-20 w-20 text-white/70" />
        </div>
      )}

      {/* Video Info */}
      <div className="absolute bottom-20 left-4 text-white z-10 pointer-events-none">
        <h3 className="font-bold text-lg drop-shadow-md">{reel.title}</h3>
        <p className="text-sm drop-shadow-md max-w-sm">{reel.description}</p>
      </div>
      
      {/* Mute/Unmute Button */}
      <button onClick={handleToggleMute} className="absolute top-4 right-4 z-10 p-2 bg-black/30 rounded-full">
        {isMuted ? <VolumeX className="h-6 w-6 text-white" /> : <Volume2 className="h-6 w-6 text-white" />}
      </button>
    </div>
  );
}
