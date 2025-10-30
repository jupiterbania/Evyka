
'use client';

import type { Image as ImageType, Purchase } from '@/lib/types';
import Image from 'next/image';
import { useState, MouseEvent, useRef } from 'react';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import {
  Eye,
  ShoppingCart,
  MoreVertical,
  Edit,
  Trash2,
} from 'lucide-react';
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
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
  DialogHeader,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  useCollection,
  useFirestore,
  useUser,
  useMemoFirebase,
} from '@/firebase';
import {
  collection,
  query,
  where,
  serverTimestamp,
  doc,
} from 'firebase/firestore';
import { Badge } from './ui/badge';
import { createOrder, verifyPayment } from '@/lib/razorpay';
import type { Order } from 'razorpay/dist/types/orders';
import {
  addDocumentNonBlocking,
  deleteDocumentNonBlocking,
  updateDocumentNonBlocking,
} from '@/firebase/non-blocking-updates';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';

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
  const { toast } = useToast();

  const designatedAdminEmail = 'jupiterbania472@gmail.com';
  const isAdmin = user?.email === designatedAdminEmail;

  const purchasesCollection = useMemoFirebase(
    () =>
      user
        ? query(
            collection(firestore, 'users', user.uid, 'purchases'),
            where('imageId', '==', photo.id)
          )
        : null,
    [firestore, user, photo.id]
  );
  const { data: purchases, isLoading: isPurchaseLoading } =
    useCollection<Purchase>(purchasesCollection);

  const isPurchased = (purchases?.length ?? 0) > 0;
  const isFree = photo.price === 0;
  const isLocked = !isPurchased && !isFree && !isAdmin;

  const [isZoomed, setIsZoomed] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const imageRef = useRef<HTMLImageElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // State for Edit/Delete dialogs
  const [isEditDialogOpen, setEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editedPhoto, setEditedPhoto] = useState<ImageType | null>(null);

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
    if (isZoomed) {
      e.currentTarget.style.cursor = 'zoom-out';
    }
  };

  const handleMouseLeave = (e: MouseEvent<HTMLDivElement>) => {
    setIsDragging(false);
    if (isZoomed) {
      e.currentTarget.style.cursor = 'zoom-out';
    }
  };

  const handlePurchase = async () => {
    if (!firestore) {
      toast({
        variant: 'destructive',
        title: 'Service Unavailable',
        description:
          'The payment service is temporarily unavailable. Please try again later.',
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
              variant: 'destructive',
              title: 'Payment Failed',
              description:
                'Your payment could not be verified. Please contact support.',
            });
          }
        },
        prefill: {
          name: user?.displayName,
          email: user?.email,
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
        title: 'Payment Error',
        description: error.message || 'Something went wrong. Please try again.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const finalizePurchase = async (
    userId: string | undefined,
    imageId: string,
    price: number
  ) => {
    if (!firestore) return;

    if (userId) {
      const userPurchaseCollectionRef = collection(
        firestore,
        'users',
        userId,
        'purchases'
      );
      addDocumentNonBlocking(userPurchaseCollectionRef, {
        imageId: imageId,
        price: price,
        purchaseDate: serverTimestamp(),
        userId: userId,
      });
    }

    const imagePurchaseCollectionRef = collection(
      firestore,
      'images',
      imageId,
      'purchases'
    );
    addDocumentNonBlocking(imagePurchaseCollectionRef, {
      imageId: imageId,
      price: price,
      purchaseDate: serverTimestamp(),
      userId: userId, // Can be undefined for guests
    });
  };

  const handleEditClick = () => {
    setEditedPhoto(photo);
    setEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (!editedPhoto || !firestore) return;
    const docRef = doc(firestore, 'images', editedPhoto.id);
    updateDocumentNonBlocking(docRef, {
      title: editedPhoto.title,
      description: editedPhoto.description,
      price: editedPhoto.price,
    });
    toast({
      title: 'Image Updated',
      description: 'The image details have been successfully updated.',
    });
    setEditDialogOpen(false);
    setEditedPhoto(null);
  };

  const handleDeleteClick = () => {
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (!photo || !firestore) return;
    const docRef = doc(firestore, 'images', photo.id);
    deleteDocumentNonBlocking(docRef);
    toast({
      title: 'Image Deleted',
      description: 'The image has been successfully removed.',
      variant: 'destructive',
    });
    setDeleteDialogOpen(false);
  };

  const renderPurchaseButton = () => {
    if (isUserLoading || (user && isPurchaseLoading)) {
      return <Button disabled>Loading...</Button>;
    }

    if (isAdmin) {
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Admin Actions</DropdownMenuLabel>
            <DropdownMenuItem onClick={handleEditClick}>
              <Edit className="mr-2 h-4 w-4" />
              <span>Edit Details</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleDeleteClick}
              className="text-destructive focus:text-destructive focus:bg-destructive/10"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              <span>Delete Image</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    }

    if (isPurchased) {
      return (
        <Button variant="outline" disabled>
          Purchased
        </Button>
      );
    }

    if (isFree) {
      return <Badge variant="secondary">Free</Badge>;
    }

    return (
      <Button onClick={handlePurchase} disabled={isProcessing}>
        {isProcessing ? (
          'Processing...'
        ) : (
          <>
            <ShoppingCart className="mr-2 h-4 w-4" /> Purchase
          </>
        )}
      </Button>
    );
  };

  const cardBackground = photo.dominantColor || 'hsl(var(--card))';
    
  const dialogBackground = photo.dominantColor
    ? `radial-gradient(ellipse at center, ${photo.dominantColor}, black)`
    : 'hsl(var(--background))';

  return (
    <>
      <Card className="group overflow-hidden flex flex-col">
        <CardHeader className="p-0">
          <Dialog onOpenChange={(open) => !open && setIsZoomed(false)}>
            <DialogTrigger asChild>
              <div
                className="relative aspect-[3/4] w-full overflow-hidden cursor-pointer"
                style={{ backgroundColor: cardBackground }}
              >
                <Image
                  src={photo.imageUrl}
                  alt={photo.title}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className={cn(
                    'object-cover transition-all duration-300 ease-in-out group-hover:scale-105',
                    isLocked && 'blur-lg group-hover:blur-md'
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
                style={{
                  cursor: isLocked
                    ? 'not-allowed'
                    : isZoomed
                    ? 'zoom-out'
                    : 'zoom-in',
                  background: dialogBackground,
                }}
              >
                <Image
                  ref={imageRef}
                  src={isLocked ? photo.blurredImageUrl : photo.imageUrl}
                  alt={photo.title}
                  fill
                  className={cn(
                    'object-contain transition-transform duration-300 ease-in-out',
                    isLocked && 'blur-xl'
                  )}
                  style={{
                    transform: isZoomed
                      ? `scale(2) translate(${position.x}px, ${position.y}px)`
                      : 'scale(1)',
                    transformOrigin: 'center center',
                  }}
                />
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="p-4 flex-grow">
          <CardTitle className="text-lg leading-tight mb-1 truncate">
            {photo.title}
          </CardTitle>
        </CardContent>
        <CardFooter className="p-4 pt-0 flex justify-between items-center">
          <p className="text-lg font-bold text-primary">
            {isFree ? 'Free' : `₹${photo.price}`}
          </p>
          {renderPurchaseButton()}
        </CardFooter>
      </Card>

      {/* Admin Modals */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              image "{photo.title}" from the gallery.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Image</DialogTitle>
            <DialogDescription>
              Update the details for "{editedPhoto?.title}".
            </DialogDescription>
          </DialogHeader>
          {editedPhoto && (
            <div className="grid gap-4 py-4">
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="edit-title">Title</Label>
                <Input
                  id="edit-title"
                  value={editedPhoto.title}
                  onChange={(e) =>
                    setEditedPhoto((p) => (p ? { ...p, title: e.target.value } : null))
                  }
                />
              </div>
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={editedPhoto.description}
                  onChange={(e) =>
                    setEditedPhoto((p) =>
                      p ? { ...p, description: e.target.value } : null
                    )
                  }
                />
              </div>
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="edit-price">Price (₹)</Label>
                <Input
                  id="edit-price"
                  type="number"
                  value={editedPhoto.price}
                  onChange={(e) =>
                    setEditedPhoto((p) =>
                      p ? { ...p, price: Number(e.target.value) } : null
                    )
                  }
                />
              </div>
            </div>
          )}
          <DialogFooter className="flex-col-reverse sm:flex-row">
            <DialogClose asChild>
              <Button type="button" variant="secondary">
                Cancel
              </Button>
            </DialogClose>
            <Button onClick={handleSaveEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

    