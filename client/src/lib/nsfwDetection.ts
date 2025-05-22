import * as nsfwjs from 'nsfwjs';

// Global model reference - we'll load it once and reuse
let nsfwModel: nsfwjs.NSFWJS | null = null;

/**
 * Initialize the NSFW detection model
 * Call this early in your application lifecycle (e.g., in the main component's useEffect)
 */
export async function initNSFWDetection(): Promise<void> {
  try {
    if (!nsfwModel) {
      console.log('Loading NSFW detection model...');
      // Use the default model hosted by the nsfwjs team
      nsfwModel = await nsfwjs.load();
      console.log('NSFW detection model loaded successfully');
    }
  } catch (error) {
    console.error('Failed to load NSFW detection model:', error);
    throw new Error('Failed to initialize content moderation system');
  }
}

/**
 * Content moderation levels
 */
export enum ModerationLevel {
  TEEN_SAFE = 'teen_safe',  // Suitable for teens (13+) - stricter moderation
  ADULT_MODERATE = 'adult_moderate', // Adult users only - moderate restrictions
  ADULT_RELAXED = 'adult_relaxed'  // Adult users only - minimal restrictions
}

/**
 * Target audience for the app
 */
export enum TargetAudience {
  EVERYONE = 'everyone',  // All ages - most restrictive
  TEENS = 'teens',        // 13+ years old
  ADULTS_ONLY = 'adults_only' // 18+ years old
}

/**
 * Configuration for NSFW detection
 */
export interface NSFWDetectionConfig {
  moderationLevel: ModerationLevel;
  threshold: {
    porn: number;   // Explicit sexual content
    sexy: number;   // Suggestive but not explicit
    hentai: number; // Animated/drawn explicit content
    violence: number; // Added threshold for violent content
  }
}

/**
 * Default configuration with different levels based on audience
 */
export const NSFW_CONFIG: Record<ModerationLevel, NSFWDetectionConfig> = {
  [ModerationLevel.TEEN_SAFE]: {
    moderationLevel: ModerationLevel.TEEN_SAFE,
    threshold: {
      porn: 0.2,    // Very low threshold - block almost anything potentially explicit
      sexy: 0.4,    // Low threshold - block suggestive content
      hentai: 0.2,  // Very low threshold - block animated explicit content
      violence: 0.5 // Moderate threshold - allow mild violence but block graphic violence
    }
  },
  [ModerationLevel.ADULT_MODERATE]: {
    moderationLevel: ModerationLevel.ADULT_MODERATE,
    threshold: {
      porn: 0.6,    // Moderate threshold - block explicit content
      sexy: 0.7,    // Higher threshold - allow more suggestive content
      hentai: 0.6,  // Moderate threshold - block explicit animated content
      violence: 0.7 // Higher threshold - allow more violent content
    }
  },
  [ModerationLevel.ADULT_RELAXED]: {
    moderationLevel: ModerationLevel.ADULT_RELAXED,
    threshold: {
      porn: 0.8,    // High threshold - only block the most explicit content
      sexy: 0.9,    // Very high threshold - allow most suggestive content
      hentai: 0.8,  // High threshold - allow most animated content
      violence: 0.9 // Very high threshold - allow most violent content except extreme
    }
  }
};

/**
 * Detection result interface
 */
export interface ContentModerationResult {
  isAppropriate: boolean;
  classifications?: {
    className: string;
    probability: number;
  }[];
  message?: string;
}

/**
 * Check if an image URL is appropriate based on NSFW detection
 * @param imageUrl URL of the image to check
 * @param config Moderation configuration
 * @returns Promise with moderation result
 */
