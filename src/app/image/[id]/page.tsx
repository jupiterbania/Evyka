
'use client';

import { useParams } from 'next/navigation';
import { useDoc, useFirestore, useUser, useMemoFirebase, useCollection } from '@/firebase';
import { doc, collection, query, where, serverTimestamp } from 'firebase/firestore';
import type { Image as ImageType, Purchase, User } from '@/lib/types';
import Image from 'next/image';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Lock, ShoppingCart } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { createOrder, verifyPayment } from '@/lib/razorpay';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';

export default function ImagePage() {
  const { id } = useParams();
  const imageId = Array.isArray(id) ? id[0] : id;
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const imageDocRef = useMemoFirebase(
    () => (imageId ? doc(firestore, 'images', imageId) : null),
    [firestore, imageId]
  );
  const { data: photo, isLoading: isPhotoLoading } = useDoc<ImageType>(imageDocRef);

  const userDocRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [firestore, user]);
  const { data: userData } = useDoc<User>(userDocRef);
  const isSubscribed = userData?.subscriptionStatus === 'active';

  const purchasesCollection = useMemoFirebase(
    () =>
      user && imageId
        ? query(
            collection(firestore, 'users', user.uid, 'purchases'),
            where('imageId', '==', imageId)
          )
        : null,
    [firestore, user, imageId]
  );
  const { data: purchases, isLoading: isPurchaseLoading } =
    useCollection<Purchase>(purchasesCollection);

  const designatedAdminEmail = 'jupiterbania472@gmail.com';
  const isAdmin = user?.email === designatedAdminEmail;

  const isPurchased = (purchases?.length ?? 0) > 0;
  const isFree = photo?.price === 0;
  
  const hasAccess = isPurchased || isFree || isAdmin || isSubscribed;
  const isLoading = isUserLoading || isPhotoLoading || isPurchaseLoading;
  
  const handlePurchase = async () => {
    if (!firestore || !photo) {
      toast({
        variant: 'destructive',
        title: 'Service Unavailable',
        description: 'The payment service is temporarily unavailable.',
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
            if (user?.uid) {
              const userPurchaseCollectionRef = collection(firestore, 'users', user.uid, 'purchases');
              addDocumentNonBlocking(userPurchaseCollectionRef, {
                imageId: photo.id,
                price: photo.price,
                purchaseDate: serverTimestamp(),
                userId: user.uid,
              });
            }
            toast({
              title: 'Purchase Successful!',
              description: `You now have access to "${photo.title}".`,
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
          name: user?.displayName || 'Guest User',
          email: user?.email || undefined,
        },
        theme: {
          color: '#3399cc',
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Payment Error',
        description: error.message || 'Something went wrong. Please try again.',
      });
    } finally {
      setIsProcessing(false);
    }
  };


  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="w-full max-w-4xl mx-auto">
            <Skeleton className="aspect-video w-full" />
            <div className="mt-4 space-y-2">
                <Skeleton className="h-8 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
            </div>
        </div>
      );
    }

    if (!photo) {
      return (
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">Image Not Found</h2>
            <p className="text-muted-foreground mb-6">The image you are looking for does not exist or may have been removed.</p>
            <Button asChild>
                <Link href="/#gallery">Back to Gallery</Link>
            </Button>
          </div>
      );
    }

    return (
      <div className="w-full max-w-4xl mx-auto">
        <div className="relative aspect-video w-full rounded-lg overflow-hidden border">
          <Image
            src={photo.imageUrl}
            alt={photo.title}
            fill
            className={cn(
              "object-contain",
              !hasAccess && "blur-2xl scale-110"
            )}
            sizes="(max-width: 768px) 100vw, 80vw"
          />
          {!hasAccess && (
             <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                <Lock className="h-12 w-12 text-white/80" />
            </div>
          )}
        </div>
        <div className="mt-6">
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
            <div>
                <h1 className="text-3xl font-bold font-headline">{photo.title}</h1>
                <p className="text-muted-foreground mt-2 max-w-prose">{photo.description}</p>
            </div>
            {!hasAccess && (
              <Card className="p-4 sm:min-w-[200px] text-center">
                <p className="text-2xl font-bold text-primary mb-2">₹{photo.price}</p>
                <Button onClick={handlePurchase} disabled={isProcessing} className="w-full">
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  {isProcessing ? 'Processing...' : 'Purchase'}
                </Button>
                 <p className="text-xs text-muted-foreground mt-3">to unlock the high-resolution image.</p>
              </Card>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow container mx-auto px-4 sm:px-6 py-8 sm:py-12 flex items-center justify-center">
        {renderContent()}
      </main>
      <Footer />
    </div>
  );
}
