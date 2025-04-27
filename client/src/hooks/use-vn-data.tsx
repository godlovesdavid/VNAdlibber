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
      const conceptData = await generateConcept(
        { theme, tone, genre }, 
        controller.signal
      );
      
      setAbortController(null);
      return conceptData;
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
      
      const characters = await response.json();
      
      setAbortController(null);
      // Return just the first character since we only requested one
      return Array.isArray(characters) && characters.length > 0 ? characters[0] : null;
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        toast({
          title: "Generation Failed",
          description: "Failed to generate character details. Please try again.",
          variant: "destructive",
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
      
      // Use our unified paths endpoint
      const response = await apiRequest(
        "POST",
        "/api/generate/paths",
        {
          indices: [index],
          pathTemplates: [partialPath],
          projectContext: {
            basicData: vnContext.projectData.basicData,
            conceptData: vnContext.projectData.conceptData,
            charactersData: vnContext.projectData.charactersData,
          }
        },
        controller.signal
      );
      
      const paths = await response.json();
      
      setAbortController(null);
      // Return just the first path since we only requested one
      return Array.isArray(paths) && paths.length > 0 ? paths[0] : null;
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        toast({
          title: "Generation Failed",
          description: "Failed to generate path details. Please try again.",
          variant: "destructive",
        });
        console.error("Error generating path:", error);
      }
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, [vnContext.projectData, toast]);
  
  // Generate plot outline using AI
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
      
      const plotData = await generatePlot(
        {
          basicData: vnContext.projectData.basicData,
          conceptData: vnContext.projectData.conceptData,
          charactersData: vnContext.projectData.charactersData,
          pathsData: vnContext.projectData.pathsData,
        },
        controller.signal
      );
      
      setAbortController(null);
      return plotData;
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        toast({
          title: "Generation Failed",
          description: "Failed to generate plot outline. Please try again.",
          variant: "destructive",
        });
        console.error("Error generating plot:", error);
      }
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, [vnContext.projectData, toast]);
  
  // Generate act scenes using AI
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
      
      const result = await generateAct(
        actNumber,
        scenesCount,
        {
          basicData: vnContext.projectData.basicData,
          conceptData: vnContext.projectData.conceptData,
          charactersData: vnContext.projectData.charactersData,
          pathsData: vnContext.projectData.pathsData,
          plotData: vnContext.projectData.plotData,
          playerData: vnContext.playerData,
        },
        controller.signal
      );
      
      setAbortController(null);
      
      // Check for validation errors from AI
      if (result && result.error) {
        toast({
          title: "Content Validation Failed",
          description: result.error,
          variant: "destructive",
        });
        return { error: result.error } as GenerationResult<any>;
      }
      
      return result && result.data ? { data: result.data } as GenerationResult<any> : null;
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        toast({
          title: "Generation Failed",
          description: `Failed to generate Act ${actNumber}. Please try again.`,
          variant: "destructive",
        });
        console.error(`Error generating Act ${actNumber}:`, error);
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
      
      const characters = await response.json();
      console.log("Received characters:", characters);
      
      setAbortController(null);
      
      // Just return the array directly
      if (Array.isArray(characters)) {
        return characters;
      } else {
        console.error("Unexpected response format:", characters);
        return null;
      }
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        toast({
          title: "Generation Failed",
          description: "Failed to generate characters. Please try again.",
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
      
      // Create indices based on the number of templates
      const indices = Array.from({ length: pathTemplates.length }, (_, i) => i);
      
      // Use our unified paths endpoint
      const response = await apiRequest(
        "POST",
        "/api/generate/paths",
        {
          indices,
          pathTemplates,
          projectContext: {
            basicData: vnContext.projectData.basicData,
            conceptData: vnContext.projectData.conceptData,
            charactersData: vnContext.projectData.charactersData,
          }
        },
        controller.signal
      );
      
      const paths = await response.json();
      console.log("Received paths:", paths);
      
      setAbortController(null);
      
      // Just return the array directly
      if (Array.isArray(paths)) {
        return paths;
      } else {
        console.error("Unexpected response format:", paths);
        return null;
      }
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        toast({
          title: "Generation Failed",
          description: "Failed to generate paths. Please try again.",
          variant: "destructive",
        });
        console.error("Error generating multiple paths:", error);
      }
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, [vnContext.projectData, toast]);
  
  // Cancel ongoing generation
  const cancelGeneration = useCallback(() => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
      setIsGenerating(false);
      toast({
        title: "Generation Cancelled",
        description: "The AI generation process was cancelled.",
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
