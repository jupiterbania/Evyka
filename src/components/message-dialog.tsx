
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

  const handleTriggerClick = () => {
    if (isUserLoading) return;
    
    if (user) {
      router.push('/messages');
    } else {
      if (auth) {
        // Trigger non-blocking anonymous sign-in and navigate immediately
        signInAnonymously(auth).catch((error) => {
            console.error("Anonymous sign-in failed:", error);
            toast({
                variant: 'destructive',
                title: 'Authentication Failed',
                description: 'Could not sign you in automatically. Please try signing in from the header.',
            });
        });
        router.push('/messages');
      }
    }
  };

  const TriggerComponent = trigger ? (
      <Slot onClick={handleTriggerClick}>{trigger}</Slot>
  ) : (
    <Button variant="outline" onClick={handleTriggerClick}>Message Us</Button>
  );

  // The dialog is no longer needed as we are signing in anonymously in the background.
  // We just return the trigger component.
  return <>{TriggerComponent}</>;
}
