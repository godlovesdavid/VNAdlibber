import { useVnContext } from "@/context/vn-context";
import { Link, useLocation } from "wouter";
import { SaveProjectButton } from "@/components/save-project-button";
import { ShareButton } from "@/components/share-button";
import { ArrowLeft, Type } from "lucide-react";
import { Button } from "@/components/ui/button";

export function NavBar() {
  const [, setLocation] = useLocation();
  const { projectData } = useVnContext();
  
  // Go back to main menu
  const goToMainMenu = () => {
    setLocation("/");
  };
  
  return (
    <nav className="bg-white shadow-sm px-4 py-3 w-full z-10">
      <div className="flex items-center justify-between">
        <div className="w-1/3 flex items-center">
          <button 
            className="text-neutral-500 hover:text-primary transition-colors"
            onClick={goToMainMenu}
            aria-label="Back to main menu"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        </div>
        <div className="w-1/3 flex justify-center">
          <h1 className="text-lg font-semibold text-primary text-center">
            {projectData?.title ? projectData.title : 'VN Adlibber'}
          </h1>
        </div>
        <div className="w-1/3 flex items-center justify-end space-x-2">
          <ShareButton 
            title={projectData?.title || 'VN Adlibber'} 
            variant="outline" 
            size="sm" 
          />
          <SaveProjectButton />
        </div>
      </div>
    </nav>
  );
}
