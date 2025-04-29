import { apiRequest } from "./queryClient";

// Interface for image generation result with error validation
export interface ImageGenerationResult {
  url?: string;
  error?: string;
  loading?: boolean;
}

// Function to generate a scene background image using DALL-E
export async function generateSceneBackground(
  scene: {
    setting: string;
    id: string;
  },
  theme?: string,
  signal?: AbortSignal,
): Promise<ImageGenerationResult> {
  try {
    const response = await apiRequest(
      "POST",
      "/api/generate/image",
      { 
        scene, 
        theme,
        imageType: "background" 
      },
      signal,
    );

    const result = await response.json();

    // Check if the API returned an error
    if (result.error) {
      return { error: result.error };
    }

    return { url: result.url };
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      return { error: "Image generation aborted" };
    }
    console.error("Error generating scene background:", error);
    return { error: "Failed to generate image. Please try again." };
  }
}

// Cache for generated images to avoid redundant API calls
const imageCache: Record<string, string> = {};

// Function to get an image URL, using cache if available
export function getCachedImageUrl(sceneId: string): string | null {
  return imageCache[sceneId] || null;
}

// Function to set an image URL in the cache
export function setCachedImageUrl(sceneId: string, url: string): void {
  imageCache[sceneId] = url;
}

// Function to clear the image cache
export function clearImageCache(): void {
  Object.keys(imageCache).forEach(key => {
    delete imageCache[key];
  });
}