
'use client';

import type { Media as MediaType } from '@/lib/types';
import Image from 'next/image';
import { useState, useRef, useEffect } from 'react';
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
  Upload,
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
import { uploadMedia } from '@/ai/flows/upload-media-flow';

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
  const [editedMedia, setEditedMedia] = useState<Partial<MediaType> & { id: string } | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [isUploadingThumbnail, setIsUploadingThumbnail] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const [isHovering, setIsHovering] = useState(false);


  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditedMedia(mediaItem);
    setThumbnailFile(null);
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editedMedia || !firestore) return;

    const docRef = doc(firestore, 'media', editedMedia.id);
    let finalUpdates: Partial<MediaType> = {
      title: editedMedia.title,
      description: editedMedia.description,
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
            return; // Don't close dialog if thumbnail upload fails
        } finally {
            setIsUploadingThumbnail(false);
        }
    }

    updateDocumentNonBlocking(docRef, finalUpdates);
    toast({
      title: 'Media Updated',
      description: 'The media details have been successfully updated.',
    });
    setEditDialogOpen(false);
    setEditedMedia(null);
    setThumbnailFile(null);
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
  const linkHref = `/image/${mediaItem.id}`;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isHovering) {
      if (video.paused) {
        video.play().catch(error => {
          if (error.name !== 'NotAllowedError') {
            console.error("Video autoplay failed:", error);
          }
        });
      }
    } else {
      if (!video.paused) {
        video.pause();
      }
    }
  }, [isHovering]);


  const renderMedia = () => {
    if (isVideo) {
       const isGoogleDrive = mediaItem.mediaUrl.includes('drive.google.com');
      // If it's a GDrive video without a thumbnail, show a placeholder
      if (isGoogleDrive && !mediaItem.thumbnailUrl) {
         return (
             <div className="w-full h-full bg-black flex items-center justify-center">
                 <PlayCircle className="h-16 w-16 text-white/70" />
             </div>
         );
      }
      return (
        <>
          <video
            ref={videoRef}
            src={mediaItem.mediaUrl}
            poster={mediaItem.thumbnailUrl || undefined}
            muted
            loop
            playsInline
            className="object-cover w-full h-full transition-all duration-300 ease-in-out"
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
            <PlayCircle className="h-16 w-16 text-white/90" />
          </div>
        </>
      );
    }

    return (
        <Image
          src={mediaItem.mediaUrl}
          alt={mediaItem.title}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover transition-all duration-300 ease-in-out group-hover:scale-105"
          data-ai-hint="photo"
        />
    );
  };

  return (
    <>
      <Card 
        className="group overflow-hidden flex flex-col"
        onMouseEnter={() => isVideo && setIsHovering(true)}
        onMouseLeave={() => isVideo && setIsHovering(false)}
      >
        <CardHeader className="p-0">
            <Link href={linkHref} className="block cursor-pointer">
              <div className="relative aspect-[3/4] w-full overflow-hidden bg-card">
                  {renderMedia()}
              </div>
            </Link>
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
                    <Link href={linkHref}>
                        {isVideo ? 'Play Video' : 'View Image'}
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
                  value={editedMedia.title || ''}
                  onChange={(e) =>
                    setEditedMedia((p) => (p ? { ...p, title: e.target.value } : null))
                  }
                />
              </div>
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={editedMedia.description || ''}
                  onChange={(e) =>
                    setEditedMedia((p) =>
                      p ? { ...p, description: e.target.value } : null
                    )
                  }
                />
              </div>
               {mediaItem.mediaType === 'video' && (
                <div className="grid w-full items-center gap-1.5">
                  <Label htmlFor="edit-thumbnail">Upload New Thumbnail</Label>
                  <Input
                    id="edit-thumbnail"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setThumbnailFile(e.target.files ? e.target.files[0] : null)}
                  />
                </div>
              )}
            </div>
          )}
          <DialogFooter className="flex-col-reverse sm:flex-row">
            <DialogClose asChild>
              <Button type="button" variant="secondary">
                Cancel
              </Button>
            </DialogClose>
            <Button onClick={handleSaveEdit} disabled={isUploadingThumbnail}>
                {isUploadingThumbnail ? (
                    'Uploading...'
                ) : (
                    'Save Changes'
                )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
