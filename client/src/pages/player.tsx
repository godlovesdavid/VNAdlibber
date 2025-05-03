import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import { useVnContext } from "@/context/vn-context";
import { useParams } from "wouter";
import { VnPlayer } from "@/components/vn-player";
import { GeneratedAct } from "@/types/vn";
import { Button } from "@/components/ui/button";
import { Share } from "lucide-react";
import { ShareStoryDialog } from "@/components/modals/share-story-dialog";

export default function Player() {
  const { actId } = useParams();
  const [, setLocation] = useLocation();
  const { projectData, updatePlayerData, resetPlayerData } = useVnContext();
  const [actData, setActData] = useState<GeneratedAct | null>(null);
  const [actNumber, setActNumber] = useState<number>(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // First-load flag to prevent infinite updates
  const initialLoadRef = useState<{loaded: boolean}>({loaded: false})[0];
  
  // Separate effect for loading project acts (non-imported)
  useEffect(() => {
    // This effect is only for non-imported acts and only runs once per actId
    if (actId !== "imported" && !initialLoadRef.loaded) {
      initialLoadRef.loaded = true;
      setLoading(true);
      setError(null);
      
      try {
        // Handle act from current project
        const num = parseInt(actId || '0');
        if (isNaN(num) || num < 1 || num > 5) {
          throw new Error("Invalid act number");
        }
        
        if (!projectData?.generatedActs?.[`act${num}`]) 
          throw new Error(`Act ${num} has not been generated yet`);
        
        // Set the data and number
        setActData(projectData.generatedActs[`act${num}`]);
        setActNumber(num);
        setLoading(false);
      } catch (err) {
        console.error("Error loading project act:", err);
        setError(err instanceof Error ? err.message : "Failed to load act");
        setLoading(false);
      }
    }
  }, [actId]);
  
  // Separate effect for imported acts
  const importLoadedRef = useRef(false);
  
  useEffect(() => {
    // Only run once for imported acts
    if (actId === "imported" && !importLoadedRef.current) {
      importLoadedRef.current = true;
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
        
          // Set act number
          setActNumber(parsedStory.actNumber || 1);
          
          // Set act data and finish loading
          setActData(parsedStory.actData);
          setLoading(false);
        
      } catch (err) {
        console.error("Error loading imported act:", err);
        setError(err instanceof Error ? err.message : "Failed to load imported act");
        setLoading(false);
      }
    }
  }, [actId]);
  
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
  
  // Use the unified player with mode parameter based on source
  return (
    <div className="relative">
      {/* Share button floating at top right */}
      {projectData?.id && actId !== "imported" && (
        <div className="absolute top-4 right-4 z-10">
          <ShareStoryDialog
            projectId={projectData.id}
            projectTitle={projectData.title || `Visual Novel Act ${actNumber}`}
            actNumber={actNumber}
            trigger={
              <Button
                variant="secondary"
                size="sm"
                className="flex items-center bg-white/80 backdrop-blur-sm hover:bg-white/90"
              >
                <Share className="mr-1 h-4 w-4" /> Share
              </Button>
            }
          />
        </div>
      )}
      <VnPlayer
        actData={actData}
        actNumber={actNumber}
        onReturn={handleReturn}
        onRestart={handleRestart}
        mode={actId === "imported" ? "imported" : "generated"}
      />
    </div>
  );
}
