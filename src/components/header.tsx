
'use client';
import Link from 'next/link';
import { Logo } from './logo';
import { Button } from './ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from './ui/sheet';
import { Menu, User as UserIcon, LogOut, LogIn, Crown } from 'lucide-react';
import { useUser, useAuth } from '@/firebase';
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
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useFirestore } from '@/firebase/provider';
import { useToast } from '@/hooks/use-toast';
import { createSubscription, verifySubscription } from '@/lib/razorpay';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useState } from 'react';

declare global {
  interface Window {
    Razorpay: any;
  }
}


export function Header() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const designatedAdminEmail = 'jupiterbania472@gmail.com';

  const handleGoogleSignIn = async () => {
    if (!auth) return;
    const provider = new new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Error signing in with Google', error);
      toast({
        variant: "destructive",
        title: "Sign-In Failed",
        description: "Could not sign in with Google. Please try again.",
      });
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

  const handleSubscription = async () => {
    if (!firestore || !user) {
      toast({
        variant: 'destructive',
        title: 'Authentication Error',
        description: 'You must be logged in to subscribe.',
      });
      return;
    }

    setIsProcessing(true);

    try {
      const subscription = await createSubscription();

      if (!subscription) {
        throw new Error('Could not create a subscription plan.');
      }

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        subscription_id: subscription.id,
        name: 'EVYKA Pro',
        description: `Monthly Subscription`,
        handler: async function (response: any) {
          const verificationResult = await verifySubscription({
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_subscription_id: response.razorpay_subscription_id,
            razorpay_signature: response.razorpay_signature,
          });

          if (verificationResult.isSignatureValid) {
            const userDocRef = doc(firestore, 'users', user.uid);
            const endDate = new Date();
            endDate.setMonth(endDate.getMonth() + 1);

            updateDocumentNonBlocking(userDocRef, {
              subscriptionStatus: 'active',
              subscriptionId: response.razorpay_subscription_id,
              subscriptionEndDate: endDate,
            });

            toast({
              title: 'Subscription Successful!',
              description: 'Welcome to Pro! All images are now unlocked.',
            });
          } else {
            toast({
              variant: 'destructive',
              title: 'Payment Failed',
              description: 'Your payment could not be verified. Please contact support.',
            });
          }
        },
        prefill: {
          name: user.displayName,
          email: user.email,
        },
        theme: {
          color: '#3399cc',
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Subscription Error',
        description: error.message || 'Something went wrong. Please try again.',
      });
    } finally {
      setIsProcessing(false);
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
                {user && user.email === designatedAdminEmail && (
                  <Link href="/admin" className="text-lg font-semibold hover:text-primary">Admin</Link>
                )}
              </nav>
            </SheetContent>
          </Sheet>
          <nav className="hidden sm:flex items-center gap-6 text-sm font-medium">
             <Link href="/" className="text-foreground/60 transition-colors hover:text-foreground/80">Home</Link>
             <Link href="/#gallery" className="text-foreground/60 transition-colors hover:text-foreground/80">Gallery</Link>
             {user && user.email === designatedAdminEmail && (
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
            {user.subscriptionStatus !== 'active' && user.email !== designatedAdminEmail && (
                <Button onClick={handleSubscription} disabled={isProcessing} size="sm" variant="outline">
                    <Crown className="mr-2 h-4 w-4 text-amber-400" />
                    {isProcessing ? 'Processing...' : 'Subscribe'}
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
