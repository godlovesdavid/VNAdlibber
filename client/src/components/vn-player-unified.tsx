import { useState, useEffect, useRef, useCallback } from "react";
import { useVnContext } from "@/context/vn-context";
import { cn } from "@/lib/utils";
import { PlayerNavbar } from "@/components/player-navbar";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import { Scene, SceneChoice, GeneratedAct } from "@/types/vn";

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
  mode = "generated" // Default to standard behavior
}: VnPlayerProps) {
  const { playerData, updatePlayerData } = useVnContext();
  
  // Core scene and dialogue state
  const [currentSceneId, setCurrentSceneId] = useState<string>("");
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
  
  // Scrolling container reference
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Process scene to ensure it's ready for display
  const processScene = useCallback((scene: Scene): Scene => {
    if (!scene) return scene;
    
    // Create a clean copy to avoid modifying the original
    const processed = { ...scene };
    
    // Additional processing based on mode if needed
    if (mode === "generated") {
      // Any special processing for generated mode
    } else if (mode === "imported") {
      // Any special processing for imported mode
    }
    
    return processed;
  }, [mode]);
  
  // Text animation functions
  const animateText = useCallback((text: string) => {
    // Skip animation if text speed is fast
    if (textSpeed === 'fast') {
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
    const charDelay = textSpeed === 'slow' ? 80 : 40; // slow = 80ms, medium = 40ms
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
  }, [textSpeed]);
  
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
  
  // Handle advancing to next dialogue or showing choices
  const advanceDialogue = useCallback(() => {
    if (!currentScene || !clickableContent) return;
    
    if (currentDialogueIndex < currentScene.dialogue.length - 1) {
      // Add current dialogue to log
      const [speaker, text] = currentScene.dialogue[currentDialogueIndex];
      setDialogueLog(prev => [...prev, { speaker, text }]);
      
      // Advance to next dialogue line
      setCurrentDialogueIndex(prev => prev + 1);
      
      // Reset displayed text for animation
      setDisplayedText("");
      
      // Start animating the next dialogue
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
  }, [currentScene, currentDialogueIndex, clickableContent, animateText]);
  
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
      setCurrentSceneId(choice.failNext);
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
  
  // Initialize manually on mount with different behaviors based on mode
  useEffect(() => {
    if (!actData?.scenes?.length) return;
    
    // Get and process the first scene
    const firstScene = processScene(actData.scenes[0]);
    console.log(`Initializing VN Player (${mode} mode) with first scene:`, firstScene.id);
    
    // Different initialization based on mode
    if (mode === "imported") {
      // For imported stories, use a simpler one-time initialization
      // that won't cause infinite update loops
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
    } else {
      // For generated stories, use the standard approach
      setCurrentSceneId(firstScene.id);
    }
  }, [actData, processScene, animateText, mode]); 
  
  // Update current scene when scene ID changes
  useEffect(() => {
    if (!actData?.scenes || !currentSceneId) return;
    
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
  }, [currentSceneId, processScene, animateText, actData]);
  
  // Handle restart
  const handleRestart = useCallback(() => {
    if (!actData?.scenes?.length) return;
    
    // Reset to first scene
    const firstScene = processScene(actData.scenes[0]);
    setCurrentScene(firstScene);
    setCurrentSceneId(firstScene.id);
    setCurrentDialogueIndex(0);
    setShowChoices(false);
    setDialogueLog([]);
  }, [actData, processScene]);
  
  // Auto-scroll to keep the current dialogue visible
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [currentDialogueIndex, showChoices]);
  
  // Text speed controls UI
  const renderTextSpeedControls = () => {
    return (
      <div className="absolute bottom-4 left-4 flex items-center space-x-2 bg-black bg-opacity-60 rounded-md p-1">
        <Button 
          size="sm" 
          variant="ghost"
          className={cn(
            "text-xs px-2 py-1 h-auto", 
            textSpeed === 'slow' ? "bg-primary text-white" : "text-gray-300"
          )}
          onClick={() => setTextSpeed('slow')}
        >
          Slow
        </Button>
        <Button 
          size="sm" 
          variant="ghost"
          className={cn(
            "text-xs px-2 py-1 h-auto", 
            textSpeed === 'medium' ? "bg-primary text-white" : "text-gray-300"
          )}
          onClick={() => setTextSpeed('medium')}
        >
          Medium
        </Button>
        <Button 
          size="sm" 
          variant="ghost"
          className={cn(
            "text-xs px-2 py-1 h-auto", 
            textSpeed === 'fast' ? "bg-primary text-white" : "text-gray-300"
          )}
          onClick={() => setTextSpeed('fast')}
        >
          Fast
        </Button>
      </div>
    );
  };
  
  // Show loading while no scene is available
  if (!currentScene) {
    return <div className="flex items-center justify-center h-screen">Loading story...</div>;
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
          
          {/* Text speed controls */}
          {renderTextSpeedControls()}
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
                Return to Selection Screen
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}