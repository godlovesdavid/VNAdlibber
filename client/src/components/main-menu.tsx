import { useVnContext } from "@/context/vn-context";
import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { LoadProjectDialog } from "@/components/modals/load-project-dialog";
import { ShareDialog } from "@/components/modals/share-dialog";
import { Pencil, FolderOpen, Play, Share2, Beaker } from "lucide-react";
import logoImage from "@assets/image_1746248981035.png";

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
    <div className="flex flex-col items-center justify-center min-h-screen bg-neutral-50 px-4 py-8">
      <div className="w-full max-w-md mx-auto text-center mb-12">
        <h1 className="text-4xl font-bold text-primary mb-2 font-title">Visual Novel Ad-libber</h1>
        <p className="text-muted-foreground font-vn">Dream up your own VN with AI!</p>
      </div>
      
      <div className="w-full max-w-xs space-y-3">
        <Button 
          onClick={handleCreateNewStory} 
          className="w-full flex items-center justify-center bg-primary hover:bg-primary/90 py-6"
          size="lg"
        >
          <Pencil className="mr-2 h-5 w-5" />
          Create New Story
        </Button>
        
        <Button 
          onClick={handleLoadProject} 
          className="w-full flex items-center justify-center bg-white border border-primary text-primary hover:bg-primary/10 py-6"
          variant="outline"
          size="lg"
        >
          <FolderOpen className="mr-2 h-5 w-5" />
          Load Saved Project
        </Button>
        
        <Button 
          onClick={handlePlayStory} 
          className="w-full flex items-center justify-center bg-white border border-neutral-300 text-neutral-700 hover:bg-neutral-100 py-6"
          variant="outline"
          size="lg"
        >
          <Play className="mr-2 h-5 w-5" />
          Play Story
        </Button>
        
        <Button 
          onClick={handleShareStories} 
          className="w-full flex items-center justify-center bg-white border border-neutral-300 text-neutral-700 hover:bg-neutral-100 py-6"
          variant="outline"
          size="lg"
        >
          <Share2 className="mr-2 h-5 w-5" />
          Share Stories
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
