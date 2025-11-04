'use client';

import { useMemo, useState } from 'react';
import { collection, query, where, doc, updateDoc } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import type { Media as MediaType, User as AppUser } from '@/lib/types';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { Loader2, Edit } from 'lucide-react';
import { ImageCard } from '@/components/image-card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { uploadMedia } from '@/ai/flows/upload-media-flow';
import { updateProfile } from 'firebase/auth';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';


export default function ProfilePage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [isEditOpen, setEditOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [profileData, setProfileData] = useState({ displayName: '', photoFile: null as File | null });

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
  
  const handleEditOpen = () => {
    if (user) {
      setProfileData({ displayName: user.displayName || '', photoFile: null });
      setEditOpen(true);
    }
  };

  const handleProfileSave = async () => {
    if (!user || !firestore) return;
    setIsUploading(true);

    try {
        let photoURL = user.photoURL;

        // 1. Upload new photo if selected
        if (profileData.photoFile) {
            const reader = await new Promise<string>((resolve, reject) => {
                const fileReader = new FileReader();
                fileReader.readAsDataURL(profileData.photoFile!);
                fileReader.onload = () => resolve(fileReader.result as string);
                fileReader.onerror = (error) => reject(error);
            });
            const uploadResult = await uploadMedia({ mediaDataUri: reader, isVideo: false });
            if (!uploadResult?.mediaUrl) throw new Error("Photo upload failed.");
            photoURL = uploadResult.mediaUrl;
        }

        // 2. Update Firebase Auth profile
        await updateProfile(user, {
            displayName: profileData.displayName,
            photoURL: photoURL,
        });

        // 3. Update Firestore user document
        const userDocRef = doc(firestore, 'users', user.uid);
        updateDocumentNonBlocking(userDocRef, {
            username: profileData.displayName,
            profileImageUrl: photoURL,
        });
        
        toast({ title: "Profile Updated Successfully!" });
        setEditOpen(false);

    } catch (error: any) {
        toast({
            variant: 'destructive',
            title: "Update Failed",
            description: error.message || "Could not update your profile.",
        });
    } finally {
        setIsUploading(false);
    }
  };


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
            <div className="container px-4 sm:px-6 flex flex-col items-center text-center relative">
                <Avatar className="h-24 w-24 mb-4 border-2 border-primary">
                    <AvatarImage src={user.photoURL || undefined} alt={user.displayName || 'User'} />
                    <AvatarFallback className="text-3xl">{getInitials(user.displayName)}</AvatarFallback>
                </Avatar>
                <h1 className="text-3xl font-bold font-headline">{user.displayName}</h1>
                <p className="text-muted-foreground">{user.email}</p>
                <Button variant="outline" size="sm" className="mt-4" onClick={handleEditOpen}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Profile
                </Button>
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
                            <ImageCard key={item.id} media={item} index={index} showAdminControls={true} />
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

      <Dialog open={isEditOpen} onOpenChange={setEditOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Edit Your Profile</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="grid w-full items-center gap-1.5">
                    <Label htmlFor="displayName">Display Name</Label>
                    <Input id="displayName" value={profileData.displayName} onChange={(e) => setProfileData(p => ({...p, displayName: e.target.value}))} />
                </div>
                <div className="grid w-full items-center gap-1.5">
                    <Label htmlFor="photoFile">Profile Picture</Label>
                    <Input id="photoFile" type="file" accept="image/*" onChange={(e) => setProfileData(p => ({...p, photoFile: e.target.files ? e.target.files[0] : null}))} />
                </div>
            </div>
            <DialogFooter>
                <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                <Button onClick={handleProfileSave} disabled={isUploading}>
                    {isUploading ? 'Saving...' : 'Save Changes'}
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
