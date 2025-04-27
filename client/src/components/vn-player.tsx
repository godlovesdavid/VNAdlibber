import { useState, useEffect, useRef } from "react";
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
}

export function VnPlayer({ actData, actNumber, onReturn }: VnPlayerProps) {
  const { playerData, updatePlayerData } = useVnContext();
  const [currentSceneId, setCurrentSceneId] = useState("");
  const [currentScene, setCurrentScene] = useState<Scene | null>(null);
  const [currentDialogueIndex, setCurrentDialogueIndex] = useState(0);
  const [showChoices, setShowChoices] = useState(false);
  const [dialogueLog, setDialogueLog] = useState<Array<{speaker: string, text: string}>>([]);
  const [clickableContent, setClickableContent] = useState(true);
  
  const containerRef = useRef<HTMLDivElement>(null);
  
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
  
  // Initialize with the first scene
  useEffect(() => {
    if (actData && actData.scenes && actData.scenes.length > 0) {
      const firstScene = processScene(actData.scenes[0]);
      setCurrentSceneId(firstScene.id);
      setCurrentScene(firstScene);
      setCurrentDialogueIndex(0);
      setShowChoices(false);
      setDialogueLog([]);
    }
  }, [actData, actNumber]);
  
  // Update current scene when scene ID changes
  useEffect(() => {
    if (actData && currentSceneId) {
      const scene = actData.scenes.find(s => s.id === currentSceneId);
      if (scene) {
        const processedScene = processScene(scene);
        setCurrentScene(processedScene);
        setCurrentDialogueIndex(0);
        setShowChoices(false);
      }
    }
  }, [actData, currentSceneId, actNumber]);
  
  // Handle restart
  const handleRestart = () => {
    if (actData && actData.scenes && actData.scenes.length > 0) {
      const firstScene = processScene(actData.scenes[0]);
      setCurrentSceneId(firstScene.id);
      setCurrentScene(firstScene);
      setCurrentDialogueIndex(0);
      setShowChoices(false);
      setDialogueLog([]);
    }
  };
  
  // Handle advancing the dialogue
  const advanceDialogue = () => {
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
      }
    }
  };
  
  // Handle choice selection
  const handleChoiceSelect = (choice: SceneChoice) => {
    // Check if there's a condition and if it's met
    if (choice.condition) {
      let conditionMet = true;
      
      for (const [key, value] of Object.entries(choice.condition)) {
        if (!playerData.relationships[key] && !playerData.inventory[key] && !playerData.skills[key]) {
          conditionMet = false;
          break;
        }
        
        const currentValue = 
          playerData.relationships[key] || 
          playerData.inventory[key] || 
          playerData.skills[key] || 
          0;
        
        if (currentValue < value) {
          conditionMet = false;
          break;
        }
      }
      
      // If condition not met, go to fail scene if specified
      if (!conditionMet && choice.failNext) {
        setCurrentSceneId(choice.failNext);
        return;
      }
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
  };
  
  // Handle content click
  const handleContentClick = () => {
    if (!showChoices) {
      advanceDialogue();
    }
  };
  
  // Auto-scroll to keep the current dialogue visible
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [currentDialogueIndex, showChoices]);
  
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
          {currentScene.dialogue.length > 0 && currentDialogueIndex < currentScene.dialogue.length && (
            <div className="vn-dialogue">
              <p className="character-name text-primary-300 font-semibold mb-2">
                {currentScene.dialogue[currentDialogueIndex][0]}
              </p>
              <p className="text-white text-lg">
                {currentScene.dialogue[currentDialogueIndex][1]}
              </p>
            </div>
          )}
          
          {showChoices && currentScene.choices && (
            <div className={cn(
              "vn-choices mt-8 grid grid-cols-1 md:grid-cols-2 gap-3",
              !clickableContent && "opacity-50 pointer-events-none"
            )}>
              {currentScene.choices.map((choice, index) => (
                <Button
                  key={index}
                  variant="outline"
                  className="bg-neutral-800 hover:bg-primary/70 text-white px-4 py-2 rounded-md text-left transition-colors h-auto"
                  onClick={() => handleChoiceSelect(choice)}
                >
                  {choice.text || `Option ${index + 1}`}
                </Button>
              ))}
            </div>
          )}
          
          {!showChoices && currentScene.dialogue.length > 0 && (
            <div className="absolute bottom-4 right-4 animate-bounce text-white">
              <ChevronDown className="h-6 w-6" />
            </div>
          )}
          
          {/* End of act message is now shown in the dialogue of the last scene */}
          {currentScene.choices === null && showChoices && (
            <div className="mt-8 text-center">
              <Button onClick={onReturn}>
                Return to Generation Screen
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
