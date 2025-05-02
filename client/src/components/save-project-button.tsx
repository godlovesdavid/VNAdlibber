import { useVnContext } from "@/context/vn-context";
import { Button } from "@/components/ui/button";
import { Save } from "lucide-react";
import { useLocation } from "wouter";
import { useFormSave } from "@/hooks/use-form-save";

export function SaveProjectButton() {
  const { saveProject, saveLoading } = useVnContext();
  const { saveCurrentForm } = useFormSave();
  const [location] = useLocation();
  
  const handleSave = async () => {
    // Get the current page path
    const path = location.split('/').pop() || '';
    
    // Try to save the current form data
    saveCurrentForm(path);
    
    // Then save the whole project
    await saveProject();
    
    console.log(`Project saved with current form data from ${path}`);
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
