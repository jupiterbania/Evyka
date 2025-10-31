
"use client";

import { useState } from 'react';
import type { Image as ImageType } from '@/lib/types';
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
import { Upload, Edit, Trash2, MoreHorizontal } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from './ui/card';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, serverTimestamp } from 'firebase/firestore';
import { addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { Textarea } from './ui/textarea';
import { uploadImage } from '@/ai/flows/upload-image-flow';
import { extractDominantColor } from '@/ai/flows/extract-color-flow';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';

export function ImageManagement() {
  const firestore = useFirestore();
  const imagesCollection = useMemoFirebase(() => collection(firestore, 'images'), [firestore]);
  const { data: photos, isLoading } = useCollection<ImageType>(imagesCollection);

  const [isUploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [isEditDialogOpen, setEditDialogOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  const [newPhoto, setNewPhoto] = useState({ title: '', description: '' });
  const [imageFiles, setImageFiles] = useState<FileList | null>(null);
  const [imageUrl, setImageUrl] = useState('');
  
  const [selectedPhoto, setSelectedPhoto] = useState<ImageType | null>(null);
  const [photoToDelete, setPhotoToDelete] = useState<ImageType | null>(null);

  const { toast } = useToast();

  const handleEditClick = (photo: ImageType) => {
    setSelectedPhoto(photo);
    setEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (!selectedPhoto || !firestore) return;

    const docRef = doc(firestore, 'images', selectedPhoto.id);
    updateDocumentNonBlocking(docRef, {
        title: selectedPhoto.title,
        description: selectedPhoto.description,
    });
    
    toast({
        title: "Image Updated",
        description: "The image details have been successfully updated.",
    });
    setEditDialogOpen(false);
    setSelectedPhoto(null);
  }

  const handleDeleteClick = (photo: ImageType) => {
    setPhotoToDelete(photo);
  };

  const confirmDelete = () => {
    if (!photoToDelete || !firestore) return;
    const docRef = doc(firestore, 'images', photoToDelete.id);
    deleteDocumentNonBlocking(docRef);

    toast({
        title: "Image Deleted",
        description: "The image has been successfully removed.",
        variant: "destructive",
      });
    setPhotoToDelete(null);
  }
  
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
            
            let dominantColor = '#F0F4F8';
            try {
              const colorResult = await extractDominantColor({ photoDataUri: reader });
              dominantColor = colorResult.dominantColor || '#F0F4F8';
            } catch (colorError) {
              console.warn("Could not extract color, using default.", colorError);
            }

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
          title: imageFiles && imageFiles.length > 1 ? `${imageFiles.length} Images Uploaded!` : 'Image Uploaded!',
          description: 'The new images are now live in the gallery.',
        });
      } catch (error: any) {
        console.error('Upload process failed:', error);
        toast({
          variant: 'destructive',
          title: 'Upload Failed',
          description: error.message || 'An unknown error occurred during image upload.',
        });
        setIsUploading(false);
      }
    };
    performUpload();
  };

  return (
    <Card>
      <CardContent className="p-0">
      <div className="flex justify-end p-4 border-b">
        <Dialog open={isUploadDialogOpen} onOpenChange={setUploadDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Upload className="mr-2 h-4 w-4" />
              Upload Image(s)
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
                <Label htmlFor="imageFile-admin">Image File(s)</Label>
                <Input id="imageFile-admin" type="file" accept="image/*" multiple
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
                <Label htmlFor="imageUrl-admin">Image URL</Label>
                <Input id="imageUrl-admin" type="text" placeholder="https://example.com/image.png" 
                  value={imageUrl} 
                  onChange={(e) => {
                      setImageUrl(e.target.value);
                      if (e.target.value) setImageFiles(null);
                  }}
                  disabled={!!imageFiles?.length}
                />
              </div>
              <div className="grid w-full items-center gap-1.5 mt-4">
                <Label htmlFor="title-admin">Title</Label>
                <Input id="title-admin" type="text" placeholder="A beautiful landscape (optional)" value={newPhoto.title} onChange={(e) => setNewPhoto({...newPhoto, title: e.target.value})} />
                <p className='text-xs text-muted-foreground'>If uploading multiple files, this title will be ignored. The original filename will be used as the title.</p>
              </div>
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="description-admin">Description</Label>
                <Textarea id="description-admin" placeholder="A detailed description of the image." value={newPhoto.description} onChange={(e) => setNewPhoto({...newPhoto, description: e.target.value})}/>
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
            <p className="text-sm text-center mt-2 text-muted-foreground">Uploading images... ({Math.round(uploadProgress)}%)</p>
        </div>
        )}

      <div className="relative w-full overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px] px-4">Image</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[120px] text-center px-4">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={4} className="text-center h-24">Loading images...</TableCell>
              </TableRow>
            )}
            {!isLoading && photos?.map((photo) => (
              <TableRow key={photo.id}>
                <TableCell className="px-4">
                  <div 
                    className="w-[60px] h-[60px] relative rounded-md overflow-hidden bg-card"
                  >
                    <Image
                      src={photo.imageUrl}
                      alt={photo.title}
                      fill
                      className="object-cover"
                      data-ai-hint="photo"
                    />
                  </div>
                </TableCell>
                <TableCell className="font-medium truncate max-w-xs">{photo.title}</TableCell>
                <TableCell>
                  <Badge variant="secondary">Free</Badge>
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
                        <DropdownMenuItem onClick={() => handleEditClick(photo)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleDeleteClick(photo)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
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

        <AlertDialog open={!!photoToDelete} onOpenChange={(open) => !open && setPhotoToDelete(null)}>
            <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the image
                    and remove its data from our servers.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setPhotoToDelete(null)}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">
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
                    Update the details for this image.
                </DialogDescription>
                </DialogHeader>
                {selectedPhoto && <div className="grid gap-4 py-4">
                    <div className="grid w-full items-center gap-1.5">
                        <Label htmlFor="edit-title">Title</Label>
                        <Input id="edit-title" value={selectedPhoto.title} onChange={(e) => setSelectedPhoto(p => p ? {...p, title: e.target.value} : null)} />
                    </div>
                    <div className="grid w-full items-center gap-1.5">
                        <Label htmlFor="edit-description">Description</Label>
                        <Textarea id="edit-description" value={selectedPhoto.description || ''} onChange={(e) => setSelectedPhoto(p => p ? {...p, description: e.target.value} : null)} />
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
