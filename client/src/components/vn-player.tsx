import { useState, useEffect, useRef, useCallback } from "react";
import { useVnContext } from "@/context/vn-context";
import { cn } from "@/lib/utils";
import { PlayerNavbar } from "@/components/player-navbar";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ChevronDown, Settings2 } from "lucide-react";
import { Scene, SceneChoice, GeneratedAct } from "@/types/vn";

// Using GeneratedAct from types now

interface VnPlayerProps {
  actData: GeneratedAct;
  actNumber: number;
  onReturn: () => void;
}

export function VnPlayer({ actData, actNumber, onReturn }: VnPlayerProps) {
  const { playerData, updatePlayerData } = useVnContext();
  const [currentSceneId, setCurrentSceneId] = useState("");
  const [currentScene, setCurrentScene] = useState<Scene | null>(null);
  const [currentDialogueIndex, setCurrentDialogueIndex] = useState(0);
  const [showChoices, setShowChoices] = useState(false);
  const [dialogueLog, setDialogueLog] = useState<Array<{speaker: string, text: string}>>([]);
  const [clickableContent, setClickableContent] = useState(true);
  
  // Text animation states
  const [textSpeed, setTextSpeed] = useState(50); // 0-100 scale (0: slow, 100: instant)
  const [displayedText, setDisplayedText] = useState("");
  const [isTextFullyTyped, setIsTextFullyTyped] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const dialogueText = currentScene?.dialogue[currentDialogueIndex]?.[1] || "";
  
  // Add end of act message to the last scene
  const processScene = (scene: Scene): Scene => {
    // Deep clone the scene to avoid mutating the original data
    const processedScene = JSON.parse(JSON.stringify(scene));
    
    // If this is the last scene with no choices (end of act), append end of act message
    const isLastScene = processedScene.choices === null;
    if (isLastScene && processedScene.dialogue.length > 0) {
      // Add the "End of Act" message to the last dialogue line
      const lastDialogueIndex = processedScene.dialogue.length - 1;
      const [speaker, text] = processedScene.dialogue[lastDialogueIndex];
      processedScene.dialogue[lastDialogueIndex] = [speaker, `${text}\n\n(End of Act ${actNumber})`];
    }
    
    return processedScene;
  };
  
  // Memoize the processScene function to avoid recreating it on every render
  const memoizedProcessScene = useCallback(processScene, [actNumber]);
  
  // Initialize with the first scene once on mount or when actData changes
  useEffect(() => {
    console.log("VnPlayer: actData changed, initializing first scene");
    
    if (actData?.scenes?.length > 0) {
      // Always reset scene ID when actData changes to force reinitialization
      const firstScene = memoizedProcessScene(actData.scenes[0]);
      
      // Important: Reset all state at once to prevent partial updates
      setCurrentSceneId(firstScene.id);
      setCurrentDialogueIndex(0);
      setShowChoices(false);
      setDialogueLog([]);
      setDisplayedText("");
      setIsTextFullyTyped(false);
    }
  }, [actData, memoizedProcessScene]); // Remove currentSceneId dependency to avoid loops
  
  // Update current scene when scene ID changes
  useEffect(() => {
    if (!actData?.scenes || !currentSceneId) return;
    
    console.log("VnPlayer: Scene ID changed to", currentSceneId);
    
    const scene = actData.scenes.find(s => s.id === currentSceneId);
    if (scene) {
      console.log("VnPlayer: Found scene with ID", currentSceneId);
      
      const processedScene = memoizedProcessScene(scene);
      setCurrentScene(processedScene);
      setCurrentDialogueIndex(0);
      setShowChoices(false);
    } else {
      console.error("VnPlayer: Scene not found with ID", currentSceneId);
    }
  }, [actData, currentSceneId, memoizedProcessScene]);
  
  // Handle restart
  const handleRestart = useCallback(() => {
    if (actData?.scenes?.length > 0) {
      // Simply reset the currentSceneId to trigger the scene loading effect
      setCurrentSceneId(""); // Clear scene ID first
      
      // Use setTimeout to ensure state updates are processed before setting the new ID
      setTimeout(() => {
        const firstScene = memoizedProcessScene(actData.scenes[0]);
        setCurrentSceneId(firstScene.id); // This will trigger the scene loading effect
        setDialogueLog([]);
      }, 0);
    }
  }, [actData, memoizedProcessScene]);
  
  // Handle advancing the dialogue
  const advanceDialogue = useCallback(() => {
    if (!currentScene || !clickableContent) return;
    
    if (currentDialogueIndex < currentScene.dialogue.length - 1) {
      // Add current dialogue to log
      const [speaker, text] = currentScene.dialogue[currentDialogueIndex];
      setDialogueLog(prev => [...prev, { speaker, text }]);
      
      // Advance to next dialogue line
      setCurrentDialogueIndex(prev => prev + 1);
    } else {
      // Add final dialogue to log
      if (currentScene.dialogue.length > 0) {
        const [speaker, text] = currentScene.dialogue[currentDialogueIndex];
        setDialogueLog(prev => [...prev, { speaker, text }]);
      }
      
      // Show choices if there are any, otherwise this is the end
      if (currentScene.choices && currentScene.choices.length > 0) {
        setShowChoices(true);
      } else {
        // This ensures the "End of Act" message is visible when there are no choices
        setShowChoices(true);
      }
    }
  }, [currentScene, currentDialogueIndex, clickableContent]);
  
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
    // Check if there's a condition and if it's met
    const conditionMet = checkConditionMet(choice);
    
    // If condition not met and there's a failNext path, go to that scene
    if (!conditionMet && choice.failNext) {
      // Add a tiny visual feedback that the condition failed (optional)
      setClickableContent(false);
      setTimeout(() => {
        // Make sure failNext is a valid string before setting it as the current scene ID
        if (choice.failNext) {
          setCurrentSceneId(choice.failNext);
        }
        setClickableContent(true);
      }, 300);
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
    
    // Move to the next scene
    setCurrentSceneId(choice.next);
  }, [playerData, checkConditionMet, updatePlayerData]);
  
  // Typewriter effect for text animation
  useEffect(() => {
    if (!dialogueText) {
      setDisplayedText("");
      setIsTextFullyTyped(true);
      return;
    }
    
    // If textSpeed is 100 (instant), display the full text immediately
    if (textSpeed >= 100) {
      setDisplayedText(dialogueText);
      setIsTextFullyTyped(true);
      return;
    }
    
    setIsTextFullyTyped(false);
    setDisplayedText("");

    // Calculate delay based on text speed (50ms to 10ms range)
    const delay = 50 - (textSpeed * 0.4);
    
    let currentChar = 0;
    const textLength = dialogueText.length;
    
    const animationInterval = setInterval(() => {
      if (currentChar <= textLength) {
        setDisplayedText(dialogueText.slice(0, currentChar));
        currentChar++;
      } else {
        clearInterval(animationInterval);
        setIsTextFullyTyped(true);
      }
    }, delay);
    
    return () => clearInterval(animationInterval);
  }, [dialogueText, textSpeed]);
  
  // Handle content click
  const handleContentClick = useCallback(() => {
    if (!showChoices) {
      // If text is still typing, immediately show full text and stop animation
      if (!isTextFullyTyped && dialogueText) {
        console.log("VnPlayer: Text clicked while still typing - displaying full text");
        
        // Important: Force immediate display of full text
        setTextSpeed(100); // Set to instant speed to bypass animation
        setDisplayedText(dialogueText); // Display full text immediately
        setIsTextFullyTyped(true);
      } else {
        console.log("VnPlayer: Text clicked after typing complete - advancing dialogue");
        advanceDialogue();
      }
    } else {
      console.log("VnPlayer: Click ignored - choices are being shown");
    }
  }, [showChoices, isTextFullyTyped, dialogueText, advanceDialogue, setTextSpeed]);
  
  // Toggle settings panel
  const toggleSettings = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setShowSettings(prev => !prev);
  }, []);
  
  // Auto-scroll to keep the current dialogue visible
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [currentDialogueIndex, showChoices, displayedText]);
  
  if (!currentScene) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }
  
  return (
    <div className="relative h-screen">
      <PlayerNavbar 
        actNumber={actNumber}
        onRestart={handleRestart}
        onReturn={onReturn}
        dialogueLog={dialogueLog}
      />
      
      <div className="vn-reader h-[calc(100vh-34px)] flex flex-col pt-[34px]">
        <div className="vn-image-area h-[65%] bg-neutral-800 flex items-center justify-center relative">
          {/* Setting name overlay */}
          <div className="absolute top-4 left-4 bg-black bg-opacity-70 text-white px-3 py-1 rounded text-sm">
            {currentScene.setting}
          </div>
          
          {/* Placeholder for background image */}
          <div className="text-white text-center">
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
            <p>Background Image Placeholder</p>
            <p className="text-sm text-neutral-400 mt-1">Image generation disabled</p>
          </div>
        </div>
        
        <div 
          ref={containerRef}
          className="vn-text-area h-[35%] bg-neutral-800 bg-opacity-90 text-white p-5 relative overflow-y-auto"
          onClick={handleContentClick}
        >
          {/* No settings button or panel, as it's already in the toolbar */}
          
          {/* Dialogue text */}
          {currentScene.dialogue.length > 0 && currentDialogueIndex < currentScene.dialogue.length && (
            <div className="vn-dialogue">
              <p className="character-name text-primary-300 font-semibold mb-2">
                {currentScene.dialogue[currentDialogueIndex][0]}
              </p>
              <p className="text-white text-lg whitespace-pre-line">
                {displayedText || " "} {/* Display animated text */}
                {!isTextFullyTyped && <span className="inline-block w-2 h-4 bg-white opacity-75 ml-1 animate-pulse"></span>}
              </p>
            </div>
          )}
          
          {showChoices && currentScene.choices && (
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
                      // Base style
                      "bg-neutral-800 hover:bg-primary/70 text-white",
                      // Condition styles
                      hasCondition && !conditionMet && "bg-red-900/40 hover:bg-red-900/60 border-red-700",
                      hasCondition && conditionMet && "bg-green-900/20 hover:bg-green-900/40 border-green-700"
                    )}
                    onClick={() => handleChoiceSelect(choice)}
                    disabled={false} // We handle condition failure in the click handler
                  >
                    {/* Indicator for choices with conditions */}
                    {hasCondition && (
                      <span className={cn(
                        "absolute top-1 right-1 w-2 h-2 rounded-full",
                        conditionMet ? "bg-green-500" : "bg-red-500"
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
          
          {!showChoices && currentScene.dialogue.length > 0 && (
            <div className="absolute bottom-4 right-4 animate-bounce text-white">
              <ChevronDown className="h-6 w-6" />
            </div>
          )}
          
          {/* End of act - show return button when at the final scene with no more choices */}
          {currentScene.choices === null && currentDialogueIndex >= currentScene.dialogue.length - 1 && (
            <div className="mt-8 text-center">
              <Button onClick={onReturn} className="mx-auto">
                Return to Generation Screen
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
