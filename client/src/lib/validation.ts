import { apiRequest } from './queryClient';
import { toast } from '@/hooks/use-toast';

/**
 * Utility function to validate form content before proceeding to the next step
 * 
 * @param projectContext The current project context data to validate
 * @param contentType The type of content being validated ('basic', 'concept', 'characters', 'paths', 'plot')
 * @returns A promise that resolves to true if validation passes, false otherwise
 */
export async function validateFormContent(
  projectContext: any,
  contentType: string
): Promise<boolean> {
  try {
    // Call validate endpoint
    const validationResponse = await apiRequest("POST", "/api/validate", {
      projectContext,
      contentType,
    });
    
    const validationResult = await validationResponse.json();
    
    // Show success or error toast
    if (validationResult.valid) {
      toast({
        title: "Validation Passed",
        description: validationResult.message || "Content validated successfully."
      });
      return true;
    } else {
      toast({
        title: "Validation Failed",
        description: validationResult.issues ? validationResult.issues.join(', ') : 
                     (validationResult.message || `Your ${contentType} has inconsistencies.`),
        variant: "destructive",
      });
      return false;
    }
  } catch (error: any) {
    console.error("Validation error:", error);

    // Try to extract the actual validation message from the error
    let errorMessage = "An error occurred during validation. Please try again.";

    try {
      // Check if the error has data with a message
      if (error.data && error.data.message) {
        errorMessage = error.data.message;
      }
      // Check if it's a response object that we can parse
      else if (error.status === 400 && error.response) {
        const errorData = error.response.json
          ? await error.response.json()
          : error.response;
        if (errorData && errorData.message) {
          errorMessage = errorData.message;
        }
      }
      // If it's just a regular error with message property
      else if (error.message) {
        errorMessage = error.message;
      }
    } catch (parseError) {
      console.error("Failed to parse error response:", parseError);
    }

    toast({
      title: "Validation Error",
      description: errorMessage,
      variant: "destructive",
    });
    
    return false;
  }
}
