/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
/* tslint:disable */

import {
  FinishReason,
  GoogleGenAI,
  HarmBlockThreshold,
  HarmCategory,
  Part,
  SafetySetting,
} from '@google/genai';

interface GenerateTextOptions {
  modelName: string;
  prompt: string;
  videoUrl?: string;
  temperature?: number;
  safetySettings?: SafetySetting[];
  systemInstruction?: string;
}

/**
 * Generate text content using the Gemini API, optionally including video data.
 *
 * @param options - Configuration options for the generation request.
 * @returns The response from the Gemini API.
 */
export async function generateText(
  options: GenerateTextOptions,
): Promise<string> {
  const {
    modelName,
    prompt,
    videoUrl,
    temperature = 0.75,
    systemInstruction,
  } = options;

  if (!process.env.API_KEY) {
    throw new Error(
      'API key is missing or empty. Please set the API_KEY environment variable.',
    );
  }

  const ai = new GoogleGenAI({apiKey: process.env.API_KEY});

  const parts: Part[] = [{text: prompt}];

  if (videoUrl) {
    try {
      parts.push({
        fileData: {
          mimeType: 'video/mp4',
          fileUri: videoUrl,
        },
      });
    } catch (error) {
      console.error('Error processing video input:', error);
      throw new Error(`Failed to process video input from URL: ${videoUrl}`);
    }
  }

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: {parts},
      config: {
        temperature,
        ...(systemInstruction && {systemInstruction}),
      },
    });

    if (response.promptFeedback?.blockReason) {
      throw new Error(
        `Content generation failed: Prompt blocked (reason: ${response.promptFeedback.blockReason})`,
      );
    }

    if (!response.candidates || response.candidates.length === 0) {
      throw new Error('Content generation failed: No candidates returned.');
    }

    const firstCandidate = response.candidates[0];

    if (
      firstCandidate.finishReason &&
      firstCandidate.finishReason !== FinishReason.STOP
    ) {
      if (firstCandidate.finishReason === FinishReason.SAFETY) {
        throw new Error(
          'Content generation failed: Response blocked due to safety settings.',
        );
      } else {
        throw new Error(
          `Content generation failed: Stopped due to ${firstCandidate.finishReason}.`,
        );
      }
    }

    return response.text;
  } catch (error) {
    console.error(
      'An error occurred during Gemini API call or response processing:',
      error,
    );
    throw error;
  }
}
