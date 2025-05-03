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
        if (!projectData.charactersData || Object.keys(projectData.charactersData).length === 0) 
          return "Characters not set";
        return `Characters: ${Object.keys(projectData.charactersData).join(", ")}${projectData?.protagonist ? `\nProtagonist: ${projectData.protagonist}` : ''}`; 
      
      case 4: // Paths
        if (!projectData.pathsData || Object.keys(projectData.pathsData).length === 0) 
          return "Paths not set";
        return `Paths: ${Object.keys(projectData.pathsData).join(", ")}`; 
      
      case 5: // Plot
        if (!projectData.plotData?.plotOutline) return "Plot not set";
        const acts = [];
        for (let i = 1; i <= 5; i++) {
          const actKey = `act${i}`;
          const act = projectData.plotData.plotOutline[actKey as keyof typeof projectData.plotData.plotOutline];
          if (act && typeof act === 'object' && 'title' in act) {
            acts.push(`Act ${i}: ${act.title || 'Not set'}`);
          } else {
            acts.push(`Act ${i}: Not set`);
          }
        }
        return `Plot structure: \n${acts.join('\n')}`;
      
      case 6: // Generate
        if (!projectData.generatedActs || Object.keys(projectData.generatedActs).length === 0) 
          return "No acts generated yet";
        return `Generated acts: ${Object.keys(projectData.generatedActs).length}/5 complete`;
      
      default:
        return "";
    }
  };
  
  return (
    <div className="pt-16 px-4 pb-4 bg-white shadow-sm">
      <div className="max-w-3xl mx-auto">
        {/* Progress circles with connector lines */}
        <div className="progress-bar flex items-center justify-between py-3">
          {[1, 2, 3, 4, 5, 6].map((step) => (
            <div key={step} className="flex flex-col items-center">
              <div className="flex items-center">
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
                      "connector h-[2px] w-12 md:w-20 lg:w-24",
                      step < currentStep ? "bg-primary" : "bg-neutral-200"
                    )}
                  />
                )}
              </div>
              
              {/* Step label directly below each circle */}
              <span className="text-xs text-neutral-500 mt-1">
                {step === 1 && "Basic"}
                {step === 2 && "Concept"}
                {step === 3 && "Characters"}
                {step === 4 && "Paths"}
                {step === 5 && "Plot"}
                {step === 6 && "Generate"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
