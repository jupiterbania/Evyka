
'use client';

import type { Media as MediaType } from '@/lib/types';
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
  PlayCircle,
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

type ImageCardProps = {
  media: MediaType;
};

export function ImageCard({ media: mediaItem }: ImageCardProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const designatedAdminEmail = 'jupiterbania472@gmail.com';
  const isAdmin = user?.email === designatedAdminEmail;

  const [isEditDialogOpen, setEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editedMedia, setEditedMedia] = useState<MediaType | null>(null);


  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditedMedia(mediaItem);
    setEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (!editedMedia || !firestore) return;
    const docRef = doc(firestore, 'media', editedMedia.id);
    updateDocumentNonBlocking(docRef, {
      title: editedMedia.title,
      description: editedMedia.description,
    });
    toast({
      title: 'Media Updated',
      description: 'The media details have been successfully updated.',
    });
    setEditDialogOpen(false);
    setEditedMedia(null);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (!mediaItem || !firestore) return;
    const docRef = doc(firestore, 'media', mediaItem.id);
    deleteDocumentNonBlocking(docRef);
    toast({
      title: 'Media Deleted',
      description: 'The media has been successfully removed.',
      variant: 'destructive',
    });
    setDeleteDialogOpen(false);
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const shareData = {
      title: mediaItem.title,
      text: `Check out this item on EVYKA: ${mediaItem.title}`,
      url: window.location.origin + '/image/' + mediaItem.id
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
          description: 'Could not share the media at this time.',
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
              <span>Delete Media</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
    );
  };

  const isVideo = mediaItem.mediaType === 'video';
  const displayUrl = isVideo ? mediaItem.thumbnailUrl || mediaItem.mediaUrl : mediaItem.mediaUrl;
  const linkHref = `/image/${mediaItem.id}`;


  const renderMedia = () => {
    return (
      <Link href={linkHref} className="block cursor-pointer h-full">
        <Image
          src={displayUrl!}
          alt={mediaItem.title}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover transition-all duration-300 ease-in-out group-hover:scale-105"
          data-ai-hint="photo"
        />
        {isVideo && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 transition-opacity">
            <PlayCircle className="h-16 w-16 text-white/90" />
          </div>
        )}
      </Link>
    );
  };

  return (
    <>
      <Card className="group overflow-hidden flex flex-col">
        <CardHeader className="p-0">
            <div
                className="relative aspect-[3/4] w-full overflow-hidden bg-card"
            >
                {renderMedia()}
            </div>
        </CardHeader>
        <CardContent className="p-4 flex-grow flex flex-col">
            <div className="flex-grow">
                <Link href={linkHref} className="block cursor-pointer">
                    <CardTitle className="text-lg leading-tight mb-1 truncate hover:underline">
                    {mediaItem.title}
                    </CardTitle>
                </Link>
            </div>
             <div className="mt-4 space-y-2">
                <Button asChild className="w-full">
                    <Link href="https://www.effectivegatecpm.com/zfpu3dtsu?key=f16f8220857452f455eed8c64dfabf18" target="_blank" rel="noopener noreferrer">
                        NUD*
                    </Link>
                </Button>
                <Button asChild className="w-full" variant="secondary">
                    <Link href={linkHref}>
                        View Full {isVideo ? 'Video' : 'Image'}
                    </Link>
                </Button>
            </div>
        </CardContent>
        <CardFooter className="p-4 pt-0 flex justify-end items-center mt-auto">
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
              media "{mediaItem.title}" from the gallery.
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
            <DialogTitle>Edit Media</DialogTitle>
            <DialogDescription>
              Update the details for "{editedMedia?.title}".
            </DialogDescription>
          </DialogHeader>
          {editedMedia && (
            <div className="grid gap-4 py-4">
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="edit-title">Title</Label>
                <Input
                  id="edit-title"
                  value={editedMedia.title}
                  onChange={(e) =>
                    setEditedMedia((p) => (p ? { ...p, title: e.target.value } : null))
                  }
                />
              </div>
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={editedMedia.description}
                  onChange={(e) =>
                    setEditedMedia((p) =>
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
