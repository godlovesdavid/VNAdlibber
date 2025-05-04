import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useVnContext } from "@/context/vn-context";
import { cn } from "@/lib/utils";
import { PlayerNavbar } from "@/components/player-navbar";
import { Button } from "@/components/ui/button";
import { ChevronDown, RefreshCw } from "lucide-react";
import { Scene, SceneChoice, GeneratedAct } from "@/types/vn";
import * as ImageGenerator from "@/lib/image-generator";
import { useToast } from "@/hooks/use-toast";

// Helper function to convert various act formats to array format for VN player
function convertActFormat(actData: any): {
  scenes: Scene[];
  act: number;
} {
  // Handle case where the data is already in the correct format
  if (actData.scenes && Array.isArray(actData.scenes)) {
    console.log("Act data is already in the legacy array format");
    return actData;
  }

  let sceneMap = {};
  let actNumber = 1;

  // Check for the new simplified format: {scene1: {...}, scene2: {...}}
  if (Object.keys(actData).some((key) => key.startsWith("scene"))) {
    console.log("Act data is in the simplified scene map format");
    sceneMap = actData;
    // Attempt to extract act number from scene names if available
    const firstScene = Object.values(actData)[0] as any;
    if (firstScene && firstScene.name && typeof firstScene.name === "string") {
      const match = firstScene.name.match(/Act (\d+)/i);
      if (match && match[1]) {
        actNumber = parseInt(match[1]);
      }
    }
  }
  // Check for nested format: {act1: {scene1: {...}, scene2: {...}}}
  else {
    console.log("Act data is in the nested format with act wrapper");
    // Find the act key (e.g., "act1")
    const actKey = Object.keys(actData).find((key) => key.startsWith("act"));
    if (actKey) {
      actNumber = parseInt(actKey.replace("act", "")) || 1;
      sceneMap = actData[actKey] || {};
    } else {
      console.warn("No scene data found in the expected formats");
    }
  }

  // Convert the scene map to an array
  const scenes: Scene[] = Object.entries(sceneMap).map(
    ([sceneKey, sceneData]: [string, any]) => {
      // Use the scene key as the name (instead of any nested name property)
      // This simplifies scene navigation since we'll reference scenes by their key

      // Make sure the scene's 'next' properties in choices point to actual scene keys
      const choices =
        sceneData.choices &&
        sceneData.choices.map((choice: any) => {
          // Update any scene references to use the scene keys
          // No need to look up the name property anymore
          return {
            ...choice,
            // We'll use the scene keys directly in next/failNext fields, so no need to transform
          };
        });

      return {
        ...sceneData,
        name: sceneKey, // Use the scene key as the name
        choices: choices,
      };
    },
  );

  return {
    scenes,
    act: actNumber,
  };
}

// Dedicated component for handling scene backgrounds with fallbacks
interface SceneBackgroundProps {
  imageUrl: string;
  sceneId: string;
  isGenerated?: boolean;
}

