import { useState, useCallback } from "react";
import { useVnContext } from "@/context/vn-context";
import { useToast } from "@/hooks/use-toast";
import { 
  generateConcept, 
  generatePlot, 
  generateAct,
  GenerationResult
} from "@/lib/openai";
import { apiRequest } from "@/lib/queryClient";

export function useVnData() {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  // For batch operations we'll use a separate controller
  const [batchMode, setBatchMode] = useState(false);
  const vnContext = useVnContext();
  
  // Generate concept using AI
  const generateConceptData = useCallback(async () => {
    if (!vnContext.projectData || !vnContext.projectData.basicData) {
      toast({
        title: "Error",
        description: "Missing basic data",
        variant: "destructive",
      });
      return null;
    }
    
    try {
      setIsGenerating(true);
      const controller = new AbortController();
      setAbortController(controller);
      
      const { theme, tone, genre } = vnContext.projectData.basicData;
      const result = await generateConcept(
        { theme, tone, genre }, 
        controller.signal
      );
      
      setAbortController(null);
      
      // Check for validation errors from AI
      if (result && result.error) {
        toast({
          title: "Content Validation Failed",
          description: result.error,
          variant: "destructive",
          duration: 60000,
        });
        return null;
      }
      
      return result.data;
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        toast({
          title: "Generation Failed",
          description: "Failed to generate concept. Please try again.",
          variant: "destructive",
        });
        console.error("Error generating concept:", error);
      }
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, [vnContext.projectData, toast]);
  
  // Generate character details using AI
  const generateCharacterData = useCallback(async (
    index: number, 
    partialCharacter: any
  ) => {
    if (!vnContext.projectData) {
      toast({
        title: "Error",
        description: "Missing project data",
        variant: "destructive",
      });
      return null;
    }
    
    try {
      setIsGenerating(true);
      const controller = new AbortController();
      setAbortController(controller);
      
      // Use our unified characters endpoint
      const response = await apiRequest(
        "POST",
        "/api/generate/characters",
        {
          indices: [index],
          characterTemplates: [partialCharacter],
          projectContext: {
            basicData: vnContext.projectData.basicData,
            conceptData: vnContext.projectData.conceptData,
          }
        },
        controller.signal
      );
      
      const result = await response.json();
      
      setAbortController(null);
      
      // Check if the API returned an error
      if (result.error || result.message) {
        const errorMessage = result.error || result.message;
        toast({
          title: "Content Validation Failed",
          description: errorMessage,
          variant: "destructive",
          duration: 60000,
        });
        return null;
      }
      
      // Return just the first character since we only requested one
      return Array.isArray(result) && result.length > 0 ? result[0] : null;
    } catch (error: any) {
      if ((error as Error).name !== 'AbortError') {
        // Try to extract error message from the error response if it exists
        let errorMsg = "Failed to generate character details. Please try again.";
        
        try {
          // If error has a data property with message
          if (error.data && (error.data.message || error.data.error)) {
            errorMsg = error.data.message || error.data.error;
          } 
          // If error has detailed message in the error string
          else if (error.message && error.message.includes(':')) {
            const parts = error.message.split(':');
            if (parts.length > 1) {
              errorMsg = parts.slice(1).join(':').trim();
            }
          }
        } catch (parseError) {
          console.error("Failed to parse error data:", parseError);
        }
        
        toast({
          title: "Content Validation Failed",
          description: errorMsg,
          variant: "destructive",
          duration: 60000,
        });
        console.error("Error generating character:", error);
      }
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, [vnContext.projectData, toast]);
  
  // Generate path details using AI
  const generatePathData = useCallback(async (
    index: number, 
    partialPath: any
  ) => {
    if (!vnContext.projectData) {
      toast({
        title: "Error",
        description: "Missing project data",
        variant: "destructive",
      });
      return null;
    }
    
    try {
      setIsGenerating(true);
      const controller = new AbortController();
      setAbortController(controller);
      
      // Create the project context object used for both validation and generation
      const projectContext = {
        basicData: vnContext.projectData.basicData,
        conceptData: vnContext.projectData.conceptData,
        charactersData: vnContext.projectData.charactersData,
      };
      
      // STEP 1: Validate the content first
      console.log("🔍 Validating content before generation...");
      const validationResponse = await apiRequest(
        "POST",
        "/api/validate/paths",
        { projectContext },
        controller.signal
      );
      
      // Check if the validation controller was aborted
      if (controller.signal.aborted) {
        console.log("Validation was cancelled by user");
        return null;
      }
      
      const validationResult = await validationResponse.json();
      
      // If validation failed, show error and stop
      if (!validationResult.valid || validationResult.message) {
        const errorMessage = validationResult.message || "Content validation failed";
        toast({
          title: "Content Validation Failed",
          description: errorMessage,
          variant: "destructive",
          duration: 60000,
        });
        setIsGenerating(false);
        setAbortController(null);
        return null;
      }
      
      console.log("✅ Content validated successfully, proceeding to generation");
      
      // STEP 2: Generate the path after validation passes
      // Use our unified paths endpoint (without validation)
      const generationResponse = await apiRequest(
        "POST",
        "/api/generate/paths",
        {
          indices: [index],
          pathTemplates: [partialPath],
          projectContext
        },
        controller.signal
      );
      
      // Check if the generation controller was aborted
      if (controller.signal.aborted) {
        console.log("Generation was cancelled by user");
        return null;
      }
      
      const result = await generationResponse.json();
      console.log("🔥 Generated path:", result);
      
      setAbortController(null);
      
      // Return just the first path since we only requested one
      return Array.isArray(result) && result.length > 0 ? result[0] : null;
    } catch (error: any) {
      if ((error as Error).name !== 'AbortError') {
        // Try to extract error message from the error response if it exists
        let errorMsg = "Failed to generate path details. Please try again.";
        
        try {
          // If error has a response property (fetch error), try to parse it
          if (error.response) {
            const errorData = await error.response.json();
            if (errorData.message || errorData.error) {
              errorMsg = errorData.message || errorData.error;
            }
          } else if (error.message) {
            errorMsg = error.message;
          }
        } catch (parseError) {
          console.error("Failed to parse error response:", parseError);
        }
        
        toast({
          title: "Generation Failed",
          description: errorMsg,
          variant: "destructive",
        });
        console.error("Error in two-step path generation:", error);
      }
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, [vnContext.projectData, toast]);
  
  // Generate plot outline using AI (with two-step validation)
  const generatePlotData = useCallback(async () => {
    if (!vnContext.projectData) {
      toast({
        title: "Error",
        description: "Missing project data",
        variant: "destructive",
      });
      return null;
    }
    
    try {
      setIsGenerating(true);
      const controller = new AbortController();
      setAbortController(controller);
      
      // Create the project context object used for both validation and generation
      const projectContext = {
        basicData: vnContext.projectData.basicData,
        conceptData: vnContext.projectData.conceptData,
        charactersData: vnContext.projectData.charactersData,
        pathsData: vnContext.projectData.pathsData,
      };
      
      // STEP 1: Validate the content first
      console.log("🔍 Validating plot context before generation...");
      const validationResponse = await apiRequest(
        "POST",
        "/api/validate/plot",
        { projectContext },
        controller.signal
      );
      
      // Check if the validation controller was aborted
      if (controller.signal.aborted) {
        console.log("Plot validation was cancelled by user");
        return null;
      }
      
      const validationResult = await validationResponse.json();
      
      // If validation failed, show error and stop
      if (!validationResult.valid || validationResult.message) {
        const errorMessage = validationResult.message || "Content validation failed";
        toast({
          title: "Content Validation Failed",
          description: errorMessage,
          variant: "destructive",
          duration: 60000,
        });
        setIsGenerating(false);
        setAbortController(null);
        return null;
      }
      
      console.log("✅ Plot context validated successfully, proceeding to generation");
      
      // STEP 2: Generate the plot after validation passes
      // Use the API directly instead of the wrapper function
      const generationResponse = await apiRequest(
        "POST",
        "/api/generate/plot",
        { projectContext },
        controller.signal
      );
      
      // Check if the generation controller was aborted
      if (controller.signal.aborted) {
        console.log("Plot generation was cancelled by user");
        return null;
      }
      
      const result = await generationResponse.json();
      console.log("🔥 Generated plot outline:", result);
      
      setAbortController(null);
      
      return result;
    } catch (error: any) {
      if ((error as Error).name !== 'AbortError') {
        // Try to extract error message from the error response if it exists
        let errorMsg = "Failed to generate plot outline. Please try again.";
        
        try {
          // If error has a data property with message
          if (error.data && (error.data.message || error.data.error)) {
            errorMsg = error.data.message || error.data.error;
          } 
          // If error has detailed message in the error string
          else if (error.message && error.message.includes(':')) {
            const parts = error.message.split(':');
            if (parts.length > 1) {
              errorMsg = parts.slice(1).join(':').trim();
            }
          }
        } catch (parseError) {
          console.error("Failed to parse error data:", parseError);
        }
        
        toast({
          title: "Generation Failed",
          description: errorMsg,
          variant: "destructive",
          duration: 60000,
        });
        console.error("Error in two-step plot generation:", error);
      }
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, [vnContext.projectData, toast]);
  
  // Generate act scenes using AI (with two-step validation)
  const generateActData = useCallback(async (
    actNumber: number, 
    scenesCount: number
  ): Promise<GenerationResult<any> | null> => {
    if (!vnContext.projectData || !vnContext.projectData.plotData) {
      toast({
        title: "Error",
        description: "Missing plot data",
        variant: "destructive",
      });
      return null;
    }
    
    try {
      setIsGenerating(true);
      const controller = new AbortController();
      setAbortController(controller);
      
      // Create the project context object used for both validation and generation
      const projectContext = {
        basicData: vnContext.projectData.basicData,
        conceptData: vnContext.projectData.conceptData,
        charactersData: vnContext.projectData.charactersData,
        pathsData: vnContext.projectData.pathsData,
        plotData: vnContext.projectData.plotData,
        playerData: vnContext.playerData,
      };
      
      // STEP 1: Validate the content first
      console.log(`🔍 Validating Act ${actNumber} content before generation...`);
      const validationResponse = await apiRequest(
        "POST",
        "/api/validate/act",
        { projectContext },
        controller.signal
      );
      
      // Check if the validation controller was aborted
      if (controller.signal.aborted) {
        console.log(`Act ${actNumber} validation was cancelled by user`);
        return null;
      }
      
      const validationResult = await validationResponse.json();
      
      // If validation failed, show error and stop
      if (!validationResult.valid || validationResult.message) {
        const errorMessage = validationResult.message || "Content validation failed";
        toast({
          title: "Content Validation Failed",
          description: errorMessage,
          variant: "destructive",
          duration: 60000,
        });
        setIsGenerating(false);
        setAbortController(null);
        return { error: errorMessage } as GenerationResult<any>;
      }
      
      console.log(`✅ Act ${actNumber} content validated successfully, proceeding to generation`);
      
      // STEP 2: Generate the act after validation passes
      // Use the API directly instead of the wrapper function
      const generationResponse = await apiRequest(
        "POST",
        "/api/generate/act",
        {
          actNumber,
          scenesCount,
          projectContext
        },
        controller.signal
      );
      
      // Check if the generation controller was aborted
      if (controller.signal.aborted) {
        console.log(`Act ${actNumber} generation was cancelled by user`);
        return null;
      }
      
      const result = await generationResponse.json();
      console.log(`🔥 Generated Act ${actNumber}:`, result);
      
      setAbortController(null);
      
      return { data: result } as GenerationResult<any>;
    } catch (error: any) {
      if ((error as Error).name !== 'AbortError') {
        // Try to extract error message from the error response if it exists
        let errorMsg = `Failed to generate Act ${actNumber}. Please try again.`;
        
        try {
          // If error has a data property with message
          if (error.data && (error.data.message || error.data.error)) {
            errorMsg = error.data.message || error.data.error;
          } 
          // If error has detailed message in the error string
          else if (error.message && error.message.includes(':')) {
            const parts = error.message.split(':');
            if (parts.length > 1) {
              errorMsg = parts.slice(1).join(':').trim();
            }
          }
        } catch (parseError) {
          console.error("Failed to parse error data:", parseError);
        }
        
        toast({
          title: "Generation Failed",
          description: errorMsg,
          variant: "destructive",
          duration: 60000,
        });
        console.error(`Error in two-step Act ${actNumber} generation:`, error);
      }
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, [vnContext.projectData, vnContext.playerData, toast]);
  
  // Generate multiple characters at once
  const generateMultipleCharactersData = useCallback(async (
    characterTemplates: any[]
  ) => {
    if (!vnContext.projectData) {
      toast({
        title: "Error",
        description: "Missing project data",
        variant: "destructive",
      });
      return null;
    }
    
    try {
      setIsGenerating(true);
      const controller = new AbortController();
      setAbortController(controller);
      
      // Create indices based on the number of templates
      const indices = Array.from({ length: characterTemplates.length }, (_, i) => i);
      
      // Use our unified characters endpoint
      const response = await apiRequest(
        "POST",
        "/api/generate/characters",
        {
          indices,
          characterTemplates,
          projectContext: {
            basicData: vnContext.projectData.basicData,
            conceptData: vnContext.projectData.conceptData,
          }
        },
        controller.signal
      );
      
      const result = await response.json();
      console.log("Received characters response:", result);
      
      setAbortController(null);
      
      // Check if the API returned an error
      if (result.error || result.message) {
        const errorMessage = result.error || result.message;
        toast({
          title: "Content Validation Failed",
          description: errorMessage,
          variant: "destructive",
          duration: 60000,
        });
        return null;
      }
      
      // Just return the array directly
      if (Array.isArray(result)) {
        return result;
      } else {
        console.error("Unexpected response format:", result);
        return null;
      }
    } catch (error: any) {
      if ((error as Error).name !== 'AbortError') {
        // Try to extract error message from the error response if it exists
        let errorMsg = "Failed to generate characters. Please try again.";
        
        try {
          // If error has a data property with message
          if (error.data && (error.data.message || error.data.error)) {
            errorMsg = error.data.message || error.data.error;
          } 
          // If error has detailed message in the error string
          else if (error.message && error.message.includes(':')) {
            const parts = error.message.split(':');
            if (parts.length > 1) {
              errorMsg = parts.slice(1).join(':').trim();
            }
          }
        } catch (parseError) {
          console.error("Failed to parse error data:", parseError);
        }
        
        toast({
          title: "Generation Failed",
          description: errorMsg,
          variant: "destructive",
        });
        console.error("Error generating multiple characters:", error);
      }
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, [vnContext.projectData, toast]);
  
  // Generate multiple paths at once
  const generateMultiplePathsData = useCallback(async (
    pathTemplates: any[]
  ) => {
    if (!vnContext.projectData) {
      toast({
        title: "Error",
        description: "Missing project data",
        variant: "destructive",
      });
      return null;
    }
    
    try {
      setIsGenerating(true);
      const controller = new AbortController();
      setAbortController(controller);
      
      // Create the project context object used for both validation and generation
      const projectContext = {
        basicData: vnContext.projectData.basicData,
        conceptData: vnContext.projectData.conceptData,
        charactersData: vnContext.projectData.charactersData,
      };
      
      // STEP 1: Validate the content first
      console.log("🔍 Validating content before generation...");
      const validationResponse = await apiRequest(
        "POST",
        "/api/validate/paths",
        { projectContext },
        controller.signal
      );
      
      // Check if the validation controller was aborted
      if (controller.signal.aborted) {
        console.log("Validation was cancelled by user");
        return null;
      }
      
      const validationResult = await validationResponse.json();
      
      // If validation failed, show error and stop
      if (!validationResult.valid || validationResult.message) {
        const errorMessage = validationResult.message || "Content validation failed";
        toast({
          title: "Content Validation Failed",
          description: errorMessage,
          variant: "destructive",
          duration: 60000,
        });
        setIsGenerating(false);
        setAbortController(null);
        return null;
      }
      
      console.log("✅ Content validated successfully, proceeding to generation");
      
      // STEP 2: Generate the paths after validation passes
      // Create indices based on the number of templates
      const indices = Array.from({ length: pathTemplates.length }, (_, i) => i);
      
      // Use our unified paths endpoint (without validation)
      const generationResponse = await apiRequest(
        "POST",
        "/api/generate/paths",
        {
          indices,
          pathTemplates,
          projectContext
        },
        controller.signal
      );
      
      // Check if the generation controller was aborted
      if (controller.signal.aborted) {
        console.log("Generation was cancelled by user");
        return null;
      }
      
      const result = await generationResponse.json();
      console.log("🔥 Generated paths:", result);
      
      setAbortController(null);
      
      // Just return the array directly
      if (Array.isArray(result)) {
        return result;
      } else {
        console.error("Unexpected response format:", result);
        return null;
      }
    } catch (error: any) {
      if ((error as Error).name !== 'AbortError') {
        // Try to extract error message from the error response if it exists
        let errorMsg = "Failed to generate paths. Please try again.";
        
        try {
          // If error has a data property with message
          if (error.data && (error.data.message || error.data.error)) {
            errorMsg = error.data.message || error.data.error;
          } 
          // If error has detailed message in the error string
          else if (error.message && error.message.includes(':')) {
            const parts = error.message.split(':');
            if (parts.length > 1) {
              errorMsg = parts.slice(1).join(':').trim();
            }
          }
        } catch (parseError) {
          console.error("Failed to parse error data:", parseError);
        }
        
        toast({
          title: "Generation Failed",
          description: errorMsg,
          variant: "destructive",
          duration: 60000,
        });
        console.error("Error in two-step path generation:", error);
      }
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, [vnContext.projectData, toast]);
  
  // Cancel ongoing generation
  const cancelGeneration = useCallback(() => {
    toast({
      title: "Generation Cancelled",
      description: "The AI generation process was cancelled.",
    });

    setIsGenerating(false);

    const currentController = abortController;
    setAbortController(null);

    if (currentController) {
      Promise.resolve().then(() => {
        try {
          if (!currentController.signal.aborted) {
            currentController.abort("UserCancelledGeneration");
          }
        } catch (error) {
          console.error("Error aborting (handled):", error);
        }
      });
    }
  }, [abortController, toast]);
  
  return {
    generateConceptData,
    generateCharacterData,
    generateMultipleCharactersData,
    generatePathData,
    generateMultiplePathsData,
    generatePlotData,
    generateActData,
    cancelGeneration,
    isGenerating,
  };
}
