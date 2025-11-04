
'use server';
/**
 * @fileOverview A flow for uploading media to an external service.
 *
 * - uploadMedia - A function that handles the media upload process.
 * - uploadMediaWithProgress - A function that handles media upload with progress reporting.
 * - UploadMediaInput - The input type for the uploadMedia function.
 * - UploadMediaOutput - The return type for the uploadMedia function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { v2 as cloudinary } from 'cloudinary';

// Define Cloudinary config in a reusable way
const configureCloudinary = () => {
  cloudinary.config({
    cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!,
    api_key: process.env.CLOUDINARY_API_KEY!,
    api_secret: process.env.CLOUDINARY_API_SECRET!,
  });
};

const UploadMediaInputSchema = z.object({
  mediaDataUri: z
    .string()
    .describe(
      "Media to be uploaded, as a data URI that must include a MIME type and use Base64 encoding."
    ),
  isVideo: z.boolean().optional().describe("Flag to indicate if the media is a video."),
});
export type UploadMediaInput = z.infer<typeof UploadMediaInputSchema>;

const UploadMediaOutputSchema = z.object({
  mediaUrl: z.string().url().describe('The URL of the uploaded media.'),
  thumbnailUrl: z.string().url().optional().describe('The URL of the media thumbnail, if applicable.'),
});
export type UploadMediaOutput = z.infer<typeof UploadMediaOutputSchema>;


export async function uploadMedia(input: UploadMediaInput): Promise<UploadMediaOutput> {
  configureCloudinary();
  return uploadMediaFlow(input);
}

/**
 * Uploads media to Cloudinary with progress reporting.
 * Note: Cloudinary Node SDK does not support streaming progress for data URI uploads.
 * This function simulates progress to provide user feedback.
 */
export async function uploadMediaWithProgress(
    input: UploadMediaInput,
    onProgress: (progress: number) => void
): Promise<UploadMediaOutput> {
    configureCloudinary();
    
    // Simulate initial progress
    onProgress(10);

    const promise = uploadMediaFlow(input);

    // Simulate progress while the upload is in flight
    const progressInterval = setInterval(() => {
        onProgress(Math.random() * 40 + 20); // Simulate progress between 20% and 60%
    }, 500);

    try {
        const result = await promise;
        clearInterval(progressInterval);
        onProgress(90); // Almost done
        return result;
    } catch (error) {
        clearInterval(progressInterval);
        throw error;
    }
}


const uploadMediaFlow = ai.defineFlow(
  {
    name: 'uploadMediaFlow',
    inputSchema: UploadMediaInputSchema,
    outputSchema: UploadMediaOutputSchema,
  },
  async (input) => {
    try {
      const uploadOptions: any = {
        resource_type: input.isVideo ? 'video' : 'image',
        use_unique_filename: true,
      };

      if (input.isVideo) {
        // For videos, generate a thumbnail automatically
        uploadOptions.eager = [
          { width: 400, height: 300, crop: "pad" },
          { width: 260, height: 200, crop: "crop", gravity: "north"}
        ];
      }
      
      const response = await cloudinary.uploader.upload(input.mediaDataUri, uploadOptions);

      if (!response.secure_url) {
        console.error('Cloudinary full response on failure:', JSON.stringify(response, null, 2));
        throw new Error('Cloudinary response did not include a URL.');
      }
      
      return {
        mediaUrl: response.secure_url,
        // Cloudinary returns eager transformations in an array. We'll take the first one as thumbnail.
        thumbnailUrl: response.eager && response.eager.length > 0 ? response.eager[0].secure_url : undefined,
      };

    } catch (error: any) {
        console.error('Cloudinary upload failed:', error);
        throw new Error(`Media upload failed: ${error.message}`);
    }
  }
);
