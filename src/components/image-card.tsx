
'use client';

import type { Image as ImageType } from '@/lib/types';
import Image from 'next/image';
import { useState } from 'react';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from './ui/button';
import {
  MoreVertical,
  Edit,
  Trash2,
  Share2,
  MessageSquare,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
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
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogHeader,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  useFirestore,
  useUser,
} from '@/firebase';
import {
  doc,
} from 'firebase/firestore';
import {
  deleteDocumentNonBlocking,
  updateDocumentNonBlocking,
} from '@/firebase/non-blocking-updates';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import Link from 'next/link';
import { MessageDialog } from './message-dialog';

type ImageCardProps = {
  photo: ImageType;
};

export function ImageCard({ photo }: ImageCardProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const designatedAdminEmail = 'jupiterbania472@gmail.com';
  const isAdmin = user?.email === designatedAdminEmail;

  // State for Edit/Delete dialogs
  const [isEditDialogOpen, setEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editedPhoto, setEditedPhoto] = useState<ImageType | null>(null);

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditedPhoto(photo);
    setEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (!editedPhoto || !firestore) return;
    const docRef = doc(firestore, 'images', editedPhoto.id);
    updateDocumentNonBlocking(docRef, {
      title: editedPhoto.title,
      description: editedPhoto.description,
    });
    toast({
      title: 'Image Updated',
      description: 'The image details have been successfully updated.',
    });
    setEditDialogOpen(false);
    setEditedPhoto(null);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (!photo || !firestore) return;
    const docRef = doc(firestore, 'images', photo.id);
    deleteDocumentNonBlocking(docRef);
    toast({
      title: 'Image Deleted',
      description: 'The image has been successfully removed.',
      variant: 'destructive',
    });
    setDeleteDialogOpen(false);
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const shareData = {
      title: photo.title,
      text: `Check out this image on EVYKA: ${photo.title}`,
      url: window.location.origin + '/image/' + photo.id
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareData.url);
        toast({
          title: 'Link Copied',
          description: 'A shareable link has been copied to your clipboard.',
        });
      }
    } catch (error: any) {
      if (error.name === 'NotAllowedError') {
        await navigator.clipboard.writeText(shareData.url);
        toast({
          title: 'Link Copied',
          description: 'Sharing was blocked, so the link was copied instead.',
        });
      } else {
        console.error('Share failed:', error);
        toast({
          variant: 'destructive',
          title: 'Share Failed',
          description: 'Could not share the image at this time.',
        });
      }
    }
  };

  const renderAdminMenu = () => {
    if (!isAdmin) {
      return null;
    }

    return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8" onClick={(e) => e.stopPropagation()}>
              <MoreVertical className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Admin Actions</DropdownMenuLabel>
            <DropdownMenuItem onClick={handleEditClick}>
              <Edit className="mr-2 h-4 w-4" />
              <span>Edit Details</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleDeleteClick}
              className="text-destructive focus:text-destructive focus:bg-destructive/10"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              <span>Delete Image</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
    );
  };

  return (
    <>
      <Card className="group overflow-hidden flex flex-col">
        <Link href={`/image/${photo.id}`} className="block cursor-pointer">
            <CardHeader className="p-0">
                <div
                    className="relative aspect-[3/4] w-full overflow-hidden bg-card"
                >
                    <Image
                    src={photo.imageUrl}
                    alt={photo.title}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover transition-all duration-300 ease-in-out group-hover:scale-105"
                    data-ai-hint="photo"
                    />
                </div>
            </CardHeader>
            <CardContent className="p-4 flex-grow">
                <div className="flex-grow">
                    <CardTitle className="text-lg leading-tight mb-1 truncate hover:underline">
                    {photo.title}
                    </CardTitle>
                </div>
            </CardContent>
        </Link>
        <CardFooter className="p-4 pt-0 flex justify-between items-center mt-auto">
            {!isAdmin ? (
                <MessageDialog
                    trigger={
                    <Button variant="outline" size="sm">
                        <MessageSquare className="mr-2 h-4 w-4" />
                        Message
                    </Button>
                    }
                />
            ) : (
                <div /> 
            )}
            <div className="flex items-center">
                <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8" onClick={handleShare}>
                    <Share2 className="h-4 w-4" />
                    <span className="sr-only">Share</span>
                </Button>
                {isAdmin && renderAdminMenu()}
            </div>
        </CardFooter>
      </Card>

      {/* Admin Modals */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              image "{photo.title}" from the gallery.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
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
              Update the details for "{editedPhoto?.title}".
            </DialogDescription>
          </DialogHeader>
          {editedPhoto && (
            <div className="grid gap-4 py-4">
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="edit-title">Title</Label>
                <Input
                  id="edit-title"
                  value={editedPhoto.title}
                  onChange={(e) =>
                    setEditedPhoto((p) => (p ? { ...p, title: e.target.value } : null))
                  }
                />
              </div>
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={editedPhoto.description}
                  onChange={(e) =>
                    setEditedPhoto((p) =>
                      p ? { ...p, description: e.target.value } : null
                    )
                  }
                />
              </div>
            </div>
          )}
          <DialogFooter className="flex-col-reverse sm:flex-row">
            <DialogClose asChild>
              <Button type="button" variant="secondary">
                Cancel
              </Button>
            </DialogClose>
            <Button onClick={handleSaveEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
