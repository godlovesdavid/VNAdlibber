import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ImageIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Character } from "@/types/vn";

// Character portrait component with 2:3 aspect ratio
export function CharacterPortrait({ 
  character, 
  index, 
  onGenerate 
}: { 
  character: any, 
  index: number, 
  onGenerate: (index: number) => void 
}) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [portraitUrl, setPortraitUrl] = useState<string | null>(null);
  const { toast } = useToast();
  
  const handleGenerateClick = async () => {
    if (!character.name || !character.appearance) {
      toast({
        title: "Missing Details",
        description: "Please provide at least a name and appearance description before generating a portrait.",
        variant: "destructive"
      });
      return;
    }
    
    setIsGenerating(true);
    
    try {
      await onGenerate(index);
    } catch (error) {
      console.error("Error generating portrait:", error);
    } finally {
      setIsGenerating(false);
    }
  };
  
  return (
    <div className="flex flex-col items-center justify-center bg-gray-50 rounded-md p-3">
      <div className="relative w-full" style={{ aspectRatio: '2/3' }}>
        {portraitUrl ? (
          <img 
            src={portraitUrl} 
            alt={`Portrait of ${character.name || 'character'}`}
            className="w-full h-full object-cover rounded-md shadow-md"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-200 rounded-md">
            <ImageIcon className="h-16 w-16 text-gray-400" />
          </div>
        )}
        
        {isGenerating && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-md">
            <svg
              className="animate-spin h-10 w-10 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
          </div>
        )}
      </div>
      
      <Button
        onClick={handleGenerateClick}
        variant="outline"
        className="mt-3 w-full"
        disabled={isGenerating}
      >
        <ImageIcon className="mr-1 h-4 w-4" />
        Generate Portrait
      </Button>
    </div>
  );
}