'use client';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { ImageCard } from '@/components/image-card';
import Image from 'next/image';
import type { Image as ImageType, SiteSettings, User } from '@/lib/types';
import { useCollection, useFirestore, useMemoFirebase, useDoc, useUser } from '@/firebase';
import { collection, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { placeholderImages } from '@/lib/placeholder-images';
import { useMemo, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Upload, Crown } from 'lucide-react';
import { addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { uploadImage } from '@/ai/flows/upload-image-flow';
import { extractDominantColor } from '@/ai/flows/extract-color-flow';
import { createSubscription, verifySubscription } from '@/lib/razorpay';


export default function Home() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  
  const imagesCollection = useMemoFirebase(() => collection(firestore, 'images'), [firestore]);
  const { data: photos, isLoading } = useCollection<ImageType>(imagesCollection);

  const sortedPhotos = useMemo(() => {
    if (!photos) return [];
    return [...photos].sort((a, b) => {
      if (a.price === 0 && b.price !== 0) return -1;
      if (a.price !== 0 && b.price === 0) return 1;
      return 0;
    });
  }, [photos]);

  const settingsDocRef = useMemoFirebase(() => doc(firestore, 'settings', 'main'), [firestore]);
  const { data: settings } = useDoc<SiteSettings>(settingsDocRef);

  const userDocRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [firestore, user]);
  const { data: userData } = useDoc<User>(userDocRef);
  
  const defaultHero = placeholderImages[0];
  const heroImageUrl = settings?.heroImageUrl || defaultHero.imageUrl;
  const heroImageHint = settings?.heroImageHint || defaultHero.imageHint;

  const designatedAdminEmail = 'jupiterbania472@gmail.com';
  const isAdmin = user?.email === designatedAdminEmail;

  // State for upload dialog
  const [isUploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [newPhoto, setNewPhoto] = useState({ title: '', description: '', price: 0 });
  const [imageFile, setImageFile] = useState<File | null>(null);

  // State for subscription
  const [isProcessing, setIsProcessing] = useState(false);
  
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
        description: 'Monthly Subscription',
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
  
      const rzp = new (window as any).Razorpay(options);
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


  const handleUpload = async () => {
    if (!firestore || !imageFile) {
      toast({
        variant: 'destructive',
        title: 'Upload Error',
        description: 'Please select an image file to upload.',
      });
      return;
    }

    setIsUploading(true);

    const reader = new FileReader();
    reader.readAsDataURL(imageFile);
    reader.onload = async () => {
      const photoDataUri = reader.result as string;

      try {
        const uploadResult = await uploadImage({ photoDataUri });
        if (!uploadResult || !uploadResult.imageUrl) {
          throw new Error('Image URL was not returned from the upload service.');
        }

        const colorResult = await extractDominantColor({ photoDataUri });
        const dominantColor = colorResult.dominantColor;

        addDocumentNonBlocking(
          imagesCollection,
          {
            ...newPhoto,
            imageUrl: uploadResult.imageUrl,
            blurredImageUrl: uploadResult.imageUrl, // Using same for now
            uploadDate: serverTimestamp(),
            sales: 0,
          }
        );

        setUploadDialogOpen(false);
        setNewPhoto({ title: '', description: '', price: 0 });
        setImageFile(null);
        toast({
          title: 'Image Uploaded!',
          description: 'The new image is now live in the gallery.',
        });
      } catch (error: any) {
        console.error('Upload process failed:', error);
        toast({
          variant: 'destructive',
          title: 'Upload Failed',
          description:
            error.message || 'An unknown error occurred during image upload.',
        });
      } finally {
        setIsUploading(false);
      }
    };
    reader.onerror = (error) => {
      toast({
        variant: 'destructive',
        title: 'File Read Error',
        description: 'Could not read the selected file.',
      });
      setIsUploading(false);
    };
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow">
        <section className="relative w-full h-[40vh] sm:h-[50vh] md:h-[60vh] flex items-center justify-center text-center text-white overflow-hidden">
          <Image
            src={heroImageUrl}
            alt="Welcome banner background"
            fill
            className="object-cover"
            data-ai-hint={heroImageHint}
            priority
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-black/50" />
          <div className="relative z-10 p-4">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white drop-shadow-md font-headline">
              WELCOME TO MY EXCLUSIVE CONTENT
            </h1>
          </div>
        </section>
        <section id="gallery" className="py-8 sm:py-12">
          <div className="container px-4 sm:px-6">
            <div className="flex flex-col sm:flex-row items-center justify-between mb-6 sm:mb-8 gap-4">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight font-headline">
                Explore Gallery
              </h2>
              <div className="flex items-center gap-2">
                {user && userData && userData.subscriptionStatus !== 'active' && !isAdmin && (
                  <Button onClick={handleSubscription} disabled={isProcessing} size="sm" variant="outline">
                      <Crown className="mr-2 h-4 w-4 text-amber-400" />
                      {isProcessing ? 'Processing...' : 'Subscribe to Unlock All'}
                  </Button>
                )}
                {isAdmin && (
                  <Dialog open={isUploadDialogOpen} onOpenChange={setUploadDialogOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <Upload className="mr-2 h-4 w-4" />
                        Upload Image
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>Upload New Image</DialogTitle>
                        <DialogDescription>
                          Select an image file and set its details to add it to the gallery.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid w-full items-center gap-1.5">
                          <Label htmlFor="imageFile">Image File</Label>
                          <Input id="imageFile" type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files ? e.target.files[0] : null)} />
                        </div>
                        <div className="grid w-full items-center gap-1.5">
                          <Label htmlFor="title">Title</Label>
                          <Input id="title" type="text" placeholder="A beautiful landscape" value={newPhoto.title} onChange={(e) => setNewPhoto({...newPhoto, title: e.target.value})} />
                        </div>
                        <div className="grid w-full items-center gap-1.5">
                          <Label htmlFor="description">Description</Label>
                          <Textarea id="description" placeholder="A detailed description of the image." value={newPhoto.description} onChange={(e) => setNewPhoto({...newPhoto, description: e.target.value})}/>
                        </div>
                        <div className="grid w-full items-center gap-1.5">
                          <Label htmlFor="price">Price (₹)</Label>
                          <Input id="price" type="number" placeholder="50" value={newPhoto.price} onChange={(e) => setNewPhoto({...newPhoto, price: Number(e.target.value)})} />
                        </div>
                      </div>
                      <DialogFooter className="flex-col-reverse sm:flex-row">
                          <DialogClose asChild>
                              <Button type="button" variant="secondary">Cancel</Button>
                          </DialogClose>
                          <Button type="submit" onClick={handleUpload} disabled={isUploading}>
                              {isUploading ? 'Uploading...' : 'Upload'}
                          </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
              {isLoading && Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="aspect-[3/4] bg-muted animate-pulse rounded-lg" />
              ))}
              {!isLoading && sortedPhotos.length === 0 && (
                <p className="col-span-full text-center text-muted-foreground">No images have been uploaded yet.</p>
              )}
              {sortedPhotos.map(photo => (
                <ImageCard key={photo.id} photo={photo} />
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
