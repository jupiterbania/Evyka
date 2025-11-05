
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
import { Checkbox } from './ui/checkbox';
import { Progress } from './ui/progress';
import { useToast } from '@/hooks/use-toast';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, serverTimestamp } from 'firebase/firestore';
import { uploadMultipleMedia } from '@/ai/flows/upload-multiple-media-flow';
import { AlertTriangle, Film, ImageIcon, Video } from 'lucide-react';
import { cn } from '@/lib/utils';


type UploadType = 'image' | 'reel' | 'nude';

type UniversalUploaderProps = {
  children: React.ReactNode;
};

export function UniversalUploader({ children }: UniversalUploaderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [uploadType, setUploadType] = useState<UploadType | null>(null);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadStatusMessage, setUploadStatusMessage] = useState('');
  const [uploadCounts, setUploadCounts] = useState({ current: 0, total: 0 });

  const [newMedia, setNewMedia] = useState({ title: '', description: '' });
  const [mediaFiles, setMediaFiles] = useState<FileList | null>(null);
  const [imageUrl, setImageUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');

  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const mediaCollection = useMemoFirebase(() => firestore ? collection(firestore, 'media') : null, [firestore]);

  const resetAll = () => {
    setStep(1);
    setUploadType(null);
    setNewMedia({ title: '', description: '' });
    setMediaFiles(null);
    setImageUrl('');
    setVideoUrl('');
    setIsUploading(false);
    setUploadProgress(null);
    setUploadStatusMessage('');
    setUploadCounts({ current: 0, total: 0 });
    setIsOpen(false);
  };
  
  const handleSelectType = (type: UploadType) => {
    setUploadType(type);
    setStep(2);
  };

  const handleUpload = async () => {
    if (!firestore || !mediaCollection || !user) return;
    if (!mediaFiles?.length && !imageUrl && !videoUrl) {
      toast({
        variant: 'destructive',
        title: 'Upload Error',
        description: 'Please select a file or provide a URL.',
      });
      return;
    }

    setIsUploading(true);
    setUploadStatusMessage('Starting upload...');

    // We can close the dialog immediately and show progress with toasts.
    setIsOpen(false); 
    toast({
        title: 'Upload Started',
        description: 'Your files are being uploaded in the background.',
    });

    try {
        const isForNudes = uploadType === 'nude';
        const isReel = uploadType === 'reel';

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

            const { results } = await uploadMultipleMedia({ mediaItems });

            if (results.length === 0) throw new Error("All file uploads failed on the server.");

            for (const result of results) {
                const docData: any = {
                    title: filesArray.length > 1 ? '' : newMedia.title,
                    description: newMedia.description,
                    mediaUrl: result.mediaUrl,
                    thumbnailUrl: result.thumbnailUrl,
                    mediaType: result.isVideo ? 'video' : 'image',
                    uploadDate: serverTimestamp(),
                    isNude: isForNudes,
                    isReel: isReel || (isForNudes && result.isVideo), // Reels can be nude
                    authorId: user.uid,
                };
                addDocumentNonBlocking(mediaCollection, docData);
            }

            toast({
                title: 'Upload Complete',
                description: `${results.length} of ${validFiles.length} files uploaded successfully.`
            });

        } else if (imageUrl) {
             const { results } = await uploadMultipleMedia({
                mediaItems: [{
                    mediaDataUri: imageUrl,
                    isVideo: false,
                    originalFilename: 'url-upload.jpg'
                }]
             });
             if (results.length === 0) throw new Error("URL upload failed.");

             const docData: any = {
                title: newMedia.title,
                description: newMedia.description,
                mediaUrl: results[0].mediaUrl,
                thumbnailUrl: results[0].thumbnailUrl,
                mediaType: 'image',
                uploadDate: serverTimestamp(),
                isNude: isForNudes,
                isReel: false, // Image URLs cannot be reels
                authorId: user.uid,
             };
             addDocumentNonBlocking(mediaCollection, docData);
             toast({ title: 'Image URL Uploaded!' });

        } else if (videoUrl) {
            // Video URLs are not processed via Cloudinary, just saved directly
            addDocumentNonBlocking(mediaCollection, {
                title: newMedia.title,
                description: newMedia.description,
                mediaUrl: videoUrl,
                thumbnailUrl: '', // No automatic thumbnail for URLs
                mediaType: 'video',
                uploadDate: serverTimestamp(),
                isNude: isForNudes,
                isReel: isReel || (isForNudes && videoUrl.length > 0),
                authorId: user.uid,
            });
            toast({ title: 'Video URL Submitted' });
        }
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
            Select files or provide a URL. Max size 99MB.
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto pr-4">
        <div className="grid w-full items-center gap-1.5">
            <Label htmlFor="mediaFile-universal">Media File(s)</Label>
            <Input id="mediaFile-universal" type="file" accept="image/*,video/mp4,video/quicktime,video/x-m4v,video/*" multiple
                onChange={(e) => {
                    setMediaFiles(e.target.files);
                    if (e.target.files?.length) { setImageUrl(''); setVideoUrl(''); }
                }}
                disabled={!!imageUrl || !!videoUrl}
            />
        </div>
        <div className="relative my-2">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">OR</span></div>
        </div>
        <div className="grid w-full items-center gap-1.5">
            <Label htmlFor="imageUrl-universal">Image URL</Label>
            <Input id="imageUrl-universal" type="text" placeholder="https://example.com/image.png" value={imageUrl}
                onChange={(e) => {
                    setImageUrl(e.target.value);
                    if (e.target.value) { setMediaFiles(null); setVideoUrl(''); }
                }}
                disabled={!!mediaFiles?.length || !!videoUrl || uploadType === 'reel'}
            />
        </div>
        <div className="grid w-full items-center gap-1.5">
            <Label htmlFor="videoUrl-universal">Video URL (e.g. Google Drive)</Label>
            <Input id="videoUrl-universal" type="text" placeholder="https://drive.google.com/..." value={videoUrl}
                onChange={(e) => {
                    setVideoUrl(e.target.value);
                    if (e.target.value) { setMediaFiles(null); setImageUrl(''); }
                }}
                disabled={!!mediaFiles?.length || !!imageUrl || uploadType === 'image'}
            />
        </div>
        
        {showTitleInput && (
            <div className="grid w-full items-center gap-1.5 mt-4">
                <Label htmlFor="title-universal">Title</Label>
                <Input id="title-universal" type="text" placeholder="My new content" value={newMedia.title} onChange={(e) => setNewMedia({...newMedia, title: e.target.value})} />
            </div>
        )}
        <div className="grid w-full items-center gap-1.5">
            <Label htmlFor="description-universal">Description</Label>            <Textarea id="description-universal" placeholder="A detailed description of the media." value={newMedia.description} onChange={(e) => setNewMedia({...newMedia, description: e.target.value})}/>
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

    