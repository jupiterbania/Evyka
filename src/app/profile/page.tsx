'use client';

import { useMemo } from 'react';
import { collection, query, where } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import type { Media as MediaType, User as AppUser } from '@/lib/types';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { Loader2 } from 'lucide-react';
import { ImageCard } from '@/components/image-card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function ProfilePage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const userMediaQuery = useMemoFirebase(
    () =>
      firestore && user
        ? query(collection(firestore, 'media'), where('authorId', '==', user.uid))
        : null,
    [firestore, user]
  );

  const { data: userMedia, isLoading: isMediaLoading } = useCollection<MediaType>(userMediaQuery);

  const sortedMedia = useMemo(() => {
    if (!userMedia) return [];
    return [...userMedia].sort((a, b) => (b.uploadDate?.toMillis() || 0) - (a.uploadDate?.toMillis() || 0));
  }, [userMedia]);

  const getInitials = (name?: string | null) => {
    if (!name) return 'U';
    const names = name.split(' ');
    if (names.length > 1 && names[0] && names[names.length - 1]) {
      return names[0][0] + names[names.length - 1][0];
    }
    return name.substring(0, 2);
  };

  const renderContent = () => {
    if (isUserLoading || (isMediaLoading && !userMedia)) {
      return (
        <div className="flex-grow flex flex-col items-center justify-center p-4 text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-muted-foreground mt-4">Loading Profile...</p>
        </div>
      );
    }
    
    if (!user) {
        return (
            <div className="flex-grow flex flex-col items-center justify-center p-4 text-center">
                <h2 className="text-2xl font-bold mb-4">Please Sign In</h2>
                <p className="text-muted-foreground mb-6">You need to be logged in to view your profile.</p>
                <Button asChild>
                    <Link href="/">Back to Home</Link>
                </Button>
            </div>
        );
    }

    return (
      <>
        <section className="py-8 sm:py-12 bg-muted/20">
            <div className="container px-4 sm:px-6 flex flex-col items-center text-center">
                <Avatar className="h-24 w-24 mb-4 border-2 border-primary">
                    <AvatarImage src={user.photoURL || undefined} alt={user.displayName || 'User'} />
                    <AvatarFallback className="text-3xl">{getInitials(user.displayName)}</AvatarFallback>
                </Avatar>
                <h1 className="text-3xl font-bold font-headline">{user.displayName}</h1>
                <p className="text-muted-foreground">{user.email}</p>
            </div>
        </section>

        <section className="py-8 sm:py-12">
            <div className="container px-4 sm:px-6">
                 <h2 className="text-2xl sm:text-3xl font-bold tracking-tight font-headline text-center mb-6 sm:mb-8">
                    My Uploads
                </h2>
                {isMediaLoading ? (
                     <div className="flex flex-col items-center justify-center min-h-[30vh]">
                        <Loader2 className="h-12 w-12 animate-spin text-primary" />
                     </div>
                ) : sortedMedia.length === 0 ? (
                    <p className="text-center text-muted-foreground min-h-[20vh] flex items-center justify-center">
                        You haven't uploaded any media yet.
                    </p>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                        {sortedMedia.map((item, index) => (
                            <ImageCard key={item.id} media={item} index={index} />
                        ))}
                    </div>
                )}
            </div>
        </section>
      </>
    );
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow">{renderContent()}</main>
      <Footer />
    </div>
  );
}