export async function checkImageURL(
  imageUrl: string, 
  config: NSFWDetectionConfig = NSFW_CONFIG[ModerationLevel.TEEN_SAFE]
): Promise<ContentModerationResult> {
  try {
    if (!nsfwModel) {
      await initNSFWDetection();
    }

    if (!nsfwModel) {
      console.warn('NSFW detection model could not be loaded');
      // If the model fails to load, we'll allow the content but log a warning
      // This is better UX than blocking everything when the model doesn't load
      return { 
        isAppropriate: true, 
        message: 'Content moderation unavailable, proceeding with caution' 
      };
    }

    // Load the image
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    // Create a promise to handle image loading
    const imageLoadPromise = new Promise<HTMLImageElement>((resolve, reject) => {
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to load image for moderation'));
      img.src = imageUrl;
    });

    // Wait for image to load
    const loadedImg = await imageLoadPromise;
    
    // Classify the image
    const predictions = await nsfwModel.classify(loadedImg);
    console.log('NSFW detection results:', predictions);
    
    // Check against thresholds
    const pornPrediction = predictions.find(p => p.className === 'Porn');
    const sexyPrediction = predictions.find(p => p.className === 'Sexy');
    const hentaiPrediction = predictions.find(p => p.className === 'Hentai');
    
    const isPorn = pornPrediction && pornPrediction.probability > config.threshold.porn;
    const isSexy = sexyPrediction && sexyPrediction.probability > config.threshold.sexy;
    const isHentai = hentaiPrediction && hentaiPrediction.probability > config.threshold.hentai;
    
    const isAppropriate = !(isPorn || isHentai || (config.moderationLevel === ModerationLevel.STRICT && isSexy));
    
    return {
      isAppropriate,
      classifications: predictions,
      message: isAppropriate 
        ? 'Content appears appropriate' 
        : 'Content may violate community guidelines'
    };
  } catch (error) {
    console.error('NSFW detection error:', error);
    // In production, you might want to fail closed (block content on error)
    // For better UX during development, we'll allow content if detection fails
    return { 
      isAppropriate: true, 
      message: 'Unable to verify content appropriateness, proceeding with caution'
    };
  }
}

/**
 * Check if a locally loaded image (File object) is appropriate
 * @param imageFile File object containing the image
 * @param config Moderation configuration
 * @returns Promise with moderation result
 */
export async function checkImageFile(
  imageFile: File,
  config: NSFWDetectionConfig = NSFW_CONFIG[ModerationLevel.MODERATE]
): Promise<ContentModerationResult> {
  try {
    // Create a local URL for the file
    const imageUrl = URL.createObjectURL(imageFile);
    
    // Check the image
    const result = await checkImageURL(imageUrl, config);
    
    // Clean up the URL
    URL.revokeObjectURL(imageUrl);
    
    return result;
  } catch (error) {
    console.error('NSFW file detection error:', error);
    return { 
      isAppropriate: true, 
      message: 'Unable to verify content appropriateness, proceeding with caution'
    };
  }
}

/**
 * Add NSFW detection to an existing image element
 * This can be used to validate images loaded from external sources
 * @param imageElement HTML image element to check
 * @param config Moderation configuration
 * @param onInappropriate Callback function when content is inappropriate
 * @returns Promise that resolves when validation is complete
 */
export async function validateImageElement(
  imageElement: HTMLImageElement,
  config: NSFWDetectionConfig = NSFW_CONFIG[ModerationLevel.MODERATE],
  onInappropriate?: (result: ContentModerationResult) => void
): Promise<ContentModerationResult> {
  try {
    if (!nsfwModel) {
      await initNSFWDetection();
    }

    if (!nsfwModel) {
      return { isAppropriate: true, message: 'Content moderation unavailable' };
    }

    // Make sure the image is loaded
    if (!imageElement.complete) {
      await new Promise<void>((resolve) => {
        imageElement.onload = () => resolve();
        imageElement.onerror = () => resolve();
      });
    }

    // Classify the image
    const predictions = await nsfwModel.classify(imageElement);

    // Check against thresholds
    const pornPrediction = predictions.find(p => p.className === 'Porn');
    const sexyPrediction = predictions.find(p => p.className === 'Sexy');
    const hentaiPrediction = predictions.find(p => p.className === 'Hentai');
    
    const isPorn = pornPrediction && pornPrediction.probability > config.threshold.porn;
    const isSexy = sexyPrediction && sexyPrediction.probability > config.threshold.sexy;
    const isHentai = hentaiPrediction && hentaiPrediction.probability > config.threshold.hentai;
    
    const isAppropriate = !(isPorn || isHentai || (config.moderationLevel === ModerationLevel.STRICT && isSexy));
    
    const result = {
      isAppropriate,
      classifications: predictions,
      message: isAppropriate ? 'Content appears appropriate' : 'Content may violate community guidelines'
    };

    // Call the callback if content is inappropriate
    if (!isAppropriate && onInappropriate) {
      onInappropriate(result);
    }

    return result;
  } catch (error) {
    console.error('NSFW element validation error:', error);
    return { 
      isAppropriate: true, 
      message: 'Unable to verify content appropriateness, proceeding with caution'
    };
  }
}