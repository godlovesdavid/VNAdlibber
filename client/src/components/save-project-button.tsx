import { useVnContext } from "@/context/vn-context";
import { Button } from "@/components/ui/button";
import { Save } from "lucide-react";

export function SaveProjectButton() {
  const { saveProject, saveLoading } = useVnContext();

  // Simplified save handler that uses the improved saveProject function
  const handleSave = async () => {
    try {
      // First, trigger all form components to save their data to context
      console.log('Save button clicked - saving form data to context');
      await saveFormToContext();
      
      // Brief delay to ensure all context updates have completed
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Then save the project using the updated context
      console.log('Saving project with updated context data');
      await saveProject();
    } catch (error) {
      console.error('Error during save process:', error);
    }
  };
  
  // Trigger form data save to context
  const saveFormToContext = async () => {
    console.log('[SaveButton] Dispatching save-form-to-context event');
    const event = new CustomEvent('save-form-to-context');
    document.dispatchEvent(event);
    
    // Wait a brief moment to let forms process the event
    await new Promise(resolve => setTimeout(resolve, 50));
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