function SceneBackground({
  imageUrl,
  sceneId,
  isGenerated = false,
}: SceneBackgroundProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  // const [actualUrl, setActualUrl] = useState('');

  // Fallback URL in case of loading failures - using data URI for guaranteed compatibility
  // const fallbackUrl = `data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%221024%22%20height%3D%22768%22%20viewBox%3D%220%200%201024%20768%22%3E%3Crect%20width%3D%22100%25%22%20height%3D%22100%25%22%20fill%3D%22%23000000%22%2F%3E%3C%2Fsvg%3E`;

  // Determine if the image source is an actual URL (data:, http:, etc.) vs just a text description
  // useEffect(() => {
    // Reset states when URL changes
    // setIsLoading(true);
    // setHasError(false);
    
    // Check if the imageUrl is actually a URL vs a text description
    // if (imageUrl && (imageUrl.startsWith('data:') || imageUrl.startsWith('http'))) {
    //   console.log(`Setting actual URL for scene ${sceneId}, source appears to be a valid URL`);
      // setActualUrl(imageUrl);
    // } else {
    //   // console.log(`Using fallback for scene ${sceneId}, source is not a valid URL: ${imageUrl?.slice(0, 30)}...`);
    //   // setActualUrl(fallbackUrl);
    //   // Mark as loaded but with error
    //   setIsLoading(false);
    //   setHasError(true);
    // }
  // }, [imageUrl]);

  const handleImageError = () => {
    console.error(`Image failed to load: ${imageUrl}`);
    // setHasError(true);
    setIsLoading(false);
    // Use fallback URL
    // setActualUrl(fallbackUrl);
  };

  const handleImageLoad = () => {
    console.log(`Image loaded successfully`);
    setIsLoading(false);
    setHasError(false);
  };

  return (
    <div
      className="w-full h-full absolute inset-0"
      style={{
        transition: "background-color 0.5s ease",
      }}
    >
      {/* Show placeholder immediately while image loads */}
      {/* <div className="absolute inset-0 flex items-center justify-center text-white">
        {isLoading && (
          <div className="text-center">
            <RefreshCw className="h-10 w-10 animate-spin mx-auto mb-2" />
            <p>Loading scene background...</p>
          </div>
        )}
      </div> */}

      {/* Actual image with appropriate handling */}
      <img
        key={`img-${imageUrl}`}
        src={imageUrl}
        alt={`Scene ${sceneId} Background`}
        className={cn(
          "w-full h-full object-cover transition-opacity duration-500",
          isLoading ? "opacity-0" : "opacity-100",
        )}
        style={{ position: "absolute", zIndex: 0 }}
        onLoad={handleImageLoad}
        onError={handleImageError}
      />

      {/* Debug info overlay */}
      {/* <div className="absolute bottom-4 right-4 bg-black bg-opacity-70 text-white px-3 py-1 rounded text-xs z-20">
        {isGenerated ? "Generated" : "Original"} | Scene: {sceneId}
        {hasError && " | Using fallback"}
      </div> */}
    </div>
  );
}

interface VnPlayerProps {
  actData: GeneratedAct;
  actNumber: number;
  onReturn: () => void;
  onRestart?: () => void; // Optional external restart handler
  mode: "generated" | "imported"; // Mode to determine initialization behavior
}

