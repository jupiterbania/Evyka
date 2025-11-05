
'use client';

import { useMemo, useState, useEffect } from 'react';
import { collection, query, where, doc, updateDoc, getDoc, writeBatch, increment, serverTimestamp, getDocs, addDoc } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase, useUser, useAuth, useDoc } from '@/firebase';
import type { Media as MediaType, User as AppUser, Conversation } from '@/lib/types';
import { Header } from '@/components/header';
import { Loader2, Edit, Settings, LogOut, UserPlus, MessageSquare } from 'lucide-react';
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
import { updateProfile, signOut } from 'firebase/auth';
import { updateDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { Separator } from '@/components/ui/separator';
import { Logo } from '@/components/logo';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';
import { useParams, useRouter } from 'next/navigation';
import { useFollow } from '@/hooks/use-follow';


export default function ProfilePage() {
  const { user: currentUser, isUserLoading } = useUser();
  const firestore = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();
  const params = useParams();
  const router = useRouter();

  const [isEditOpen, setEditOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isCreatingConversation, setIsCreatingConversation] = useState(false);
  const [profileData, setProfileData] = useState({ displayName: '', photoFile: null as File | null });
  
  const profileUserId = Array.isArray(params.id) ? params.id[0] : params.id;

  const { isFollowing, isFollowLoading, handleFollowToggle } = useFollow(profileUserId);

  const userDocRef = useMemoFirebase(
    () => (firestore && profileUserId ? doc(firestore, 'users', profileUserId) : null),
    [firestore, profileUserId]
  );
  const { data: profileUser, isLoading: isUserDocLoading } = useDoc<AppUser>(userDocRef);

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
    if (profileUser) {
      setProfileData({ displayName: profileUser.username || '', photoFile: null });
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
  
  const handleMessage = async () => {
    if (!currentUser || !profileUser || !firestore || currentUser.uid === profileUser.id) return;

    setIsCreatingConversation(true);
    try {
      // Look for an existing conversation
      const conversationsRef = collection(firestore, 'conversations');
      const q = query(
        conversationsRef,
        where('participants', 'array-contains', currentUser.uid)
      );

      const querySnapshot = await getDocs(q);
      let existingConversation: (Conversation & { id: string }) | null = null;

      querySnapshot.forEach((doc) => {
        const conversation = { id: doc.id, ...doc.data() } as (Conversation & { id: string });
        if (conversation.participants.includes(profileUser.id)) {
          existingConversation = conversation;
        }
      });

      if (existingConversation) {
        router.push(`/messages/${existingConversation.id}`);
      } else {
        // Create a new conversation
        const newConversationData = {
            participants: [currentUser.uid, profileUser.id],
            participantInfo: [
                { userId: currentUser.uid, username: currentUser.displayName, profileImageUrl: currentUser.photoURL },
                { userId: profileUser.id, username: profileUser.username, profileImageUrl: profileUser.profileImageUrl }
            ],
            lastMessage: '',
            lastMessageAt: serverTimestamp(),
            lastMessageSenderId: '',
        };
        const newConversationRef = await addDocumentNonBlocking(collection(firestore, 'conversations'), newConversationData);
        if (newConversationRef) {
          router.push(`/messages/${newConversationRef.id}`);
        }
      }
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Error', description: `Could not start conversation: ${error.message}` });
    } finally {
        setIsCreatingConversation(false);
    }
  };

  const handleProfileSave = async () => {
    if (!currentUser || !firestore) return;
    setIsUploading(true);

    try {
        let photoURL = currentUser.photoURL;

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

        await updateProfile(currentUser, {
            displayName: profileData.displayName,
            photoURL: photoURL,
        });

        const userDocRef = doc(firestore, 'users', currentUser.uid);
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
    
    if (!profileUser) {
        return (
            <div className="flex-grow flex flex-col items-center justify-center p-4 text-center">
                <h2 className="text-2xl font-bold mb-4">Profile Not Found</h2>
                <p className="text-muted-foreground mb-6">This user does not exist.</p>
                 <Button asChild>
                    <Link href="/">Back to Home</Link>
                </Button>
            </div>
        );
    }
    
    const isOwnProfile = currentUser && currentUser.uid === profileUser.id;

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
                    <>
                    <Button
                        onClick={handleFollowToggle}
                        disabled={isFollowLoading}
                        variant={isFollowing ? 'secondary' : 'default'}
                        size="sm"
                    >
                        {isFollowLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
                        {isFollowing ? 'Unfollow' : 'Follow'}
                    </Button>
                     <Button onClick={handleMessage} disabled={isCreatingConversation} size="sm" variant="outline">
                        {isCreatingConversation ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MessageSquare className="mr-2 h-4 w-4" />}
                        Message
                      </Button>
                    </>
                  )}
                </div>
            </div>
        </section>

        <section className="py-8 sm:py-12">
            <div className="container px-4 sm:px-6">
                 <h2 className="text-2xl sm:text-3xl font-bold tracking-tight font-headline text-center mb-6 sm:mb-8">
                    {isOwnProfile ? 'My Uploads' : 'Uploads'}
                </h2>
                {isMediaLoading ? (
                     <div className="flex flex-col items-center justify-center min-h-[30vh]">
                        <Loader2 className="h-12 w-12 animate-spin text-primary" />
                     </div>
                ) : sortedMedia.length === 0 ? (
                    <p className="text-center text-muted-foreground min-h-[20vh] flex items-center justify-center">
                        {isOwnProfile ? "You haven't uploaded any media yet." : "This user hasn't uploaded any media yet."}
                    </p>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                        {sortedMedia.map((item, index) => (
                            <ImageCard key={item.id} media={item} index={index} showAdminControls={isOwnProfile} />
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
