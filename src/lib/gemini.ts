import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY || "";

export const ai = new GoogleGenAI({ apiKey });

export interface Shot {
  id: string;
  description: string;
  imagePrompt: string;
  imageUrl?: string;
}

export async function parseScript(script: string): Promise<Shot[]> {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Parse the following script into a sequence of storyboard shots. 
    For each shot, provide a concise visual description and a detailed image generation prompt.
    The prompt should be artistic, cinematic, and consistent in style.
    
    Script:
    ${script}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            description: { type: Type.STRING },
            imagePrompt: { type: Type.STRING },
          },
          required: ["id", "description", "imagePrompt"],
        },
      },
    },
  });

  try {
    return JSON.parse(response.text || "[]");
  } catch (e) {
    console.error("Failed to parse script JSON", e);
    return [];
  }
}

export async function generateStoryboardImage(
  prompt: string,
  size: "1K" | "2K" | "4K" = "1K"
): Promise<string | undefined> {
  // Create a new instance to ensure fresh API key from dialog if needed
  const freshAi = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
  
  const response = await freshAi.models.generateContent({
    model: "gemini-3-pro-image-preview",
    contents: {
      parts: [{ text: prompt }],
    },
    config: {
      imageConfig: {
        aspectRatio: "16:9",
        imageSize: size,
      },
    },
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  return undefined;
}

export const CHAT_MODELS = {
  complex: "gemini-3.1-pro-preview",
  general: "gemini-3-flash-preview",
  fast: "gemini-3.1-flash-lite-preview",
} as const;

export type ChatModelType = keyof typeof CHAT_MODELS;
