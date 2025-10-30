"use client";

import type { Photo } from '@/lib/types';
import Image from 'next/image';
import { useState } from 'react';
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
} from "@/components/ui/alert-dialog"

type ImageCardProps = {
  photo: Photo;
};

export function ImageCard({ photo }: ImageCardProps) {
  const [isPurchased, setIsPurchased] = useState(photo.isPurchased);
  const { toast } = useToast();

  const handlePurchase = () => {
    setIsPurchased(true);
    toast({
      title: 'Purchase Successful!',
      description: `You can now view "${photo.name}" without blur.`,
    });
  };

  return (
    <Card className="group overflow-hidden flex flex-col">
      <CardHeader className="p-0">
        <div className="relative aspect-[3/4] overflow-hidden">
          <Image
            src={photo.imageUrl}
            alt={photo.name}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className={cn(
              "object-cover transition-all duration-300 ease-in-out group-hover:scale-105",
              !isPurchased && "blur-lg group-hover:blur-md"
            )}
            data-ai-hint={photo.imageHint}
          />
          {!isPurchased && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity">
              <Eye className="h-10 w-10 text-white" />
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-4 flex-grow">
        <CardTitle className="text-lg leading-tight mb-1 truncate">{photo.name}</CardTitle>
        <p className="text-sm text-muted-foreground">by {photo.artist}</p>
      </CardContent>
      <CardFooter className="p-4 pt-0 flex justify-between items-center">
        <p className="text-lg font-bold text-primary">${photo.price}</p>
        {isPurchased ? (
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
                  You are about to purchase "{photo.name}" for ${photo.price}.
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
