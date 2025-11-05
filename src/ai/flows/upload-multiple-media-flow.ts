
'use server';
/**
 * @fileOverview A flow for uploading multiple media files to an external service sequentially.
 *
 * - uploadMultipleMedia - A function that handles the batch media upload process.
 * - UploadMultipleMediaInput - The input type for the function.
 * - UploadMultipleMediaOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { v2 as cloudinary } from 'cloudinary';

const configureCloudinary = () => {
  if (!process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    throw new Error('Cloudinary environment variables are not set.');
  }
  cloudinary.config({
    cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!,
    api_key: process.env.CLOUDINARY_API_KEY!,
    api_secret: process.env.CLOUDINARY_API_SECRET!,
  });
};

const MediaUploadSchema = z.object({
    mediaDataUri: z.string(),
    isVideo: z.boolean(),
    originalFilename: z.string(),
});

const UploadMultipleMediaInputSchema = z.object({
    mediaItems: z.array(MediaUploadSchema),
});
export type UploadMultipleMediaInput = z.infer<typeof UploadMultipleMediaInputSchema>;

const UploadResultSchema = z.object({
    mediaUrl: z.string().url(),
    thumbnailUrl: z.string().url().optional(),
    originalFilename: z.string(),
    isVideo: z.boolean(),
});

const UploadMultipleMediaOutputSchema = z.object({
    results: z.array(UploadResultSchema),
});
export type UploadMultipleMediaOutput = z.infer<typeof UploadMultipleMediaOutputSchema>;

export async function uploadMultipleMedia(input: UploadMultipleMediaInput): Promise<UploadMultipleMediaOutput> {
    configureCloudinary();
    return uploadMultipleMediaFlow(input);
}

const uploadMultipleMediaFlow = ai.defineFlow(
  {
    name: 'uploadMultipleMediaFlow',
    inputSchema: UploadMultipleMediaInputSchema,
    outputSchema: UploadMultipleMediaOutputSchema,
  },
  async (input) => {
    const results: z.infer<typeof UploadResultSchema>[] = [];
    
    // Process files one by one to avoid overwhelming the server or hitting rate limits
    for (const item of input.mediaItems) {
      try {
        const uploadOptions: any = {
          resource_type: item.isVideo ? 'video' : 'image',
          use_unique_filename: true,
          // We can add eager transformations for videos if needed
          eager: item.isVideo ? [{ width: 400, height: 300, crop: "pad" }] : [],
        };
        
        console.log(`Uploading ${item.originalFilename}...`);
        const response = await cloudinary.uploader.upload(item.mediaDataUri, uploadOptions);

        if (!response || !response.secure_url) {
            console.error(`Cloudinary full response on failure for ${item.originalFilename}:`, JSON.stringify(response, null, 2));
            // We could decide to throw and stop the whole batch, or just skip this file.
            // For now, let's skip and continue.
            continue;
        }
        
        results.push({
            mediaUrl: response.secure_url,
            thumbnailUrl: response.eager?.[0]?.secure_url ?? response.secure_url,
            originalFilename: item.originalFilename,
            isVideo: item.isVideo,
        });

        if (input.mediaItems.length > 1) {
            console.log(`Successfully uploaded ${item.originalFilename}. Pausing for 2 seconds.`);
            // Pause between uploads to be kind to the API, only if there's more than one file.
            await new Promise(resolve => setTimeout(resolve, 2000));
        } else {
             console.log(`Successfully uploaded ${item.originalFilename}.`);
        }
        
      } catch (error: any) {
        console.error(`Failed to upload ${item.originalFilename}:`, error.message || JSON.stringify(error));
        // Throw a more descriptive error to be caught by the client
        throw new Error(`Failed to upload ${item.originalFilename}. Reason: ${error.message || 'Unknown error'}`);
      }
    }
    
    return { results };
  }
);
