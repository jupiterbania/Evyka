'use client';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { ImageCard } from '@/components/image-card';
import Image from 'next/image';
import type { Image as ImageType, SiteSettings } from '@/lib/types';
import { useCollection, useFirestore, useMemoFirebase, useDoc, useUser } from '@/firebase';
import { collection, doc, serverTimestamp } from 'firebase/firestore';
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
import { Upload } from 'lucide-react';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { uploadImage } from '@/ai/flows/upload-image-flow';
import { extractDominantColor } from '@/ai/flows/extract-color-flow';
import { Switch } from '@/components/ui/switch';


export default function Home() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  
  const imagesCollection = useMemoFirebase(() => collection(firestore, 'images'), [firestore]);
  const { data: photos, isLoading } = useCollection<ImageType>(imagesCollection);

  const sortedPhotos = useMemo(() => {
    if (!photos) return [];
    return [...photos].sort((a, b) => b.uploadDate.toMillis() - a.uploadDate.toMillis());
  }, [photos]);

  const settingsDocRef = useMemoFirebase(() => doc(firestore, 'settings', 'main'), [firestore]);
  const { data: settings } = useDoc<SiteSettings>(settingsDocRef);
  
  const defaultHero = placeholderImages[0];
  const heroImageUrl = settings?.heroImageUrl || defaultHero.imageUrl;
  const heroImageHint = settings?.heroImageHint || defaultHero.imageHint;

  const designatedAdminEmail = 'jupiterbania472@gmail.com';
  const isAdmin = user?.email === designatedAdminEmail;

  // State for upload dialog
  const [isUploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [newPhoto, setNewPhoto] = useState({ title: '', description: '' });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState('');
  const [isAdGated, setIsAdGated] = useState(false);
  
  const resetUploadForm = () => {
    setNewPhoto({ title: '', description: '' });
    setImageFile(null);
    setImageUrl('');
    setIsAdGated(false);
    setUploadDialogOpen(false);
  };
  
  const handleUpload = async () => {
    if (!firestore) return;
    if (!imageFile && !imageUrl) {
      toast({
        variant: 'destructive',
        title: 'Upload Error',
        description: 'Please select an image file or provide a direct URL.',
      });
      return;
    }

    setIsUploading(true);

    try {
      let finalImageUrl: string;
      let photoDataUriForColor: string | undefined;

      if (imageFile) {
        // Upload from file
        const reader = await new Promise<string>((resolve, reject) => {
          const fileReader = new FileReader();
          fileReader.readAsDataURL(imageFile);
          fileReader.onload = () => resolve(fileReader.result as string);
          fileReader.onerror = (error) => reject(error);
        });

        photoDataUriForColor = reader;
        const uploadResult = await uploadImage({ photoDataUri: reader });
        if (!uploadResult || !uploadResult.imageUrl) {
          throw new Error('Image URL was not returned from the upload service.');
        }
        finalImageUrl = uploadResult.imageUrl;
      } else {
        // Use direct URL
        finalImageUrl = imageUrl;
      }

      let dominantColor = '#F0F4F8'; // Default background color
      if (photoDataUriForColor) {
        const colorResult = await extractDominantColor({ photoDataUri: photoDataUriForColor });
        dominantColor = colorResult.dominantColor;
      }

      addDocumentNonBlocking(
        imagesCollection,
        {
          ...newPhoto,
          imageUrl: finalImageUrl,
          blurredImageUrl: finalImageUrl,
          uploadDate: serverTimestamp(),
          dominantColor: dominantColor,
          isAdGated: isAdGated,
        }
      );

      resetUploadForm();
      toast({
        title: 'Image Added!',
        description: 'The new image is now live in the gallery.',
      });
    } catch (error: any) {
      console.error('Upload process failed:', error);
      toast({
        variant: 'destructive',
        title: 'Upload Failed',
        description:
          error.message || 'An unknown error occurred during image processing.',
      });
    } finally {
      setIsUploading(false);
    }
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
                          <Input id="imageFile" type="file" accept="image/*" 
                            onChange={(e) => {
                                setImageFile(e.target.files ? e.target.files[0] : null);
                                if (e.target.files?.length) setImageUrl('');
                            }}
                            disabled={!!imageUrl}
                          />
                        </div>
                         <div className="relative my-2">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-background px-2 text-muted-foreground">OR</span>
                            </div>
                        </div>
                        <div className="grid w-full items-center gap-1.5">
                          <Label htmlFor="imageUrl">Image URL</Label>
                          <Input id="imageUrl" type="text" placeholder="https://example.com/image.png" 
                            value={imageUrl} 
                            onChange={(e) => {
                                setImageUrl(e.target.value);
                                if (e.target.value) setImageFile(null);
                            }}
                            disabled={!!imageFile}
                          />
                        </div>
                        <div className="grid w-full items-center gap-1.5 mt-4">
                          <Label htmlFor="title">Title</Label>
                          <Input id="title" type="text" placeholder="A beautiful landscape" value={newPhoto.title} onChange={(e) => setNewPhoto({...newPhoto, title: e.target.value})} />
                        </div>
                        <div className="grid w-full items-center gap-1.5">
                          <Label htmlFor="description">Description</Label>
                          <Textarea id="description" placeholder="A detailed description of the image." value={newPhoto.description} onChange={(e) => setNewPhoto({...newPhoto, description: e.target.value})}/>
                        </div>
                        <div className="flex items-center space-x-2 mt-2">
                            <Switch id="ad-gated-switch" checked={isAdGated} onCheckedChange={setIsAdGated} />
                            <Label htmlFor="ad-gated-switch">Ad-Gated</Label>
                        </div>
                      </div>
                      <DialogFooter className="flex-col-reverse sm:flex-row">
                          <DialogClose asChild>
                              <Button type="button" variant="secondary" onClick={resetUploadForm}>Cancel</Button>
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
