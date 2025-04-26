import { Fragment } from "react";
import { useVnContext } from "@/context/vn-context";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface CreationProgressProps {
  currentStep: number;
}

export function CreationProgress({ currentStep }: CreationProgressProps) {
  const { goToStep, projectData } = useVnContext();
  
  const maxStep = projectData?.currentStep || 1;
  
  // Handle click on step
  const handleStepClick = (step: number) => {
    if (step <= maxStep) {
      goToStep(step);
    }
  };

  // Get tooltip content based on step
  const getTooltipContent = (step: number): string => {
    if (!projectData) return "";
    
    switch(step) {
      case 1: // Basic
        if (!projectData.basicData) return "Basic information not set";
        return `Theme: ${projectData.basicData.theme}
                Tone: ${projectData.basicData.tone}
                Genre: ${projectData.basicData.genre}`;
      
      case 2: // Concept
        if (!projectData.conceptData) return "Concept not set";
        return `Title: ${projectData.conceptData.title}
                Tagline: ${projectData.conceptData.tagline}
                Premise: ${projectData.conceptData.premise?.substring(0, 100)}${projectData.conceptData.premise?.length > 100 ? '...' : ''}`;
      
      case 3: // Characters
        if (!projectData.charactersData?.characters || projectData.charactersData.characters.length === 0) 
          return "Characters not set";
        return `Characters: ${projectData.charactersData.characters.map(c => c.name).join(", ")}`;
      
      case 4: // Paths
        if (!projectData.pathsData?.routes || projectData.pathsData.routes.length === 0) 
          return "Paths not set";
        return `Paths: ${projectData.pathsData.routes.map(r => r.title).join(", ")}`;
      
      case 5: // Plot
        if (!projectData.plotData?.plotOutline) return "Plot not set";
        return `Plot structure: 
                Act 1: ${projectData.plotData.plotOutline.act1?.title || 'Not set'}
                Act 2: ${projectData.plotData.plotOutline.act2?.title || 'Not set'}
                Act 3: ${projectData.plotData.plotOutline.act3?.title || 'Not set'}
                Act 4: ${projectData.plotData.plotOutline.act4?.title || 'Not set'}
                Act 5: ${projectData.plotData.plotOutline.act5?.title || 'Not set'}`;
      
      case 6: // Generate
        if (!projectData.generatedActs || Object.keys(projectData.generatedActs).length === 0) 
          return "No acts generated yet";
        return `Generated acts: ${Object.keys(projectData.generatedActs).length}/5 complete`;
      
      default:
        return "";
    }
  };
  
  return (
    <TooltipProvider>
      <div className="pt-16 px-4 pb-4 bg-white shadow-sm">
        <div className="progress-bar flex items-center justify-between max-w-4xl mx-auto py-3">
          {[1, 2, 3, 4, 5, 6].map((step) => (
            <div key={step} className="flex items-center">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div 
                    className={cn(
                      "flex items-center justify-center w-8 h-8 rounded-full border-2 text-sm font-medium cursor-pointer",
                      step < currentStep && "bg-primary text-white border-primary", // completed
                      step === currentStep && "text-primary border-primary", // active
                      step > currentStep && "border-neutral-300 text-neutral-500", // future
                      step > maxStep && "cursor-not-allowed opacity-50" // disabled
                    )}
                    onClick={() => handleStepClick(step)}
                  >
                    {step}
                  </div>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs whitespace-pre-line">
                  {step <= maxStep 
                    ? getTooltipContent(step) 
                    : "This step is not yet available"}
                </TooltipContent>
              </Tooltip>
              
              {step < 6 && (
                <div 
                  className={cn(
                    "connector h-[2px] flex-grow",
                    step < currentStep ? "bg-primary" : "bg-neutral-200"
                  )}
                />
              )}
            </div>
          ))}
        </div>
        
        <div className="flex justify-between text-xs text-neutral-500 max-w-4xl mx-auto px-1">
          <span>Basic</span>
          <span>Concept</span>
          <span>Characters</span>
          <span>Paths</span>
          <span>Plot</span>
          <span>Generate</span>
        </div>
      </div>
    </TooltipProvider>
  );
}
