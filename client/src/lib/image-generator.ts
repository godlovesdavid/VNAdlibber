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
  options?: { forceReal?: boolean }
): Promise<ImageGenerationResult> {
  try {
    console.log("Generating background for scene:", scene.id, "setting:", scene.setting, "theme:", theme || "none");
    
    const requestData = { 
      scene, 
      theme,
      imageType: "background", 
      forceReal: options?.forceReal || false
    };
    console.log("Sending request to generate image API:", requestData);
    
    const response = await apiRequest(
      "POST",
      "/api/generate/image",
      requestData,
      signal,
    );

    console.log("Received response from image API, status:", response.status);
    const result = await response.json();
    console.log("Parsed response:", result.url ? "Success (URL hidden)" : "No URL", result.error || "No error");

    // Check if the API returned an error
    if (result.error) {
      console.error("API returned error:", result.error);
      return { error: result.error };
    }

    console.log("Successfully generated image, returning URL");
    return { url: result.url };
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      console.log("Image generation was aborted");
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