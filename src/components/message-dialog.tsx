
'use client';

import { useState } from 'react';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useUser, useAuth } from '@/firebase';
import { GoogleAuthProvider, signInWithPopup, signInAnonymously } from 'firebase/auth';
import { Slot } from '@radix-ui/react-slot';
import { useRouter } from 'next/navigation';


type MessageDialogProps = {
  trigger?: React.ReactElement;
};

export function MessageDialog({ trigger }: MessageDialogProps) {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isDialogOpen, setDialogOpen] = useState(false);

  const handleTriggerClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isUserLoading) return;
    
    if (user) {
      router.push('/messages');
    } else {
      if (auth) {
        // Attempt non-blocking anonymous sign-in
        signInAnonymously(auth)
          .then(() => {
            // On success, navigate immediately. The auth state listener will handle the rest.
            router.push('/messages');
          })
          .catch((error) => {
            // This is the fallback if anonymous sign-in is not enabled.
            if (error.code === 'auth/operation-not-allowed' || error.code === 'auth/admin-restricted-operation') {
              console.warn("Anonymous sign-in not enabled in Firebase console. Falling back to dialog.");
              toast({
                title: "Sign in to continue",
                description: "Please sign in with Google to send a message.",
              });
              setDialogOpen(true); // Open the explicit sign-in dialog.
            } else {
              console.error("Anonymous sign-in failed:", error);
              toast({
                variant: 'destructive',
                title: 'Authentication Failed',
                description: 'Could not sign you in automatically. Please try again.',
              });
            }
          });
      }
    }
  };

  const handleGoogleSignIn = async () => {
    if (!auth) return;
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      setDialogOpen(false);
      router.push('/messages'); // Navigate after successful sign-in
    } catch (error: any) {
      if (error.code !== 'auth/popup-closed-by-user') {
        toast({
          variant: 'destructive',
          title: 'Sign-in Failed',
          description: error.message || 'Could not sign you in with Google.',
        });
      }
    }
  };

  const TriggerComponent = trigger ? (
      <Slot onClick={handleTriggerClick}>{trigger}</Slot>
  ) : (
    <Button variant="outline" onClick={handleTriggerClick}>Message Us</Button>
  );

  return (
    <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        {TriggerComponent}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Sign In to Message</DialogTitle>
          <DialogDescription>
            To send a personal message, please sign in with your Google account first.
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-center py-4">
            <Button onClick={handleGoogleSignIn}>
                Sign In with Google
            </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
