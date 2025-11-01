
'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { uploadMedia } from '@/ai/flows/upload-media-flow';
import type { SiteSettings as SiteSettingsType } from '@/lib/types';
import { Upload } from 'lucide-react';

export function SiteSettings() {
  const firestore = useFirestore();
  const { toast } = useToast();

  const settingsDocRef = useMemoFirebase(
    () => doc(firestore, 'settings', 'main'),
    [firestore]
  );
  const { data: settings, isLoading: isSettingsLoading } = useDoc<SiteSettingsType>(settingsDocRef);

  const [heroImageFile, setHeroImageFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const currentHeroImageUrl = settings?.heroImageUrl;
  
  const handleHeroImageUpload = async () => {
    if (!heroImageFile) {
      toast({
        variant: 'destructive',
        title: 'No file selected',
        description: 'Please select an image file to upload.',
      });
      return;
    }

    setIsUploading(true);

    try {
      const reader = new FileReader();
      reader.readAsDataURL(heroImageFile);
      reader.onload = async () => {
        const mediaDataUri = reader.result as string;
        const result = await uploadMedia({ mediaDataUri, isVideo: false });

        if (!result || !result.mediaUrl) {
          throw new Error('Image URL was not returned from the upload service.');
        }

        setDocumentNonBlocking(settingsDocRef, {
            heroImageUrl: result.mediaUrl,
            heroImageHint: 'custom background'
        }, { merge: true });

        toast({
          title: 'Hero Image Updated!',
          description: 'The homepage welcome banner has been changed.',
        });
        setHeroImageFile(null);
      };
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Upload Failed',
        description:
          error.message || 'An unknown error occurred during image upload.',
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Site Settings</CardTitle>
        <CardDescription>
          Manage global settings for your website.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div>
            <Label>Homepage Welcome Image</Label>
            <div className="relative aspect-video w-full max-w-md rounded-md overflow-hidden border mt-2">
              {isSettingsLoading ? (
                  <div className="w-full h-full bg-muted animate-pulse" />
              ) : currentHeroImageUrl ? (
                  <Image
                  src={currentHeroImageUrl}
                  alt="Current hero background"
                  fill
                  className="object-cover"
                  data-ai-hint="background"
                  />
              ) : (
                <div className="w-full h-full bg-muted flex items-center justify-center text-muted-foreground">
                  No image uploaded
                </div>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="hero-image-upload">Upload New Welcome Image</Label>
            <div className="flex gap-2">
              <Input
                id="hero-image-upload"
                type="file"
                accept="image/*"
                onChange={(e) => setHeroImageFile(e.target.files ? e.target.files[0] : null)}
                className="max-w-xs"
              />
              <Button onClick={handleHeroImageUpload} disabled={isUploading || !heroImageFile}>
                <Upload className="mr-2 h-4 w-4" />
                {isUploading ? 'Uploading...' : 'Save'}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              This will replace the background image on the main welcome banner.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

    