export function VnPlayer({
  actData: rawActData,
  actNumber,
  onReturn,
  onRestart: externalRestart,
  mode = "generated",
}: VnPlayerProps) {
  // Convert the actData to the format expected by the player using useMemo to prevent re-calculation on every render
  const actData = useMemo(() => convertActFormat(rawActData), [rawActData]);

  // Debug log the conversion
  useEffect(() => {
    if (rawActData) {
      console.log(
        "VN Player received data format:",
        Object.keys(rawActData).length > 0 && !Array.isArray(rawActData.scenes)
          ? "New nested format"
          : "Legacy array format",
      );
    }
  }, [rawActData]);
  const { playerData, updatePlayerData } = useVnContext();
  const { toast } = useToast(); // Initialize toast

  // Core scene and dialogue state
  const [currentSceneId, setCurrentSceneId] = useState("");
  const [currentScene, setCurrentScene] = useState<Scene | null>(null);
  const [currentDialogueIndex, setCurrentDialogueIndex] = useState(0);
  const [showChoices, setShowChoices] = useState(false);
  const [dialogueLog, setDialogueLog] = useState<
    Array<{ speaker: string; text: string }>
  >([]);
  const [clickableContent, setClickableContent] = useState(true);
  
  // Image generation toggle state with a reference to track changes
  const [imageGenerationEnabled, setImageGenerationEnabled] = useState(true);

  // Text animation state
  const [textSpeed, setTextSpeed] = useState<"slow" | "medium" | "fast">(
    "medium",
  );
  const [isTextAnimating, setIsTextAnimating] = useState(false);
  const [displayedText, setDisplayedText] = useState("");
  const textAnimationRef = useRef<number | null>(null);

  // Refs to prevent infinite render loops
  const containerRef = useRef<HTMLDivElement>(null);

  // TEXT ANIM
  const animateText = useCallback(
    (textContent: any) => {
      // Convert object to string if needed
      const text = typeof textContent === 'string'
        ? textContent
        : ((textContent as {text?: string})?.text || JSON.stringify(textContent));
        
      // Skip animation if text speed is set to fast
      if (textSpeed === "fast") {
        setDisplayedText(text);
        setIsTextAnimating(false);
        return;
      }

      // Clear any existing animation
      if (textAnimationRef.current) {
        window.cancelAnimationFrame(textAnimationRef.current);
      }

      // Start new animation
      setIsTextAnimating(true);
      let currentIndex = 0;
      const totalLength = text.length;

      // Determine speed in milliseconds per character
      const charDelay = textSpeed === "slow" ? 50 : 30; // slow = 50ms (faster than before), medium = 30ms
      let lastTimeStamp = 0;

      const animate = (timestamp: number) => {
        if (!lastTimeStamp) lastTimeStamp = timestamp;

        const elapsed = timestamp - lastTimeStamp;

        if (elapsed > charDelay) {
          // Add one character
          currentIndex++;
          lastTimeStamp = timestamp;

          // Update displayed text
          setDisplayedText(text.substring(0, currentIndex));

          // Check if we're done
          if (currentIndex >= totalLength) {
            setIsTextAnimating(false);
            textAnimationRef.current = null;
            return;
          }
        }

        // Continue animation
        textAnimationRef.current = window.requestAnimationFrame(animate);
      };

      // Start animation
      textAnimationRef.current = window.requestAnimationFrame(animate);
    },
    [textSpeed, mode],
  );

  // SKIP TEXT ANIM
  const skipTextAnimation = useCallback(() => {
    if (textAnimationRef.current) {
      window.cancelAnimationFrame(textAnimationRef.current);
      textAnimationRef.current = null;
    }

    if (currentScene && currentDialogueIndex < currentScene.dialogue.length) {
      const dialogueContent = currentScene.dialogue[currentDialogueIndex][1];
      
      // Handle case where dialogue content is an object instead of a string
      if (typeof dialogueContent === 'string') {
        setDisplayedText(dialogueContent);
      } else if (dialogueContent && typeof dialogueContent === 'object') {
        // Use the text property if it exists, otherwise stringify the object
        setDisplayedText((dialogueContent as {text?: string})?.text || JSON.stringify(dialogueContent));
      } else {
        // Fallback for any other case
        setDisplayedText(String(dialogueContent || ''));
      }
    }

    setIsTextAnimating(false);
  }, [currentScene, currentDialogueIndex]);

  // Use image generation hook - make sure to update when scene changes
  // State for image handling
  // const isGenerating = useRef(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageError, setError] = useState<string | null>(null);

  // IMAGE GEN
  const generateImage = useCallback(async () => {
    if (!currentScene || isGenerating || !imageGenerationEnabled || !currentScene?.image_prompt)
    {
      // alert((!currentScene).toString() + isGenerating.toString() + !imageGenerationEnabled.toString()+ (!currentScene?.image_prompt).toString())
      return
    }
    try {
      // Mark as generating
      setIsGenerating(true);

      // Check cache first
      const cachedUrl = ImageGenerator.getCachedImageUrl(currentScene.setting);

      if (cachedUrl) {
        console.log("Using cached image for scene:", currentScene.setting);
        setImageUrl(cachedUrl);
        setError(null);
        return;
      }

      // Generate new image if not cached
      console.log("Generating new image for scene:", currentScene.setting);
      // alert(JSON.stringify({name: currentScene.name, image_prompt: currentScene?.image_prompt || ''}))
      const result = await ImageGenerator.generateSceneBackground({name: currentScene.name, image_prompt: currentScene?.image_prompt || ''});

      if (result.url) {
        // Cache the new image
        ImageGenerator.setCachedImageUrl(currentScene.setting, result.url);
        // Update UI state
        setImageUrl(result.url);
        setError(null);
      }
    } catch (error) {
      console.error("Image generation error:", error);
      setError("Failed to generate image");
      toast({
        title: "Image Generation Failed",
        description: error as String,
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  }, [currentScene, imageGenerationEnabled, isGenerating]);

  //IMAGE GEN ON SCENE CHANGE
  useEffect(() => {
    console.log("Image generation effect triggered", {
      currentSceneId,
      imageGenerationEnabled,
      isGenerating: isGenerating,
    });
    if (currentScene && imageGenerationEnabled) 
    {
      console.log("Starting image generation for the current scene");
      generateImage()
    }
  }, [currentScene, imageGenerationEnabled]);

  // Listen for image generation toggle events from the player navbar
  useEffect(() => {
    const handleImageGenerationToggle = (e: CustomEvent) => {
      console.log("Image generation toggled:", e.detail);
      setImageGenerationEnabled(e.detail);
    };
    window.addEventListener("vnToggleImageGeneration", handleImageGenerationToggle as EventListener);
    return () => {
      window.removeEventListener("vnToggleImageGeneration", handleImageGenerationToggle as EventListener);
    };
  }, [currentScene, imageGenerationEnabled]);

  //FIRST SCENE INIT
  useEffect(() => {
    if (!actData?.scenes?.length ) return;
    
    ImageGenerator.clearImageCache()
    
    // Set initial scene
    const firstScene = actData.scenes[0];
    console.log(
      `Initializing VN Player (${mode} mode) with first scene:`,
      firstScene.name,
    );

    setCurrentScene(firstScene);
    setCurrentSceneId(firstScene.name);
    setCurrentDialogueIndex(0);
    setShowChoices(false);
    setDialogueLog([]);

    // Start text animation for the first dialogue line
    if (firstScene.dialogue && firstScene.dialogue.length > 0) {
      setDisplayedText(""); // Clear any previous text
      animateText(firstScene.dialogue[0][1]);
    }
  }, [actData, mode, animateText]);

  // Update current scene when scene ID changes
  useEffect(() => {
    if (!actData?.scenes || !currentSceneId) return;

    const scene = actData.scenes.find((s) => s.name === currentSceneId);
    if (scene) {
      setCurrentScene(scene);
      setCurrentDialogueIndex(0);
      setShowChoices(false);

      if (scene.dialogue && scene.dialogue.length > 0) {
        setDisplayedText("");
        animateText(scene.dialogue[0][1]);
      }
    }
  }, [
    actData,
    currentSceneId,
    animateText,
    mode,
    setCurrentScene,
    setCurrentDialogueIndex,
    setShowChoices,
    setDisplayedText,
  ]);

  // Handle restart
  const handleRestart = useCallback(() => {
    if (!actData?.scenes?.length) return;

    // Reset all the state
    setCurrentScene(actData.scenes[0]);
    setCurrentSceneId(actData.scenes[0].name);
    setCurrentDialogueIndex(0);
    setShowChoices(false);
    setDialogueLog([]);

    // Use animation for both modes now
    if (actData.scenes[0].dialogue && actData.scenes[0].dialogue.length > 0) {
      setDisplayedText(""); // Clear any previous text
      animateText(actData.scenes[0].dialogue[0][1]);
    }
  }, [
    actData,
    animateText,
    mode,
    setCurrentScene,
    setCurrentSceneId,
    setCurrentDialogueIndex,
    setShowChoices,
    setDialogueLog,
    setDisplayedText,
  ]);

  // Handle advancing to next dialogue or showing choices
  const advanceDialogue = useCallback(() => {
    if (!currentScene || !clickableContent) return;

    if (currentDialogueIndex < currentScene.dialogue.length - 1) {
      // Add current dialogue to log
      const [speaker, dialogueContent] = currentScene.dialogue[currentDialogueIndex];
      
      // Handle both string and object dialogue content
      let textToLog = '';
      if (typeof dialogueContent === 'string') {
        textToLog = dialogueContent;
      } else if (dialogueContent && typeof dialogueContent === 'object') {
        textToLog = (dialogueContent as {text?: string})?.text || JSON.stringify(dialogueContent);
      } else {
        textToLog = String(dialogueContent || '');
      }
      
      setDialogueLog((prev) => [...prev, { speaker, text: textToLog }]);

      // Advance to next dialogue line
      setCurrentDialogueIndex((prev) => prev + 1);

      // Use animation for both modes now
      setDisplayedText(""); // Clear any previous text
      if (currentScene.dialogue[currentDialogueIndex + 1]) {
        animateText(currentScene.dialogue[currentDialogueIndex + 1][1]);
      }
    } else {
      // Add final dialogue to log
      if (currentScene.dialogue.length > 0) {
        const [speaker, dialogueContent] = currentScene.dialogue[currentDialogueIndex];
        
        // Handle both string and object dialogue content
        let textToLog = '';
        if (typeof dialogueContent === 'string') {
          textToLog = dialogueContent;
        } else if (dialogueContent && typeof dialogueContent === 'object') {
          textToLog = (dialogueContent as {text?: string})?.text || JSON.stringify(dialogueContent);
        } else {
          textToLog = String(dialogueContent || '');
        }
        
        setDialogueLog((prev) => [...prev, { speaker, text: textToLog }]);
      }

      // Show choices if there are any, otherwise this is the end
      setShowChoices(true);
    }
  }, [currentScene, currentDialogueIndex, clickableContent, animateText, mode]);

  // Check if a choice's condition is met
  const checkConditionMet = useCallback(
    (choice: SceneChoice): boolean => {
      if (!choice.condition) return true;

      for (const [key, value] of Object.entries(choice.condition)) {
        // Find which category the key belongs to
        let currentValue = 0;

        if (key in playerData.relationships) {
          currentValue = playerData.relationships[key] || 0;
        } else if (key in playerData.inventory) {
          currentValue = playerData.inventory[key] || 0;
        } else if (key in playerData.skills) {
          currentValue = playerData.skills[key] || 0;
        }

        // If current value is less than required, condition is not met
        if (currentValue < value) {
          return false;
        }
      }

      return true;
    },
    [playerData],
  );

  // Handle choice selection
  const handleChoiceSelect = useCallback(
    (choice: SceneChoice) => {
      // Guard: if not clickable, do nothing
      if (!clickableContent) return;

      // Disable interactions during transition
      setClickableContent(false);

      // Check if there's a condition and if it's met
      const conditionMet = checkConditionMet(choice);

      // If condition not met and there's a failNext path, go to that scene
      if (!conditionMet && choice.failNext) {
        // No delay needed for failure path
        if (choice.failNext) {
          setCurrentSceneId(choice.failNext);
        }
        setClickableContent(true);
        return;
      }

      // Apply delta values to player data
      if (choice.delta) {
        const updatedRelationships: Record<string, number> = {};
        const updatedInventory: Record<string, number> = {};
        const updatedSkills: Record<string, number> = {};

        for (const [key, value] of Object.entries(choice.delta)) {
          // Determine which category this key belongs to
          if (playerData.relationships[key] !== undefined) {
            updatedRelationships[key] =
              (playerData.relationships[key] || 0) + value;
          } else if (playerData.inventory[key] !== undefined) {
            updatedInventory[key] = (playerData.inventory[key] || 0) + value;
          } else if (playerData.skills[key] !== undefined) {
            updatedSkills[key] = (playerData.skills[key] || 0) + value;
          } else {
            // Default to relationships if not found
            updatedRelationships[key] = value;
          }
        }

        updatePlayerData({
          relationships: updatedRelationships,
          inventory: updatedInventory,
          skills: updatedSkills,
        });
      }

      // Move to next scene immediately - no delay needed
      setCurrentSceneId(choice.next);
      setClickableContent(true);
    },
    [playerData, checkConditionMet, updatePlayerData, clickableContent],
  );

  // Handle content click to advance dialogue or skip animation
  const handleContentClick = useCallback(() => {
    if (isTextAnimating) {
      // If text is animating, skip to end
      skipTextAnimation();
    } else if (!showChoices) {
      // If not showing choices and not animating, advance dialogue
      advanceDialogue();
    }
  }, [showChoices, advanceDialogue, isTextAnimating, skipTextAnimation]);

  // Auto-scroll to keep the current dialogue visible
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [currentDialogueIndex, showChoices]);

  // Listen for text speed change events from the navbar
  useEffect(() => {
    const handleTextSpeedChange = (event: CustomEvent<number>) => {
      const speedValue = event.detail;
      console.log(
        `Text speed change event received: ${speedValue} in ${mode} mode`,
      );

      // Update text speed state
      if (speedValue === 1) {
        setTextSpeed("slow");
      } else if (speedValue === 5) {
        setTextSpeed("medium");
      } else if (speedValue === 10) {
        setTextSpeed("fast");
      }

      // For debugging - log current text state
      console.log(
        `Current animation state - isTextAnimating: ${isTextAnimating}`,
      );
    };

    window.addEventListener(
      "vnSetTextSpeed",
      handleTextSpeedChange as EventListener,
    );

    return () => {
      window.removeEventListener(
        "vnSetTextSpeed",
        handleTextSpeedChange as EventListener,
      );
    };
  }, [mode, isTextAnimating]);
  
  // Log current scene and image state for debugging
  useEffect(() => {
    if (currentScene) {
      console.log(
        `Current scene updated: ${currentScene.name}, image status:`,
        {
          imageUrl: imageUrl ? "Has URL" : "No URL",
          isGenerating,
          hasError: !!imageError,
        },
      );
    }
  }, [currentScene, imageUrl, isGenerating, imageError]);

  // Show loading while no scene is available
  if (!currentScene) {
    return (
      <div className="flex items-center justify-center h-screen">
        Loading {mode} story...
      </div>
    );
  }

  // Get current dialogue text (using either the animated display text or the full original text)
  const rawDialogueContent = currentScene?.dialogue[currentDialogueIndex]?.[1] || "";
  // Handle case where dialogue content is an object instead of a string
  const originalDialogueText = typeof rawDialogueContent === 'string' 
    ? rawDialogueContent 
    : ((rawDialogueContent as {text?: string})?.text || JSON.stringify(rawDialogueContent));
  const dialogueText = isTextAnimating ? displayedText : originalDialogueText;

  return (
    <div className="relative h-screen">
      <PlayerNavbar
        actNumber={actNumber}
        onRestart={() => {
          // Call local restart to reset scene state
          handleRestart();
          // Call external handler if provided to reset player data
          if (externalRestart) externalRestart();
        }}
        onReturn={onReturn}
        dialogueLog={dialogueLog}
      />

      <div className="vn-reader h-[calc(100vh-34px)] flex flex-col pt-[34px] relative">
        <div className="vn-image-area absolute inset-0 bg-neutral-800 flex items-center justify-center">
          {/* Setting name overlay */}
          <div className="absolute top-10 md:top-14 left-2 md:left-4 bg-black bg-opacity-70 text-white px-2 md:px-3 py-1 rounded text-xs md:text-sm z-30">
            {currentScene.setting}
          </div>

          {/* Image generation controls - Increased z-index to ensure it's clickable */}
          <div className="absolute top-10 md:top-24 right-2 md:right-4 flex space-x-2 z-20 gap-2">
            {/* Button: Use the hook's generateImage function */}
            {/* <Button
              variant="default"
              className="bg-blue-500 hover:bg-blue-700 active:bg-blue-800 cursor-pointer text-xs md:text-sm py-1 md:py-2 px-2 md:px-4"
              onClick={(e) => {
                // Stop propagation to prevent parent elements from capturing the click
                e.stopPropagation();
                console.log("Generate image button clicked - using direct method");
                generateImage()
              }}
              disabled={isGenerating || !imageGenerationEnabled}
              style={{ pointerEvents: "auto" }} // Ensure pointer events are enabled
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="h-3 w-3 md:h-4 md:w-4 animate-spin mr-1 md:mr-2" />
                  <span className="hidden sm:inline">Generating...</span>
                  <span className="sm:hidden">Gen...</span>
                </>
              ) : !imageGenerationEnabled ? (
                <>
                  <ImageIcon className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                  <span className="hidden sm:inline">Images Off</span>
                  <span className="sm:hidden">Off</span>
                </>
              ) : (
                <>
                  <ImageIcon className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                  <span className="hidden sm:inline">Regenerate</span>
                  <span className="sm:hidden">Image</span>
                </>
              )}
            </Button> */}
          </div>

          {/* Background image display with SceneBackground component */}
          {imageGenerationEnabled ? (
            imageUrl ? (
              // Display generated image when we have a URL
              <SceneBackground
                imageUrl={imageUrl}
                sceneId={currentScene.name}
                isGenerated={true}
              />
            ) : currentScene.image_prompt ? (
              // Display scene's existing background image
              <SceneBackground
                imageUrl={currentScene.image_prompt}
                sceneId={currentScene.name}
                isGenerated={false}
              />
            ) : (
              // Display placeholder when no image is available
              <div className="text-white text-center z-0">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="mx-auto h-16 w-16 mb-2"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <p>No image available</p>
                <p className="text-sm text-neutral-400 mt-1">
                  {imageError ? `Error: ${imageError}` : isGenerating ? "Generating image..." : "Click 'Regenerate' to create an image"}
                </p>
              </div>
            )
          ) : (
            // When image generation is disabled, show disabled message
            <div className="text-white text-center z-0">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="mx-auto h-16 w-16 mb-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <p>Images are disabled</p>
              <p className="text-sm text-neutral-400 mt-1">
                Toggle images on in the navbar settings
              </p>
            </div>
          )}

          {/* Loading overlay */}
          {isGenerating && (
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-10">
              <div className="text-white text-center">
                <RefreshCw className="h-12 w-12 animate-spin mx-auto mb-4" />
                <p className="text-xl">Generating Image</p>
                <p className="text-sm opacity-75 mt-2"></p>
              </div>
            </div>
          )}
        </div>

        <div
          ref={containerRef}
          className="vn-text-area h-[40%] sm:h-[35%] bg-black/75 sm:bg-black/60 text-white p-3 sm:p-4 md:p-5 absolute bottom-0 left-0 right-0 overflow-y-auto z-10"
          onClick={handleContentClick}
        >
          {/* Dialogue text */}
          {currentScene.dialogue.length > 0 &&
            currentDialogueIndex < currentScene.dialogue.length && (
              <div className="vn-dialogue">
                <p className="character-name text-primary-300 font-semibold mb-1 sm:mb-2 text-sm sm:text-base md:text-lg">
                  {currentScene.dialogue[currentDialogueIndex][0]}
                </p>
                <p className="text-white text-sm sm:text-base md:text-lg whitespace-pre-line font-dialogue">
                  {typeof dialogueText === 'string' ? dialogueText : JSON.stringify(dialogueText)}
                </p>
              </div>
            )}

          {/* Choices */}
          {showChoices &&
            currentScene.choices &&
            Array.isArray(currentScene.choices) &&
            currentScene.choices.length > 0 && (
              <div
                className={cn(
                  "vn-choices mt-4 sm:mt-6 md:mt-8 animate-fadeIn",
                  "w-full mx-auto px-2 sm:px-4", // Set width and center the choices container
                  // Apply different max widths based on number of choices
                  currentScene.choices && currentScene.choices.length <= 2
                    ? "max-w-3xl"
                    : "max-w-4xl",
                  // Apply different layouts based on number of choices
                  currentScene.choices && currentScene.choices.length <= 2
                    ? "flex flex-col sm:grid sm:grid-cols-1 gap-3 sm:gap-4"
                    : "grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3",
                  !clickableContent && "opacity-50 pointer-events-none",
                )}
              >
                {currentScene.choices.map((choice, index) => {
                  // Check if this choice has a condition and if it's met
                  const hasCondition = !!choice.condition;
                  const conditionMet = checkConditionMet(choice);

                  return (
                    <Button
                      key={index}
                      variant="outline"
                      className={cn(
                        // Adjust padding based on number of choices
                        currentScene.choices && currentScene.choices.length <= 2
                          ? "px-3 py-3 md:px-5 md:py-4 rounded-md text-center transition-colors h-auto relative w-full text-sm md:text-base"
                          : "px-2 py-2 md:px-3 md:py-3 rounded-md text-center transition-colors h-auto relative w-full text-xs sm:text-sm md:text-base",
                        // Animation with staggered delay based on index
                        "animate-fadeInUp",
                        // Apply staggered animation delay based on index
                        index === 0 ? "animation-delay-0" :
                        index === 1 ? "animation-delay-100" :
                        index === 2 ? "animation-delay-200" :
                        "animation-delay-300",
                        // Base style for all buttons
                        "bg-neutral-800 text-white border-neutral-600",
                        // Add hover effect only when not showing condition colors
                        !hasCondition &&
                          "hover:bg-primary/70 hover:border-primary",
                        // Condition-specific styles with more opacity for visibility
                        hasCondition &&
                          !conditionMet &&
                          "bg-red-900/30 border-red-700/70 hover:bg-red-900/50",
                        hasCondition &&
                          conditionMet &&
                          "bg-green-900/30 border-green-700/70 hover:bg-green-900/50",
                      )}
                      onClick={() => {
                        if (clickableContent) {
                          handleChoiceSelect(choice);
                        }
                      }}
                      disabled={!clickableContent} // Disable when not clickable
                    >
                      {/* Indicator for choices with conditions */}
                      {hasCondition && (
                        <span
                          className={cn(
                            "absolute top-1 right-1 md:top-2 md:right-2 flex items-center justify-center",
                            "w-3 h-3 md:w-4 md:h-4 rounded-full border",
                            conditionMet
                              ? "bg-green-600 border-green-400"
                              : "bg-red-600 border-red-400",
                          )}
                        />
                      )}
                      <div className="flex flex-col items-center w-full overflow-hidden">
                        {/* Main choice text */}
                        <div className="text-center whitespace-normal break-words text-xs sm:text-sm md:text-base w-full max-w-full">
                          {choice.text || `Option ${index + 1}`}
                        </div>

                        {/* Description text (if present) */}
                        {choice.description && (
                          <div className={cn(
                            "italic text-center whitespace-normal break-words w-full font-dialogue overflow-hidden text-ellipsis",
                            "text-neutral-400 mt-1",
                            // Adjust text size based on number of choices
                            currentScene.choices && currentScene.choices.length <= 2
                              ? "text-xs md:text-sm" 
                              : "text-[0.65rem] sm:text-xs"
                          )}>
                            {choice.description}
                          </div>
                        )}
                      </div>
                    </Button>
                  );
                })}
              </div>
            )}

          {/* Bounce indicator for continuing dialogue */}
          {!showChoices &&
            currentScene.dialogue.length > 0 &&
            !isTextAnimating && (
              <div className="absolute bottom-4 right-4 animate-bounce text-white">
                <ChevronDown className="h-6 w-6" />
              </div>
            )}

          {/* End of act - show return button when at the final scene with no more choices */}
          {currentScene.choices === null &&
            currentDialogueIndex >= currentScene.dialogue.length - 1 && (
              <div className="mt-8 text-center">
                <Button onClick={onReturn} className="mx-auto">
                  {mode === "imported"
                    ? "Return to Selection Screen"
                    : "Return to Generation Screen"}
                </Button>
              </div>
            )}
        </div>
      </div>
    </div>
  );
}
