'use server';
/**
 * @fileOverview A flow for extracting a dominant color from an image.
 *
 * - extractDominantColor - A function that handles the color extraction.
 * - ExtractColorInput - The input type for the function.
 * - ExtractColorOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ExtractColorInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo to be analyzed, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'"
    ),
});
export type ExtractColorInput = z.infer<typeof ExtractColorInputSchema>;

const ExtractColorOutputSchema = z.object({
  dominantColor: z.string().describe('The dominant color from the image in hex format (e.g., #RRGGBB).'),
});
export type ExtractColorOutput = z.infer<typeof ExtractColorOutputSchema>;


export async function extractDominantColor(input: ExtractColorInput): Promise<ExtractColorOutput> {
  return extractColorFlow(input);
}


const extractColorPrompt = ai.definePrompt({
  name: 'extractColorPrompt',
  input: { schema: ExtractColorInputSchema },
  output: { schema: ExtractColorOutputSchema },
  prompt: `Analyze the provided image and determine a single dominant color that would be suitable for a background. 
  
  Return this color as a hex code.
  
  Image: {{media url=photoDataUri}}`,
});


const extractColorFlow = ai.defineFlow(
  {
    name: 'extractColorFlow',
    inputSchema: ExtractColorInputSchema,
    outputSchema: ExtractColorOutputSchema,
  },
  async (input) => {
    const { output } = await extractColorPrompt(input);
    return output!;
  }
);
