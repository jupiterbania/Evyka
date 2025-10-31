"use client";

import { useState } from 'react';
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
import { Upload, Edit, Trash2, MoreHorizontal, Film, ImageIcon } from 'lucide-react';
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

export function ImageManagement() {
  const firestore = useFirestore();
  const mediaCollection = useMemoFirebase(() => collection(firestore, 'media'), [firestore]);
  const { data: mediaItems, isLoading } = useCollection<MediaType>(mediaCollection);

  const [isUploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [isEditDialogOpen, setEditDialogOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  const [newMedia, setNewMedia] = useState({ title: '', description: '' });
  const [mediaFiles, setMediaFiles] = useState<FileList | null>(null);
  const [mediaUrl, setMediaUrl] = useState('');
  
  const [selectedMedia, setSelectedMedia] = useState<MediaType | null>(null);
  const [mediaToDelete, setMediaToDelete] = useState<MediaType | null>(null);

  const { toast } = useToast();

  const handleEditClick = (media: MediaType) => {
    setSelectedMedia(media);
    setEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (!selectedMedia || !firestore) return;

    const docRef = doc(firestore, 'media', selectedMedia.id);
    updateDocumentNonBlocking(docRef, {
        title: selectedMedia.title,
        description: selectedMedia.description,
    });
    
    toast({
        title: "Media Updated",
        description: "The media details have been successfully updated.",
    });
    setEditDialogOpen(false);
    setSelectedMedia(null);
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
    setMediaUrl('');
    setUploadDialogOpen(false);
  };

  const handleUpload = () => {
    if (!firestore) return;
    if (!mediaFiles?.length && !mediaUrl) {
      toast({
        variant: 'destructive',
        title: 'Upload Error',
        description: 'Please select a file or provide a direct URL.',
      });
      return;
    }
  
    setUploadDialogOpen(false);
    setIsUploading(true);
    setUploadProgress(0);

    const performUpload = async () => {
      try {
        if (mediaFiles && mediaFiles.length > 0) {
          const totalFiles = mediaFiles.length;
          const isMultiple = totalFiles > 1;

          for (let i = 0; i < totalFiles; i++) {
            const file = mediaFiles[i];
            if (file.size > 99 * 1024 * 1024) {
              toast({
                variant: 'destructive',
                title: 'File Too Large',
                description: `"${file.name}" is larger than the 99MB limit.`
              });
              continue;
            }

            const reader = await new Promise<string>((resolve, reject) => {
              const fileReader = new FileReader();
              fileReader.readAsDataURL(file);
              fileReader.onload = () => resolve(fileReader.result as string);
              fileReader.onerror = (error) => reject(error);
            });

            const isVideo = file.type.startsWith('video/');
            const uploadResult = await uploadMedia({ mediaDataUri: reader, isVideo });
            if (!uploadResult || !uploadResult.mediaUrl) {
              throw new Error('Media URL was not returned from the upload service.');
            }
            
            const mediaType = isVideo ? 'video' : 'image';
            let dominantColor = '#F0F4F8';
            if (mediaType === 'image') {
              try {
                const colorResult = await extractDominantColor({ photoDataUri: reader });
                dominantColor = colorResult.dominantColor || '#F0F4F8';
              } catch (colorError) {
                console.warn("Could not extract color, using default.", colorError);
              }
            }

            const docData: any = {
                title: isMultiple ? '' : newMedia.title,
                description: newMedia.description,
                mediaUrl: uploadResult.mediaUrl,
                mediaType: mediaType,
                uploadDate: serverTimestamp(),
            };

            if (uploadResult.thumbnailUrl) {
                docData.thumbnailUrl = uploadResult.thumbnailUrl;
            }

            if (mediaType === 'image') {
                docData.dominantColor = dominantColor;
            }

            addDocumentNonBlocking(mediaCollection, docData);
            setUploadProgress(((i + 1) / totalFiles) * 100);
          }
        } else if (mediaUrl) {
          setUploadProgress(50);
          addDocumentNonBlocking(
            mediaCollection,
            {
              ...newMedia,
              mediaUrl: mediaUrl,
              mediaType: 'image',
              uploadDate: serverTimestamp(),
              dominantColor: '#F0F4F8',
            }
          );
          setUploadProgress(100);
        }
        
        setTimeout(() => setIsUploading(false), 1000);
    
        resetUploadForm();
        toast({
          title: mediaFiles && mediaFiles.length > 1 ? `Upload Complete!` : 'Media Uploaded!',
          description: 'The new media is now live in the gallery.',
        });
      } catch (error: any) {
        console.error('Upload process failed:', error);
        toast({
          variant: 'destructive',
          title: 'Upload Failed',
          description: error.message || 'An unknown error occurred during upload.',
        });
        setIsUploading(false);
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
                 Select image or video files to add. Max size is 99MB. You can also provide a URL for a single image.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto pr-4">
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="mediaFile-admin">Media File(s)</Label>
                <Input id="mediaFile-admin" type="file" accept="image/*,video/mp4,video/quicktime" multiple
                    onChange={(e) => {
                        setMediaFiles(e.target.files);
                        if (e.target.files?.length) setMediaUrl('');
                    }}
                    disabled={!!mediaUrl}
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
                <Label htmlFor="mediaUrl-admin">Image URL</Label>
                <Input id="mediaUrl-admin" type="text" placeholder="https://example.com/image.png" 
                  value={mediaUrl} 
                  onChange={(e) => {
                      setMediaUrl(e.target.value);
                      if (e.target.value) setMediaFiles(null);
                  }}
                  disabled={!!mediaFiles?.length}
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
        <div className="p-4 border-b">
            <Progress value={uploadProgress} className="w-full" />
            <p className="text-sm text-center mt-2 text-muted-foreground">Uploading media... ({Math.round(uploadProgress)}%)</p>
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
                <TableCell colSpan={4} className="text-center h-24">Loading media...</TableCell>
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
                        <Input id="edit-title" value={selectedMedia.title} onChange={(e) => setSelectedMedia(p => p ? {...p, title: e.target.value} : null)} />
                    </div>
                    <div className="grid w-full items-center gap-1.5">
                        <Label htmlFor="edit-description">Description</Label>
                        <Textarea id="edit-description" value={selectedMedia.description || ''} onChange={(e) => setSelectedMedia(p => p ? {...p, description: e.target.value} : null)} />
                    </div>
                </div>}
                <DialogFooter className="flex-col-reverse sm:flex-row pt-4 border-t">
                    <DialogClose asChild>
                        <Button type="button" variant="secondary" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
                    </DialogClose>
                    <Button onClick={handleSaveEdit}>Save Changes</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
