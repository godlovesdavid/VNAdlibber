import { useVnContext } from "@/context/vn-context";
import { useLocation } from "wouter";
import { SaveProjectButton } from "@/components/save-project-button";
import { ArrowLeft } from "lucide-react";

export function NavBar() {
  const [, setLocation] = useLocation();
  const { projectData } = useVnContext();
  
  // Go back to main menu
  const goToMainMenu = () => {
    setLocation("/");
  };
  
  return (
    <nav className="bg-white shadow-sm px-4 py-3 fixed top-0 left-0 w-full z-10">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button 
            className="text-neutral-500 hover:text-primary transition-colors"
            onClick={goToMainMenu}
            aria-label="Back to main menu"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-semibold text-primary">
            {projectData?.title ? projectData.title : 'VN Adlibber'}
          </h1>
        </div>
        <div>
          <SaveProjectButton />
        </div>
      </div>
    </nav>
  );
}
