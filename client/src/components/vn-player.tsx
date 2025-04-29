import { useState, useEffect, useRef, useCallback } from "react";
import { useVnContext } from "@/context/vn-context";
import { cn } from "@/lib/utils";
import { PlayerNavbar } from "@/components/player-navbar";
import { Button } from "@/components/ui/button";
import { ChevronDown, ImageIcon, RefreshCw } from "lucide-react";
import { Scene, SceneChoice, GeneratedAct } from "@/types/vn";
import { useImageGeneration } from "@/hooks/use-image-generation";
import { setCachedImageUrl } from "@/lib/image-generator";
import { useToast } from "@/hooks/use-toast";

// Dedicated component for handling scene backgrounds with fallbacks
interface SceneBackgroundProps {
  imageUrl: string;
  sceneId: string;
  isGenerated?: boolean;
}

function SceneBackground({ imageUrl, sceneId, isGenerated = false }: SceneBackgroundProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [actualUrl, setActualUrl] = useState(imageUrl);
  
  // Fallback URL in case of loading failures
  const fallbackUrl = "https://via.placeholder.com/1024x768/333333/ffffff?text=Scene+Background";
  
  useEffect(() => {
    // Reset states when URL changes
    setIsLoading(true);
    setHasError(false);
    setActualUrl(imageUrl);
  }, [imageUrl]);
  
  // Generate a color from the scene ID for consistent display when needed
  const getSceneColor = (id: string) => {
    // Generate a consistent color based on scene ID
    const hash = Array.from(id).reduce((acc, char) => char.charCodeAt(0) + acc, 0);
    const hue = hash % 360;
    return `hsl(${hue}, 70%, 40%)`;
  };
  
  const handleImageError = () => {
    console.error(`Image failed to load: ${imageUrl}`);
    setHasError(true);
    setIsLoading(false);
    // Use fallback URL
    setActualUrl(fallbackUrl);
  };
  
  const handleImageLoad = () => {
    console.log(`Image loaded successfully: ${imageUrl}`);
    setIsLoading(false);
    setHasError(false);
  };
  
  return (
    <div 
      className="w-full h-full absolute inset-0" 
      style={{ 
        backgroundColor: getSceneColor(sceneId),
        transition: 'background-color 0.5s ease'
      }}
    >
      {/* Show placeholder immediately while image loads */}
      <div className="absolute inset-0 flex items-center justify-center text-white">
        {isLoading && (
          <div className="text-center">
            <RefreshCw className="h-10 w-10 animate-spin mx-auto mb-2" />
            <p>Loading scene background...</p>
          </div>
        )}
      </div>
      
      {/* Actual image with appropriate handling */}
      <img 
        key={`img-${actualUrl}`}
        src={actualUrl} 
        alt={`Scene ${sceneId} Background`}
        className={cn(
          "w-full h-full object-cover transition-opacity duration-500",
          isLoading ? "opacity-0" : "opacity-100"
        )}
        style={{ position: 'absolute', zIndex: 0 }}
        onLoad={handleImageLoad}
        onError={handleImageError}
      />
      
      {/* Debug info overlay */}
      <div className="absolute bottom-4 right-4 bg-black bg-opacity-70 text-white px-3 py-1 rounded text-xs z-20">
        {isGenerated ? "Generated" : "Original"} | Scene: {sceneId}
        {hasError && " | Using fallback"}
      </div>
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
  actData, 
  actNumber, 
  onReturn, 
  onRestart: externalRestart,
  mode = "generated" 
}: VnPlayerProps) {
  const { playerData, updatePlayerData } = useVnContext();
  const { toast } = useToast(); // Initialize toast
  
  // Core scene and dialogue state
  const [currentSceneId, setCurrentSceneId] = useState("");
  const [currentScene, setCurrentScene] = useState<Scene | null>(null);
  const [currentDialogueIndex, setCurrentDialogueIndex] = useState(0);
  const [showChoices, setShowChoices] = useState(false);
  const [dialogueLog, setDialogueLog] = useState<Array<{speaker: string, text: string}>>([]);
  const [clickableContent, setClickableContent] = useState(true);
  
  // Text animation state
  const [textSpeed, setTextSpeed] = useState<'slow' | 'medium' | 'fast'>('fast');
  const [isTextAnimating, setIsTextAnimating] = useState(false);
  const [displayedText, setDisplayedText] = useState("");
  const textAnimationRef = useRef<number | null>(null);
  
  // Refs to prevent infinite render loops
  const containerRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);
  
  // Text animation function
  const animateText = useCallback((text: string) => {
    // Skip animation if text speed is set to fast
    if (textSpeed === 'fast') {
      setDisplayedText(text);
      setIsTextAnimating(false);
      return;
    }
    
    // We've enabled animations for imported stories too, removing the exception
    
    // Clear any existing animation
    if (textAnimationRef.current) {
      window.cancelAnimationFrame(textAnimationRef.current);
    }
    
    // Start new animation
    setIsTextAnimating(true);
    let currentIndex = 0;
    const totalLength = text.length;
    
    // Determine speed in milliseconds per character
    const charDelay = textSpeed === 'slow' ? 50 : 30; // slow = 50ms (faster than before), medium = 30ms
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
  }, [textSpeed, mode]);
  
  // Skip text animation
  const skipTextAnimation = useCallback(() => {
    if (textAnimationRef.current) {
      window.cancelAnimationFrame(textAnimationRef.current);
      textAnimationRef.current = null;
    }
    
    if (currentScene && currentDialogueIndex < currentScene.dialogue.length) {
      setDisplayedText(currentScene.dialogue[currentDialogueIndex][1]);
    }
    
    setIsTextAnimating(false);
  }, [currentScene, currentDialogueIndex]);
  
  // Process scenes to fix imported data issues and add end-of-act messages
  const processScene = useCallback((scene: Scene): Scene => {
    // Make a deep copy to avoid mutating the original
    const processed = JSON.parse(JSON.stringify(scene));
    
    // Fix choices that are string "null" instead of null
    if (processed.choices === "null") {
      processed.choices = null;
    }
    
    // Fix non-array choices
    if (processed.choices && !Array.isArray(processed.choices)) {
      processed.choices = null;
    }
    
    // Add end of act message to the final scene
    if (processed.choices === null && processed.dialogue?.length > 0) {
      const lastIndex = processed.dialogue.length - 1;
      const [speaker, text] = processed.dialogue[lastIndex];
      processed.dialogue[lastIndex] = [speaker, `${text}\n\n(End of Act ${actNumber})`];
    }
    
    return processed;
  }, [actNumber]);
  
  // Initialize scenes separately for generated and imported modes to avoid recursion issues
  // This initialization is only for generated mode
  useEffect(() => {
    if (mode !== 'generated' || !actData?.scenes?.length || initialized.current) return;
    
    // Mark as initialized to prevent re-initialization
    initialized.current = true;
    
    // Set initial scene
    const firstScene = processScene(actData.scenes[0]);
    console.log(`Initializing VN Player (${mode} mode) with first scene:`, firstScene.id);
    
    setCurrentScene(firstScene);
    setCurrentSceneId(firstScene.id);
    setCurrentDialogueIndex(0);
    setShowChoices(false);
    setDialogueLog([]);
    
    // Start text animation for the first dialogue line
    if (firstScene.dialogue && firstScene.dialogue.length > 0) {
      setDisplayedText(""); // Clear any previous text
      animateText(firstScene.dialogue[0][1]);
    }
  }, [actData, processScene, animateText, mode]);
  
  // Separate initialization for imported mode
  useEffect(() => {
    if (mode !== 'imported' || !actData?.scenes?.length || initialized.current) return;
    
    // Mark as initialized to prevent re-initialization
    initialized.current = true;
    
    // Set initial scene - using direct JSON copy to avoid any reference issues
    const firstSceneRaw = JSON.parse(JSON.stringify(actData.scenes[0]));
    const firstScene = processScene(firstSceneRaw);
    console.log(`Initializing VN Player (${mode} mode) with first scene:`, firstScene.id);
    
    // Set all initial state directly (without animation)
    setCurrentScene(firstScene);
    setCurrentSceneId(firstScene.id);
    setCurrentDialogueIndex(0);
    setShowChoices(false);
    setDialogueLog([]);
    
    // For imported mode, now using animation like generated mode
    if (firstScene.dialogue && firstScene.dialogue.length > 0) {
      setDisplayedText(""); // Clear any previous text
      animateText(firstScene.dialogue[0][1]);
    }
  }, [actData, processScene, mode]);
  
  // Update current scene when scene ID changes - for generated mode
  useEffect(() => {
    if (mode !== 'generated' || !actData?.scenes || !currentSceneId) return;
    
    const scene = actData.scenes.find(s => s.id === currentSceneId);
    if (scene) {
      const processedScene = processScene(scene);
      setCurrentScene(processedScene);
      setCurrentDialogueIndex(0);
      setShowChoices(false);
      
      // Start text animation for the first dialogue line
      if (processedScene.dialogue && processedScene.dialogue.length > 0) {
        setDisplayedText(""); // Clear any previous text
        animateText(processedScene.dialogue[0][1]);
      }
    }
  }, [actData, currentSceneId, processScene, animateText, mode]);
  
  // Update current scene when scene ID changes - for imported mode (no animation)
  useEffect(() => {
    if (mode !== 'imported' || !actData?.scenes || !currentSceneId) return;
    
    const scene = actData.scenes.find(s => s.id === currentSceneId);
    if (scene) {
      // Use deep copy to prevent any reference issues
      const sceneCopy = JSON.parse(JSON.stringify(scene));
      const processedScene = processScene(sceneCopy);
      
      setCurrentScene(processedScene);
      setCurrentDialogueIndex(0);
      setShowChoices(false);
      
      // For imported mode, now using animation like generated mode
      if (processedScene.dialogue && processedScene.dialogue.length > 0) {
        setDisplayedText(""); // Clear any previous text
        animateText(processedScene.dialogue[0][1]);
      }
    }
  }, [actData, currentSceneId, processScene, mode]);
  
  // Handle restart
  const handleRestart = useCallback(() => {
    if (!actData?.scenes?.length) return;
    
    // Reset to first scene - using deep copy to avoid reference issues
    const firstSceneRaw = JSON.parse(JSON.stringify(actData.scenes[0]));
    const firstScene = processScene(firstSceneRaw);
    
    // Reset all the state
    setCurrentScene(firstScene);
    setCurrentSceneId(firstScene.id);
    setCurrentDialogueIndex(0);
    setShowChoices(false);
    setDialogueLog([]);
    
    // Use animation for both modes now
    if (firstScene.dialogue && firstScene.dialogue.length > 0) {
      setDisplayedText(""); // Clear any previous text
      animateText(firstScene.dialogue[0][1]);
    }
  }, [actData, processScene, animateText, mode]);
  
  // Handle advancing to next dialogue or showing choices
  const advanceDialogue = useCallback(() => {
    if (!currentScene || !clickableContent) return;
    
    if (currentDialogueIndex < currentScene.dialogue.length - 1) {
      // Add current dialogue to log
      const [speaker, text] = currentScene.dialogue[currentDialogueIndex];
      setDialogueLog(prev => [...prev, { speaker, text }]);
      
      // Advance to next dialogue line
      setCurrentDialogueIndex(prev => prev + 1);
      
      // Use animation for both modes now
      setDisplayedText(""); // Clear any previous text
      if (currentScene.dialogue[currentDialogueIndex + 1]) {
        animateText(currentScene.dialogue[currentDialogueIndex + 1][1]);
      }
    } else {
      // Add final dialogue to log
      if (currentScene.dialogue.length > 0) {
        const [speaker, text] = currentScene.dialogue[currentDialogueIndex];
        setDialogueLog(prev => [...prev, { speaker, text }]);
      }
      
      // Show choices if there are any, otherwise this is the end
      setShowChoices(true);
    }
  }, [currentScene, currentDialogueIndex, clickableContent, animateText, mode]);
  
  // Check if a choice's condition is met
  const checkConditionMet = useCallback((choice: SceneChoice): boolean => {
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
  }, [playerData]);
  
  // Handle choice selection
  const handleChoiceSelect = useCallback((choice: SceneChoice) => {
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
          updatedRelationships[key] = (playerData.relationships[key] || 0) + value;
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
  }, [playerData, checkConditionMet, updatePlayerData, clickableContent]);
  
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
      console.log(`Text speed change event received: ${speedValue} in ${mode} mode`);
      
      // Update text speed state
      if (speedValue === 1) {
        setTextSpeed('slow');
      } else if (speedValue === 5) {
        setTextSpeed('medium');
      } else if (speedValue === 10) {
        setTextSpeed('fast');
      }
      
      // For debugging - log current text state
      console.log(`Current animation state - isTextAnimating: ${isTextAnimating}`);
    };
    
    window.addEventListener('vnSetTextSpeed', handleTextSpeedChange as EventListener);
    
    return () => {
      window.removeEventListener('vnSetTextSpeed', handleTextSpeedChange as EventListener);
    };
  }, [mode, isTextAnimating]);
  
  // Use image generation hook - make sure to update when scene changes
  const theme = actData?.meta?.theme || "";
  const { 
    imageUrl, 
    isGenerating, 
    error: imageError, 
    generateImage 
  } = useImageGeneration(currentScene, theme, {
    autoGenerate: false,
    debug: true,
    generationDelay: 100, // Reduced delay for testing
  });
  
  // Log current scene and image state for debugging
  useEffect(() => {
    if (currentScene) {
      console.log(`Current scene updated: ${currentScene.id}, image status:`, {
        imageUrl: imageUrl ? "Has URL" : "No URL", 
        isGenerating, 
        hasError: !!imageError
      });
    }
  }, [currentScene, imageUrl, isGenerating, imageError]);
  
  // Text speed controls removed - now only using the ones in the options menu
  
  // Show loading while no scene is available
  if (!currentScene) {
    return <div className="flex items-center justify-center h-screen">Loading {mode} story...</div>;
  }
  
  // Get current dialogue text (using either the animated display text or the full original text)
  const originalDialogueText = currentScene?.dialogue[currentDialogueIndex]?.[1] || "";
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
      
      <div className="vn-reader h-[calc(100vh-34px)] flex flex-col pt-[34px]">
        <div className="vn-image-area h-[65%] bg-neutral-800 flex items-center justify-center relative">
          {/* Setting name overlay */}
          <div className="absolute top-4 left-4 bg-black bg-opacity-70 text-white px-3 py-1 rounded text-sm">
            {currentScene.setting}
          </div>
          
          {/* Image generation controls - Increased z-index to ensure it's clickable */}
          <div className="absolute top-4 right-4 flex space-x-2 z-20">
            {/* Button: Use the hook's generateImage function */}
            <Button
              variant="default"
              className="bg-blue-500 hover:bg-blue-700 active:bg-blue-800 cursor-pointer"
              onClick={(e) => {
                // Stop propagation to prevent parent elements from capturing the click
                e.stopPropagation();
                console.log('Generate image button clicked - using hook');
                // Force true to regenerate even if cached
                generateImage(true);
              }}
              disabled={isGenerating}
              style={{ pointerEvents: 'auto' }} // Ensure pointer events are enabled
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <ImageIcon className="h-4 w-4 mr-2" />
                  <span>Generate Image</span>
                </>
              )}
            </Button>
            
            {/* Button: Test OpenAI connection */}
            <Button
              variant="outline"
              className="ml-2 bg-green-500 text-white hover:bg-green-700 active:bg-green-800 cursor-pointer"
              onClick={(e) => {
                // Stop propagation to prevent parent elements from capturing the click
                e.stopPropagation();
                console.log('Testing OpenAI connection');
                
                fetch('/api/test/openai')
                  .then(response => response.json())
                  .then(data => {
                    console.log('OpenAI test result:', data);
                    toast({
                      title: `OpenAI Connection: ${data.success ? 'SUCCESS' : 'FAILED'}`,
                      description: data.message,
                      variant: data.success ? "default" : "destructive",
                    });
                  })
                  .catch(error => {
                    console.error('Test Error:', error);
                    toast({
                      title: "Connection Test Failed",
                      description: error instanceof Error ? error.message : "Unknown error",
                      variant: "destructive",
                    });
                  });
              }}
              style={{ pointerEvents: 'auto' }} // Ensure pointer events are enabled
            >
              Test OpenAI
            </Button>
            
            {/* Button: Test DALL-E API */}
            <Button
              variant="outline"
              className="ml-2 bg-purple-500 text-white hover:bg-purple-700 active:bg-purple-800 cursor-pointer"
              onClick={(e) => {
                // Stop propagation to prevent parent elements from capturing the click
                e.stopPropagation();
                console.log('Testing DALL-E API');
                
                toast({
                  title: "Testing DALL-E API",
                  description: "Checking if DALL-E image generation is working...",
                });
                
                fetch('/api/test/dalle')
                  .then(response => response.json())
                  .then(data => {
                    console.log('DALL-E test result:', data);
                    if (data.success) {
                      toast({
                        title: "DALL-E API Success",
                        description: data.message,
                        variant: "default",
                      });
                      
                      // Show the test image if one was returned
                      if (data.url) {
                        // Open the image in a new window
                        window.open(data.url, '_blank');
                      }
                    } else {
                      toast({
                        title: "DALL-E API Failed",
                        description: data.message,
                        variant: "destructive",
                      });
                    }
                  })
                  .catch(error => {
                    console.error('DALL-E Test Error:', error);
                    toast({
                      title: "DALL-E Test Failed",
                      description: error instanceof Error ? error.message : "Unknown error",
                      variant: "destructive",
                    });
                  });
              }}
              style={{ pointerEvents: 'auto' }} // Ensure pointer events are enabled
            >
              Test DALL-E
            </Button>
          </div>
          
          {/* Background image display with SceneBackground component */}
          {imageUrl ? (
            // Display generated image with reliable placeholder fallback
            <SceneBackground 
              imageUrl={imageUrl} 
              sceneId={currentScene.id}
              isGenerated={true}
            />
          ) : currentScene.bg ? (
            // Display scene's existing background image
            <SceneBackground 
              imageUrl={currentScene.bg} 
              sceneId={currentScene.id}
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
              <p>No background image available</p>
              <p className="text-sm text-neutral-400 mt-1">
                {imageError ? `Error: ${imageError}` : "Click 'Generate Image' to create one"}
              </p>
            </div>
          )}
          
          {/* Loading overlay */}
          {isGenerating && (
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-10">
              <div className="text-white text-center">
                <RefreshCw className="h-12 w-12 animate-spin mx-auto mb-4" />
                <p className="text-xl">Generating Image...</p>
                <p className="text-sm opacity-75 mt-2">Please wait while DALL-E creates a background for this scene</p>
              </div>
            </div>
          )}
        </div>
        
        <div 
          ref={containerRef}
          className="vn-text-area h-[35%] bg-neutral-800 bg-opacity-90 text-white p-5 relative overflow-y-auto"
          onClick={handleContentClick}
        >
          {/* Dialogue text */}
          {currentScene.dialogue.length > 0 && currentDialogueIndex < currentScene.dialogue.length && (
            <div className="vn-dialogue">
              <p className="character-name text-primary-300 font-semibold mb-2">
                {currentScene.dialogue[currentDialogueIndex][0]}
              </p>
              <p className="text-white text-lg whitespace-pre-line">
                {dialogueText}
              </p>
            </div>
          )}
          
          {/* Choices */}
          {showChoices && currentScene.choices && Array.isArray(currentScene.choices) && currentScene.choices.length > 0 && (
            <div className={cn(
              "vn-choices mt-8 grid grid-cols-1 md:grid-cols-2 gap-3",
              !clickableContent && "opacity-50 pointer-events-none"
            )}>
              {currentScene.choices.map((choice, index) => {
                // Check if this choice has a condition and if it's met
                const hasCondition = !!choice.condition;
                const conditionMet = checkConditionMet(choice);
                
                return (
                  <Button
                    key={index}
                    variant="outline"
                    className={cn(
                      "px-4 py-3 rounded-md text-center transition-colors h-auto relative w-full",
                      // Base style for all buttons
                      "bg-neutral-800 text-white border-neutral-600",
                      // Add hover effect only when not showing condition colors
                      !hasCondition && "hover:bg-primary/70 hover:border-primary",
                      // Condition-specific styles with more opacity for visibility
                      hasCondition && !conditionMet && "bg-red-900/30 border-red-700/70 hover:bg-red-900/50",
                      hasCondition && conditionMet && "bg-green-900/30 border-green-700/70 hover:bg-green-900/50"
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
                      <span className={cn(
                        "absolute top-2 right-2 flex items-center justify-center",
                        "w-4 h-4 rounded-full border",
                        conditionMet 
                          ? "bg-green-600 border-green-400" 
                          : "bg-red-600 border-red-400"
                      )} />
                    )}
                    <div className="flex flex-col items-center">
                      {/* Main choice text */}
                      <div className="text-center break-words">{choice.text || `Option ${index + 1}`}</div>
                      
                      {/* Description text (if present) */}
                      {choice.description && (
                        <div className="text-sm text-neutral-400 mt-1 italic text-center break-words max-w-full">
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
          {!showChoices && currentScene.dialogue.length > 0 && !isTextAnimating && (
            <div className="absolute bottom-4 right-4 animate-bounce text-white">
              <ChevronDown className="h-6 w-6" />
            </div>
          )}
          
          {/* End of act - show return button when at the final scene with no more choices */}
          {currentScene.choices === null && currentDialogueIndex >= currentScene.dialogue.length - 1 && (
            <div className="mt-8 text-center">
              <Button onClick={onReturn} className="mx-auto">
                {mode === "imported" ? "Return to Selection Screen" : "Return to Generation Screen"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}