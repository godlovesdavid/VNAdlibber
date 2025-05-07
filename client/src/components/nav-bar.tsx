import { useVnContext } from "@/context/vn-context";
import { Link, useLocation } from "wouter";
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
  const { projectData, hasUnsavedChanges } = useVnContext();
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [sharingDialogOpen, setSharingDialogOpen] = useState(false);

  // Check if we're on a form page
  const isFormPage = () => {
    return location.includes("/create/");
  };


  // Go back to main menu with confirmation for form pages
  const handleBackClick = async () => {
    console.log("[NavBar] Back button clicked");
    if (isFormPage()) {
      const hasChanges = hasUnsavedChanges();
      console.log("[NavBar] hasUnsavedChanges returned:", hasChanges);

      if (hasChanges) {
        console.log("[NavBar] Showing confirmation dialog");
        setConfirmDialogOpen(true);
      } else {
        // No unsaved changes, just go back to main menu
        console.log("[NavBar] No unsaved changes, going back to main menu");
        setLocation("/");
      }
    } else {
      console.log("[NavBar] Not on a form page, going back to main menu");
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
    return location.includes("/play/") || location.includes("/shared/");
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
              {projectData?.title ? projectData.title : "VN Ad Libber"}
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
              Any unsaved changes on this form will be lost. Are you sure you
              want to return to the main menu?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmGoToMainMenu}>
              Continue
            </AlertDialogAction>
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
