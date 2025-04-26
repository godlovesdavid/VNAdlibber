import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useVnContext } from "@/context/vn-context";
import { useParams } from "wouter";
import { VnPlayer } from "@/components/vn-player";
import { GeneratedAct } from "@/types/vn";

export default function Player() {
  const { actId } = useParams();
  const [, setLocation] = useLocation();
  const { projectData } = useVnContext();
  const [actData, setActData] = useState<GeneratedAct | null>(null);
  const [actNumber, setActNumber] = useState<number>(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const loadAct = async () => {
      setLoading(true);
      setError(null);
      
      try {
        if (actId === "imported") {
          // Handle imported story from session storage
          const importedStory = sessionStorage.getItem("current_story");
          if (importedStory) {
            const parsedStory = JSON.parse(importedStory);
            setActData(parsedStory.actData);
            setActNumber(parsedStory.actNumber || 1);
          } else {
            throw new Error("No imported story found");
          }
        } else {
          // Handle act from current project
          const num = parseInt(actId);
          if (isNaN(num) || num < 1 || num > 5) {
            throw new Error("Invalid act number");
          }
          
          if (!projectData?.generatedActs?.[`act${num}`]) {
            throw new Error(`Act ${num} has not been generated yet`);
          }
          
          setActData(projectData.generatedActs[`act${num}`]);
          setActNumber(num);
        }
      } catch (err) {
        console.error("Error loading act:", err);
        setError(err instanceof Error ? err.message : "Failed to load act");
      } finally {
        setLoading(false);
      }
    };
    
    loadAct();
  }, [actId, projectData]);
  
  // Handle return to generator or play selection
  const handleReturn = () => {
    if (actId === "imported") {
      setLocation("/play");
    } else {
      setLocation("/create/generate-vn");
    }
  };
  
  if (loading) {
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
  
  if (error) {
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
  
  if (!actData) {
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
  
  return (
    <VnPlayer
      actData={actData}
      actNumber={actNumber}
      onReturn={handleReturn}
    />
  );
}
