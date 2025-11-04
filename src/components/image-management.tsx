
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Image from 'next/image';
import { Edit, Trash2, MoreHorizontal, Film, ImageIcon, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from './ui/card';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { Textarea } from './ui/textarea';
import { Checkbox } from './ui/checkbox';
import { uploadMedia } from '@/ai/flows/upload-media-flow';
import { Badge } from './ui/badge';

function ImageManagementInternal() {
  const firestore = useFirestore();
  const mediaItemsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'media') : null), [firestore]);
  const { data: mediaItems, isLoading } = useCollection<MediaType>(mediaItemsQuery);
  
  const [isEditDialogOpen, setEditDialogOpen] = useState(false);
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

  return (
    <Card>
      <CardContent className="p-0">
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
                {selectedMedia && <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-4">
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
                        <div className="grid w-full items-center gap-1.5 mt-4">
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
