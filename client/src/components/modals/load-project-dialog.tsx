import { useState, useEffect } from "react";
import { useVnContext } from "@/context/vn-context";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ConfirmationModal } from "@/components/modals/confirmation-modal";
import { Trash2, Upload } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

// Helper function to calculate actual progress based on data presence
const calculateProgress = (project: any): number => {
  let progress = 1; // Basic data is always present (step 1)
  
  // Check for concept data (step 2)
  if (project.conceptData) progress++;
  
  // Check for characters data (step 3)
  if (project.charactersData?.characters?.length > 0) progress++;
  
  // Check for paths data (step 4)
  if (project.pathsData?.routes?.length > 0) progress++;
  
  // Check for plot data (step 5)
  if (project.plotData?.plotOutline) progress++;
  
  // Check for generated acts (step 6)
  if (project.generatedActs && Object.keys(project.generatedActs).length > 0) progress++;
  
  return progress;
};

interface LoadProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LoadProjectDialog({ open, onOpenChange }: LoadProjectDialogProps) {
  const { loadProject, deleteProject, projectData } = useVnContext();
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<number | null>(null);
  
  // Fetch projects
  const { data: projects, isLoading, error, refetch } = useQuery({
    queryKey: ['/api/projects'],
    enabled: open, // Only fetch when dialog is open
  });
  
  // Handle project selection
  const handleSelectProject = async (projectId: number) => {
    try {
      await loadProject(projectId);
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to load project:", error);
    }
  };
  
  // Handle project deletion
  const handleDeleteClick = (projectId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setProjectToDelete(projectId);
    setDeleteConfirmOpen(true);
  };
  
  const confirmDelete = async () => {
    if (projectToDelete !== null) {
      try {
        await deleteProject(projectToDelete);
        refetch();
      } catch (error) {
        console.error("Failed to delete project:", error);
      }
    }
  };
  
  // Handle import project
  const handleImportProject = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const importedProject = JSON.parse(event.target?.result as string);
          // Validate the imported project has the required structure
          if (importedProject.basicData && importedProject.title) {
            // Create a new project with the imported data
            // This would typically go through the API but for simplicity
            // we're just using the data directly
            const updatedProject = {
              ...importedProject,
              createdAt: importedProject.createdAt || new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            
            // Store in localStorage for now
            localStorage.setItem('imported_project', JSON.stringify(updatedProject));
            
            // Close dialog and redirect to appropriate step
            onOpenChange(false);
            window.location.href = `/create/${
              importedProject.currentStep === 1 ? 'basic' :
              importedProject.currentStep === 2 ? 'concept' :
              importedProject.currentStep === 3 ? 'characters' :
              importedProject.currentStep === 4 ? 'paths' :
              importedProject.currentStep === 5 ? 'plot' :
              'generate-vn'
            }`;
          } else {
            alert('Invalid project file format');
          }
        } catch (error) {
          console.error('Error parsing project file:', error);
          alert('Error importing project. Please check the file format.');
        }
      };
      reader.readAsText(file);
    };
    
    input.click();
  };
  
  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Load Saved Project</DialogTitle>
            <DialogDescription>
              Select a project to continue working on.
            </DialogDescription>
          </DialogHeader>
          
          <div className="max-h-80 overflow-y-auto space-y-3 my-4">
            {isLoading ? (
              <div className="text-center py-8">
                <svg className="animate-spin h-8 w-8 mx-auto text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="mt-2">Loading projects...</p>
              </div>
            ) : error ? (
              <div className="text-center py-8 text-destructive">
                <p>Error loading projects. Please try again.</p>
              </div>
            ) : projects && Array.isArray(projects) && projects.length > 0 ? (
              projects.map((project: any) => (
                <div 
                  key={project.id}
                  className="border border-border rounded-md p-4 hover:border-primary cursor-pointer"
                  onClick={() => handleSelectProject(project.id)}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-medium">{project.title}</h4>
                      <p className="text-sm text-muted-foreground">
                        Last edited: {formatDistanceToNow(new Date(project.updatedAt), { addSuffix: true })} 
                        | Progress: {calculateProgress(project)}/6 steps
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive"
                        title="Delete Project"
                        onClick={(e) => handleDeleteClick(project.id, e)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className="mx-auto h-12 w-12 text-muted" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" 
                  />
                </svg>
                <p className="mt-2">No saved projects found.</p>
              </div>
            )}
          </div>
          
          <DialogFooter className="flex justify-between sm:justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={handleImportProject}
              className="flex items-center"
            >
              <Upload className="mr-2 h-4 w-4" /> 
              Import Project
            </Button>
            <Button type="button" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <ConfirmationModal
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Delete Project"
        description="Are you sure you want to delete this project? This action cannot be undone."
        confirmText="Delete"
        onConfirm={confirmDelete}
        variant="destructive"
      />
    </>
  );
}
