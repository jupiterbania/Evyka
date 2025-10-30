
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
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
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
import { ScrollArea } from './ui/scroll-area';

export function ImageManagement() {
  const firestore = useFirestore();
  const imagesCollection = useMemoFirebase(() => collection(firestore, 'images'), [firestore]);
  const { data: photos, isLoading } = useCollection<ImageType>(imagesCollection);

  const [isUploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [isEditDialogOpen, setEditDialogOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
  
  const [newPhoto, setNewPhoto] = useState({ title: '', description: '', price: 0 });
  const [imageFile, setImageFile] = useState<File | null>(null);
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
        price: selectedPhoto.price,
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
    setDeleteDialogOpen(true);
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
    setDeleteDialogOpen(false);
    setPhotoToDelete(null);
  }
  
  const handleUpload = async () => {
    if (!firestore || !imageFile) {
        toast({
            variant: "destructive",
            title: "Upload Error",
            description: "Please select an image file to upload.",
        });
        return;
    }
    
    setIsUploading(true);

    const reader = new FileReader();
    reader.readAsDataURL(imageFile);
    reader.onload = async () => {
        const photoDataUri = reader.result as string;

        try {
            const result = await uploadImage({ photoDataUri });

            if (!result || !result.imageUrl) {
                throw new Error('Image URL was not returned from the upload service.');
            }

            addDocumentNonBlocking(imagesCollection, {
                ...newPhoto,
                imageUrl: result.imageUrl,
                blurredImageUrl: result.imageUrl, // Using same for now
                uploadDate: serverTimestamp(),
                sales: 0,
            });

            setUploadDialogOpen(false);
            setNewPhoto({ title: '', description: '', price: 0 });
            setImageFile(null);
            toast({title: "Image Uploaded!", description: "The new image is now live in the gallery."});
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Upload Failed",
                description: error.message || "An unknown error occurred during image upload.",
            });
        } finally {
            setIsUploading(false);
        }
    };
    reader.onerror = (error) => {
        toast({
            variant: "destructive",
            title: "File Read Error",
            description: "Could not read the selected file.",
        });
        setIsUploading(false);
    };
  }

  return (
    <Card>
      <CardContent className="p-0">
      <div className="flex justify-end p-4 border-b">
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
      </div>

      <ScrollArea className="w-full whitespace-nowrap">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px] px-4">Image</TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead>Sales</TableHead>
              <TableHead className="w-[120px] text-center px-4">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={5} className="text-center h-24">Loading images...</TableCell>
              </TableRow>
            )}
            {!isLoading && photos?.map((photo) => (
              <TableRow key={photo.id}>
                <TableCell className="px-4">
                  <Image
                    src={photo.imageUrl}
                    alt={photo.title}
                    width={60}
                    height={80}
                    className="rounded-md object-cover aspect-[3/4]"
                    data-ai-hint="photo"
                  />
                </TableCell>
                <TableCell className="font-medium truncate max-w-xs">{photo.title}</TableCell>
                <TableCell className="text-right">₹{photo.price.toFixed(2)}</TableCell>
                <TableCell className="text-right">{photo.sales || 0}</TableCell>
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
        </ScrollArea>

        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
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
                        <Textarea id="edit-description" value={selectedPhoto.description} onChange={(e) => setSelectedPhoto(p => p ? {...p, description: e.target.value} : null)} />
                    </div>
                    <div className="grid w-full items-center gap-1.5">
                        <Label htmlFor="edit-price">Price (₹)</Label>
                        <Input id="edit-price" type="number" value={selectedPhoto.price} onChange={(e) => setSelectedPhoto(p => p ? {...p, price: Number(e.target.value)} : null)} />
                    </div>
                </div>}
                <DialogFooter className="flex-col-reverse sm:flex-row">
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
