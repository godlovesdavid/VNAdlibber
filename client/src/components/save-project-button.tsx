import { useVnContext, hasUnsavedChanges } from "@/context/vn-context";
import { Button } from "@/components/ui/button";
import { Save } from "lucide-react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

export function SaveProjectButton() {
  const { saveProject, saveLoading, projectData } = useVnContext();
  const [location] = useLocation();
  const { toast } = useToast();
  const handleSave = async () => {
    try {
      // Before saving to database, make sure the current form's data is in the context
      console.log('Save button clicked - saving form to context first');
      await saveFormToContext(location);
      
      // Add a small delay to ensure React state updates are processed
      console.log('[saveProject] Waiting briefly for state updates to finish');
      
      // Before starting the save process, check for unsaved changes
      // Now using await with the Promise-based hasUnsavedChanges
      // This gets projectData from context internally
      const hasChanges = await hasUnsavedChanges();
      if (!hasChanges) {
        console.log('[saveProject] No changes detected, skipping save operation');
        toast({
          title: "No Changes",
          description: "No changes to save",
        });
        return projectData; // Return the existing data
      }
      
      // Then save everything to the database
      console.log('Saving to database now');
      await saveProject();
    } catch (error) {
      console.error('Error during save process:', error);
    }
  };
  
  // Helper function to save the current form's data to the context
  const saveFormToContext = async (path: string) => {
    // Get the form data based on the current route
    if (!projectData) {
      console.log('No project data available to save');
      return;
    }

    // Each route path corresponds to a specific form
    // We'll dispatch a custom event to trigger the form to save to context
    console.log('Dispatching save-form-to-context event');
    const event = new CustomEvent('save-form-to-context');
    document.dispatchEvent(event);
    
    // Return a promise that resolves after a short delay to allow form data to be saved to context
    return new Promise<void>(resolve => setTimeout(resolve, 50));
  };
  
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleSave}
      disabled={saveLoading}
      className="border-primary text-primary hover:bg-primary/10"
    >
      {saveLoading ? (
        <>
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Saving...
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
