
"use client";

import type { Image as ImageType, Purchase } from '@/lib/types';
import Image from 'next/image';
import { useState, useEffect, useRef, MouseEvent } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import { Eye, LogIn, ShoppingCart } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { useCollection, useFirestore, useUser, useMemoFirebase, useAuth } from '@/firebase';
import { collection, doc, query, where, serverTimestamp, increment } from 'firebase/firestore';
import { addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { format } from 'date-fns';
import { Badge } from './ui/badge';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

type ImageCardProps = {
  photo: ImageType;
};

export function ImageCard({ photo }: ImageCardProps) {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();

  const purchasesCollection = useMemoFirebase(() => user ? query(collection(firestore, 'users', user.uid, 'purchases'), where('imageId', '==', photo.id)) : null, [firestore, user, photo.id]);
  const { data: purchases, isLoading: isPurchaseLoading } = useCollection<Purchase>(purchasesCollection);

  const isPurchased = (purchases?.length ?? 0) > 0;
  const isFree = photo.price === 0;
  const isLocked = !isPurchased && !isFree;

  const [isZoomed, setIsZoomed] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const imageRef = useRef<HTMLImageElement>(null);

  const handleDoubleClick = () => {
    if (isLocked) return;
    setIsZoomed(!isZoomed);
    if (isZoomed) {
      setPosition({ x: 0, y: 0 });
    }
  };

  const handleMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    if (isZoomed) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
      e.currentTarget.style.cursor = 'grabbing';
    }
  };

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (isDragging && isZoomed) {
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;
      setPosition({ x: newX, y: newY });
    }
  };

  const handleMouseUp = (e: MouseEvent<HTMLDivElement>) => {
    setIsDragging(false);
    if(isZoomed) {
      e.currentTarget.style.cursor = 'zoom-out';
    }
  };
  
  const handleMouseLeave = (e: MouseEvent<HTMLDivElement>) => {
    setIsDragging(false);
     if(isZoomed) {
      e.currentTarget.style.cursor = 'zoom-out';
    }
  };

  const handleGoogleSignIn = async () => {
    if (!auth) return;
    const provider = new GoogleAuthProvider();
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

  const handlePurchase = () => {
    if (!user || !firestore) {
      toast({
        variant: "destructive",
        title: "Authentication Required",
        description: "You must be signed in to purchase an image.",
      });
      return;
    }
    
    // Add to user's personal purchase history
    const userPurchaseCollectionRef = collection(firestore, 'users', user.uid, 'purchases');
    addDocumentNonBlocking(userPurchaseCollectionRef, {
        imageId: photo.id,
        price: photo.price,
        purchaseDate: serverTimestamp(),
        userId: user.uid,
    });

    // Add a record to the image's purchase subcollection for admin tracking
    const imagePurchaseCollectionRef = collection(firestore, 'images', photo.id, 'purchases');
     addDocumentNonBlocking(imagePurchaseCollectionRef, {
        userId: user.uid,
        price: photo.price,
        purchaseDate: serverTimestamp()
    });

    // Increment sales count on the image document
    const imageDocRef = doc(firestore, 'images', photo.id);
    updateDocumentNonBlocking(imageDocRef, {
        sales: increment(1)
    });

    // Increment aggregated analytics
    const analyticsRef = doc(firestore, 'analytics', 'sales');
    const monthKey = format(new Date(), 'yyyy-MM');
    updateDocumentNonBlocking(analyticsRef, {
        totalRevenue: increment(photo.price),
        totalSales: increment(1),
        [`monthlySales.${monthKey}`]: increment(1),
    });


    toast({
      title: 'Purchase Successful!',
      description: `You can now view "${photo.title}" without blur.`,
    });
  };
  
  const renderPurchaseButton = () => {
    if (isUserLoading || isPurchaseLoading) {
      return <Button disabled>Loading...</Button>;
    }
    
    if (isPurchased) {
      return <Button variant="outline" disabled>Purchased</Button>;
    }

    if (isFree) {
        return <Badge variant="secondary">Free</Badge>;
    }

    if (!user) {
      return (
        <Button onClick={handleGoogleSignIn}>
          <LogIn className="mr-2 h-4 w-4" />
          Sign in to Purchase
        </Button>
      );
    }

    return (
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button>
            <ShoppingCart className="mr-2 h-4 w-4" />
            Purchase
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Purchase</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to purchase "{photo.title}" for ₹{photo.price}.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handlePurchase}>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  };

  return (
    <Card className="group overflow-hidden flex flex-col">
      <CardHeader className="p-0">
        <Dialog onOpenChange={(open) => !open && setIsZoomed(false)}>
          <DialogTrigger asChild>
            <div className="relative aspect-[3/4] w-full overflow-hidden cursor-pointer">
              <Image
                src={photo.imageUrl}
                alt={photo.title}
                width={600}
                height={800}
                className={cn(
                  "object-cover transition-all duration-300 ease-in-out group-hover:scale-105",
                  isLocked && "blur-lg group-hover:blur-md"
                )}
                data-ai-hint="photo"
              />
              {isLocked && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Eye className="h-10 w-10 text-white" />
                </div>
              )}
            </div>
          </DialogTrigger>
          <DialogContent className="max-w-5xl h-auto bg-transparent border-none shadow-none p-0">
            <div 
              className="relative aspect-[3/4] max-h-[90vh] w-full overflow-hidden rounded-lg"
              onDoubleClick={handleDoubleClick}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseLeave}
              style={{ cursor: isLocked ? 'not-allowed' : isZoomed ? 'zoom-out' : 'zoom-in' }}
            >
              <Image
                ref={imageRef}
                src={isLocked ? photo.blurredImageUrl : photo.imageUrl}
                alt={photo.title}
                fill
                className={cn(
                  "object-contain transition-transform duration-300 ease-in-out",
                  isLocked && 'blur-xl'
                )}
                style={{
                  transform: isZoomed ? `scale(2) translate(${position.x}px, ${position.y}px)` : 'scale(1)',
                  transformOrigin: 'center center',
                }}
              />
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="p-4 flex-grow">
        <CardTitle className="text-lg leading-tight mb-1 truncate">{photo.title}</CardTitle>
      </CardContent>
      <CardFooter className="p-4 pt-0 flex justify-between items-center">
        <p className="text-lg font-bold text-primary">
            {isFree ? 'Free' : `₹${photo.price}`}
        </p>
        {renderPurchaseButton()}
      </CardFooter>
    </Card>
  );
}
