/**
 * Interface for image upscaling options
 */
export interface UpscalingOptions {
  // Target width for the upscaled image
  targetWidth?: number;
  // Target height for the upscaled image
  targetHeight?: number;
  // Quality of the upscaled image (1-100)
  quality?: number;
  // Image smoothing algorithm quality ('low', 'medium', 'high')
  smoothingQuality?: 'low' | 'medium' | 'high';
}

/**
 * Default upscaling options
 */
const defaultOptions: UpscalingOptions = {
  targetWidth: 1024,
  targetHeight: 768,
  quality: 90,
  smoothingQuality: 'high'
};

/**
 * Cache for device detection to avoid redundant checks
 */
let isMobileDeviceCache: boolean | null = null;

/**
 * Detects if the current device is mobile or has a small screen
 */
export function isMobileDevice(): boolean {
  if (isMobileDeviceCache !== null) return isMobileDeviceCache;
  
  // Check for mobile user agent
  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
  const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i;
  
  // Also check for mobile/small screen sizes
  const isMobile = mobileRegex.test(userAgent.toLowerCase()) || 
                  (window.innerWidth <= 768);
  
  isMobileDeviceCache = isMobile;
  return isMobile;
}

/**
 * Upscale an image using HTML Canvas
 * 
 * @param imageUrl - URL of the image to upscale (can be a data URL or remote URL)
 * @param options - Upscaling options
 * @returns Promise with the upscaled image as a data URL
 */
export async function upscaleImage(
  imageUrl: string,
  options: UpscalingOptions = {}
): Promise<string> {
  console.log("Starting canvas-based image upscaling...");
  
  // Skip upscaling for mobile devices - they don't need high-res images
  if (isMobileDevice()) {
    console.log("Mobile device detected, skipping upscaling");
    return imageUrl;
  }
  
  // Merge provided options with defaults
  const settings = { ...defaultOptions, ...options };
  
  return new Promise<string>((resolve, reject) => {
    // Create an image element to load the source image
    const img = new Image();
    img.crossOrigin = "anonymous";
    
    img.onload = () => {
      try {
        // Create canvas for the upscaling process
        const canvas = document.createElement('canvas');
        canvas.width = settings.targetWidth || 1024;
        canvas.height = settings.targetHeight || 768;
        
        const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
        
        if (!ctx) {
          console.error("Failed to get canvas context");
          resolve(imageUrl); // Return original if context fails
          return;
        }
        
        // Apply high-quality image smoothing
        if ('imageSmoothingEnabled' in ctx) {
          ctx.imageSmoothingEnabled = true;
          // Set quality if supported
          if ('imageSmoothingQuality' in ctx) {
            ctx.imageSmoothingQuality = settings.smoothingQuality || 'high';
          }
        }
        
        // Clear canvas with a black background for better rendering
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw image with correct aspect ratio and centering
        const targetRatio = canvas.width / canvas.height;
        const imgRatio = img.width / img.height;
        
        let drawWidth, drawHeight, offsetX = 0, offsetY = 0;
        
        if (imgRatio > targetRatio) {
          // Image is wider than target aspect ratio
          drawHeight = canvas.height;
          drawWidth = img.width * (canvas.height / img.height);
          offsetX = (canvas.width - drawWidth) / 2;
        } else {
          // Image is taller than target aspect ratio
          drawWidth = canvas.width;
          drawHeight = img.height * (canvas.width / img.width);
          offsetY = (canvas.height - drawHeight) / 2;
        }
        
        // Draw the image (this is where the upscaling happens)
        ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
        
        // Apply a subtle sharpening pass to enhance details
        try {
          applySharpening(ctx, canvas.width, canvas.height);
        } catch (sharpErr) {
          console.log("Sharpening pass skipped:", sharpErr);
        }
        
        // Convert to data URL
        const dataUrl = canvas.toDataURL('image/jpeg', (settings.quality || 90) / 100);
        console.log("Canvas upscaling complete");
        resolve(dataUrl);
      } catch (err) {
        console.error("Error during upscaling:", err);
        resolve(imageUrl); // Return original URL on error
      }
    };
    
    img.onerror = () => {
      console.error("Error loading image for upscaling");
      resolve(imageUrl); // Return original URL on error
    };
    
    // Start loading the image
    img.src = imageUrl;
  });
}

/**
 * Apply a simple sharpening filter to enhance image details
 * This is a basic implementation of an unsharp mask
 */
