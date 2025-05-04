import { useVnContext } from "@/context/vn-context";
import { Link, useLocation } from "wouter";
import { SaveProjectButton } from "@/components/save-project-button";
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
        <div className="flex items-center space-x-2">
          {/* <Link href="/font-demo">
            <Button size="sm" variant="ghost" className="flex items-center gap-1">
              <Type className="h-4 w-4" />
              <span className="hidden sm:inline">Fonts</span>
            </Button>
          </Link> */}
          <SaveProjectButton />
        </div>
      </div>
    </nav>
  );
}
