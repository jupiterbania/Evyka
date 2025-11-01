'use client';

import { useState, useEffect } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { Button } from './ui/button';
import { ShieldAlert } from 'lucide-react';
import { useUser } from '@/firebase';

export function AdBlockDetector() {
  const { user } = useUser();
  const [isBlocking, setIsBlocking] = useState(false);
  
  const designatedAdminEmail = 'jupiterbania472@gmail.com';
  const isAdmin = user?.email === designatedAdminEmail;

  useEffect(() => {
    // Don't run detection for the admin user
    if (isAdmin) {
      setIsBlocking(false);
      return;
    }

    // A common technique is to try fetching a resource that is typically blocked by ad-blockers.
    const testAdUrl = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js';

    fetch(testAdUrl, { method: 'HEAD', mode: 'no-cors' })
      .then(response => {
        // If the fetch is successful but the response is opaque, it wasn't blocked.
        // If it was truly blocked, the catch block would execute.
        // We do nothing here, as we assume no blocking.
      })
      .catch(error => {
        // A failed fetch (e.g., network error) is a strong indicator of ad-blocking.
        setIsBlocking(true);
      });
  }, [isAdmin]);

  const handleRefresh = () => {
    window.location.reload();
  };
  
  if (isAdmin) {
    return null; // Don't render the component for admin
  }

  return (
    <AlertDialog open={isBlocking}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex justify-center mb-4">
            <ShieldAlert className="h-16 w-16 text-destructive" />
          </div>
          <AlertDialogTitle className="text-center text-2xl font-bold">
            Ad Blocker Detected
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center">
            It looks like you are using an ad blocker or a DNS filtering service (like AdGuard DNS) that is preventing our site from loading correctly.
            <br /><br />
            Please disable it and click "Try Again" to continue.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={handleRefresh} className="w-full">
            Try Again
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
