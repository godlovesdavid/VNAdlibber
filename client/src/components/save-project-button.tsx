
import { useVnContext } from "@/context/vn-context";
import { Button } from "@/components/ui/button";
import { Save } from "lucide-react";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";

export function SaveProjectButton() {
  const { saveProject, saveLoading, projectData } = useVnContext();
  const [location] = useLocation();
  const [triggerSave, setTriggerSave] = useState(false);
  const [isSavingToContext, setIsSavingToContext] = useState(false);

  // Effect to handle the save process
  useEffect(() => {
    if (!triggerSave) return;

    const handleSave = async () => {
      try {
        // First save to context
        setIsSavingToContext(true);
        console.log('Dispatching save-form-to-context event');
        const event = new CustomEvent('save-form-to-context');
        document.dispatchEvent(event);
        
        // Wait for context to update
        console.log('Waiting for context to update...');
        await new Promise(resolve => setTimeout(resolve, 200));
        setIsSavingToContext(false);

        // Then save to database
        console.log('Saving to database now');
        await saveProject();
      } catch (error) {
        console.error('Error during save process:', error);
      } finally {
        setTriggerSave(false);
      }
    };

    handleSave();
  }, [triggerSave, saveProject]);

  const handleSaveClick = () => {
    setTriggerSave(true);
  };
  
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleSaveClick}
      disabled={saveLoading || isSavingToContext}
      className="border-primary text-primary hover:bg-primary/10"
    >
      {(saveLoading || isSavingToContext) ? (
        <>
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          {isSavingToContext ? 'Saving to Context...' : 'Saving...'}
        </>
      ) : (
        <>
          <Save className="h-4 w-4 mr-1" />
          Save Project
        </>
      )}
    </Button>
  );
}
