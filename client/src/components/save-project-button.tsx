import { useVnContext } from "@/context/vn-context";
import { VnProjectData } from "@/types/vn";
import { Button } from "@/components/ui/button";
import { Save } from "lucide-react";
import { useLocation } from "wouter";

export function SaveProjectButton() {
  const { saveProject, saveLoading, projectData } = useVnContext();
  const [location] = useLocation();

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
    
  };
  const handleSave = async () => {
    try {
      // First, save the current form data to a local variable
      // This will let us capture the latest form data directly
      console.log('Save button clicked - getting current form data');
      const formData = await getCurrentFormData();
      
      if (!formData) {
        console.log('No form data to save from current form');
        // If no form data available, save the project as-is
        await saveProject();
        return;
      }
      
      // Create an updated project data object with the current form data
      // This ensures we're working with the most up-to-date form data
      console.log('Updating project data with current form data');
      const updatedProjectData = await updateProjectDataWithFormData(formData);
      
      // Save the project with the explicitly updated data
      console.log('Saving project with explicitly updated data');
      await saveProject({ updatedData: updatedProjectData });
    } catch (error) {
      console.error('Error during save process:', error);
    }
  };
  
  // Gets the current form data based on the current route
  const getCurrentFormData = async (): Promise<any> => {
    // Create a promise that will be resolved with the form data
    return new Promise((resolve) => {
      // Create a unique event ID for this save operation
      const eventId = Date.now().toString();
      
      // Function to handle the event when form data is returned
      const handleFormData = (e: CustomEvent) => {
        // Check if this event corresponds to our request
        if (e.detail && e.detail.eventId === eventId) {
          // Remove the event listener
          document.removeEventListener('form-data-available', handleFormData as EventListener);
          // Resolve the promise with the form data
          resolve(e.detail.data);
        }
      };
      
      // Add the event listener for form data
      document.addEventListener('form-data-available', handleFormData as EventListener);
      
      // Dispatch event to request form data
      const event = new CustomEvent('get-form-data', { detail: { eventId } });
      document.dispatchEvent(event);
      
      // Set a timeout in case the form doesn't respond
      setTimeout(() => {
        document.removeEventListener('form-data-available', handleFormData as EventListener);
        console.log('Timed out waiting for form data');
        resolve(null);
      }, 500);
    });
  };
  
  // Creates an updated project data object with the current form data
  const updateProjectDataWithFormData = async (formData: any): Promise<VnProjectData> => {
    if (!projectData) {
      throw new Error('No project data available');
    }
    
    // Create a deep copy of the current project data
    const currentData = {
      ...projectData,
      title: projectData.title || 'Untitled Project',
      createdAt: projectData.createdAt || new Date().toISOString(),
      updatedAt: projectData.updatedAt || new Date().toISOString(),
      basicData: { ...projectData.basicData },
      // Make sure we have all the required fields even if they're empty
      conceptData: projectData.conceptData || {},
      charactersData: projectData.charactersData || {},
      pathsData: projectData.pathsData || {},
      plotData: projectData.plotData || {},
      generatedActs: projectData.generatedActs || {},
      playerData: projectData.playerData || {},
      currentStep: projectData.currentStep || 1
    };
    
    // Based on location, update the appropriate section of the project data
    if (location.includes('/basic')) {
      currentData.basicData = formData;
    } else if (location.includes('/concept')) {
      currentData.conceptData = formData;
    } else if (location.includes('/characters')) {
      currentData.charactersData = formData;
    } else if (location.includes('/paths')) {
      currentData.pathsData = formData;
    } else if (location.includes('/plot')) {
      currentData.plotData = formData;
    }
    
    return currentData as VnProjectData;
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
