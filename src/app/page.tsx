'use client';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { ImageCard } from '@/components/image-card';
import Image from 'next/image';
import type { Image as ImageType, SiteSettings } from '@/lib/types';
import { useCollection, useFirestore, useMemoFirebase, useDoc, useUser } from '@/firebase';
import { collection, doc, serverTimestamp } from 'firebase/firestore';
import { placeholderImages } from '@/lib/placeholder-images';
import { useMemo, useState, useRef, Fragment } from 'react';
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
import { AdBanner } from '@/components/ad-banner';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';


export default function Home() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const galleryRef = useRef<HTMLElement>(null);
  
  const imagesCollection = useMemoFirebase(() => collection(firestore, 'images'), [firestore]);
  const { data: photos, isLoading } = useCollection<ImageType>(imagesCollection);

  const sortedPhotos = useMemo(() => {
    if (!photos) return [];
    return [...photos].sort((a, b) => {
      const timeA = a.uploadDate?.toMillis() || 0;
      const timeB = b.uploadDate?.toMillis() || 0;
      return timeB - timeA;
    });
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
  const [uploadProgress, setUploadProgress] = useState(0);
  const [newPhoto, setNewPhoto] = useState({ title: '', description: '' });
  const [imageFiles, setImageFiles] = useState<FileList | null>(null);
  const [imageUrl, setImageUrl] = useState('');
  
  // State for pagination
  const [currentPage, setCurrentPage] = useState(1);
  const imagesPerPage = 8;
  const totalPages = Math.ceil((sortedPhotos?.length || 0) / imagesPerPage);
  const maxPageNumbersToShow = 4;

  const paginatedPhotos = useMemo(() => {
    const startIndex = (currentPage - 1) * imagesPerPage;
    const endIndex = startIndex + imagesPerPage;
    return sortedPhotos.slice(startIndex, endIndex);
  }, [sortedPhotos, currentPage, imagesPerPage]);

  const goToPage = (page: number) => {
    setCurrentPage(page);
    galleryRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const goToNextPage = () => {
    goToPage(Math.min(currentPage + 1, totalPages));
  };

  const goToPreviousPage = () => {
    goToPage(Math.max(currentPage - 1, 1));
  };
  
  const getPaginationGroup = () => {
    if (totalPages <= maxPageNumbersToShow) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    let startPage = Math.max(2, currentPage - 1);
    let endPage = startPage + maxPageNumbersToShow - 3;

    if (currentPage === 1) {
        startPage = 1;
        endPage = maxPageNumbersToShow -1;
    }

    if (endPage > totalPages -1) {
        endPage = totalPages -1;
        startPage = endPage - (maxPageNumbersToShow-3);
    }

    const pages: (number | string)[] = [1];
    if (startPage > 2) {
      pages.push('...');
    }
    
    for (let i = startPage; i <= endPage; i++) {
        if(i > 1 && i < totalPages) pages.push(i);
    }
    
    if (endPage < totalPages - 1) {
        pages.push('...');
    }

    if(totalPages > 1) pages.push(totalPages);
    return pages;
  };


  const resetUploadForm = () => {
    setNewPhoto({ title: '', description: '' });
    setImageFiles(null);
    setImageUrl('');
    setUploadDialogOpen(false);
  };
  
  const handleUpload = () => {
    if (!firestore) return;
    if (!imageFiles?.length && !imageUrl) {
      toast({
        variant: 'destructive',
        title: 'Upload Error',
        description: 'Please select an image file or provide a direct URL.',
      });
      return;
    }
    
    setUploadDialogOpen(false);
    setIsUploading(true);
    setUploadProgress(0);

    const performUpload = async () => {
      try {
        if (imageFiles && imageFiles.length > 0) {
          const totalFiles = imageFiles.length;
          for (let i = 0; i < totalFiles; i++) {
            const file = imageFiles[i];
            const reader = await new Promise<string>((resolve, reject) => {
              const fileReader = new FileReader();
              fileReader.readAsDataURL(file);
              fileReader.onload = () => resolve(fileReader.result as string);
              fileReader.onerror = (error) => reject(error);
            });

            const uploadResult = await uploadImage({ photoDataUri: reader });
            if (!uploadResult || !uploadResult.imageUrl) {
              throw new Error('Image URL was not returned from the upload service.');
            }
            
            const colorResult = await extractDominantColor({ photoDataUri: reader });
            const dominantColor = colorResult.dominantColor || '#F0F4F8';

            const originalFileName = file.name.substring(0, file.name.lastIndexOf('.'));
            
            addDocumentNonBlocking(
              imagesCollection,
              {
                title: newPhoto.title || originalFileName,
                description: newPhoto.description,
                imageUrl: uploadResult.imageUrl,
                blurredImageUrl: uploadResult.imageUrl,
                uploadDate: serverTimestamp(),
                dominantColor: dominantColor,
              }
            );
            setUploadProgress(((i + 1) / totalFiles) * 100);
          }
        } else if (imageUrl) {
          setUploadProgress(50);
          addDocumentNonBlocking(
            imagesCollection,
            {
              ...newPhoto,
              imageUrl: imageUrl,
              blurredImageUrl: imageUrl,
              uploadDate: serverTimestamp(),
              dominantColor: '#F0F4F8',
            }
          );
          setUploadProgress(100);
        }

        setTimeout(() => setIsUploading(false), 1000);
        resetUploadForm();
        toast({
          title: imageFiles && imageFiles.length > 1 ? `${imageFiles.length} Images Added!` : 'Image Added!',
          description: 'The new images are now live in the gallery.',
        });

      } catch (error: any) {
        console.error('Upload process failed:', error);
        toast({
          variant: 'destructive',
          title: 'Upload Failed',
          description:
            error.message || 'An unknown error occurred during image processing.',
        });
        setIsUploading(false);
      }
    };

    performUpload();
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
        <section ref={galleryRef} id="gallery" className="py-8 sm:py-12 scroll-mt-20">
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
                        <DialogTitle>Upload New Image(s)</DialogTitle>
                        <DialogDescription>
                          Select one or more image files to add to the gallery. You can also provide a URL for a single image.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto pr-4">
                        <div className="grid w-full items-center gap-1.5">
                          <Label htmlFor="imageFile">Image File(s)</Label>
                          <Input id="imageFile" type="file" accept="image/*" multiple
                            onChange={(e) => {
                                setImageFiles(e.target.files);
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
                                if (e.target.value) setImageFiles(null);
                            }}
                            disabled={!!imageFiles?.length}
                          />
                        </div>
                        <div className="grid w-full items-center gap-1.5 mt-4">
                          <Label htmlFor="title">Title</Label>
                          <Input id="title" type="text" placeholder="A beautiful landscape (optional)" value={newPhoto.title} onChange={(e) => setNewPhoto({...newPhoto, title: e.target.value})} />
                          <p className='text-xs text-muted-foreground'>If uploading multiple files, this title will be ignored. The original filename will be used as the title.</p>
                        </div>
                        <div className="grid w-full items-center gap-1.5">
                          <Label htmlFor="description">Description</Label>
                          <Textarea id="description" placeholder="A detailed description of the image." value={newPhoto.description} onChange={(e) => setNewPhoto({...newPhoto, description: e.target.value})}/>
                        </div>
                      </div>
                      <DialogFooter className="flex-col-reverse sm:flex-row pt-4 border-t">
                          <DialogClose asChild>
                              <Button type="button" variant="secondary" onClick={resetUploadForm}>Cancel</Button>
                          </DialogClose>
                          <Button type="submit" onClick={handleUpload}>
                              Upload
                          </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </div>

            {isUploading && (
              <div className="mb-4">
                <Progress value={uploadProgress} className="w-full" />
                <p className="text-sm text-center mt-2 text-muted-foreground">Uploading images... ({Math.round(uploadProgress)}%)</p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
              {isLoading && Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="aspect-[3/4] bg-muted animate-pulse rounded-lg" />
              ))}
              {!isLoading && paginatedPhotos.length === 0 && (
                <p className="col-span-full text-center text-muted-foreground">No images have been uploaded yet.</p>
              )}
              {paginatedPhotos.map((photo, index) => (
                <Fragment key={photo.id}>
                  <ImageCard photo={photo} />
                  {index === 3 && <AdBanner />}
                </Fragment>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8 sm:mt-12">
                <Button onClick={goToPreviousPage} disabled={currentPage === 1} variant="outline">
                  Previous
                </Button>
                <nav className="flex items-center gap-1">
                  {getPaginationGroup().map((item, index) =>
                    typeof item === 'number' ? (
                      <Button
                        key={index}
                        onClick={() => goToPage(item)}
                        variant={currentPage === item ? 'default' : 'outline'}
                        className={cn(
                          'h-9 w-9 p-0',
                          currentPage === item && 'pointer-events-none'
                        )}
                      >
                        {item}
                      </Button>
                    ) : (
                      <span key={index} className="px-2">
                        {item}
                      </span>
                    )
                  )}
                </nav>
                <Button onClick={goToNextPage} disabled={currentPage === totalPages} variant="outline">
                  Next
                </Button>
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