function applySharpening(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  // Only apply sharpening on larger screens/images for performance
  if (width < 512 || height < 512) return;
  
  try {
    // Get image data
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    
    // Create a copy of the image data for the blur pass
    const blurData = new Uint8ClampedArray(data);
    
    // Apply a simple box blur
    const boxBlur = (data: Uint8ClampedArray, width: number, height: number, radius: number): void => {
      const size = width * height * 4;
      const tempData = new Uint8ClampedArray(size);
      
      // Simple horizontal blur pass
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          let r = 0, g = 0, b = 0;
          let count = 0;
          
          // Sample neighboring pixels
          for (let i = -radius; i <= radius; i++) {
            const px = Math.min(Math.max(x + i, 0), width - 1);
            const index = (y * width + px) * 4;
            
            r += data[index];
            g += data[index + 1];
            b += data[index + 2];
            count++;
          }
          
          // Write the average to temp buffer
          const targetIndex = (y * width + x) * 4;
          tempData[targetIndex] = r / count;
          tempData[targetIndex + 1] = g / count;
          tempData[targetIndex + 2] = b / count;
          tempData[targetIndex + 3] = data[targetIndex + 3]; // Keep alpha unchanged
        }
      }
      
      // Simple vertical blur pass
      for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
          let r = 0, g = 0, b = 0;
          let count = 0;
          
          // Sample neighboring pixels
          for (let i = -radius; i <= radius; i++) {
            const py = Math.min(Math.max(y + i, 0), height - 1);
            const index = (py * width + x) * 4;
            
            r += tempData[index];
            g += tempData[index + 1];
            b += tempData[index + 2];
            count++;
          }
          
          // Write the average back to original buffer
          const targetIndex = (y * width + x) * 4;
          blurData[targetIndex] = r / count;
          blurData[targetIndex + 1] = g / count;
          blurData[targetIndex + 2] = b / count;
          blurData[targetIndex + 3] = data[targetIndex + 3]; // Keep alpha unchanged
        }
      }
    };
    
    // Apply blur with radius 1
    boxBlur(blurData, width, height, 1);
    
    // Apply unsharp mask (subtract blurred image with a weight)
    const amount = 0.5; // Sharpening intensity (0.2 to 0.8 is a good range)
    
    for (let i = 0; i < data.length; i += 4) {
      // Subtract blurred image from original with weighting
      data[i] = Math.min(255, Math.max(0, data[i] + amount * (data[i] - blurData[i])));
      data[i+1] = Math.min(255, Math.max(0, data[i+1] + amount * (data[i+1] - blurData[i+1])));
      data[i+2] = Math.min(255, Math.max(0, data[i+2] + amount * (data[i+2] - blurData[i+2])));
      // Alpha remains unchanged
    }
    
    // Put the sharpened image data back to the canvas
    ctx.putImageData(imageData, 0, 0);
  } catch (err) {
    console.error("Error applying sharpening:", err);
  }
}

/**
 * Check if upscaling is available on this device
 * For this implementation, it's always available as we're using Canvas API
 */
export async function isUpscalerAvailable(): Promise<boolean> {
  try {
    // Check if Canvas is supported
    const canvas = document.createElement('canvas');
    return !!canvas.getContext('2d');
  } catch (error) {
    console.error("Canvas upscaling not available:", error);
    return false;
  }
}

/**
 * Helper function to fetch an image as blob
 */
export async function fetchImageAsBlob(url: string): Promise<Blob> {
  // If the URL is already a data URL, convert it to a Blob
  if (url.startsWith('data:')) {
    const response = await fetch(url);
    return await response.blob();
  }
  
  // Otherwise fetch the remote image
  try {
    const response = await fetch(url, { mode: 'cors' });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
    }
    
    return await response.blob();
  } catch (error) {
    console.error("Error fetching image:", error);
    // Create a minimal error image if fetching fails
    const errorCanvas = document.createElement('canvas');
    errorCanvas.width = 400;
    errorCanvas.height = 300;
    const ctx = errorCanvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#f44336';
      ctx.fillRect(0, 0, 400, 300);
      ctx.fillStyle = 'white';
      ctx.font = '20px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Image Loading Error', 200, 150);
    }
    
    return new Promise<Blob>((resolve) => {
      errorCanvas.toBlob((blob) => {
        resolve(blob || new Blob());
      }, 'image/jpeg');
    });
  }
}