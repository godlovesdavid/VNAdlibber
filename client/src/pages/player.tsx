import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { useVnContext } from "@/context/vn-context";
import { useParams } from "wouter";
import { VnPlayer } from "@/components/vn-player";
import { GeneratedAct } from "@/types/vn";

export default function Player() {
  const { actId } = useParams();
  const [, setLocation] = useLocation();
  const { projectData, updatePlayerData, resetPlayerData } = useVnContext();
  const [actData, setActData] = useState<GeneratedAct | null>(null);
  const [actNumber, setActNumber] = useState<number>(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Separate effect for loading project act vs. imported act 
  // to avoid unnecessary dependencies that cause loops
  useEffect(() => {
    // This effect is only for non-imported acts
    if (actId !== "imported") {
      setLoading(true);
      setError(null);
      
      try {
        // Handle act from current project
        const num = parseInt(actId || '0');
        if (isNaN(num) || num < 1 || num > 5) {
          throw new Error("Invalid act number");
        }
        
        if (!projectData?.generatedActs?.[`act${num}`]) {
          throw new Error(`Act ${num} has not been generated yet`);
        }
        
        // Make a deep copy to avoid reference issues (same as import flow)
        const actKey = `act${num}`;
        const stringCopy = JSON.stringify(projectData.generatedActs[actKey]);
        const actDataCopy = JSON.parse(stringCopy);
        
        // Ensure it has meta property
        if (!actDataCopy.meta) {
          actDataCopy.meta = {
            theme: projectData.basicData?.theme || "Generated story",
            relationshipVars: []
          };
        }
        
        // Fix any "null" string issues
        if (actDataCopy.scenes) {
          actDataCopy.scenes = actDataCopy.scenes.map((scene: any) => {
            if (scene.choices === "null") {
              return { ...scene, choices: null };
            }
            return scene;
          });
        }
        
        // Set the data and number
        setActData(actDataCopy);
        setActNumber(num);
        setLoading(false);
      } catch (err) {
        console.error("Error loading project act:", err);
        setError(err instanceof Error ? err.message : "Failed to load act");
        setLoading(false);
      }
    }
  }, [actId, projectData]);
  
  // Separate effect for imported acts to minimize dependencies
  useEffect(() => {
    // Only run for imported acts
    if (actId === "imported") {
      setLoading(true);
      setError(null);
      
      try {
        // Handle imported story from localStorage
        const importedStory = localStorage.getItem("imported_story");
        
        if (!importedStory) {
          throw new Error("No imported story found");
        }
        
        const parsedStory = JSON.parse(importedStory);
        
        // Reset player data first (one time only)
        resetPlayerData();
        
        // Handle old format with actData property (which is what we use)
        if (parsedStory.actData) {
          // Set act number
          setActNumber(parsedStory.actNumber || 1);
          
          // Apply player data if present in export info
          if (parsedStory.actData.__exportInfo?.playerData) {
            updatePlayerData(parsedStory.actData.__exportInfo.playerData);
          }
          
          // Make a deep copy of act data to avoid reference issues
          const stringCopy = JSON.stringify(parsedStory.actData);
          const actDataCopy = JSON.parse(stringCopy);
          
          // Ensure meta property exists
          if (!actDataCopy.meta) {
            actDataCopy.meta = {
              theme: "Imported story",
              relationshipVars: []
            };
          }
          
          // Fix 'choices: "null"' issue in older exports
          if (actDataCopy.scenes) {
            actDataCopy.scenes = actDataCopy.scenes.map((scene: any) => {
              if (scene.choices === "null") {
                return { ...scene, choices: null };
              }
              return scene;
            });
          }
          
          // Set act data
          setActData(actDataCopy);
          setLoading(false);
        } else {
          // Direct data format (less common)
          setActNumber(1);
          
          // Apply player data if present in export info
          if (parsedStory.__exportInfo?.playerData) {
            updatePlayerData(parsedStory.__exportInfo.playerData);
          }
          
          // Make a deep copy to avoid reference issues
          const stringCopy = JSON.stringify(parsedStory);
          const actDataCopy = JSON.parse(stringCopy);
          
          // Fix 'choices: "null"' issue in older exports
          if (actDataCopy.scenes) {
            actDataCopy.scenes = actDataCopy.scenes.map((scene: any) => {
              if (scene.choices === "null") {
                return { ...scene, choices: null };
              }
              return scene;
            });
          }
          
          // Ensure meta property exists
          if (!actDataCopy.meta) {
            actDataCopy.meta = {
              theme: "Imported story",
              relationshipVars: []
            };
          }
          
          // Set act data
          setActData(actDataCopy);
          setLoading(false);
        }
      } catch (err) {
        console.error("Error loading imported act:", err);
        setError(err instanceof Error ? err.message : "Failed to load imported act");
        setLoading(false);
      }
    }
  }, [actId, resetPlayerData, updatePlayerData]);
  
  // Handle return to generator or play selection
  const handleReturn = () => 
  {
    if (actId === "imported") 
    {
      setLocation("/play");
    } 
    else 
    {
      setLocation("/create/generate-vn");
    }
  };
  
  // Define a single handleRestart function
  const handleRestart = useCallback(() => {
    // Reset player data to initial state
    resetPlayerData();
  }, [resetPlayerData]);
  
  if (loading) 
  {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <svg className="animate-spin h-10 w-10 mx-auto text-primary mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-lg">Loading Act {actNumber}...</p>
        </div>
      </div>
    );
  }
  
  if (error) 
  {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center max-w-md">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="mx-auto h-16 w-16 text-red-500 mb-4" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
            />
          </svg>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Error Loading Act</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button 
            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
            onClick={handleReturn}
          >
            Return
          </button>
        </div>
      </div>
    );
  }
  
  if (!actData) 
  {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-lg text-gray-800">No act data found</p>
          <button 
            className="mt-4 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
            onClick={handleReturn}
          >
            Return
          </button>
        </div>
      </div>
    );
  }
  
  // Use the original player regardless of source
  return (
    <VnPlayer
      actData={actData}
      actNumber={actNumber}
      onReturn={handleReturn}
      onRestart={handleRestart}
    />
  );
}
