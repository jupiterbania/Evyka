
"use client";

import { useState, useRef, useEffect } from 'react';
import type { Media as MediaType } from '@/lib/types';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogFooter,
  } from "@/components/ui/alert-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Image from 'next/image';
import { Upload, Edit, Trash2, MoreHorizontal, Film, ImageIcon, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from './ui/card';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, serverTimestamp } from 'firebase/firestore';
import { addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { Textarea } from './ui/textarea';
import { uploadMedia } from '@/ai/flows/upload-media-flow';
import { extractDominantColor } from '@/ai/flows/extract-color-flow';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';

function ImageManagementInternal() {
  const firestore = useFirestore();
  const mediaItemsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'media') : null), [firestore]);
  const { data: mediaItems, isLoading } = useCollection<MediaType>(mediaItemsQuery);

  const [isUploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [isEditDialogOpen, setEditDialogOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadStatusMessage, setUploadStatusMessage] = useState('');
  
  const [newMedia, setNewMedia] = useState({ title: '', description: '' });
  const [mediaFiles, setMediaFiles] = useState<FileList | null>(null);
  const [imageUrl, setImageUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [uploadCounts, setUploadCounts] = useState({ current: 0, total: 0 });

  const [selectedMedia, setSelectedMedia] = useState<Partial<MediaType> & { id: string } | null>(null);
  const [mediaToDelete, setMediaToDelete] = useState<MediaType | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [isUploadingThumbnail, setIsUploadingThumbnail] = useState(false);

  const { toast } = useToast();

  const handleEditClick = (media: MediaType) => {
    setSelectedMedia(media);
    setThumbnailFile(null);
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedMedia || !firestore) return;

    const docRef = doc(firestore, 'media', selectedMedia.id);
    let finalUpdates: Partial<MediaType> = {
        title: selectedMedia.title,
        description: selectedMedia.description,
        thumbnailUrl: selectedMedia.thumbnailUrl,
    };

    if (thumbnailFile) {
        setIsUploadingThumbnail(true);
        try {
            const reader = await new Promise<string>((resolve, reject) => {
              const fileReader = new FileReader();
              fileReader.readAsDataURL(thumbnailFile);
              fileReader.onload = () => resolve(fileReader.result as string);
              fileReader.onerror = (error) => reject(error);
            });
            const uploadResult = await uploadMedia({ mediaDataUri: reader, isVideo: false });

            if (!uploadResult || !uploadResult.mediaUrl) {
                throw new Error("Thumbnail upload failed to return a URL.");
            }
            finalUpdates.thumbnailUrl = uploadResult.mediaUrl;

        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Thumbnail Upload Failed',
                description: error.message || "Could not upload the new thumbnail.",
            });
            setIsUploadingThumbnail(false);
            return;
        } finally {
            setIsUploadingThumbnail(false);
        }
    }

    updateDocumentNonBlocking(docRef, finalUpdates);
    
    toast({
        title: "Media Updated",
        description: "The media details have been successfully updated.",
    });
    setEditDialogOpen(false);
    setSelectedMedia(null);
    setThumbnailFile(null);
  }

  const handleDeleteClick = (media: MediaType) => {
    setMediaToDelete(media);
  };

  const confirmDelete = () => {
    if (!mediaToDelete || !firestore) return;
    const docRef = doc(firestore, 'media', mediaToDelete.id);
    deleteDocumentNonBlocking(docRef);

    toast({
        title: "Media Deleted",
        description: "The media has been successfully removed.",
        variant: "destructive",
      });
    setMediaToDelete(null);
  }
  
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
    if (!firestore) return;
    const mediaCollectionRef = collection(firestore, 'media');
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

          if (validFiles.length === 0) throw new Error("No valid files to upload.");

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
              };
              
              addDocumentNonBlocking(mediaCollectionRef, docData);
              uploadedCount++;

              if (i < validFiles.length - 1) {
                setUploadStatusMessage(`Waiting 2 seconds...`);
                setUploadProgress(null); // Hide progress bar
                await new Promise(resolve => setTimeout(resolve, 2000));
              }

            } catch (fileError: any) {
               toast({
                variant: 'destructive',
                title: `Failed to upload ${file.name}`,
                description: fileError.message || "An unknown error occurred.",
              });
            }
          }

          toast({
            title: `Upload Complete`,
            description: `${uploadedCount} of ${validFiles.length} files were successfully uploaded.`,
          });
          setUploadStatusMessage('Completed!');

        } else if (imageUrl) {
          setUploadStatusMessage('Uploading from URL...');
          const uploadResult = await uploadMediaWithProgress({ mediaDataUri: imageUrl, isVideo: false }, setUploadProgress);
          
          addDocumentNonBlocking(mediaCollectionRef, {
            ...newMedia,
            mediaUrl: uploadResult.mediaUrl,
            thumbnailUrl: uploadResult.thumbnailUrl,
            mediaType: 'image',
            uploadDate: serverTimestamp(),
            dominantColor: '#F0F4F8',
          });
          setUploadStatusMessage('URL uploaded successfully.');

        } else if (videoUrl) {
          setUploadStatusMessage('Submitting Video URL...');
          setUploadProgress(50);
          addDocumentNonBlocking(mediaCollectionRef, {
            ...newMedia,
            mediaUrl: videoUrl,
            mediaType: 'video',
            uploadDate: serverTimestamp(),
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
          title: 'Upload Failed',
          description: error.message || 'An unknown error occurred during upload.',
        });
        resetUploadForm();
      }
    };
    performUpload();
  };

  const showTitleInput = !mediaFiles || mediaFiles.length <= 1;

  return (
    <Card>
      <CardContent className="p-0">
      <div className="flex justify-end p-4 border-b">
        <Dialog open={isUploadDialogOpen} onOpenChange={setUploadDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Upload className="mr-2 h-4 w-4" />
              Upload Media
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Upload New Media</DialogTitle>
              <DialogDescription>
                 Select files, or provide an image/video URL. Max size is 99MB.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto pr-4">
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="mediaFile-admin">Media File(s)</Label>
                <Input id="mediaFile-admin" type="file" accept="image/*,video/mp4,video/quicktime,video/x-m4v,video/*" multiple
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
                <Label htmlFor="imageUrl-admin">Image URL</Label>
                <Input id="imageUrl-admin" type="text" placeholder="https://example.com/image.png" 
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
                <Label htmlFor="videoUrl-admin">Video URL</Label>
                <Input id="videoUrl-admin" type="text" placeholder="https://youtube.com/watch?v=..." 
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
                    <Label htmlFor="title-admin">Title</Label>
                    <Input id="title-admin" type="text" placeholder="A beautiful landscape (optional)" value={newMedia.title} onChange={(e) => setNewMedia({...newMedia, title: e.target.value})} />
                </div>
              )}
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="description-admin">Description</Label>
                <Textarea id="description-admin" placeholder="A detailed description of the media." value={newMedia.description} onChange={(e) => setNewMedia({...newMedia, description: e.target.value})}/>
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

      {isUploading && (
        <div className="p-4 border-b space-y-2">
            <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">{uploadStatusMessage}</span>
                {uploadCounts.total > 1 && (
                  <span className="font-medium">{uploadCounts.current} / {uploadCounts.total}</span>
                )}
            </div>
            {uploadProgress !== null && <Progress value={uploadProgress} className="w-full h-2" />}
        </div>
        )}

      <div className="relative w-full overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px] px-4">Thumbnail</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="w-[120px] text-center px-4">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
                    <div className="flex justify-center items-center">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                </TableCell>
              </TableRow>
            )}
            {!isLoading && mediaItems?.map((media) => (
              <TableRow key={media.id}>
                <TableCell className="px-4">
                  <div 
                    className="w-[60px] h-[60px] relative rounded-md overflow-hidden bg-card"
                  >
                    <Image
                      src={media.thumbnailUrl || media.mediaUrl}
                      alt={media.title}
                      fill
                      className="object-cover"
                    />
                  </div>
                </TableCell>
                <TableCell className="font-medium truncate max-w-xs">{media.title}</TableCell>
                <TableCell>
                  <Badge variant={media.mediaType === 'video' ? 'default' : 'secondary'} className="capitalize">
                    {media.mediaType === 'video' ? <Film className="mr-1.5 h-3.5 w-3.5" /> : <ImageIcon className="mr-1.5 h-3.5 w-3.5" />}
                    {media.mediaType}
                  </Badge>
                </TableCell>
                <TableCell className="text-center px-4">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => handleEditClick(media)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleDeleteClick(media)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                        </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </div>

        <AlertDialog open={!!mediaToDelete} onOpenChange={(open) => !open && setMediaToDelete(null)}>
            <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the media
                    and remove its data from our servers.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setMediaToDelete(null)}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">
                Delete
                </AlertDialogAction>
            </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        <Dialog open={isEditDialogOpen} onOpenChange={setEditDialogOpen}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                <DialogTitle>Edit Media</DialogTitle>
                <DialogDescription>
                    Update the details for this media item.
                </DialogDescription>
                </DialogHeader>
                {selectedMedia && <div className="grid gap-4 py-4">
                    <div className="grid w-full items-center gap-1.5">
                        <Label htmlFor="edit-title">Title</Label>
                        <Input id="edit-title" value={selectedMedia.title || ''} onChange={(e) => setSelectedMedia(p => p ? {...p, title: e.target.value} : null)} />
                    </div>
                    <div className="grid w-full items-center gap-1.5">
                        <Label htmlFor="edit-description">Description</Label>
                        <Textarea id="edit-description" value={selectedMedia.description || ''} onChange={(e) => setSelectedMedia(p => p ? {...p, description: e.target.value} : null)} />
                    </div>
                     {selectedMedia.mediaType === 'video' && (
                      <>
                        <div className="grid w-full items-center gap-1.5">
                          <Label htmlFor="edit-thumbnail-url">Thumbnail URL</Label>
                          <Input
                            id="edit-thumbnail-url"
                            value={selectedMedia.thumbnailUrl || ''}
                            onChange={(e) =>
                              setSelectedMedia((p) => (p ? { ...p, thumbnailUrl: e.target.value } : null))
                            }
                            placeholder="https://example.com/thumbnail.jpg"
                          />
                        </div>
                        <div className="relative my-1">
                          <div className="absolute inset-0 flex items-center">
                              <span className="w-full border-t" />
                          </div>
                          <div className="relative flex justify-center text-xs uppercase">
                              <span className="bg-background px-2 text-muted-foreground">OR</span>
                          </div>
                        </div>
                        <div className="grid w-full items-center gap-1.5">
                          <Label htmlFor="edit-thumbnail-file">Upload New Thumbnail</Label>
                          <Input
                            id="edit-thumbnail-file"
                            type="file"
                            accept="image/*"
                            onChange={(e) => setThumbnailFile(e.target.files ? e.target.files[0] : null)}
                          />
                        </div>
                      </>
                    )}
                </div>}
                <DialogFooter className="flex-col-reverse sm:flex-row pt-4 border-t">
                    <DialogClose asChild>
                        <Button type="button" variant="secondary" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
                    </DialogClose>
                    <Button onClick={handleSaveEdit} disabled={isUploadingThumbnail}>
                        {isUploadingThumbnail ? 'Uploading...' : 'Save Changes'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

export function ImageManagement() {
  const firestore = useFirestore();

  // This guard prevents the component from rendering until firestore is available.
  if (!firestore) {
    return (
        <Card>
            <CardContent className="p-4 flex justify-center items-center h-48">
                <div className="flex justify-center items-center">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            </CardContent>
        </Card>
    );
  }

  return <ImageManagementInternal />;
}
