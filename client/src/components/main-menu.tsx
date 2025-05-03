import { useVnContext } from "@/context/vn-context";
import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { LoadProjectDialog } from "@/components/modals/load-project-dialog";
import { ShareDialog } from "@/components/modals/share-dialog";
import { Pencil, FolderOpen, Play, Share2, Beaker } from "lucide-react";

export function MainMenu() {
  const [, setLocation] = useLocation();
  const { createNewProject } = useVnContext();
  const [showLoadDialog, setShowLoadDialog] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);

  // Handle creating a new story
  const handleCreateNewStory = () => {
    createNewProject();
  };

  // Handle loading project dialog
  const handleLoadProject = () => {
    setShowLoadDialog(true);
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

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-neutral-50 px-4 py-6 sm:py-8">
      <div className="w-full max-w-md mx-auto text-center mb-6 sm:mb-10 md:mb-12">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-primary mb-1 sm:mb-2">VN Adlibber</h1>
        <p className="text-sm sm:text-base text-muted-foreground">Create your own Visual Novel adventures</p>
      </div>
      
      <div className="w-full max-w-xs space-y-2 sm:space-y-3">
        <Button 
          onClick={handleCreateNewStory} 
          className="w-full flex items-center justify-center bg-primary hover:bg-primary/90 py-4 sm:py-5 md:py-6"
          size="lg"
        >
          <Pencil className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
          <span className="text-sm sm:text-base">Create New Story</span>
        </Button>
        
        <Button 
          onClick={handleLoadProject} 
          className="w-full flex items-center justify-center bg-white border border-primary text-primary hover:bg-primary/10 py-4 sm:py-5 md:py-6"
          variant="outline"
          size="lg"
        >
          <FolderOpen className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
          <span className="text-sm sm:text-base">Load Saved Project</span>
        </Button>
        
        <Button 
          onClick={handlePlayStory} 
          className="w-full flex items-center justify-center bg-white border border-neutral-300 text-neutral-700 hover:bg-neutral-100 py-4 sm:py-5 md:py-6"
          variant="outline"
          size="lg"
        >
          <Play className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
          <span className="text-sm sm:text-base">Play Story</span>
        </Button>
        
        <Button 
          onClick={handleShareStories} 
          className="w-full flex items-center justify-center bg-white border border-neutral-300 text-neutral-700 hover:bg-neutral-100 py-4 sm:py-5 md:py-6"
          variant="outline"
          size="lg"
        >
          <Share2 className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
          <span className="text-sm sm:text-base">Share Stories</span>
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
      <ShareDialog 
        open={showShareDialog} 
        onOpenChange={setShowShareDialog} 
      />
    </div>
  );
}

export default MainMenu;
