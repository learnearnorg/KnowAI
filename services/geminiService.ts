
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import { GoogleGenAI, GenerateContentResponse, Tool, HarmCategory, HarmBlockThreshold, Content, Part } from "@google/genai";
import { UrlContextMetadataItem, Document, DocumentType } from '../types';

// Use gemini-3-flash-preview for general text and documentation tasks
const MODEL_NAME = "gemini-3-flash-preview"; 

const getAiInstance = (): GoogleGenAI => {
  // Read API_KEY directly from process.env to ensure it's up-to-date after key selection
  const currentKey = process.env.API_KEY;
  if (!currentKey) {
    const error = new Error("Gemini API Key not configured. Set process.env.API_KEY.");
    (error as any).code = 'API_KEY_INVALID';
    throw error;
  }
  return new GoogleGenAI({ apiKey: currentKey });
};

/**
 * Maps raw API errors to application-specific error codes for localized messaging.
 */
const mapAiError = (error: any) => {
  const msg = error.message?.toLowerCase() || "";
  if (msg.includes("api key not valid") || msg.includes("401") || msg.includes("403")) {
     error.code = 'API_KEY_INVALID';
  } else if (msg.includes("quota") || msg.includes("429") || msg.includes("rate limit")) {
    error.code = 'QUOTA_EXCEEDED';
  } else if (msg.includes("overloaded") || msg.includes("503") || msg.includes("500")) {
    error.code = 'SERVER_OVERLOADED';
  }
  return error;
};

/**
 * Utility for exponential backoff retries on specific error codes
 */
const withRetry = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 2000
): Promise<T> => {
  let lastError: any;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = mapAiError(error);
      const status = error?.status || error?.code;
      const isRetryable = status === 429 || (status >= 500 && status <= 599) || error?.message?.includes('429');
      
      if (!isRetryable || attempt === maxRetries - 1) {
        throw lastError;
      }
      
      // Exponential backoff: 2s, 4s, 8s...
      const delay = initialDelay * Math.pow(2, attempt);
      console.warn(`Attempt ${attempt + 1} failed with ${status}. Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw lastError;
};

const safetySettings = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
];

interface GeminiResponse {
  text: string;
  urlContextMetadata?: UrlContextMetadataItem[];
}

export const generateContentWithUrlContext = async (
  prompt: string,
  documents: Document[],
  languageName?: string
): Promise<GeminiResponse> => {
  return withRetry(async () => {
    const currentAi = getAiInstance();
    
    const urls = documents.filter(d => d.type === DocumentType.URL).map(d => d.source);
    const files = documents.filter(d => d.type === DocumentType.FILE);

    let fullPrompt = prompt;
    if (urls.length > 0) {
      const urlList = urls.join('\n');
      fullPrompt = `${prompt}\n\nRelevant URLs for context:\n${urlList}`;
    }
    
    if (languageName) {
      fullPrompt += `\n\nPlease answer the user's question in ${languageName}.`;
    }

    // Fixed Tool cast to satisfy custom platform extensions
    const tools: Tool[] = [{ urlContext: {} } as any];
    const parts: Part[] = [{ text: fullPrompt }];

    // Add files as inlineData parts
    for (const file of files) {
      parts.push({
        inlineData: {
          data: file.source,
          mimeType: file.mimeType || 'application/pdf'
        }
      });
    }

    const contents: Content[] = [{ role: "user", parts }];

    try {
      const response: GenerateContentResponse = await currentAi.models.generateContent({
        model: MODEL_NAME,
        contents: contents,
        config: { 
          tools: tools,
          safetySettings: safetySettings,
        },
      });

      const candidate = response.candidates?.[0];
      if (candidate?.finishReason === 'SAFETY') {
        const error = new Error("Response blocked by safety filters.");
        (error as any).code = 'SAFETY_BLOCKED';
        throw error;
      }

      const text = response.text || "";
      let extractedUrlContextMetadata: UrlContextMetadataItem[] | undefined = undefined;

      // Accessing custom candidate property safely
      const candidateAny = candidate as any;
      if (candidateAny && candidateAny.urlContextMetadata && candidateAny.urlContextMetadata.urlMetadata) {
        extractedUrlContextMetadata = candidateAny.urlContextMetadata.urlMetadata as UrlContextMetadataItem[];
      }
      
      return { text, urlContextMetadata: extractedUrlContextMetadata };

    } catch (error: any) {
      throw mapAiError(error);
    }
  });
};

export const getInitialSuggestions = async (urls: string[], languageName: string = 'English'): Promise<GeminiResponse> => {
  if (urls.length === 0) {
    return { text: JSON.stringify({ suggestions: [] }) };
  }

  return withRetry(async () => {
    const currentAi = getAiInstance();
    const urlList = urls.join('\n');
    
    const promptText = `Based on the content of the following documentation URLs, provide 3-4 concise and actionable questions a developer might ask to explore these documents. These questions should be suitable as quick-start prompts and must be in ${languageName}. Return ONLY a JSON object with a key "suggestions" containing an array of these question strings.

Relevant URLs:
${urlList}`;

    const contents: Content[] = [{ role: "user", parts: [{ text: promptText }] }];

    const response: GenerateContentResponse = await currentAi.models.generateContent({
      model: MODEL_NAME,
      contents: contents,
      config: {
        safetySettings: safetySettings,
        responseMimeType: "application/json",
      },
    });

    return { text: response.text || "{}" };
  });
};

export const generateVeoVideo = async (
  prompt: string,
  config: { 
    aspectRatio: "16:9" | "9:16"; 
    resolution: "720p" | "1080p";
    model: 'veo-3.1-generate-preview' | 'veo-3.1-fast-generate-preview'
  }
): Promise<string> => {
  const aiInstance = getAiInstance();

  try {
    let operation = await aiInstance.models.generateVideos({
      model: config.model,
      prompt: prompt,
      config: {
        numberOfVideos: 1,
        resolution: config.resolution,
        aspectRatio: config.aspectRatio
      }
    });

    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 10000));
      operation = await aiInstance.operations.getVideosOperation({ operation: operation });
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) {
      throw new Error("No video download link received.");
    }

    return `${downloadLink}&key=${process.env.API_KEY}`;
  } catch (error: any) {
    console.error("Veo generation error:", error);
    if (error.message?.includes("Requested entity was not found")) {
      const e = new Error("Key selection error. Please select your API key again.");
      (e as any).code = 'KEY_SELECTION_REQUIRED';
      throw e;
    }
    throw mapAiError(error);
  }
};

/**
 * Handles general assistant responses, including potential tool calls.
 */
export const getAssistantResponse = async (prompt: string): Promise<GenerateContentResponse> => {
  return withRetry(async () => {
    const currentAi = getAiInstance();
    try {
      const response = await currentAi.models.generateContent({
        model: MODEL_NAME,
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: {
          systemInstruction: "You are a helpful and professional AI assistant integrated into a documentation browser. Be concise. You can use tools to help the user.",
          tools: [{ googleSearch: {} }], 
          safetySettings: safetySettings,
        },
      });
      return response;
    } catch (error: any) {
      throw mapAiError(error);
    }
  });
};
