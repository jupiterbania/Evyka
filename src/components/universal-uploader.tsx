
'use client';

import { useState } from 'react';
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
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, serverTimestamp } from 'firebase/firestore';
import { uploadMultipleMedia } from '@/ai/flows/upload-multiple-media-flow';
import { AlertTriangle, ImageIcon, Video } from 'lucide-react';


type UploadType = 'image' | 'reel' | 'nude';

type UniversalUploaderProps = {
  children: React.ReactNode;
};

export function UniversalUploader({ children }: UniversalUploaderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [uploadType, setUploadType] = useState<UploadType | null>(null);

  const [isUploading, setIsUploading] = useState(false);

  const [newMedia, setNewMedia] = useState({ title: '', description: '' });
  const [mediaFiles, setMediaFiles] = useState<FileList | null>(null);

  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const mediaCollection = useMemoFirebase(() => firestore ? collection(firestore, 'media') : null, [firestore]);

  const resetAll = () => {
    setStep(1);
    setUploadType(null);
    setNewMedia({ title: '', description: '' });
    setMediaFiles(null);
    setIsUploading(false);
    setIsOpen(false);
  };
  
  const handleSelectType = (type: UploadType) => {
    setUploadType(type);
    setStep(2);
  };

  const handleUpload = async () => {
    if (!firestore || !mediaCollection || !user) return;
    if (!mediaFiles?.length) {
      toast({
        variant: 'destructive',
        title: 'Upload Error',
        description: 'Please select one or more files to upload.',
      });
      return;
    }

    setIsUploading(true);
    setIsOpen(false); 
    toast({
        title: 'Upload Started',
        description: 'Your files are being uploaded in the background.',
    });

    try {
        const isForNudes = uploadType === 'nude';
        const isReel = uploadType === 'reel';

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

        const mediaItems = await Promise.all(validFiles.map(async (file) => {
            const mediaDataUri = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.readAsDataURL(file);
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = error => reject(error);
            });
            return {
                mediaDataUri,
                isVideo: file.type.startsWith('video/'),
                originalFilename: file.name
            };
        }));

        const { results } = await uploadMultipleMedia({ 
          mediaItems,
          authorId: user.uid,
          authorName: user.displayName,
          authorPhotoUrl: user.photoURL
        });

        if (results.length === 0) throw new Error("All file uploads failed on the server.");

        for (const result of results) {
            const docData: any = {
                title: filesArray.length > 1 ? result.originalFilename.replace(/\.[^/.]+$/, "") : newMedia.title,
                description: newMedia.description,
                mediaUrl: result.mediaUrl,
                thumbnailUrl: result.thumbnailUrl,
                mediaType: result.isVideo ? 'video' : 'image',
                uploadDate: serverTimestamp(),
                isNude: isForNudes,
                isReel: isReel || (isForNudes && result.isVideo),
                authorId: user.uid,
            };
            addDocumentNonBlocking(mediaCollection, docData);
        }

        toast({
            title: 'Upload Complete',
            description: `${results.length} of ${validFiles.length} files uploaded successfully.`
        });

    } catch (error: any) {
        console.error('Universal upload failed:', error);
        toast({
            variant: 'destructive',
            title: 'Upload Process Failed',
            description: error.message || 'An unknown error occurred.',
        });
    } finally {
        resetAll();
    }
};

  const getAcceptValue = () => {
    switch(uploadType) {
        case 'image':
            return 'image/*';
        case 'reel':
            return 'video/mp4,video/quicktime,video/x-m4v,video/*';
        case 'nude':
            return 'image/*,video/mp4,video/quicktime,video/x-m4v,video/*';
        default:
            return '';
    }
  }

  const showTitleInput = !mediaFiles || mediaFiles.length <= 1;

  const renderStepOne = () => (
    <>
      <DialogHeader>
        <DialogTitle>What would you like to upload?</DialogTitle>
        <DialogDescription>
          Choose the type of content you want to add.
        </DialogDescription>
      </DialogHeader>
      <div className="grid grid-cols-2 gap-4 py-4">
        <Button variant="outline" className="h-24 flex-col gap-2" onClick={() => handleSelectType('image')}>
          <ImageIcon className="h-8 w-8" />
          Image
        </Button>
        <Button variant="outline" className="h-24 flex-col gap-2" onClick={() => handleSelectType('reel')}>
          <Video className="h-8 w-8" />
          Reel
        </Button>
        <Button variant="outline" className="h-24 flex-col gap-2 text-accent border-accent/50 hover:bg-accent/10 hover:text-accent focus-visible:ring-accent col-span-2" onClick={() => handleSelectType('nude')}>
          <AlertTriangle className="h-8 w-8" />
          18+ Content
        </Button>
      </div>
    </>
  );

  const renderStepTwo = () => (
    <>
      <DialogHeader>
        <DialogTitle>Upload: <span className="capitalize">{uploadType}</span></DialogTitle>
        <DialogDescription>
            Select files to upload. Max size 99MB per file.
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto pr-4">
        <div className="grid w-full items-center gap-1.5">
            <Label htmlFor="mediaFile-universal">Media File(s)</Label>
            <Input id="mediaFile-universal" type="file" accept={getAcceptValue()} multiple
                onChange={(e) => setMediaFiles(e.target.files)}
            />
        </div>
        
        {showTitleInput && (
            <div className="grid w-full items-center gap-1.5 mt-4">
                <Label htmlFor="title-universal">Title</Label>
                <Input id="title-universal" type="text" placeholder="My new content" value={newMedia.title} onChange={(e) => setNewMedia({...newMedia, title: e.target.value})} />
            </div>
        )}
        <div className="grid w-full items-center gap-1.5">
            <Label htmlFor="description-universal">Description</Label>
            <Textarea id="description-universal" placeholder="A detailed description of the media." value={newMedia.description} onChange={(e) => setNewMedia({...newMedia, description: e.target.value})}/>
        </div>
      </div>
       <DialogFooter className="flex-col-reverse sm:flex-row pt-4 border-t">
            <Button type="button" variant="ghost" onClick={() => setStep(1)}>Back</Button>
            <DialogClose asChild>
                <Button type="button" variant="secondary" onClick={resetAll}>Cancel</Button>
            </DialogClose>
            <Button type="submit" onClick={handleUpload} disabled={isUploading}>
              {isUploading ? 'Uploading...' : 'Upload'}
            </Button>
        </DialogFooter>
    </>
  );


  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) resetAll(); else setIsOpen(true); }}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent onInteractOutside={(e) => { if(isUploading) e.preventDefault()}} onEscapeKeyDown={(e) => {if(isUploading) e.preventDefault()}}>
        {step === 1 ? renderStepOne() : renderStepTwo()}
      </DialogContent>
    </Dialog>
  );
}
