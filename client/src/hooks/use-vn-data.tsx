import { useState, useCallback } from "react";
import { useVnContext } from "@/context/vn-context";
import { useToast } from "@/hooks/use-toast";
import {
  generateConcept,
  generatePlot,
  generateAct,
  GenerationResult,
} from "@/lib/openai";
import { apiRequest } from "@/lib/queryClient";

// To make this hook compatible with Fast Refresh, we use a named function
// expression instead of a function declaration
export function useVnData() {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [abortController, setAbortController] =
    useState<AbortController | null>(null);
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
        controller.signal,
      );

      setAbortController(null);

      // Check for validation errors from AI
      if (result && result.error) {
        toast({
          title: "Content Validation Failed",
          description: result.error,
          variant: "destructive",
          // Use infinite duration for validation errors to ensure user sees them
          duration: Infinity,
        });
        return null;
      }

      return result.data;
    } catch (error) {
      if ((error as Error).name !== "AbortError") {
        toast({
          title: "Generation Failed",
          description: "Failed to generate concept. Please try again.",
          variant: "destructive",
          duration: 60000,
        });
        console.error("Error generating concept:", error);
      }
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, [vnContext.projectData, toast]);

  // Generate character details using AI
  const generateCharacterData = useCallback(
    async (index: number, partialCharacter: any) => {
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

        console.log("Generating single character with data:", partialCharacter);

        // Use our simplified character endpoint
        const response = await apiRequest(
          "POST",
          "/api/generate/character",
          {
            characterTemplates: [partialCharacter],
            projectContext: {
              basics: vnContext.projectData.basicData,
              concept: vnContext.projectData.conceptData,
            },
          },
          controller.signal,
        );

        const result = await response.json();
        console.log("Character generation response:", result);

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
        // Ensure the character data has no nested objects that might cause issues
        if (Array.isArray(result) && result.length > 0) {
          const character = result[0];
          console.log("Processing generated character:", character);
          
          // Clean character data to ensure no nested objects
          const cleanCharacter = Object.entries(character)
            .filter(([key]) => isNaN(Number(key))) // Remove any numeric keys
            .reduce((obj, [key, value]) => {
              // For non-null objects, convert to string unless it's relationshipPotential
              if (typeof value === 'object' && value !== null && key !== 'relationshipPotential') {
                console.warn(`Converting nested object in ${key} to string:`, value);
                obj[key] = JSON.stringify(value);
              } else {
                obj[key] = value;
              }
              return obj;
            }, {} as Record<string, any>);
            
          console.log("Cleaned character data:", cleanCharacter);
          return cleanCharacter;
        }
        
        return null;
      } catch (error: any) {
        if ((error as Error).name !== "AbortError") {
          // Try to extract error message from the error response if it exists
          let errorMsg =
            "Failed to generate character details. Please try again.";
          let duration = 60000; // Default duration
          let title = "Generation Failed";

          try {
            // If error has a data property with message
            if (error.data && (error.data.message || error.data.error)) {
              errorMsg = error.data.message || error.data.error;

              // Check for special properties passed through from the server
              if (
                error.errorType === "validation_error" ||
                error.errorType === "validation_issue"
              ) {
                title = "Content Validation Failed";
              }

              // Check for infinite duration marker
              if (
                error.duration === Infinity ||
                error.data.duration === "infinite"
              ) {
                duration = Infinity;
              } else if (error.duration) {
                duration = error.duration;
              }
            }
            // If error has detailed message in the error string
            else if (error.message && error.message.includes(":")) {
              const parts = error.message.split(":");
              if (parts.length > 1) {
                errorMsg = parts.slice(1).join(":").trim();
              }
            }
          } catch (parseError) {
            console.error("Failed to parse error data:", parseError);
          }

          toast({
            title: title,
            description: errorMsg,
            variant: "destructive",
            duration: duration,
          });
          console.error("Error generating character:", error);
        }
        return null;
      } finally {
        setIsGenerating(false);
      }
    },
    [vnContext.projectData, toast],
  );

  // Generate path details using AI
  const generatePathData = useCallback(
    async (index: number, partialPath: any) => {
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

        // // STEP 1: Validate the content first
        // console.log("🔍 Validating content before generation...");
        // const validationResponse = await apiRequest(
        //   "POST",
        //   "/api/validate",
        //   { projectContext, contentType: "paths" },
        //   controller.signal
        // );

        // // Check if the validation controller was aborted
        // if (controller.signal.aborted) {
        //   console.log("Validation was cancelled by user");
        //   return null;
        // }

        // const validationResult = await validationResponse.json();

        // // If validation failed, show error and stop
        // if (!validationResult.valid || validationResult.message) {
        //   const errorMessage = validationResult.message || "Content validation failed";
        //   toast({
        //     title: "Content Validation Failed",
        //     description: errorMessage,
        //     variant: "destructive",
        //     duration: 60000,
        //   });
        //   setIsGenerating(false);
        //   setAbortController(null);
        //   return null;
        // }

        // console.log("✅ Content validated successfully, proceeding to generation");

        // STEP 2: Generate the path after validation passes
        // Use our simplified path endpoint
        const generationResponse = await apiRequest(
          "POST",
          "/api/generate/path",
          {
            pathTemplates: [partialPath],
            projectContext: {
              basics: vnContext.projectData.basicData,
              concept: vnContext.projectData.conceptData,
              characters: vnContext.projectData.charactersData,
            },
          },
          controller.signal,
        );

        // Check if the generation controller was aborted
        if (controller.signal.aborted) {
          console.log("Generation was cancelled by user");
          return null;
        }

        const result = await generationResponse.json();

        setAbortController(null);

        // Return just the first path since we only requested one
        return Array.isArray(result) && result.length > 0 ? result[0] : null;
      } catch (error: any) {
        if ((error as Error).name !== "AbortError") {
          // Try to extract error message from the error response if it exists
          let errorMsg = "Failed to generate path details. Please try again.";
          let duration = 60000; // Default duration
          let title = "Generation Failed";

          try {
            // If error has a data property with message
            if (error.data && (error.data.message || error.data.error)) {
              errorMsg = error.data.message || error.data.error;

              // Check for special properties passed through from the server
              if (
                error.errorType === "validation_error" ||
                error.errorType === "validation_issue"
              ) {
                title = "Content Validation Failed";
              }

              // Check for infinite duration marker
              if (
                error.duration === Infinity ||
                error.data.duration === "infinite"
              ) {
                duration = Infinity;
              } else if (error.duration) {
                duration = error.duration;
              }
            }
            // If error has a response property (fetch error), try to parse it
            else if (error.response) {
              const errorData = await error.response.json();
              if (errorData.message || errorData.error) {
                errorMsg = errorData.message || errorData.error;

                if (
                  errorData.errorType === "validation_error" ||
                  errorData.errorType === "validation_issue"
                ) {
                  title = "Content Validation Failed";
                }

                if (errorData.duration === "infinite") {
                  duration = Infinity;
                } else if (errorData.duration) {
                  duration = errorData.duration;
                }
              }
            } else if (error.message) {
              errorMsg = error.message;
            }
          } catch (parseError) {
            console.error("Failed to parse error response:", parseError);
          }

          toast({
            title: title,
            description: errorMsg,
            variant: "destructive",
            duration: duration,
          });
          console.error("Error in two-step path generation:", error);
        }
        return null;
      } finally {
        setIsGenerating(false);
      }
    },
    [vnContext.projectData, toast],
  );

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

      // // STEP 1: Validate the content first
      // console.log("🔍 Validating plot context before generation...");
      // const validationResponse = await apiRequest(
      //   "POST",
      //   "/api/validate",
      //   { projectContext, contentType: "plot" },
      //   controller.signal
      // );

      // // Check if the validation controller was aborted
      // if (controller.signal.aborted) {
      //   console.log("Plot validation was cancelled by user");
      //   return null;
      // }

      // const validationResult = await validationResponse.json();

      // // If validation failed, show error and stop
      // if (!validationResult.valid || validationResult.message) {
      //   const errorMessage = validationResult.message || "Content validation failed";
      //   toast({
      //     title: "Content Validation Failed",
      //     description: errorMessage,
      //     variant: "destructive",
      //     duration: 60000,
      //   });
      //   setIsGenerating(false);
      //   setAbortController(null);
      //   return null;
      // }

      // console.log("✅ Plot context validated successfully, proceeding to generation");

      // STEP 2: Generate the plot after validation passes
      // Use the API directly instead of the wrapper function
      const generationResponse = await apiRequest(
        "POST",
        "/api/generate/plot",
        { projectContext: {
          basics: vnContext.projectData.basicData,
          concept: vnContext.projectData.conceptData,
          characters: vnContext.projectData.charactersData,
          paths: vnContext.projectData.pathsData,
        } },
        controller.signal,
      );

      // Check if the generation controller was aborted
      if (controller.signal.aborted) {
        console.log("Plot generation was cancelled by user");
        return null;
      }

      const result = await generationResponse.json();

      setAbortController(null);

      return result;
    } catch (error: any) {
      if ((error as Error).name !== "AbortError") {
        // Try to extract error message from the error response if it exists
        let errorMsg = "Failed to generate plot outline. Please try again.";

        try {
          // If error has a data property with message
          if (error.data && (error.data.message || error.data.error)) {
            errorMsg = error.data.message || error.data.error;
          }
          // If error has detailed message in the error string
          else if (error.message && error.message.includes(":")) {
            const parts = error.message.split(":");
            if (parts.length > 1) {
              errorMsg = parts.slice(1).join(":").trim();
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
  const generateActData = useCallback(
    async (
      actNumber: number,
      scenesCount: number,
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

        // // STEP 1: Validate the content first
        // console.log(`🔍 Validating Act ${actNumber} content before generation...`);
        // const validationResponse = await apiRequest(
        //   "POST",
        //   "/api/validate",
        //   { projectContext, contentType: "act" },
        //   controller.signal
        // );

        // // Check if the validation controller was aborted
        // if (controller.signal.aborted) {
        //   console.log(`Act ${actNumber} validation was cancelled by user`);
        //   return null;
        // }

        // const validationResult = await validationResponse.json();

        // // If validation failed, show error and stop
        // if (!validationResult.valid || validationResult.message) {
        //   const errorMessage = validationResult.message || "Content validation failed";
        //   toast({
        //     title: "Content Validation Failed",
        //     description: errorMessage,
        //     variant: "destructive",
        //     duration: 60000,
        //   });
        //   setIsGenerating(false);
        //   setAbortController(null);
        //   return { error: errorMessage } as GenerationResult<any>;
        // }

        // console.log(`✅ Act ${actNumber} content validated successfully, proceeding to generation`);

        // STEP 2: Generate the act after validation passes
        // Use the API directly instead of the wrapper function
        const generationResponse = await apiRequest(
          "POST",
          "/api/generate/act",
          {
            actNumber,
            scenesCount,
            projectContext: {
                basics: vnContext.projectData.basicData,
                concept: vnContext.projectData.conceptData,
                characters: vnContext.projectData.charactersData,
                paths: vnContext.projectData.pathsData,
                plot: vnContext.projectData.plotData,
              },
          },
          controller.signal,
        );

        // Check if the generation controller was aborted
        if (controller.signal.aborted) {
          console.log(`Act ${actNumber} generation was cancelled by user`);
          return null;
        }

        const result = await generationResponse.json();

        //to stop aborted without reason errors
        setAbortController(null);

        return { data: result } as GenerationResult<any>;
      } catch (error: any) {
        if ((error as Error).name !== "AbortError") {
          // Try to extract error message from the error response if it exists
          let errorMsg = `Failed to generate Act ${actNumber}. Please try again.`;

          try {
            // If error has a data property with message
            if (error.data && (error.data.message || error.data.error)) {
              errorMsg = error.data.message || error.data.error;
            }
            // If error has detailed message in the error string
            else if (error.message && error.message.includes(":")) {
              const parts = error.message.split(":");
              if (parts.length > 1) {
                errorMsg = parts.slice(1).join(":").trim();
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
          console.error(
            `Error in two-step Act ${actNumber} generation:`,
            error,
          );
        }
        return null;
      } finally {
        setIsGenerating(false);
      }
    },
    [vnContext.projectData, vnContext.playerData, toast],
  );

  // Generate multiple characters at once
  const generateMultipleCharactersData = useCallback(
    async (characterTemplates: any[]) => {
      if (!vnContext.projectData) {
        toast({
          title: "Error",
          description: "Missing project data",
          variant: "destructive",
          duration: 60000,
        });
        return null;
      }

      try {
        setIsGenerating(true);
        const controller = new AbortController();
        setAbortController(controller);

        // Create indices based on the number of templates
        const indices = Array.from(
          { length: characterTemplates.length },
          (_, i) => i,
        );
        
        console.log(`Generating ${indices.length} characters with templates:`, characterTemplates);

        // Use our simplified character endpoint
        const response = await apiRequest(
          "POST",
          "/api/generate/character",
          {
            characterTemplates,
            projectContext: {
              basics: vnContext.projectData.basicData,
              concept: vnContext.projectData.conceptData,
            },
          },
          controller.signal,
        );

        const result = await response.json();
        console.log("Multiple characters generation response:", result);

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
          // Clean each character object to prevent nested objects
          const cleanedCharacters = result.map((character, index) => {
            console.log(`Processing batch character ${index}:`, character);
            
            // Clean character data to ensure no nested objects
            const cleanCharacter = Object.entries(character)
              .filter(([key]) => isNaN(Number(key))) // Remove any numeric keys
              .reduce((obj, [key, value]) => {
                // For non-null objects, convert to string unless it's relationshipPotential
                if (typeof value === 'object' && value !== null && key !== 'relationshipPotential') {
                  console.warn(`Converting nested object in ${key} to string:`, value);
                  obj[key] = JSON.stringify(value);
                } else {
                  obj[key] = value;
                }
                return obj;
              }, {} as Record<string, any>);
              
            return cleanCharacter;
          });
          
          console.log("Cleaned batch of characters:", cleanedCharacters);
          return cleanedCharacters;
        } else {
          console.error("Unexpected response format:", result);
          return null;
        }
      } catch (error: any) {
        if ((error as Error).name !== "AbortError") {
          // Try to extract error message from the error response if it exists
          let errorMsg = "Failed to generate characters. Please try again.";

          try {
            // If error has a data property with message
            if (error.data && (error.data.message || error.data.error)) {
              errorMsg = error.data.message || error.data.error;
            }
            // If error has detailed message in the error string
            else if (error.message && error.message.includes(":")) {
              const parts = error.message.split(":");
              if (parts.length > 1) {
                errorMsg = parts.slice(1).join(":").trim();
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
          console.error("Error generating multiple characters:", error);
        }
        return null;
      } finally {
        setIsGenerating(false);
      }
    },
    [vnContext.projectData, toast],
  );

  // Generate multiple paths at once
  const generateMultiplePathsData = useCallback(
    async (pathTemplates: any[]) => {
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

        // // STEP 1: Validate the content first
        // console.log("🔍 Validating content before generation...");
        // const validationResponse = await apiRequest(
        //   "POST",
        //   "/api/validate",
        //   { projectContext: projectContext, contentType: "paths" },
        //   controller.signal
        // );

        // // Check if the validation controller was aborted
        // if (controller.signal.aborted) {
        //   console.log("Validation was cancelled by user");
        //   return null;
        // }

        // const validationResult = await validationResponse.json();

        // // If validation failed, show error and stop
        // if (!validationResult.valid || validationResult.message) {
        //   const errorMessage = validationResult.message || "Content validation failed";
        //   toast({
        //     title: "Content Validation Failed",
        //     description: errorMessage,
        //     variant: "destructive",
        //     duration: 60000,
        //   });
        //   setIsGenerating(false);
        //   setAbortController(null);
        //   return null;
        // }

        // console.log("✅ Content validated successfully, proceeding to generation");

        // STEP 2: Generate the paths after validation passes
        // Create indices based on the number of templates
        const indices = Array.from(
          { length: pathTemplates.length },
          (_, i) => i,
        );

        // Use our simplified path endpoint
        const generationResponse = await apiRequest(
          "POST",
          "/api/generate/path",
          {
            pathTemplates,
            projectContext: {
                basics: vnContext.projectData.basicData,
                concept: vnContext.projectData.conceptData,
                characters: vnContext.projectData.charactersData,
              },
          },
          controller.signal,
        );

        // Check if the generation controller was aborted
        if (controller.signal.aborted) {
          console.log("Generation was cancelled by user");
          return null;
        }

        const result = await generationResponse.json();

        setAbortController(null);

        // Just return the array directly
        if (Array.isArray(result)) {
          return result;
        } else {
          console.error("Unexpected response format:", result);
          return null;
        }
      } catch (error: any) {
        if ((error as Error).name !== "AbortError") {
          // Try to extract error message from the error response if it exists
          let errorMsg = "Failed to generate paths. Please try again.";

          try {
            // If error has a data property with message
            if (error.data && (error.data.message || error.data.error)) {
              errorMsg = error.data.message || error.data.error;
            }
            // If error has detailed message in the error string
            else if (error.message && error.message.includes(":")) {
              const parts = error.message.split(":");
              if (parts.length > 1) {
                errorMsg = parts.slice(1).join(":").trim();
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
    },
    [vnContext.projectData, toast],
  );

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
};
