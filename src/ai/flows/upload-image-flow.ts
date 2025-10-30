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
      "A photo to be uploaded, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'"
    ),
});
export type UploadImageInput = z.infer<typeof UploadImageInputSchema>;

const UploadImageOutputSchema = z.object({
  imageUrl: z.string().url().describe('The URL of the uploaded image.'),
});
export type UploadImageOutput = z.infer<typeof UploadImageOutputSchema>;

export async function uploadImage(input: UploadImageInput): Promise<UploadImageOutput> {
  // Using a publicly available key for iili.io service
  const imageHostingApiKey = '62133-c23d596489574e4fce9ef617300c1e84';
  return uploadImageFlow({ ...input, apiKey: imageHostingApiKey });
}

const uploadImageFlow = ai.defineFlow(
  {
    name: 'uploadImageFlow',
    inputSchema: UploadImageInputSchema.extend({
      apiKey: z.string(),
    }),
    outputSchema: UploadImageOutputSchema,
  },
  async (input) => {
    const [header, base64Image] = input.photoDataUri.split(',');
    if (!header || !base64Image) {
      throw new Error('Invalid data URI. Could not extract base64 data.');
    }
    
    const formData = new FormData();
    formData.append('key', input.apiKey);
    formData.append('image', base64Image);


    const response = await fetch('https://iili.io/api/1/upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
        const errorBody = await response.text();
        console.error('Image upload failed:', errorBody);
        throw new Error(`Image upload failed with status ${response.status}. Response: ${errorBody}`);
    }

    const result = await response.json();
    
    if (result.status_code !== 200 || !result.image?.url) {
      const errorMessage = result?.error?.message || 'Failed to upload image. The hosting service returned an unexpected response.';
      console.error('Image hosting service error:', result);
      throw new Error(errorMessage);
    }
    
    const secureUrl = result.image.url.replace(/^http:/, 'https:');

    return {
      imageUrl: secureUrl,
    };
  }
);
