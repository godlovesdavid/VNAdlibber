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
import { getUserFriendlyErrorMessage } from "@/lib/error-messages";

// To make this hook compatible with Fast Refresh, we use a named function
// expression instead of a function declaration
export const useVnData = () => {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [abortController, setAbortController] =
    useState<AbortController | null>(null);
  // For batch operations we'll use a separate controller
  const [batchMode, setBatchMode] = useState(false);
  const vnContext = useVnContext();
  
  // Helper function to check if an error is related to API key issues
  const checkForApiKeyError = (errorMessage: string) => {
    // Check for common API key related error messages
    const apiKeyErrorPatterns = [
      "api key",
      "apikey",
      "authentication",
      "auth",
      "unauthorized",
      "401",
      "403",
      "invalid key",
      "key not valid",
      "credential"
    ];
    
    const lowerCaseMsg = errorMessage.toLowerCase();
    const isApiKeyError = apiKeyErrorPatterns.some(pattern => 
      lowerCaseMsg.includes(pattern.toLowerCase())
    );
    
    if (isApiKeyError) {
      // Show a helpful message directing the user to the settings page
      toast({
        title: "API Key Required",
        description: (
          <div>
            <p>This request requires a valid Gemini API key.</p>
            <p className="mt-2">
              <a 
                href="/settings" 
                className="font-medium underline cursor-pointer"
                onClick={(e) => {
                  e.preventDefault();
                  window.location.href = '/settings';
                }}
              >
                Go to Settings to add your API key
              </a>
            </p>
          </div>
        ),
        variant: "destructive",
        duration: 10000,
      });
      return true;
    }
    return false;
  };

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

      const { theme, tone, genre, setting } = vnContext.projectData.basicData;
      const result = await generateConcept(
        { theme, tone, genre, setting },
        controller.signal,
      );

      setAbortController(null);

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

        // Get the user's API key from localStorage if available
        const userApiKey = localStorage.getItem("user_gemini_key");
        
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
            // Include the user's API key if available
            apiKey: userApiKey || undefined,
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

        // The result is an object where the keys are character names
        // We need to extract the first character and its name
        if (result && typeof result === 'object') {
          // Get the first key (character name) from the object
          const characterNames = Object.keys(result);
          
          if (characterNames.length > 0) {
            const characterName = characterNames[0];
            const character = result[characterName];
            
            console.log("Processing generated character:", characterName, character);
            
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
          
          // Check if this is an API key related error
          const isApiKeyIssue = checkForApiKeyError(errorMsg);
          if (isApiKeyIssue) {
            // Already showed a specialized message, so return early
            return null;
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

        // Get the user's API key from localStorage if available
        const userApiKey = localStorage.getItem("user_gemini_key");
        
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
            // Include the user's API key if available
            apiKey: userApiKey || undefined,
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

        // The result is an object where the keys are path titles
        // We need to extract the first path and its title
        if (result && typeof result === 'object') {
          // Get the first key (path title) from the object
          const pathTitles = Object.keys(result);
          
          if (pathTitles.length > 0) {
            const pathTitle = pathTitles[0];
            const path = result[pathTitle];
            
            console.log("Processing generated path:", pathTitle, path);
            return path;
          }
        }
        
        return null;
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
          
          // Check if this is an API key related error
          const isApiKeyIssue = checkForApiKeyError(errorMsg);
          if (isApiKeyIssue) {
            // Already showed a specialized message, so return early
            return null;
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

      // Get the user's API key from localStorage if available
      const userApiKey = localStorage.getItem("user_gemini_key");
      
      const generationResponse = await apiRequest(
        "POST",
        "/api/generate/plot",
        { 
          projectContext: {
            // Use property names that match what the server expects
            basicData: vnContext.projectData.basicData,
            conceptData: vnContext.projectData.conceptData,
            charactersData: vnContext.projectData.charactersData,
            pathsData: vnContext.projectData.pathsData,
          },
          // Include the user's API key if available
          apiKey: userApiKey || undefined,
        },
        controller.signal,
      );

      // Check if the generation controller was aborted
      if (controller.signal.aborted) {
        console.log("Plot generation was cancelled by user");
        return null;
      }

      // Parse the API response
      const result = await generationResponse.json();
      
      // Log the structure for debugging purposes
      console.log('Plot generation response structure:', 
        Object.keys(result).length > 0 
          ? Object.keys(result) 
          : 'Empty response');
      
      // Clear the abort controller
      setAbortController(null);
      
      
      // Return the result as is if it already has the right structure
      return result;
    } catch (error: any) {
      if ((error as Error).name !== "AbortError") {
        // Get all technical details from the error for debugging
        let errorMsg = "";
        let technicalDetails = "";
        let rootCause = "";
        let isModelOverloaded = false;

        try {
          // Extract all available error data
          if (error.data) {
            // Technical details directly from server
            if (error.data.technicalDetails) {
              technicalDetails = error.data.technicalDetails;
              errorMsg = technicalDetails; // Use technical details as the primary message
            }
            // Root cause from server
            if (error.data.rootCause) {
              rootCause = error.data.rootCause;
            }
            // Check for model overload
            if (error.data.isModelOverloaded) {
              isModelOverloaded = true;
            }
            // Fallback to message or error
            if (!errorMsg && (error.data.message || error.data.error)) {
              errorMsg = error.data.message || error.data.error;
            }
          }
          
          // If no message was extracted, try the error message itself
          if (!errorMsg && error.message) {
            errorMsg = error.message;
            // Further parse colon-separated error messages
            if (error.message.includes(":")) {
              const parts = error.message.split(":");
              if (parts.length > 1) {
                errorMsg = parts.slice(1).join(":").trim();
              }
            }
          }
          
          // Still no message? Use a generic one but include error object in console
          if (!errorMsg) {
            console.error("Failed to extract error details from:", error);
            errorMsg = "Unknown error during plot generation. See console for details.";
          }
          
          // Check if this is an API key related error
          const isApiKeyIssue = checkForApiKeyError(errorMsg);
          if (isApiKeyIssue) {
            // Already showed a specialized message, so return early
            return null;
          }
        } catch (parseError) {
          console.error("Failed to parse error data:", parseError);
          errorMsg = "Error parsing error details. See console logs.";
        }

        // Create a more detailed error message that includes the model status
        let toastTitle = "Generation Failed";
        let toastVariant: "default" | "destructive" = "destructive";
        let toastDuration = 60000;
        
        // For overloaded models, provide a more specific message
        if (isModelOverloaded) {
          toastTitle = "AI Model Overloaded";
          // Add note about retrying later
          errorMsg = `${errorMsg}\n\nPlease try again in a few minutes when the AI service is less busy.`;
        }
        
        toast({
          title: toastTitle,
          description: errorMsg,
          variant: toastVariant,
          duration: toastDuration,
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

        // Get the user's API key from localStorage if available
        const userApiKey = localStorage.getItem("user_gemini_key");
        
        const generationResponse = await apiRequest(
          "POST",
          "/api/generate/act",
          {
            actNumber,
            scenesCount,
            projectContext: {
                // Use consistent property names that match what the server expects
                basicData: vnContext.projectData.basicData,
                conceptData: vnContext.projectData.conceptData,
                charactersData: vnContext.projectData.charactersData,
                pathsData: vnContext.projectData.pathsData,
                plotData: vnContext.projectData.plotData,
              },
            // Include the user's API key if available
            apiKey: userApiKey || undefined,
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
          // Get all technical details from the error for debugging
          let errorMsg = "";
          let technicalDetails = "";
          let rootCause = "";
          let isModelOverloaded = false;

          try {
            // Extract all available error data
            if (error.data) {
              // Technical details directly from server
              if (error.data.technicalDetails) {
                technicalDetails = error.data.technicalDetails;
                errorMsg = technicalDetails; // Use technical details as the primary message
              }
              // Root cause from server
              if (error.data.rootCause) {
                rootCause = error.data.rootCause;
              }
              // Check for model overload
              if (error.data.isModelOverloaded) {
                isModelOverloaded = true;
              }
              // Fallback to message or error
              if (!errorMsg && (error.data.message || error.data.error)) {
                errorMsg = error.data.message || error.data.error;
              }
            }
            
            // If no message was extracted, try the error message itself
            if (!errorMsg && error.message) {
              errorMsg = error.message;
              // Further parse colon-separated error messages
              if (error.message.includes(":")) {
                const parts = error.message.split(":");
                if (parts.length > 1) {
                  errorMsg = parts.slice(1).join(":").trim();
                }
              }
            }
            
            // Still no message? Use a generic one but include error object in console
            if (!errorMsg) {
              console.error("Failed to extract error details from:", error);
              errorMsg = `Unknown error during Act ${actNumber} generation. See console for details.`;
            }
            
            // Check if this is an API key related error
            const isApiKeyIssue = checkForApiKeyError(errorMsg);
            if (isApiKeyIssue) {
              // Already showed a specialized message, so return early
              return null;
            }
          } catch (parseError) {
            console.error("Failed to parse error data:", parseError);
            errorMsg = "Error parsing error details. See console logs.";
          }

          // Create a more detailed error message that includes the model status
          let toastTitle = "Generation Failed";
          let toastVariant: "default" | "destructive" = "destructive";
          let toastDuration = 60000;
          
          // For overloaded models, provide a more specific message
          if (isModelOverloaded) {
            toastTitle = "AI Model Overloaded";
            // Add note about retrying later
            errorMsg = `${errorMsg}\n\nPlease try again in a few minutes when the AI service is less busy.`;
          }
          
          toast({
            title: toastTitle,
            description: errorMsg,
            variant: toastVariant,
            duration: toastDuration,
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
              // Use consistent property names that match what the server expects
              basicData: vnContext.projectData.basicData,
              conceptData: vnContext.projectData.conceptData,
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

        // The result is an object where keys are character names
        if (result && typeof result === 'object') {
          const characterNames = Object.keys(result);
          
          if (characterNames.length > 0) {
            console.log(`Processing ${characterNames.length} characters:`, characterNames);
            
            // Convert object of characters to array of characters with name
            const charactersArray = characterNames.map(name => {
              const character = result[name];
              console.log(`Processing batch character ${name}:`, character);
              
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
                
              // Include the name as a property
              return {
                name,
                ...cleanCharacter
              };
            });
            
            console.log("Converted characters array:", charactersArray);
            return charactersArray;
          }
        }
        
        console.error("Unexpected response format:", result);
        return null;
      } catch (error: any) {
        if ((error as Error).name !== "AbortError") {
          // Get all technical details from the error for debugging
          let errorMsg = "";
          let technicalDetails = "";
          let rootCause = "";
          let isModelOverloaded = false;

          try {
            // Extract all available error data
            if (error.data) {
              // Technical details directly from server
              if (error.data.technicalDetails) {
                technicalDetails = error.data.technicalDetails;
                errorMsg = technicalDetails; // Use technical details as the primary message
              }
              // Root cause from server
              if (error.data.rootCause) {
                rootCause = error.data.rootCause;
              }
              // Check for model overload
              if (error.data.isModelOverloaded) {
                isModelOverloaded = true;
              }
              // Fallback to message or error
              if (!errorMsg && (error.data.message || error.data.error)) {
                errorMsg = error.data.message || error.data.error;
              }
            }
            
            // If no message was extracted, try the error message itself
            if (!errorMsg && error.message) {
              errorMsg = error.message;
              // Further parse colon-separated error messages
              if (error.message.includes(":")) {
                const parts = error.message.split(":");
                if (parts.length > 1) {
                  errorMsg = parts.slice(1).join(":").trim();
                }
              }
            }
            
            // Still no message? Use a generic one but include error object in console
            if (!errorMsg) {
              console.error("Failed to extract error details from:", error);
              errorMsg = "Unknown error during character generation. See console for details.";
            }
          } catch (parseError) {
            console.error("Failed to parse error data:", parseError);
            errorMsg = "Error parsing error details. See console logs.";
          }

          // Create a more detailed error message that includes the model status
          let toastTitle = "Generation Failed";
          let toastVariant: "default" | "destructive" = "destructive";
          let toastDuration = 60000;
          
          // For overloaded models, provide a more specific message
          if (isModelOverloaded) {
            toastTitle = "AI Model Overloaded";
            // Add note about retrying later
            errorMsg = `${errorMsg}\n\nPlease try again in a few minutes when the AI service is less busy.`;
          }
          
          toast({
            title: toastTitle,
            description: errorMsg,
            variant: toastVariant,
            duration: toastDuration,
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

        // Use our simplified path endpoint
        const generationResponse = await apiRequest(
          "POST",
          "/api/generate/path",
          {
            pathTemplates,
            projectContext: {
                // Use consistent property names that match what the server expects
                basicData: vnContext.projectData.basicData,
                conceptData: vnContext.projectData.conceptData,
                charactersData: vnContext.projectData.charactersData,
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

        // The result is an object where keys are path titles
        if (result && typeof result === 'object') {
          const pathTitles = Object.keys(result);
          
          if (pathTitles.length > 0) {
            console.log(`Processing ${pathTitles.length} paths:`, pathTitles);
            
            // Convert object of paths to array of paths with title
            const pathsArray = pathTitles.map(title => {
              const path = result[title];
              console.log(`Processing batch path ${title}:`, path);
              
              // Include the title as a property
              return {
                title,
                ...path
              };
            });
            
            console.log("Converted paths array:", pathsArray);
            return pathsArray;
          }
        }
        
        console.error("Unexpected response format:", result);
        return null;
      } catch (error: any) {
        if ((error as Error).name !== "AbortError") {
          // Get all technical details from the error for debugging
          let errorMsg = "";
          let technicalDetails = "";
          let rootCause = "";
          let isModelOverloaded = false;

          try {
            // Extract all available error data
            if (error.data) {
              // Technical details directly from server
              if (error.data.technicalDetails) {
                technicalDetails = error.data.technicalDetails;
                errorMsg = technicalDetails; // Use technical details as the primary message
              }
              // Root cause from server
              if (error.data.rootCause) {
                rootCause = error.data.rootCause;
              }
              // Check for model overload
              if (error.data.isModelOverloaded) {
                isModelOverloaded = true;
              }
              // Fallback to message or error
              if (!errorMsg && (error.data.message || error.data.error)) {
                errorMsg = error.data.message || error.data.error;
              }
            }
            
            // If no message was extracted, try the error message itself
            if (!errorMsg && error.message) {
              errorMsg = error.message;
              // Further parse colon-separated error messages
              if (error.message.includes(":")) {
                const parts = error.message.split(":");
                if (parts.length > 1) {
                  errorMsg = parts.slice(1).join(":").trim();
                }
              }
            }
            
            // Still no message? Use a generic one but include error object in console
            if (!errorMsg) {
              console.error("Failed to extract error details from:", error);
              errorMsg = "Unknown error during path generation. See console for details.";
            }
          } catch (parseError) {
            console.error("Failed to parse error data:", parseError);
            errorMsg = "Error parsing error details. See console logs.";
          }

          // Create a more detailed error message that includes the model status
          let toastTitle = "Generation Failed";
          let toastVariant: "default" | "destructive" = "destructive";
          let toastDuration = 60000;
          
          // For overloaded models, provide a more specific message
          if (isModelOverloaded) {
            toastTitle = "AI Model Overloaded";
            // Add note about retrying later
            errorMsg = `${errorMsg}\n\nPlease try again in a few minutes when the AI service is less busy.`;
          }
          
          toast({
            title: toastTitle,
            description: errorMsg,
            variant: toastVariant,
            duration: toastDuration,
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

// Fast Refresh support removed as it was causing errors
