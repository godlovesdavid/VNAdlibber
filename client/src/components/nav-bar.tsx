import { useVnContext } from "@/context/vn-context";
import { VnProjectData } from "@/types/vn";
import { useLocation } from "wouter";
import { SaveProjectButton } from "@/components/save-project-button";
import { ArrowLeft, Share } from "lucide-react";
import { ProjectSharingDialog } from "@/components/modals/project-sharing-dialog";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState } from "react";

export function NavBar() {
  const [location, setLocation] = useLocation();
  const { projectData, hasUnsavedChanges, saveProject } = useVnContext();
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [sharingDialogOpen, setSharingDialogOpen] = useState(false);
  
  // Check if we're on a form page
  const isFormPage = () => {
    return location.includes('/create/');
  };
  
  // Helper function to save form to context before checking for changes
  const saveFormToContext = async () => {
    // Dispatch a save-form-to-context event to trigger the form to save data
    console.log('[NavBar] Dispatching save-form-to-context event');
    const event = new CustomEvent('save-form-to-context');
    document.dispatchEvent(event);
    
  };
  
  // Gets the current form data based on the current route
  const getCurrentFormData = async (): Promise<any> => {
    // Create a promise that will be resolved with the form data
    return new Promise((resolve) => {
      // Create a unique event ID for this operation
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
        console.log('[NavBar] Timed out waiting for form data');
        resolve(null);
      }, 500);
    });
  };
  
  // Creates an updated project data object with the current form data
  const updateProjectDataWithFormData = async (formData: any): Promise<VnProjectData | null> => {
    if (!projectData || !formData) return null;
    
    // Create a deep copy of the current project data with all required fields
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

  // Go back to main menu with confirmation for form pages
  const handleBackClick = async () => {
    console.log('[NavBar] Back button clicked');
    if (isFormPage()) {
      console.log('[NavBar] On a form page, getting form data directly');
      
      // Get the form data directly
      const formData = await getCurrentFormData();
      
      if (formData) {
        // Create an updated project data object with this form data
        const updatedProjectData = await updateProjectDataWithFormData(formData);
        
        if (updatedProjectData) {
          // Now check for unsaved changes using this updated project data
          const checkResult = await saveProject({ updatedData: updatedProjectData });
          console.log('[NavBar] Save result:', checkResult);
          
          // If we got back the same project, there were no changes
          const hasChanges = hasUnsavedChanges();
          console.log('[NavBar] hasUnsavedChanges returned:', hasChanges);
          
          if (hasChanges) {
            console.log('[NavBar] Showing confirmation dialog');
            setConfirmDialogOpen(true);
          } else {
            // No unsaved changes, just go back to main menu
            console.log('[NavBar] No unsaved changes, going back to main menu');
            setLocation("/");
          }
          return;
        }
      }
      
      // Fallback to old behavior if we couldn't get form data
      console.log('[NavBar] Using fallback behavior with context');
      await saveFormToContext();
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const hasChanges = hasUnsavedChanges();
      console.log('[NavBar] Fallback hasUnsavedChanges returned:', hasChanges);
      
      if (hasChanges) {
        console.log('[NavBar] Showing confirmation dialog');
        setConfirmDialogOpen(true);
      } else {
        // No unsaved changes, just go back to main menu
        console.log('[NavBar] No unsaved changes, going back to main menu');
        setLocation("/");
      }
    } else {
      console.log('[NavBar] Not on a form page, going back to main menu');
      setLocation("/");
    }
  };
  
  // Confirm navigation to main menu
  const confirmGoToMainMenu = () => {
    setLocation("/");
    setConfirmDialogOpen(false);
  };
  
  // Check if we're on a player page to hide the SaveProjectButton
  const isPlayerPage = () => {
    return location.includes('/play/') || location.includes('/shared/');
  };
  
  return (
    <>
      <nav className="bg-white shadow-sm px-4 py-3 fixed top-0 left-0 w-full z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button 
              className="text-neutral-500 hover:text-primary transition-colors"
              onClick={handleBackClick}
              aria-label="Back to main menu"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-lg font-semibold text-primary">
              {projectData?.title ? projectData.title : 'VN Ad Libber'}
            </h1>
          </div>
          <div className="flex items-center space-x-2">
            {/* Only show these buttons when not on player pages */}
            {!isPlayerPage() && (
              <>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex items-center gap-1"
                  onClick={() => setSharingDialogOpen(true)}
                >
                  <Share className="h-4 w-4" />
                  <span className="hidden sm:inline">Share</span>
                </Button>
                <SaveProjectButton />
              </>
            )}
          </div>
        </div>
      </nav>
      
      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Return to Main Menu?</AlertDialogTitle>
            <AlertDialogDescription>
              Any unsaved changes on this form will be lost. Are you sure you want to return to the main menu?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmGoToMainMenu}>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Sharing Dialog */}
      <ProjectSharingDialog
        open={sharingDialogOpen}
        onOpenChange={setSharingDialogOpen}
      />
    </>
  );
}
