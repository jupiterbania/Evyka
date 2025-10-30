'use server';
/**
 * @fileOverview A flow for uploading images to an external service.
 *
 * - uploadImage - A function that handles the image upload process.
 * - UploadImageInput - The input type for the uploadImage function.
 * - UploadImageOutput - The return type for the uploadImage function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const UploadImageInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo to be uploaded, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type UploadImageInput = z.infer<typeof UploadImageInputSchema>;

const UploadImageOutputSchema = z.object({
  imageUrl: z.string().url().describe('The URL of the uploaded image.'),
});
export type UploadImageOutput = z.infer<typeof UploadImageOutputSchema>;

export async function uploadImage(input: UploadImageInput): Promise<UploadImageOutput> {
  return uploadImageFlow(input);
}

const uploadImageFlow = ai.defineFlow(
  {
    name: 'uploadImageFlow',
    inputSchema: UploadImageInputSchema,
    outputSchema: UploadImageOutputSchema,
  },
  async (input) => {
    const base64Image = input.photoDataUri.split(',')[1];
    if (!base64Image) {
      throw new Error('Invalid data URI. Could not extract base64 data.');
    }
    
    const imageHostingApiKey = process.env.IMAGE_HOSTING_API_KEY;
    if (!imageHostingApiKey) {
        throw new Error("IMAGE_HOSTING_API_KEY environment variable is not set.");
    }

    const formData = new FormData();
    formData.append('key', imageHostingApiKey);
    formData.append('action', 'upload');
    formData.append('source', base64Image);
    formData.append('format', 'json');

    const response = await fetch('https://freeimage.host/api/1/upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Image upload failed with status ${response.status}: ${errorBody}`);
    }

    const result = await response.json();

    if (result.status_code !== 200 || !result.image || !result.image.url) {
      throw new Error(result.status_txt || 'Failed to upload image. The hosting service returned an error.');
    }

    return {
      imageUrl: result.image.url,
    };
  }
);
