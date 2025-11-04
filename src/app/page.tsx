'use client';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { ImageCard } from '@/components/image-card';
import Image from 'next/image';
import type { Media as MediaType, SiteSettings, Message } from '@/lib/types';
import { useCollection, useFirestore, useMemoFirebase, useDoc, useUser, useCollectionGroup } from '@/firebase';
import { collection, doc, serverTimestamp, query, collectionGroup } from 'firebase/firestore';
import { useMemo, useState, useRef, Fragment, useEffect } from 'react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Upload, Film, ImageIcon, AlertTriangle, Loader2, MessageSquare } from 'lucide-react';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { uploadMedia } from '@/ai/flows/upload-media-flow';
import { extractDominantColor } from '@/ai/flows/extract-color-flow';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { MessageDialog } from '@/components/message-dialog';
import Link from 'next/link';


export default function Home() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const galleryRef = useRef<HTMLElement>(null);
  
  const mediaCollection = useMemoFirebase(() => firestore ? collection(firestore, 'media') : null, [firestore]);
  const { data: media, isLoading } = useCollection<MediaType>(mediaCollection);

  const [filter, setFilter] = useState<'image' | 'video' | 'nude'>('image');

  const sortedMedia = useMemo(() => {
    if (!media) return [];
    return [...media].sort((a, b) => {
      const timeA = a.uploadDate?.toMillis() || 0;
      const timeB = b.uploadDate?.toMillis() || 0;
      return timeB - timeA;
    });
  }, [media]);

  const filteredMedia = useMemo(() => {
    if (filter === 'nude') {
      return sortedMedia.filter(item => item.isNude);
    }
    // Default filter for 'image' or 'video' should not show nudes
    return sortedMedia.filter(item => item.mediaType === filter && !item.isNude);
  }, [sortedMedia, filter]);


  const settingsDocRef = useMemoFirebase(() => firestore ? doc(firestore, 'settings', 'main') : null, [firestore]);
  const { data: settings } = useDoc<SiteSettings>(settingsDocRef);
  
  const heroImageUrl = settings?.heroImageUrl;
  const heroImageHint = settings?.heroImageHint;

  const designatedAdminEmail = 'jupiterbania472@gmail.com';
  const isAdmin = user?.email === designatedAdminEmail;

  // --- Unread Messages Logic ---
  const allMessagesQuery = useMemoFirebase(
    () => (firestore && isAdmin ? collectionGroup(firestore, 'messages') : null),
    [firestore, isAdmin]
  );
  const { data: allMessages } = useCollectionGroup<Message>(allMessagesQuery);
  const unreadCount = useMemo(() => {
    if (!allMessages) return 0;
    // Client-side filter
    return allMessages.filter(msg => !msg.isRead).length;
  }, [allMessages]);
  // --- End Unread Messages Logic ---

  // State for upload dialog
  const [isUploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadStatusMessage, setUploadStatusMessage] = useState('');
  const [newMedia, setNewMedia] = useState({ title: '', description: '' });
  const [mediaFiles, setMediaFiles] = useState<FileList | null>(null);
  const [imageUrl, setImageUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [uploadCounts, setUploadCounts] = useState({ current: 0, total: 0 });

  // State for age gate
  const [isAgeGateOpen, setAgeGateOpen] = useState(false);
  const [isAgeConfirmed, setAgeConfirmed] = useState(false);
  
  // State for pagination
  const [currentPage, setCurrentPage] = useState(1);
  const imagesPerPage = 16;
  const totalPages = Math.ceil((filteredMedia?.length || 0) / imagesPerPage);
  const maxPageNumbersToShow = 4;

  const paginatedMedia = useMemo(() => {
    const startIndex = (currentPage - 1) * imagesPerPage;
    const endIndex = startIndex + imagesPerPage;
    return filteredMedia.slice(startIndex, endIndex);
  }, [filteredMedia, currentPage, imagesPerPage]);

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
    setNewMedia({ title: '', description: '' });
    setMediaFiles(null);
    setImageUrl('');
    setVideoUrl('');
    setUploadDialogOpen(false);
    setIsUploading(false);
    setUploadCounts({ current: 0, total: 0 });
    setUploadProgress(null);
    setUploadStatusMessage('');
  };

  const uploadMediaWithProgress = async (
    input: { mediaDataUri: string, isVideo?: boolean },
    onProgress: (progress: number) => void
  ) => {
    onProgress(10);
    const promise = uploadMedia(input);
    
    const progressInterval = setInterval(() => {
      onProgress(Math.random() * 40 + 20); // Simulate progress between 20% and 60%
    }, 500);
  
    try {
      const result = await promise;
      clearInterval(progressInterval);
      onProgress(100);
      return result;
    } catch (error) {
      clearInterval(progressInterval);
      onProgress(0); // Reset progress on error
      throw error;
    }
  };

  const handleUpload = async () => {
    if (!firestore || !mediaCollection) return;
    if (!mediaFiles?.length && !imageUrl && !videoUrl) {
      toast({
        variant: 'destructive',
        title: 'Upload Error',
        description: 'Please select a file or provide an image/video URL.',
      });
      return;
    }
    
    setUploadDialogOpen(false);
    setIsUploading(true);
    setUploadProgress(0);
    setUploadStatusMessage('Preparing upload...');

    const performUpload = async () => {
      try {
        const isForNudes = filter === 'nude';
        
        if (mediaFiles && mediaFiles.length > 0) {
          const filesArray = Array.from(mediaFiles);
          
          const validFiles = filesArray.filter(file => {
            if (file.size > 99 * 1024 * 1024) {
              toast({
                variant: 'destructive',
                title: 'File Too Large',
                description: `"${file.name}" is over 99MB and will be skipped.`,
              });
              return false;
            }
            return true;
          });

          if (validFiles.length === 0) {
            throw new Error("No valid files to upload.");
          }

          setUploadCounts({ current: 0, total: validFiles.length });
          let uploadedCount = 0;
          
          for (let i = 0; i < validFiles.length; i++) {
            const file = validFiles[i];
            setUploadCounts(prev => ({ ...prev, current: i + 1 }));
            setUploadStatusMessage(`Uploading file ${i + 1} of ${validFiles.length}: ${file.name}`);
            setUploadProgress(0);

            try {
              const mediaDataUri = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.readAsDataURL(file);
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = error => reject(error);
              });

              const isVideo = file.type.startsWith('video/');
              const uploadResult = await uploadMediaWithProgress({ mediaDataUri, isVideo }, setUploadProgress);
              
              const docData: any = {
                title: validFiles.length > 1 ? file.name.split('.').slice(0, -1).join('.') : newMedia.title,
                description: newMedia.description,
                mediaUrl: uploadResult.mediaUrl,
                thumbnailUrl: uploadResult.thumbnailUrl,
                mediaType: isVideo ? 'video' : 'image',
                uploadDate: serverTimestamp(),
                isNude: isForNudes
              };
              
              addDocumentNonBlocking(mediaCollection, docData);
              uploadedCount++;

              // Pause between uploads if it's not the last file
              if (i < validFiles.length - 1) {
                setUploadStatusMessage(`Waiting 2 seconds...`);
                setUploadProgress(null);
                await new Promise(resolve => setTimeout(resolve, 2000));
              }

            } catch (fileError: any) {
              toast({
                variant: 'destructive',
                title: `Failed to upload ${file.name}`,
                description: fileError.message || "An unknown error occurred.",
              });
              // Skip to the next file
            }
          }

          toast({
            title: `Upload Complete`,
            description: `${uploadedCount} of ${validFiles.length} files were successfully uploaded.`,
          });
          setUploadStatusMessage(`Completed!`);

        } else if (imageUrl) {
          setUploadStatusMessage('Uploading from URL...');
          const uploadResult = await uploadMediaWithProgress({ mediaDataUri: imageUrl, isVideo: false }, setUploadProgress);

          addDocumentNonBlocking(mediaCollection, {
            ...newMedia,
            mediaUrl: uploadResult.mediaUrl,
            thumbnailUrl: uploadResult.thumbnailUrl,
            mediaType: 'image',
            uploadDate: serverTimestamp(),
            isNude: isForNudes,
            dominantColor: '#F0F4F8',
          });
          setUploadStatusMessage('URL uploaded successfully.');

        } else if (videoUrl) {
          setUploadStatusMessage('Submitting Video URL...');
          setUploadProgress(50);
          addDocumentNonBlocking(mediaCollection, {
            ...newMedia,
            mediaUrl: videoUrl,
            mediaType: 'video', 
            uploadDate: serverTimestamp(),
            isNude: isForNudes,
          });
          setUploadProgress(100);
          setUploadStatusMessage('Video URL submitted.');
        }

        setTimeout(() => {
          resetUploadForm();
        }, 3000);

      } catch (error: any) {
        console.error('Upload process failed:', error);
        toast({
          variant: 'destructive',
          title: 'Upload Process Failed',
          description: error.message || 'An unknown error occurred during the upload process.',
        });
        resetUploadForm();
      }
    };

    performUpload();
  };


  const handleNudesClick = () => {
    if (isAgeConfirmed) {
      setFilter('nude');
    } else {
      setAgeGateOpen(true);
    }
  };

  const handleAgeConfirm = () => {
    setAgeConfirmed(true);
    setFilter('nude');
    setAgeGateOpen(false);
  };

  const showTitleInput = !mediaFiles || mediaFiles.length <= 1;

  useEffect(() => {
    setCurrentPage(1);
  }, [filter]);


  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow">
        <section className="relative w-full h-[40vh] sm:h-[50vh] md:h-[60vh] flex items-center justify-center text-center text-white overflow-hidden">
          {heroImageUrl && (
            <Image
              src={heroImageUrl}
              alt="Welcome banner background"
              fill
              className="object-cover"
              data-ai-hint={heroImageHint}
              priority
              sizes="100vw"
            />
          )}
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
               {isAdmin ? (
                  <Button asChild className="relative">
                    <Link href="/admin/messages">
                      <MessageSquare className="mr-2 h-4 w-4" />
                      View Messages
                      {unreadCount > 0 && (
                        <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-xs font-bold text-destructive-foreground">
                          {unreadCount}
                        </span>
                      )}
                    </Link>
                  </Button>
                ) : (
                  <MessageDialog 
                    trigger={<Button variant="outline">
                      <MessageSquare className="mr-2 h-4 w-4" />
                      Send me a personal message
                    </Button>}
                  />
                )}
            </div>
            
            <div className="flex justify-center mb-6 sm:mb-8">
              <div className="inline-flex items-center justify-center rounded-md bg-muted p-1">
                <Button variant={filter === 'image' ? 'default' : 'ghost'} onClick={() => setFilter('image')} className="px-4 py-2 h-auto">
                    <ImageIcon className="mr-2 h-4 w-4" />
                    Images
                </Button>
                <Button variant={filter === 'video' ? 'default' : 'ghost'} onClick={() => setFilter('video')} className="px-4 py-2 h-auto">
                    <Film className="mr-2 h-4 w-4" />
                    Videos
                </Button>
                <Button 
                  variant={filter === 'nude' ? 'default' : 'ghost'}
                  onClick={handleNudesClick} 
                  className={cn(
                      "px-4 py-2 h-auto animate-glow-right",
                      filter !== 'nude' && "text-accent hover:bg-accent/10 hover:text-white focus:bg-accent/10 focus:text-white",
                      filter === 'nude' && "bg-accent text-accent-foreground hover:bg-accent/90",
                      "focus-visible:ring-accent"
                  )}
                >
                    <AlertTriangle className="mr-2 h-4 w-4" />
                    18+
                </Button>
              </div>
            </div>

            {isAdmin && (
              <div className="flex justify-center mb-6 sm:mb-8">
                <Dialog open={isUploadDialogOpen} onOpenChange={setUploadDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Upload className="mr-2 h-4 w-4" />
                      Upload to {filter.charAt(0).toUpperCase() + filter.slice(1)}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Upload New Media</DialogTitle>
                      <DialogDescription>
                        Select files or provide a URL to add to the '{filter}' category. Max size is 99MB.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto pr-4">
                      <div className="grid w-full items-center gap-1.5">
                        <Label htmlFor="mediaFile">Media File(s)</Label>
                        <Input id="mediaFile" type="file" accept="image/*,video/mp4,video/quicktime,video/x-m4v,video/*" multiple
                          onChange={(e) => {
                              setMediaFiles(e.target.files);
                              if (e.target.files?.length) {
                                setImageUrl('');
                                setVideoUrl('');
                              }
                          }}
                          disabled={!!imageUrl || !!videoUrl}
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
                              if (e.target.value) {
                                setMediaFiles(null);
                                setVideoUrl('');
                              }
                          }}
                          disabled={!!mediaFiles?.length || !!videoUrl}
                        />
                      </div>
                      <div className="grid w-full items-center gap-1.5">
                        <Label htmlFor="videoUrl">Video URL</Label>
                        <Input id="videoUrl" type="text" placeholder="https://youtube.com/watch?v=... or Google Drive link" 
                          value={videoUrl} 
                          onChange={(e) => {
                              setVideoUrl(e.target.value);
                              if (e.target.value) {
                                setMediaFiles(null);
                                setImageUrl('');
                              }
                          }}
                          disabled={!!mediaFiles?.length || !!imageUrl}
                        />
                      </div>
                      {showTitleInput && (
                          <div className="grid w-full items-center gap-1.5 mt-4">
                              <Label htmlFor="title">Title</Label>
                              <Input id="title" type="text" placeholder="A beautiful landscape" value={newMedia.title} onChange={(e) => setNewMedia({...newMedia, title: e.target.value})} />
                          </div>
                      )}
                      <div className="grid w-full items-center gap-1.5">
                        <Label htmlFor="description">Description</Label>
                        <Textarea id="description" placeholder="A detailed description of the media." value={newMedia.description} onChange={(e) => setNewMedia({...newMedia, description: e.target.value})}/>
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
              </div>
            )}


            {isUploading && (
              <div className="mb-4 space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">{uploadStatusMessage}</span>
                  {uploadCounts.total > 1 && (
                    <span className="font-medium">{uploadCounts.current} / {uploadCounts.total}</span>
                  )}
                </div>
                {uploadProgress !== null && <Progress value={uploadProgress} className="w-full h-2" />}
              </div>
            )}
            
            {isLoading ? (
              <div className="flex flex-col items-center justify-center min-h-[30vh]">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="mt-4 text-muted-foreground">Loading Gallery...</p>
              </div>
            ) : paginatedMedia.length === 0 ? (
              <p className="col-span-full text-center text-muted-foreground min-h-[30vh] flex items-center justify-center">
                No media in the '{filter}' category yet.
              </p>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                  {paginatedMedia.map((item, index) => (
                    <ImageCard key={item.id} media={item} index={index} />
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
              </>
            )}
          </div>
        </section>
      </main>
      <Footer />

      <AlertDialog open={isAgeGateOpen} onOpenChange={setAgeGateOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Age Verification</AlertDialogTitle>
            <AlertDialogDescription>
              You must be 18 years or older to view this content. Please confirm your age.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No, take me back</AlertDialogCancel>
            <AlertDialogAction onClick={handleAgeConfirm}>
              Yes, I am 18+
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
