
'use client';

import React, { useMemo, type ReactNode } from 'react';
import { FirebaseProvider, useUser } from '@/firebase/provider';
import { initializeFirebase } from '@/firebase';
import { Loader2 } from 'lucide-react';
import { Toaster } from '@/components/ui/toaster';
import { BottomNav } from '@/components/bottom-nav';

interface FirebaseClientProviderProps {
  children: ReactNode;
}

/**
 * A client component that waits for Firebase authentication to be ready
 * before rendering its children. Shows a loading spinner in the meantime.
 */
function AuthReadyContent({ children }: { children: ReactNode }) {
  const { isUserLoading } = useUser();

  if (isUserLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin" />
      </div>
    );
  }
  
  // Once the user is loaded, render the main app layout
  return (
      <>
        <div className="pb-16">
            {children}
        </div>
        <Toaster />
        <BottomNav />
      </>
  );
}

/**
 * Initializes Firebase on the client and provides Firebase services
 * and authentication state to the application.
 */
export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  const firebaseServices = useMemo(() => {
    // Initialize Firebase on the client side, once per component mount.
    return initializeFirebase();
  }, []);

  return (
    <FirebaseProvider
      firebaseApp={firebaseServices.firebaseApp}
      auth={firebaseServices.auth}
      firestore={firebaseServices.firestore}
    >
      <AuthReadyContent>{children}</AuthReadyContent>
    </FirebaseProvider>
  );
}
