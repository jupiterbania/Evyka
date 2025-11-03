
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
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
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

  const [isOpen, setIsOpen] = useState(false);

  const handleTriggerClick = () => {
    if (isUserLoading) return; // Don't do anything if auth state is loading
    
    if (user) {
      // If user is logged in, navigate them to the messages page.
      router.push('/messages');
    } else {
      // If user is not logged in, open the login prompt dialog.
      setIsOpen(true);
    }
  };

  const handleGoogleSignIn = async () => {
    if (!auth) return;
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      setIsOpen(false);
      // After successful sign-in, you could redirect them or let them click again
      toast({
        title: 'Signed In Successfully!',
        description: 'You can now send a message.',
      });
      router.push('/messages');
    } catch (error: any) {
      if (error.code !== 'auth/popup-closed-by-user') {
        console.error('Error signing in with Google', error);
        toast({
          variant: 'destructive',
          title: 'Sign-In Failed',
          description: 'Could not sign you in. Please try again.',
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
    <>
      {TriggerComponent}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Please Sign In</DialogTitle>
            <DialogDescription>
              You need to be signed in to send a personal message and start a conversation.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center py-4">
            <Button onClick={handleGoogleSignIn}>
              Sign In with Google
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
