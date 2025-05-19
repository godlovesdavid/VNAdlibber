import { Fragment } from "react";
import { useVnContext } from "@/context/vn-context";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTranslation } from "react-i18next";

interface CreationProgressProps {
  currentStep: number;
}

export function CreationProgress({ currentStep }: CreationProgressProps) {
  const { goToStep, projectData } = useVnContext();
  const { t } = useTranslation();
  
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
        if (!projectData.basicData) return t('creationProgress.tooltips.basicNotSet', 'Basic information not set');
        return t('creationProgress.tooltips.basicInfo', 'Theme: {{theme}}\nTone: {{tone}}\nGenre: {{genre}}', {
          theme: projectData.basicData.theme,
          tone: projectData.basicData.tone,
          genre: projectData.basicData.genre
        });
      
      case 2: // Concept
        if (!projectData.conceptData) return t('creationProgress.tooltips.conceptNotSet', 'Concept not set');
        return t('creationProgress.tooltips.conceptInfo', 'Title: {{title}}\nTagline: {{tagline}}\nPremise: {{premise}}', {
          title: projectData.conceptData.title,
          tagline: projectData.conceptData.tagline,
          premise: projectData.conceptData.premise?.substring(0, 100) + (projectData.conceptData.premise?.length > 100 ? '...' : '')
        });
      
      case 3: // Characters
        if (!projectData.charactersData || Object.keys(projectData.charactersData).length === 0) 
          return t('creationProgress.tooltips.charactersNotSet', 'Characters not set');
          
        const protagonistInfo = projectData?.protagonist ? 
          t('creationProgress.tooltips.protagonist', '\nProtagonist: {{name}}', { name: projectData.protagonist }) : '';
          
        return t('creationProgress.tooltips.charactersInfo', 'Characters: {{characters}}{{protagonist}}', {
          characters: Object.keys(projectData.charactersData).join(", "),
          protagonist: protagonistInfo
        });
      
      case 4: // Paths
        if (!projectData.pathsData || Object.keys(projectData.pathsData).length === 0) 
          return t('creationProgress.tooltips.pathsNotSet', 'Paths not set');
        return t('creationProgress.tooltips.pathsInfo', 'Paths: {{paths}}', {
          paths: Object.keys(projectData.pathsData).join(", ")
        });
      
      case 5: // Plot
        if (!projectData.plotData || Object.keys(projectData.plotData).length === 0) 
          return t('creationProgress.tooltips.plotNotSet', 'Plot not set');
        const acts = [];
        for (let i = 1; i <= 5; i++) {
          const actKey = `act${i}`;
          const act = projectData.plotData[actKey as keyof typeof projectData.plotData];
          if (act && typeof act === 'object' && 'title' in act) {
            acts.push(t('creationProgress.tooltips.act', 'Act {{number}}: {{title}}', {
              number: i,
              title: act.title || t('creationProgress.tooltips.notSet', 'Not set')
            }));
          } else {
            acts.push(t('creationProgress.tooltips.act', 'Act {{number}}: {{title}}', {
              number: i,
              title: t('creationProgress.tooltips.notSet', 'Not set')
            }));
          }
        }
        return t('creationProgress.tooltips.plotStructure', 'Plot structure: \n{{acts}}', {
          acts: acts.join('\n')
        });
      
      case 6: // Generate
        if (!projectData.generatedActs || Object.keys(projectData.generatedActs).length === 0) 
          return t('creationProgress.tooltips.noActsGenerated', 'No acts generated yet');
        return t('creationProgress.tooltips.generatedActs', 'Generated acts: {{count}}/5 complete', {
          count: Object.keys(projectData.generatedActs).length
        });
      
      default:
        return "";
    }
  };
  
  return (
    <div className="pt-12 sm:pt-14 md:pt-16 px-2 sm:px-4 pb-2 sm:pb-4 bg-white shadow-sm">
      <div className="max-w-3xl mx-auto">
        {/* Progress circles with connector lines */}
        <div className="progress-bar flex items-center justify-between py-2 sm:py-3 overflow-x-auto sm:overflow-x-auto md:overflow-visible pb-3 sm:pb-4">
          {[1, 2, 3, 4, 5, 6].map((step) => (
            <div key={step} className="flex flex-col items-center min-w-[38px] sm:min-w-[44px] md:min-w-0">
              <div className="flex items-center">
                <TooltipProvider delayDuration={300}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div 
                        className={cn(
                          "flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 rounded-full border-2 text-[10px] sm:text-xs md:text-sm font-medium cursor-pointer",
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
                    <TooltipContent className="max-w-xs whitespace-pre-line text-xs sm:text-sm">
                      {step <= maxStep 
                        ? getTooltipContent(step) 
                        : t('creationProgress.stepNotAvailable', 'This step is not yet available')}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                
                {step < 6 && (
                  <div 
                    className={cn(
                      "connector h-[2px] w-3 sm:w-6 md:w-12 lg:w-20",
                      step < currentStep ? "bg-primary" : "bg-neutral-200"
                    )}
                  />
                )}
              </div>
              
              {/* Step label directly below each circle */}
              <div className="text-[8px] sm:text-[8px] md:text-xs text-neutral-500 mt-1 text-center w-full max-w-[45px] sm:max-w-[70px] truncate">
                {step === 1 && t('creationProgress.steps.basic', 'Basics')}
                {step === 2 && t('creationProgress.steps.concept', 'Concept')}
                {step === 3 && t('creationProgress.steps.characters', 'Characters')}
                {step === 4 && t('creationProgress.steps.paths', 'Paths')}
                {step === 5 && t('creationProgress.steps.plot', 'Plot')}
                {step === 6 && t('creationProgress.steps.generate', 'Generate!')}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
