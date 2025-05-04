import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import { useVnContext } from "@/context/vn-context";
import { useParams } from "wouter";
import { VnPlayer } from "@/components/vn-player";
import { NavBar } from "@/components/nav-bar";
import { Loader2 } from "lucide-react";
import { ShareButton } from "@/components/share-button";
import { Helmet } from "react-helmet";
import { GeneratedAct } from "@/types/vn";

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
  
  // Common UI wrapper for all cases
  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-16 flex-grow">
          <div className="text-center">
            <Loader2 className="animate-spin h-10 w-10 mx-auto text-primary mb-4" />
            <p className="text-lg">Loading Act {actNumber}...</p>
          </div>
        </div>
      );
    }
    
    if (error) {
      return (
        <div className="flex items-center justify-center py-16 flex-grow">
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
    
    if (!actData) {
      return (
        <div className="flex items-center justify-center py-16 flex-grow">
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
    
    // Normal player rendering when everything is loaded properly
    return (
      <VnPlayer
        actData={actData}
        actNumber={actNumber}
        onReturn={handleReturn}
        onRestart={handleRestart}
        mode={actId === "imported" ? "imported" : "generated"}
      />
    );
  };
  
  // Get the story title from the project data or imported data
  const getStoryTitle = () => {
    if (actId === "imported") {
      try {
        const importedStory = localStorage.getItem("imported_story");
        if (importedStory) {
          const parsedStory = JSON.parse(importedStory);
          return parsedStory.title || "Imported Story";
        }
      } catch (err) {
        console.error("Error parsing imported story title:", err);
      }
      return "Imported Story";
    } else {
      return projectData?.conceptData?.title || `Act ${actNumber}`;
    }
  };

  // Function to extract a description from the story data
  const getStoryDescription = () => {
    if (!actData) return "An interactive visual novel adventure";
    
    // Try to extract a description from the first scene dialogue or summary
    try {
      // Handle different possible formats of story data
      const actDataObj = actData as any; // Use any temporarily for type checking
      
      // Handle the three different GeneratedAct formats
      
      // Format 1: Legacy format with scenes array
      if ('scenes' in actDataObj && Array.isArray(actDataObj.scenes) && actDataObj.scenes.length > 0) {
        const firstScene = actDataObj.scenes[0];
        if (firstScene && 'dialogue' in firstScene && Array.isArray(firstScene.dialogue) && 
            firstScene.dialogue.length > 0 && Array.isArray(firstScene.dialogue[0])) {
          return firstScene.dialogue[0][1] || "An interactive visual novel adventure";
        }
      }
      
      // Format 2: Direct scene map { scene1: {...}, scene2: {...} }
      if ('scene1' in actDataObj && typeof actDataObj.scene1 === 'object') {
        const scene1 = actDataObj.scene1;
        if (scene1 && 'dialogue' in scene1 && Array.isArray(scene1.dialogue) && 
            scene1.dialogue.length > 0 && Array.isArray(scene1.dialogue[0])) {
          return scene1.dialogue[0][1] || "An interactive visual novel adventure";
        }
      }
      
      // Format 3: Nested format with act wrapper { act1: { scene1: {...}, scene2: {...} } }
      const actKeys = Object.keys(actDataObj);
      if (actKeys.length > 0 && actKeys[0].startsWith('act')) {
        const firstAct = actDataObj[actKeys[0]];
        if (firstAct && typeof firstAct === 'object') {
          const sceneKeys = Object.keys(firstAct);
          if (sceneKeys.length > 0) {
            const firstScene = firstAct[sceneKeys[0]];
            if (firstScene && 'dialogue' in firstScene && Array.isArray(firstScene.dialogue) && 
                firstScene.dialogue.length > 0 && Array.isArray(firstScene.dialogue[0])) {
              return firstScene.dialogue[0][1] || "An interactive visual novel adventure";
            }
          }
        }
      }
      
      // Fallback to project premise
      return projectData?.conceptData?.premise || "An interactive visual novel adventure";
    } catch (err) {
      return projectData?.conceptData?.premise || "An interactive visual novel adventure";
    }
  };

  // Determine if we should show the sharing UI
  const shouldShowShareUI = () => {
    // Only show sharing UI for project acts (non-imported)
    return actId !== "imported";
  };

  // UI with navbar and wrapper for the player
  return (
    <div className="flex flex-col min-h-screen overflow-hidden">
      <Helmet>
        <title>{getStoryTitle()} | VN Adlibber</title>
        <meta name="description" content={getStoryDescription()} />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content={window.location.href} />
        <meta property="og:title" content={`${getStoryTitle()} | VN Adlibber`} />
        <meta property="og:description" content={getStoryDescription()} />
        
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content={window.location.href} />
        <meta name="twitter:title" content={`${getStoryTitle()} | VN Adlibber`} />
        <meta name="twitter:description" content={getStoryDescription()} />
      </Helmet>
      
      <NavBar />
      <main className="flex flex-col flex-grow relative overflow-hidden">
        {shouldShowShareUI() && (
          <div className="absolute top-0 left-0 right-0 z-50 bg-background/70 backdrop-blur-sm shadow-md border-b border-border/30">
            <div className="container px-2 py-2 mx-auto sm:px-4">
              <div className="flex justify-between items-center py-1">
                <div>
                  <h1 className="text-lg sm:text-xl font-semibold text-foreground/90">{getStoryTitle()}</h1>
                  <p className="text-xs text-muted-foreground">
                    Act {actNumber} of {Object.keys(projectData?.generatedActs || {}).length || 1}
                  </p>
                </div>
                <div className="flex gap-2">
                  <ShareButton 
                    title={getStoryTitle()} 
                    variant="outline" 
                    size="sm" 
                    className="bg-primary/10 hover:bg-primary/20 border-primary/30"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div className="flex-grow h-full pt-10">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}
