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
import ImageKit from 'imagekit';

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
  const imageKitConfig = {
    publicKey: 'public_3BzpFL5pqk2Qn42+6s7TAa0gFqc=',
    privateKey: 'private_gDgJMY3xa9l+pkjMH6r2OIg3UfA=',
    urlEndpoint: 'https://ik.imagekit.io/oco6vyb1z',
  };
  return uploadImageFlow({ ...input, ...imageKitConfig });
}

const uploadImageFlow = ai.defineFlow(
  {
    name: 'uploadImageFlow',
    inputSchema: UploadImageInputSchema.extend({
      publicKey: z.string(),
      privateKey: z.string(),
      urlEndpoint: z.string(),
    }),
    outputSchema: UploadImageOutputSchema,
  },
  async (input) => {
    const imagekit = new ImageKit({
      publicKey: input.publicKey,
      privateKey: input.privateKey,
      urlEndpoint: input.urlEndpoint,
    });

    try {
      const response = await imagekit.upload({
        file: input.photoDataUri, // The data URI is passed directly
        fileName: `image-${Date.now()}`, // Generate a unique file name
        useUniqueFileName: true,
      });

      if (!response.url) {
        throw new Error('ImageKit response did not include a URL.');
      }
      
      return {
        imageUrl: response.url,
      };

    } catch (error: any) {
        console.error('ImageKit upload failed:', error);
        throw new Error(`Image upload failed: ${error.message}`);
    }
  }
);
