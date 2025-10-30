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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Image from 'next/image';
import { Upload, Edit, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from './ui/card';
import { useCollection, useFirestore } from '@/firebase';
import { collection, doc, serverTimestamp } from 'firebase/firestore';
import { addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { Textarea } from './ui/textarea';

export function ImageManagement() {
  const firestore = useFirestore();
  const imagesCollection = collection(firestore, 'images');
  const { data: photos, isLoading } = useCollection<ImageType>(imagesCollection);

  const [isUploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [isEditDialogOpen, setEditDialogOpen] = useState(false);
  
  const [newPhoto, setNewPhoto] = useState({ title: '', description: '', price: 0, imageUrl: '' });
  const [selectedPhoto, setSelectedPhoto] = useState<ImageType | null>(null);

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

  const handleDelete = (photoId: string) => {
    if (!firestore) return;
    const docRef = doc(firestore, 'images', photoId);
    deleteDocumentNonBlocking(docRef);

    toast({
        title: "Image Deleted",
        description: "The image has been successfully removed.",
        variant: "destructive",
      });
  }
  
  const handleUpload = () => {
    if (!firestore) return;
    
    addDocumentNonBlocking(imagesCollection, {
        ...newPhoto,
        blurredImageUrl: newPhoto.imageUrl, // Using same for now
        uploadDate: serverTimestamp(),
        sales: 0,
    });

    setUploadDialogOpen(false);
    setNewPhoto({ title: '', description: '', price: 0, imageUrl: '' });
    toast({title: "Image Uploaded!", description: "The new image is now live in the gallery."});
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
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Upload New Image</DialogTitle>
              <DialogDescription>
                Select an image file and set its details to add it to the gallery.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="imageUrl">Image URL</Label>
                <Input id="imageUrl" type="text" placeholder="https://example.com/image.png" value={newPhoto.imageUrl} onChange={(e) => setNewPhoto({...newPhoto, imageUrl: e.target.value})} />
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
                <Label htmlFor="price">Price ($)</Label>
                <Input id="price" type="number" placeholder="50" value={newPhoto.price} onChange={(e) => setNewPhoto({...newPhoto, price: Number(e.target.value)})} />
              </div>
            </div>
            <DialogFooter>
                <DialogClose asChild>
                    <Button type="button" variant="secondary">Cancel</Button>
                </DialogClose>
                <Button type="submit" onClick={handleUpload}>
                    Upload
                </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">Image</TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-right">Sales</TableHead>
              <TableHead className="w-[120px] text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={5} className="text-center">Loading images...</TableCell>
              </TableRow>
            )}
            {!isLoading && photos?.map((photo) => (
              <TableRow key={photo.id}>
                <TableCell>
                  <Image
                    src={photo.imageUrl}
                    alt={photo.title}
                    width={50}
                    height={70}
                    className="rounded-md object-cover"
                    data-ai-hint="photo"
                  />
                </TableCell>
                <TableCell className="font-medium">{photo.title}</TableCell>
                <TableCell className="text-right">${photo.price.toFixed(2)}</TableCell>
                <TableCell className="text-right">{photo.sales}</TableCell>
                <TableCell className="text-center">
                    <div className="flex justify-center gap-2">
                        <Button variant="ghost" size="icon" aria-label="Edit image" onClick={() => handleEditClick(photo)}>
                            <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" aria-label="Delete image">
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete the image
                                and remove its data from our servers.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(photo.id)} className="bg-destructive hover:bg-destructive/90">
                                Delete
                                </AlertDialogAction>
                            </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </div>
        <Dialog open={isEditDialogOpen} onOpenChange={setEditDialogOpen}>
            <DialogContent>
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
                        <Label htmlFor="edit-price">Price ($)</Label>
                        <Input id="edit-price" type="number" value={selectedPhoto.price} onChange={(e) => setSelectedPhoto(p => p ? {...p, price: Number(e.target.value)} : null)} />
                    </div>
                </div>}
                <DialogFooter>
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
