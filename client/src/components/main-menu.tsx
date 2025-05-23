import { useVnContext } from "@/context/vn-context";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { LoadProjectDialog } from "@/components/modals/load-project-dialog";
import { ProjectSharingDialog } from "@/components/modals/project-sharing-dialog";
import { useToast } from "@/hooks/use-toast";
import { Pencil, FolderOpen, Play, Share2, Beaker, RotateCcw, Settings, Languages } from "lucide-react";
import { useTranslation } from "react-i18next";
import { FlagSelector } from "@/components/flag-selector";
import logoSrc from "../assets/logo.webp";

export function MainMenu() {
  const [, setLocation] = useLocation();
  const { createNewProject, projectData, loadFromLocalStorage } = useVnContext();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [showLoadDialog, setShowLoadDialog] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [hasContinueProject, setHasContinueProject] = useState(false);
  
  // Check if there's a project in localStorage to continue
  useEffect(() => {
    const savedProject = localStorage.getItem("current_vn_project");
    setHasContinueProject(!!savedProject);
  }, []);
  
  // Handle creating a new story
  const handleCreateNewStory = () => {
    createNewProject();
  };

  // Handle loading project dialog
  const handleLoadProject = () => {
    setShowLoadDialog(true);
  };
  
  // Handle continuing the most recent project
  const handleContinueProject = () => {
    // Load from localStorage then navigate to the appropriate step
    if (loadFromLocalStorage()) {
      // If we have project data and a current step, go to that step
      if (projectData && projectData.currentStep) {
        const stepRoutes = [
          "/create/basic",
          "/create/concept",
          "/create/characters",
          "/create/paths",
          "/create/plot",
          "/create/generate-vn",
        ];
        const stepIndex = Math.min(
          projectData.currentStep - 1,
          stepRoutes.length - 1
        );
        setLocation(stepRoutes[stepIndex]);
      } else {
        // Default to the first step if no step is specified
        setLocation("/create/basic");
      }
    } else {
      toast({
        title: t('common.error', 'Error'),
        description: t('mainMenu.noRecentProject', 'No recent project found to continue'),
        variant: "destructive",
      });
    }
  };

  // Handle play story
  const handlePlayStory = () => {
    setLocation("/play");
  };

  // Handle share stories
  const handleShareStories = () => {
    setShowShareDialog(true);
  };
  
  // Handle test player navigation
  const handleTestPlayer = () => {
    setLocation("/test-player");
  };
  
  // Handle navigation to translation settings
  const handleTranslationSettings = () => {
    setLocation("/settings/translations");
  };
  
  // Handle navigation to translation manager
  const handleTranslationManager = () => {
    setLocation("/tools/translation-manager");
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-neutral-50 px-4 py-8">
      <div className="fixed top-4 right-4">
        <FlagSelector />
      </div>
      <div className="w-full max-w-md mx-auto text-center mb-12">
        <img 
          src={logoSrc} 
          alt="Visual Novel Creator Logo" 
          className="w-1/3 aspect-auto mx-auto mb-4 object-contain"
        />
        <h1 className="text-5xl text-primary font-bold mb-2">{t('mainMenu.title', 'Visual Novel Ad Lib')}</h1>
        <p className="text-muted-foreground">{t('mainMenu.subtitle', 'Dream it. Play it. Share it.')}</p>
      </div>
      
      <div className="w-full max-w-xs space-y-3">
        <Button 
          onClick={handleCreateNewStory} 
          className="w-full flex items-center justify-center bg-primary hover:bg-primary/90 py-6"
          size="lg"
        >
          <Pencil className="mr-2 h-5 w-5" />
          {t('mainMenu.createNewStory', 'Create New Story')}
        </Button>
        
        {/* {hasContinueProject && (
          <Button 
            onClick={handleContinueProject} 
            className="w-full flex items-center justify-center bg-white border border-green-600 text-green-600 hover:bg-green-50 py-6"
            variant="outline"
            size="lg"
          >
            <RotateCcw className="mr-2 h-5 w-5" />
            Continue Recent Project
          </Button>
        )} */}
        
        <Button 
          onClick={handleLoadProject} 
          className="w-full flex items-center justify-center bg-white border border-primary text-primary hover:bg-primary/10 py-6"
          variant="outline"
          size="lg"
        >
          <FolderOpen className="mr-2 h-5 w-5" />
          {t('mainMenu.loadSavedProject', 'Load Saved Project')}
        </Button>
        
        <Button 
          onClick={handlePlayStory} 
          className="w-full flex items-center justify-center bg-white border border-neutral-300 text-neutral-700 hover:bg-neutral-100 py-6"
          variant="outline"
          size="lg"
        >
          <Play className="mr-2 h-5 w-5" />
          {t('mainMenu.playStory', 'Play Story')}
        </Button>
        
        <Button 
          onClick={handleShareStories} 
          className="w-full flex items-center justify-center bg-white border border-neutral-300 text-neutral-700 hover:bg-neutral-100 py-6"
          variant="outline"
          size="lg"
        >
          <Share2 className="mr-2 h-5 w-5" />
          {t('mainMenu.shareStories', 'Share Stories')}
        </Button>
        
        <Button 
          onClick={handleTranslationManager} 
          className="w-full flex items-center justify-center bg-white border border-indigo-500 text-indigo-600 hover:bg-indigo-50 py-6"
          variant="outline"
          size="lg"
        >
          <Languages className="mr-2 h-5 w-5" />
          {t('mainMenu.translationManager', 'Translation Manager')}
        </Button>

        {/* <Button 
          onClick={handleTestPlayer} 
          className="w-full flex items-center justify-center bg-green-600 text-white hover:bg-green-700 py-6"
          variant="default"
          size="lg"
        >
          <Beaker className="mr-2 h-5 w-5" />
          Test VN Player
        </Button> */}
      </div>

      {/* Load Project Dialog */}
      <LoadProjectDialog 
        open={showLoadDialog} 
        onOpenChange={setShowLoadDialog} 
      />

      {/* Share Dialog */}
      <ProjectSharingDialog 
        open={showShareDialog} 
        onOpenChange={setShowShareDialog} 
      />
    </div>
  );
}

export default MainMenu;
