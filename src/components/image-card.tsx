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
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useCollection, useFirestore, useUser, useMemoFirebase, useAuth } from '@/firebase';
import { collection, query, where, serverTimestamp, increment, doc } from 'firebase/firestore';
import { format } from 'date-fns';
import { Badge } from './ui/badge';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { createOrder, verifyPayment } from '@/lib/razorpay';
import type { Order } from 'razorpay/dist/types/orders';
import { addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';

declare global {
    interface Window {
        Razorpay: any;
    }
}

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
  const [isProcessing, setIsProcessing] = useState(false);


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

  const handlePurchase = async () => {
    if (!firestore) {
      toast({
        variant: 'destructive',
        title: 'Service Unavailable',
        description: 'The payment service is temporarily unavailable. Please try again later.',
      });
      return;
    }
    
    setIsProcessing(true);

    try {
      const order = await createOrder({
        amount: photo.price,
        imageTitle: photo.title,
      });

      if (!order) {
        throw new Error('Could not create a payment order.');
      }
      
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: order.currency,
        name: 'EVYKA',
        description: `Purchase: ${photo.title}`,
        order_id: order.id,
        handler: async function (response: any) {
            const verificationResult = await verifyPayment({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
            });

            if (verificationResult.isSignatureValid) {
                await finalizePurchase(user?.uid, photo.id, photo.price);
                toast({
                    title: 'Purchase Successful!',
                    description: `You can now view "${photo.title}" without blur.`,
                });
            } else {
                toast({
                    variant: "destructive",
                    title: 'Payment Failed',
                    description: 'Your payment could not be verified. Please contact support.',
                });
            }
        },
        prefill: {
            name: user?.displayName,
            email: user?.email,
        },
        theme: {
            color: '#3399cc'
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.open();

    } catch (error: any) {
        toast({
            variant: "destructive",
            title: 'Payment Error',
            description: error.message || 'Something went wrong. Please try again.',
        });
    } finally {
        setIsProcessing(false);
    }
  };

  const finalizePurchase = async (userId: string | undefined, imageId: string, price: number) => {
    if (!firestore) return;

    // Add to user's personal purchase history only if the user is logged in
    if (userId) {
        const userPurchaseCollectionRef = collection(firestore, 'users', userId, 'purchases');
        addDocumentNonBlocking(userPurchaseCollectionRef, {
            imageId: imageId,
            price: price,
            purchaseDate: serverTimestamp(),
            userId: userId,
        });
    }

    // Add a record to the image's purchase subcollection for admin tracking
    const imagePurchaseCollectionRef = collection(firestore, 'images', imageId, 'purchases');
     addDocumentNonBlocking(imagePurchaseCollectionRef, {
        userId: userId || 'anonymous', // Mark as anonymous if no user
        price: price,
        purchaseDate: serverTimestamp()
    });

    // Increment sales count on the image document
    const imageDocRef = doc(firestore, 'images', imageId);
    updateDocumentNonBlocking(imageDocRef, {
        sales: increment(1)
    });

    // Increment aggregated analytics
    const analyticsRef = doc(firestore, 'analytics', 'sales');
    const monthKey = format(new Date(), 'yyyy-MM');
    updateDocumentNonBlocking(analyticsRef, {
        totalRevenue: increment(price),
        totalSales: increment(1),
        [`monthlySales.${monthKey}`]: increment(1),
    });
  }
  
  const renderPurchaseButton = () => {
    if (isUserLoading || (user && isPurchaseLoading)) {
      return <Button disabled>Loading...</Button>;
    }
    
    if (isPurchased) {
      return <Button variant="outline" disabled>Purchased</Button>;
    }

    if (isFree) {
        return <Badge variant="secondary">Free</Badge>;
    }

    return (
      <Button onClick={handlePurchase} disabled={isProcessing}>
        {isProcessing ? 'Processing...' : <><ShoppingCart className="mr-2 h-4 w-4" /> Purchase</>}
      </Button>
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
             <DialogTitle className="sr-only">{photo.title}</DialogTitle>
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
