
'use client';

import { useMemo, useState, useEffect } from 'react';
import { collection, query, where, doc, updateDoc, getDoc } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase, useUser, useAuth } from '@/firebase';
import type { Media as MediaType, User as AppUser } from '@/lib/types';
import { Header } from '@/components/header';
import { Loader2, Edit, Settings, LogOut, UserPlus } from 'lucide-react';
import { ImageCard } from '@/components/image-card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { uploadMedia } from '@/ai/flows/upload-media-flow';
import { toggleFollow } from '@/ai/flows/toggle-follow-flow';
import { updateProfile, signOut } from 'firebase/auth';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { Separator } from '@/components/ui/separator';
import { Logo } from '@/components/logo';

export default function ProfilePage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();

  const [isEditOpen, setEditOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [profileData, setProfileData] = useState({ displayName: '', photoFile: null as File | null });
  
  // State for the profile being viewed
  const [profileUser, setProfileUser] = useState<AppUser | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowLoading, setIsFollowLoading] = useState(false);

  // For this page, we'll assume we are viewing the logged-in user's profile.
  // This could be extended to view other profiles via a URL param.
  const profileUserId = user?.uid;

  const userDocRef = useMemoFirebase(
    () => (firestore && profileUserId ? doc(firestore, 'users', profileUserId) : null),
    [firestore, profileUserId]
  );
  const { data: userDoc, isLoading: isUserDocLoading } = useDoc<AppUser>(userDocRef);

  useEffect(() => {
    if (userDoc) {
      setProfileUser(userDoc);
    }
  }, [userDoc]);

  useEffect(() => {
    if (user && profileUserId && user.uid !== profileUserId) {
      const checkFollowing = async () => {
        setIsFollowLoading(true);
        const followDocRef = doc(firestore, 'users', user.uid, 'following', profileUserId);
        const followDoc = await getDoc(followDocRef);
        setIsFollowing(followDoc.exists());
        setIsFollowLoading(false);
      };
      checkFollowing();
    }
  }, [user, profileUserId, firestore]);

  const userMediaQuery = useMemoFirebase(
    () =>
      firestore && profileUserId
        ? query(collection(firestore, 'media'), where('authorId', '==', profileUserId))
        : null,
    [firestore, profileUserId]
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

  const handleSignOut = async () => {
    if (!auth) return;
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out', error);
    }
  };
  
  const handleFollowToggle = async () => {
    if (!user || !profileUserId || user.uid === profileUserId) return;
    setIsFollowLoading(true);
    try {
      const result = await toggleFollow({ currentUserId: user.uid, targetUserId: profileUserId });
      setIsFollowing(result.newState === 'followed');
      
      // Manually update follower count on the client for immediate feedback
      setProfileUser(prev => {
        if (!prev) return null;
        const currentFollowers = prev.followerCount || 0;
        return {
          ...prev,
          followerCount: result.newState === 'followed' ? currentFollowers + 1 : Math.max(0, currentFollowers - 1)
        }
      });
      
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setIsFollowLoading(false);
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
  
  const formatCount = (count?: number): string => {
    if (count === undefined || count === null) return '0';
    if (count >= 1000000) return (count / 1000000).toFixed(1) + 'M';
    if (count >= 1000) return (count / 1000).toFixed(1) + 'K';
    return count.toLocaleString();
  };

  const renderContent = () => {
    if (isUserLoading || isUserDocLoading) {
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
    
    if (!profileUser) {
        return (
            <div className="flex-grow flex flex-col items-center justify-center p-4 text-center">
                <h2 className="text-2xl font-bold mb-4">Profile Not Found</h2>
            </div>
        );
    }
    
    const isOwnProfile = user.uid === profileUser.id;

    return (
      <>
        <section className="py-8 sm:py-12 bg-muted/20">
            <div className="container px-4 sm:px-6 flex flex-col items-center text-center relative">
                <Avatar className="h-24 w-24 mb-4 border-2 border-primary">
                    <AvatarImage src={profileUser.profileImageUrl || undefined} alt={profileUser.username || 'User'} />
                    <AvatarFallback className="text-3xl">{getInitials(profileUser.username)}</AvatarFallback>
                </Avatar>
                <h1 className="text-3xl font-bold font-headline">{profileUser.username}</h1>
                <p className="text-muted-foreground">{profileUser.email}</p>
                
                 <div className="flex items-center gap-4 mt-4 text-sm">
                    <div>
                        <span className="font-bold">{formatCount(userMedia?.length)}</span>
                        <span className="text-muted-foreground ml-1">Posts</span>
                    </div>
                     <div className="cursor-pointer">
                        <span className="font-bold">{formatCount(profileUser.followerCount)}</span>
                        <span className="text-muted-foreground ml-1">Followers</span>
                    </div>
                    <div className="cursor-pointer">
                        <span className="font-bold">{formatCount(profileUser.followingCount)}</span>
                        <span className="text-muted-foreground ml-1">Following</span>
                    </div>
                </div>

                <div className="flex items-center gap-2 mt-4">
                  {isOwnProfile ? (
                    <>
                      <Button variant="outline" size="sm" onClick={handleEditOpen}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit Profile
                      </Button>
                       <Sheet>
                            <SheetTrigger asChild>
                                 <Button variant="outline" size="icon" className="h-9 w-9">
                                    <Settings className="h-4 w-4" />
                                    <span className="sr-only">Settings</span>
                                </Button>
                            </SheetTrigger>
                            <SheetContent>
                                <SheetHeader>
                                    <SheetTitle>Settings</SheetTitle>
                                    <SheetDescription>
                                        Application settings and information.
                                    </SheetDescription>
                                </SheetHeader>
                                <div className="py-8 grid gap-4">
                                    <Button variant="ghost" asChild className="justify-start">
                                      <Link href="/about">About Us</Link>
                                    </Button>
                                    <Button variant="ghost" asChild className="justify-start">
                                      <a href="https://www.instagram.com/heyevyka" target="_blank" rel="noopener noreferrer">Contact Us</a>
                                    </Button>
                                    <Separator />
                                    <Button variant="ghost" onClick={handleSignOut} className="justify-start text-destructive hover:text-destructive">
                                      <LogOut className="mr-2 h-4 w-4" />
                                      Log out
                                    </Button>
                                </div>
                                <Separator />
                                <div className="text-center text-sm text-muted-foreground py-8 space-y-2">
                                    <p>All content on this site is for entertainment purposes only.</p>
                                    <p>© {new Date().getFullYear()} EVYKA Inc. All rights reserved.</p>
                                </div>
                            </SheetContent>
                        </Sheet>
                    </>
                  ) : (
                    <Button
                        onClick={handleFollowToggle}
                        disabled={isFollowLoading}
                        variant={isFollowing ? 'secondary' : 'default'}
                        size="sm"
                    >
                        {isFollowLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
                        {isFollowing ? 'Unfollow' : 'Follow'}
                    </Button>
                  )}
                </div>
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
