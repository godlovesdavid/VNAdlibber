import { apiRequest } from "./queryClient";

// Interface for image generation result with error validation
export interface ImageGenerationResult {
  url?: string;
  error?: string;
  loading?: boolean;
  details?: string; // Additional error details
}

// Helper to detect mobile devices
function isMobileDevice(): boolean {
  // Use window.innerWidth as the most reliable way to detect small screens
  // We consider devices with screens smaller than 768px to be "mobile"
  return window.innerWidth <= 768;
}

// Function to generate a scene background image using RunPod
export async function generateSceneBackground(
  scene: {
    image_prompt: string;
    name: string;
  },
  signal?: AbortSignal,
  options?: {
    retryCount?: number;
    timeoutMs?: number;
  },
): Promise<ImageGenerationResult> {
  // Get options with defaults
  const {
    retryCount = 1,
    timeoutMs = 20000, // 20 second timeout
  } = options || {};
  
  let attemptCount = 0;
  let lastError: any = null;
  
  while (attemptCount < retryCount + 1) { // +1 for the initial attempt
    // Create a timeout race promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Image generation timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    });
    
    try {
      attemptCount++;
      console.log(
        `Generating background for scene (attempt ${attemptCount}/${retryCount + 1}):`,
        scene.name,
        "image prompt:",
        scene.image_prompt
      );

      const requestData = {
        scene,
        imageType: "background",
        // Include flag to indicate if optimize mode should be used
        optimizeForMobile: isMobileDevice(),
      };
      console.log("Sending request to generate image API:", requestData);

      // Race between the API request and the timeout
      const response = await Promise.race([
        apiRequest("POST", "/api/generate/image", requestData, signal),
        timeoutPromise
      ]);

      console.log("Received response from image API, status:", response.status);
      
      // Verify that the response has content
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error(`Invalid content type: ${contentType}`);
      }
      
      const result = await response.json();
      console.log(
        "Parsed response:",
        result.url ? "Success (URL hidden)" : "No URL",
        result.error || "No error"
      );

      // Check if the API returned an error
      if (result.error) {
        console.error("API returned error:", result.error);
        return { error: result.error };
      }

      // Make sure we actually have a URL before returning success
      if (!result.url) {
        throw new Error("API response missing URL");
      }

      console.log("Successfully generated image, returning URL");
      return { url: result.url };
    } catch (error) {
      lastError = error;
      
      if (signal?.aborted || (error as Error).name === "AbortError") {
        console.log("Image generation was cancelled by user or component unmounting");
        return { error: "Image generation cancelled" };
      }
      
      console.error(`Error generating image (attempt ${attemptCount}/${retryCount + 1}):`, error);
      
      // If we've reached the max retry count, return the error
      if (attemptCount >= retryCount + 1) {
        break;
      }
      
      // Wait 1 second before retrying
      console.log(`Retrying in 1 second...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  // We've exhausted all retries, return the last error
  console.error("All image generation attempts failed:", lastError);
  return { 
    error: "Image generation failed after multiple attempts. Please try again later.",
    details: lastError?.message || "Unknown error" 
  };
}

// Cache for generated images to avoid redundant API calls
const imageCache: Record<string, string> = {};

// Function to get an image URL, using cache if available
export function getCachedImageUrl(setting: string): string | null {
  return imageCache[setting] || null;
}

// Function to set an image URL in the cache
export function setCachedImageUrl(setting: string, url: string): void {
  if (setting && setting.length > 0) {
    imageCache[setting] = url;
  }
}

// Function to clear the image cache
export function clearImageCache(): void {
  Object.keys(imageCache).forEach((key) => {
    delete imageCache[key];
  });
}
