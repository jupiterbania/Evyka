'use client';
import Link from 'next/link';
import { Logo } from './logo';
import { Button } from './ui/button';
import { LogIn, Plus } from 'lucide-react';
import { useUser, useAuth } from '@/firebase';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { UniversalUploader } from './universal-uploader';


export function Header() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();

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

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="flex-1 flex items-center">
          <nav className="hidden sm:flex items-center gap-6 text-sm font-medium">
             <Link href="/" className="text-foreground/60 transition-colors hover:text-foreground/80">Home</Link>
             <Link href="/#gallery" className="text-foreground/60 transition-colors hover:text-foreground/80">Gallery</Link>
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
              <UniversalUploader>
                <Button variant="ghost" size="icon">
                  <Plus className="h-5 w-5" />
                  <span className="sr-only">Upload Media</span>
                </Button>
              </UniversalUploader>
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
