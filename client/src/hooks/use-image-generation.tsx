import { useState, useEffect, useRef, useCallback } from "react";
import {
  generateSceneBackground,
  getCachedImageUrl,
  setCachedImageUrl,
  ImageGenerationResult,
} from "@/lib/image-generator";
import { Scene } from "@/types/vn";
import { useToast } from "./use-toast";

interface UseImageGenerationOptions {
  // Time in ms to delay generation to avoid too many API calls during rapid scene changes
  generationDelay?: number;
  // Set to true to automatically generate when scene changes
  autoGenerate?: boolean;
  // Log generation events to console
  debug?: boolean;
}

export function useImageGeneration(
  scene: Scene | null,
  options: UseImageGenerationOptions = {},
) {
  const {
    generationDelay = 1000,
    autoGenerate = false,
    debug = false,
  } = options;

  const { toast } = useToast();

  // State to track image URL and loading status
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs to handle aborts and prevent effect loops
  const abortController = useRef<AbortController | null>(null);
  const generationTimeout = useRef<NodeJS.Timeout | null>(null);
  const isGenerationQueued = useRef(false);
  const currentSceneId = useRef<string | null>(null);

  // Debug log function
  const logDebug = useCallback(
    (...args: any[]) => {
      if (debug) {
        console.log("[ImageGeneration]", ...args);
      }
    },
    [debug],
  );

  // Cancel any pending generation
  const cancelGeneration = useCallback(() => {
    logDebug("Canceling pending generation");

    if (abortController.current) {
      abortController.current.abort();
      abortController.current = null;
    }

    if (generationTimeout.current) {
      clearTimeout(generationTimeout.current);
      generationTimeout.current = null;
    }

    isGenerationQueued.current = false;
  }, [logDebug]);

  // Generate image function with safety checks
  const generateImage = useCallback(
    async (forceGenerate = false, options?: {}) => {
      // Don't generate if no scene is available
      if (!scene) {
        logDebug("Cannot generate - no scene provided");
        return;
      }
       // Block any new scene transitions until generation completes
        if (isGenerating) {
          logDebug("Already generating an image, blocking new generation");
          return;
        }

      // Always update current scene ID reference
      currentSceneId.current = scene.name;

      // Check if scene already has a background URL
      if (scene.image_prompt && !forceGenerate) {
        logDebug("Scene already has bg URL:", scene.image_prompt);
        setImageUrl(scene.image_prompt);
        return;
      }

      // Check cache first using scene setting
      const setting = scene.setting || '';
      const cachedUrl = getCachedImageUrl(setting);
      if (cachedUrl && !forceGenerate) {
        logDebug("Using cached image URL for scene setting:", setting);
        setImageUrl(cachedUrl);
        return;
      }

      // Cancel any existing generation
      cancelGeneration();

      // Don't generate immediately - queue with delay to prevent too many API calls
      logDebug("Queueing image generation for scene:", scene.name);
      isGenerationQueued.current = true;

      generationTimeout.current = setTimeout(async () => {
        // Only proceed if this is still the current scene
        if (currentSceneId.current !== scene.name) {
          logDebug("Scene changed before generation, aborting");
          return;
        }

        try {
          // Create new AbortController for this request
          abortController.current = new AbortController();

          // Update UI state
          setIsGenerating(true);
          setError(null);

          logDebug("Starting image generation for scene:", scene.name);

          // Call API to generate image
          const result: ImageGenerationResult = await generateSceneBackground(
            { name: scene.name, image_prompt: scene.image_prompt || "" },
            abortController.current.signal,
            {}, // No options needed since we're using RunPod
          );

          // Only update state if this is still the current scene
          if (currentSceneId.current !== scene.name) {
            logDebug("Scene changed during generation, discarding result");
            return;
          }

          if (result.error) {
            setError(result.error);
            toast({
              title: "Image Generation Failed",
              description: result.error,
              variant: "destructive",
            });
          } else if (result.url) {
            setImageUrl(result.url);
            setCachedImageUrl(scene.setting || scene.name, result.url); //Store using setting if available, otherwise use ID
            logDebug("Image generated successfully:", result.url);
          }
        } catch (err) {
          // Only update error state if this is still the current scene
          if (currentSceneId.current !== scene.name) return;

          const errorMessage =
            (err as Error).message || "Unknown error occurred";
          setError(errorMessage);
          logDebug("Error during image generation:", errorMessage);

          toast({
            title: "Image Generation Error",
            description: errorMessage,
            variant: "destructive",
          });
        } finally {
          // Only update state if this is still the current scene
          if (currentSceneId.current !== scene.name) return;

          setIsGenerating(false);
          isGenerationQueued.current = false;
          abortController.current = null;
          generationTimeout.current = null;
        }
      }, generationDelay);
    },
    [scene, cancelGeneration, generationDelay, toast, logDebug],
  );

  // Auto-generate when scene changes if autoGenerate is true
  useEffect(() => {
    if (!scene || !autoGenerate) return;

    // Always update current scene ID reference even if we don't generate
    currentSceneId.current = scene.name;

    // Check if scene already has a background URL or cached URL
    if (scene.image_prompt) {
      logDebug("Scene has bg URL, using it:", scene.image_prompt);
      setImageUrl(scene.image_prompt);
      return;
    }

    const setting = scene.setting || '';
    const cachedUrl = getCachedImageUrl(setting);
    if (cachedUrl) {
      logDebug("Using cached image for scene setting:", setting);
      setImageUrl(cachedUrl);
      return;
    }

    // Only generate if not already generating or queued
    if (!isGenerating && !isGenerationQueued.current) {
      generateImage();
    }

    // Cleanup function for when scene changes or component unmounts
    return () => {
      cancelGeneration();
    };
  }, [
    scene,
    autoGenerate,
    isGenerating,
    generateImage,
    cancelGeneration,
    logDebug,
  ]);

  // Cleanup when component unmounts
  useEffect(() => {
    return () => {
      cancelGeneration();
    };
  }, [cancelGeneration]);

  return {
    imageUrl,
    isGenerating,
    error,
    generateImage,
    cancelGeneration,
  };
}