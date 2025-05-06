import { useState, useEffect } from "react";
import { useVnContext, calculateCurrentStep } from "@/context/vn-context";
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

interface LoadProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LoadProjectDialog({ open, onOpenChange }: LoadProjectDialogProps) {
  const { loadProject, deleteProject, projectData } = useVnContext();
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<number | null>(null);
  
  // Fetch projects
  const { data: projects = [], isLoading, error, refetch } = useQuery<any[]>({
    queryKey: ['/api/projects'],
    enabled: open, // Only fetch when dialog is open
    refetchOnWindowFocus: true,
    staleTime: 0 // Consider data stale immediately
  });
  
  // Force refresh the project list when the dialog opens
  useEffect(() => {
    if (open) {
      console.log('Dialog opened, refreshing project list');
      refetch();
    }
  }, [open, refetch]);
  
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
        <DialogContent className="w-[95vw] max-w-[95vw] sm:max-w-xl rounded-md p-4 sm:p-6">
          <DialogHeader className="pb-2 sm:pb-4">
            <DialogTitle className="text-lg sm:text-xl">Load Saved Project</DialogTitle>
            <DialogDescription className="text-sm">
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
                  className="border border-border rounded-md p-3 sm:p-4 hover:border-primary cursor-pointer"
                  onClick={() => handleSelectProject(project.id)}
                >
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                    <div className="flex-1 pr-8 sm:pr-0"> 
                      <h4 className="font-medium text-sm sm:text-base">{project.title}</h4>
                      <div className="text-xs sm:text-sm text-muted-foreground">
                        <p className="mb-1 sm:mb-0">Last edited: {formatDistanceToNow(new Date(project.updatedAt), { addSuffix: true })}</p>
                        <p>Progress: {calculateCurrentStep(project)}/6 steps</p>
                      </div>
                    </div>
                    <div className="flex space-x-2 absolute top-3 right-3 sm:static">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive h-7 w-7 sm:h-8 sm:w-8"
                        title="Delete Project"
                        onClick={(e) => handleDeleteClick(project.id, e)}
                      >
                        <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
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
          
          <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-0 justify-between sm:justify-between mt-2 sm:mt-4">
            {/* <Button
              type="button"
              variant="outline"
              onClick={handleImportProject}
              className="flex items-center justify-center text-xs sm:text-sm w-full sm:w-auto"
              size="sm"
            >
              <Upload className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" /> 
              Import Project
            </Button> */}
            <Button 
              type="button" 
              onClick={() => onOpenChange(false)}
              className="text-xs sm:text-sm w-full sm:w-auto"
              size="sm"
            >
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
