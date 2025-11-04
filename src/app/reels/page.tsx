'use client';

import { useMemo, useRef, useEffect } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import type { Media as MediaType } from '@/lib/types';
import { Header } from '@/components/header';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

function ReelCard({ media }: { media: MediaType }) {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        videoRef.current?.play().catch(error => {
                            console.warn("Autoplay prevented for reel:", media.id, error);
                        });
                    } else {
                        videoRef.current?.pause();
                    }
                });
            },
            { threshold: 0.5 } // Play when at least 50% of the video is visible
        );

        const currentVideoRef = videoRef.current;
        if (currentVideoRef) {
            observer.observe(currentVideoRef);
        }

        return () => {
            if (currentVideoRef) {
                observer.unobserve(currentVideoRef);
            }
        };
    }, [media.id]);

    return (
        <div className="h-screen w-full flex-shrink-0 snap-center flex items-center justify-center bg-black relative">
            <video
                ref={videoRef}
                src={media.mediaUrl}
                loop
                muted
                playsInline
                className="w-full h-full object-contain"
                poster={media.thumbnailUrl}
            />
            <div className="absolute bottom-10 left-0 p-4 bg-gradient-to-t from-black/60 to-transparent w-full text-white">
                <h3 className="font-bold text-lg drop-shadow-md">{media.title}</h3>
                <p className="text-sm drop-shadow-sm">{media.description}</p>
            </div>
        </div>
    );
}

export default function ReelsPage() {
    const firestore = useFirestore();

    const reelsQuery = useMemoFirebase(
        () => firestore
            ? query(
                collection(firestore, 'media'),
                where('isReel', '==', true),
                orderBy('uploadDate', 'desc')
            )
            : null,
        [firestore]
    );

    const { data: reels, isLoading } = useCollection<MediaType>(reelsQuery);

    const renderContent = () => {
        if (isLoading) {
            return (
                <div className="flex-grow flex flex-col items-center justify-center text-center">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    <p className="text-muted-foreground mt-4">Loading Reels...</p>
                </div>
            );
        }

        if (!reels || reels.length === 0) {
            return (
                <div className="flex-grow flex items-center justify-center text-center">
                    <div>
                        <h2 className="text-2xl font-bold mb-4">No Reels Yet</h2>
                        <p className="text-muted-foreground mb-6">Check back later for new short videos!</p>
                        <Button asChild>
                            <Link href="/">Back to Home</Link>
                        </Button>
                    </div>
                </div>
            );
        }

        return (
            <div className="h-full snap-y snap-mandatory overflow-y-auto">
                {reels.map(reel => (
                    <ReelCard key={reel.id} media={reel} />
                ))}
            </div>
        );
    };

    return (
        <div className="flex flex-col h-screen overflow-hidden">
            <Header />
            <main className="flex-grow flex flex-col items-stretch justify-center h-full min-h-0">
                {renderContent()}
            </main>
        </div>
    );
}
