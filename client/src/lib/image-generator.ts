import { apiRequest } from "./queryClient";
import { isUpscalerAvailable, upscaleImage } from "./image-upscaler";

// Interface for image generation result with error validation
export interface ImageGenerationResult {
  url?: string;
  error?: string;
  loading?: boolean;
}

// Flag to track upscaler availability
let upscalerAvailabilityChecked = false;
let isUpscalerAvailableCache = false;

// Helper to detect mobile devices
function isMobileDevice(): boolean {
  // Use window.innerWidth as the most reliable way to detect small screens
  // We consider devices with screens smaller than 768px to be "mobile"
  return window.innerWidth <= 768;
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
      forceReal: options?.forceReal || false,
      // Include flag to indicate if optimize mode should be used
      optimizeForMobile: isMobileDevice()
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

    // Determine if we should upscale the image
    // Only upscale if:
    // 1. Not a mobile device (they don't need high-res)
    // 2. The image might be low resolution (DALL-E 2 or optimized mode)
    // 3. The upscaler is available
    const isMobile = isMobileDevice();
    const isOptimized = result.isOptimized === true;
    
    if (!isMobile && isOptimized && !signal?.aborted) {
      // Check if upscaler is available (only once)
      if (!upscalerAvailabilityChecked) {
        try {
          isUpscalerAvailableCache = await isUpscalerAvailable();
          upscalerAvailabilityChecked = true;
          console.log("Upscaler availability:", isUpscalerAvailableCache);
        } catch (err) {
          console.error("Failed to check upscaler availability:", err);
          upscalerAvailabilityChecked = true;
          isUpscalerAvailableCache = false;
        }
      }
      
      // If upscaler is available, try upscaling the image
      if (isUpscalerAvailableCache) {
        try {
          console.log("Upscaling optimized image for desktop view...");
          const upscaledUrl = await upscaleImage(result.url, {
            targetWidth: 1024,
            targetHeight: 768,
            quality: 90,
            smoothingQuality: 'high'
          });
          
          console.log("Image upscaled successfully");
          return { url: upscaledUrl };
        } catch (upscaleErr) {
          console.error("Error upscaling image:", upscaleErr);
          console.log("Falling back to original image");
        }
      }
    } else if (isMobile) {
      console.log("Mobile device detected, skipping upscaling");
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