"use client";

import type { Image as ImageType, Purchase } from '@/lib/types';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import { Eye, ShoppingCart } from 'lucide-react';
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
import { useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { collection, doc, query, where, serverTimestamp } from 'firebase/firestore';
import { addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';

type ImageCardProps = {
  photo: ImageType;
};

export function ImageCard({ photo }: ImageCardProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const purchasesCollection = useMemoFirebase(() => user ? query(collection(firestore, 'users', user.uid, 'purchases'), where('imageId', '==', photo.id)) : null, [firestore, user, photo.id]);
  const { data: purchases, isLoading: isPurchaseLoading } = useCollection<Purchase>(purchasesCollection);

  const isPurchased = (purchases?.length ?? 0) > 0;

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
        sales: (photo.sales || 0) + 1
    });

    toast({
      title: 'Purchase Successful!',
      description: `You can now view "${photo.title}" without blur.`,
    });
  };

  return (
    <Card className="group overflow-hidden flex flex-col">
      <CardHeader className="p-0">
        <div className="relative aspect-[3/4] overflow-hidden">
          <Image
            src={photo.imageUrl}
            alt={photo.title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className={cn(
              "object-cover transition-all duration-300 ease-in-out group-hover:scale-105",
              !isPurchased && "blur-lg group-hover:blur-md"
            )}
            data-ai-hint="photo"
          />
          {!isPurchased && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity">
              <Eye className="h-10 w-10 text-white" />
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-4 flex-grow">
        <CardTitle className="text-lg leading-tight mb-1 truncate">{photo.title}</CardTitle>
      </CardContent>
      <CardFooter className="p-4 pt-0 flex justify-between items-center">
        <p className="text-lg font-bold text-primary">${photo.price}</p>
        {isPurchaseLoading ? (
            <Button disabled>Loading...</Button>
        ) : isPurchased ? (
          <Button variant="outline" disabled>Purchased</Button>
        ) : (
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
                  You are about to purchase "{photo.title}" for ${photo.price}.
                  This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handlePurchase}>Continue</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </CardFooter>
    </Card>
  );
}
