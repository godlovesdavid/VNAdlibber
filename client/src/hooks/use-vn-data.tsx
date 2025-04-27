import { useState, useCallback } from "react";
import { useVnContext } from "@/context/vn-context";
import { useToast } from "@/hooks/use-toast";
import { 
  generateConcept, 
  generateCharacter, 
  generatePath, 
  generatePlot, 
  generateAct,
  generateMultipleCharacters,
  generateMultiplePaths
} from "@/lib/openai";

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
      
      const characterData = await generateCharacter(
        index,
        partialCharacter,
        {
          basicData: vnContext.projectData.basicData,
          conceptData: vnContext.projectData.conceptData,
        },
        controller.signal
      );
      
      setAbortController(null);
      return characterData;
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
      
      const pathData = await generatePath(
        index,
        partialPath,
        {
          basicData: vnContext.projectData.basicData,
          conceptData: vnContext.projectData.conceptData,
          charactersData: vnContext.projectData.charactersData,
        },
        controller.signal
      );
      
      setAbortController(null);
      return pathData;
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
  ) => {
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
      
      const actData = await generateAct(
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
      return actData;
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
      
      const charactersData = await generateMultipleCharacters(
        characterTemplates,
        {
          basicData: vnContext.projectData.basicData,
          conceptData: vnContext.projectData.conceptData,
        },
        controller.signal
      );
      
      setAbortController(null);
      return charactersData;
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
      
      const pathsData = await generateMultiplePaths(
        pathTemplates,
        {
          basicData: vnContext.projectData.basicData,
          conceptData: vnContext.projectData.conceptData,
          charactersData: vnContext.projectData.charactersData,
        },
        controller.signal
      );
      
      setAbortController(null);
      return pathsData;
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
