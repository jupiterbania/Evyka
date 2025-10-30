'use client';

import { useState, useEffect } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { Button } from './ui/button';

export function AgeGate({ children }: { children: React.ReactNode }) {
  const [isVerified, setIsVerified] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const storedVerification = localStorage.getItem('ageVerified');
    if (storedVerification === 'true') {
      setIsVerified(true);
    }
  }, []);

  const handleYes = () => {
    localStorage.setItem('ageVerified', 'true');
    setIsVerified(true);
  };

  const handleNo = () => {
    setIsBlocked(true);
  };

  if (isBlocked) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground text-center p-4">
        <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
        <p>You must be 18 years or older to access this content.</p>
      </div>
    );
  }

  if (!isVerified && isMounted) {
    return (
      <>
        <AlertDialog open={true}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Age Verification</AlertDialogTitle>
              <AlertDialogDescription>
                Are you 18 years of age or older?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <Button variant="destructive" onClick={handleNo}>No</Button>
              <AlertDialogAction onClick={handleYes}>Yes</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        {/* Render children in the background but visually hidden */}
        <div className="opacity-0" aria-hidden="true">
            {children}
        </div>
      </>
    );
  }

  return <>{children}</>;
}
