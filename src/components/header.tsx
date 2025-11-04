'use client';
import Link from 'next/link';
import { Logo } from './logo';
import { Button } from './ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from './ui/sheet';
import { Menu, LogIn, LogOut, MessageSquare, Plus } from 'lucide-react';
import { useUser, useAuth, useFirestore, useMemoFirebase, useCollection } from '@/firebase';
import { GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { doc, setDoc, serverTimestamp, getDoc, query, collection, where, limit } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useEffect, useMemo, useState } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { cn } from '@/lib/utils';
import type { Message, Reply } from '@/lib/types';
import { UniversalUploader } from './universal-uploader';


export function Header() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();

  const designatedAdminEmail = 'jupiterbania472@gmail.com';
  const isAdmin = user?.email === designatedAdminEmail;

  // --- User's Unread Count Logic ---
  const userMessageQuery = useMemoFirebase(() => {
      if (firestore && user && !isAdmin) {
          return query(collection(firestore, 'users', user.uid, 'messages'), limit(1));
      }
      return null;
  }, [firestore, user, isAdmin]);

  const { data: messages } = useCollection<Message>(userMessageQuery);
  const userMessageThread = messages?.[0];

  const unreadRepliesQuery = useMemoFirebase(() => {
      if (firestore && userMessageThread) {
          return query(
              collection(firestore, 'users', userMessageThread.userId, 'messages', userMessageThread.id, 'replies'),
              where('isFromAdmin', '==', true),
              where('isRead', '==', false)
          );
      }
      return null;
  }, [firestore, userMessageThread]);

  const { data: unreadReplies } = useCollection<Reply>(unreadRepliesQuery);
  const userUnreadCount = unreadReplies?.length ?? 0;
  // --- End User's Unread Count Logic ---

  useEffect(() => {
    const setupAdminRole = async () => {
      if (user && user.email === designatedAdminEmail && firestore) {
        const adminRoleRef = doc(firestore, 'roles_admin', user.uid);
        try {
            const adminRoleSnap = await getDoc(adminRoleRef);
            if (!adminRoleSnap.exists()) {
              const roleData = {
                email: user.email,
                grantedAt: serverTimestamp(),
              };
              setDocumentNonBlocking(adminRoleRef, roleData);
            }
        } catch (error) {
            console.error("Error checking or setting up admin role:", error);
            errorEmitter.emit('permission-error', error as any);
        }
      }
    };

    if (!isUserLoading && user && firestore) {
      setupAdminRole();
    }
  }, [user, isUserLoading, firestore, designatedAdminEmail]);

  const handleGoogleSignIn = async () => {
    if (!auth) return;
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      if (
        error.code === 'auth/popup-closed-by-user' ||
        error.code === 'auth/cancelled-popup-request' ||
        error.code === 'auth/popup-blocked'
      ) {
        console.warn('Sign-in popup was closed or blocked by the user/browser.');
        return;
      }
      console.error('Error signing in with Google', error);
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

  const getInitials = (name?: string | null) => {
    if (!name) return 'U';
    const names = name.split(' ');
    if (names.length > 1 && names[0] && names[names.length - 1]) {
      return names[0][0] + names[names.length - 1][0];
    }
    return name.substring(0, 2);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="flex-1 flex items-center">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="sm:hidden">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left">
              <SheetTitle className="sr-only">Menu</SheetTitle>
              <div className="py-4">
                <Logo />
              </div>
              <nav className="grid gap-4 py-4">
                <Link href="/" className="text-lg font-semibold hover:text-primary">Home</Link>
                <Link href="/#gallery" className="text-lg font-semibold hover:text-primary">Gallery</Link>
                {user && !isAdmin && (
                  <Link href="/messages" className="flex items-center gap-2 text-lg font-semibold hover:text-primary relative">
                    Messages
                    {userUnreadCount > 0 && (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-xs font-bold text-destructive-foreground">
                        {userUnreadCount}
                      </span>
                    )}
                  </Link>
                )}
                {isAdmin && (
                  <Link href="/admin" className="text-lg font-semibold hover:text-primary">Admin</Link>
                )}
              </nav>
            </SheetContent>
          </Sheet>
          <nav className="hidden sm:flex items-center gap-6 text-sm font-medium">
             <Link href="/" className="text-foreground/60 transition-colors hover:text-foreground/80">Home</Link>
             <Link href="/#gallery" className="text-foreground/60 transition-colors hover:text-foreground/80">Gallery</Link>
             {user && !isAdmin && (
                <Link href="/messages" className="text-foreground/60 transition-colors hover:text-foreground/80 relative flex items-center gap-1">
                  Messages
                  {userUnreadCount > 0 && (
                      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                        {userUnreadCount}
                      </span>
                    )}
                </Link>
             )}
             {isAdmin && (
                <Link href="/admin" className="text-foreground/60 transition-colors hover:text-foreground/80">Admin</Link>
              )}
          </nav>
        </div>
        
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <Logo />
        </div>

        <div className="flex flex-1 items-center justify-end space-x-2">
          {isUserLoading ? (
            <div className="w-8 h-8 bg-muted rounded-full animate-pulse" />
          ) : user ? (
            <>
            { isAdmin && (
              <UniversalUploader>
                <Button variant="ghost" size="icon">
                  <Plus className="h-5 w-5" />
                  <span className="sr-only">Upload Media</span>
                </Button>
              </UniversalUploader>
            )}
            { !isAdmin && (
              <Button variant="ghost" size="icon" asChild className="relative">
                <Link href="/messages">
                  <MessageSquare />
                  {userUnreadCount > 0 && (
                    <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                      {userUnreadCount}
                    </span>
                  )}
                  <span className="sr-only">My Messages</span>
                </Link>
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.photoURL || undefined} alt={user.displayName || 'User'} />
                    <AvatarFallback>{getInitials(user.displayName)}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user.displayName}</p>
                    <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            </>
          ) : (
            <Button onClick={handleGoogleSignIn}>
              <LogIn className="mr-2 h-4 w-4" />
              Sign In
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
