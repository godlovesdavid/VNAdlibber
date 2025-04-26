import { useVnContext } from "@/context/vn-context";
import { cn } from "@/lib/utils";

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
  
  return (
    <div className="pt-16 px-4 pb-4 bg-white shadow-sm">
      <div className="progress-bar flex items-center justify-between max-w-4xl mx-auto py-3">
        {[1, 2, 3, 4, 5, 6].map((step) => (
          <React.Fragment key={step}>
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
            
            {step < 6 && (
              <div 
                className={cn(
                  "connector h-[2px] flex-grow",
                  step < currentStep ? "bg-primary" : "bg-neutral-200"
                )}
              />
            )}
          </React.Fragment>
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
  );
}
