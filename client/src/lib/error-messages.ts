/**
 * User-friendly error messages for common generation failures
 * 
 * This utility provides consistent, user-friendly error messages
 * instead of showing technical errors to users
 */

export interface ErrorMessageOptions {
  // If true, shows a more detailed message for debugging
  showDetails?: boolean;
  // How long to show the toast message (in ms)
  duration?: number;
}

export type ErrorType = 
  | 'generation'
  | 'validation'
  | 'connection'
  | 'input'
  | 'storage'
  | 'unknown';

/**
 * Get a user-friendly error message based on the error type and original error
 */
export function getUserFriendlyErrorMessage(
  errorType: ErrorType,
  originalError?: any,
  options: ErrorMessageOptions = {}
): { title: string; message: string; duration: number } {
  const { showDetails = false, duration = 6000 } = options;
  
  // Default messages by error type
  const errorMessages = {
    generation: {
      title: "Generation Failed",
      message: "Sorry! We couldn't create that for you right now. Please try generating again."
    },
    validation: {
      title: "Content Needs Adjustments",
      message: "Some aspects of your story need a bit more detail. Please review and try again."
    },
    connection: {
      title: "Connection Issue",
      message: "We're having trouble connecting to our creativity servers. Please check your internet connection and try again."
    },
    input: {
      title: "Incomplete Information",
      message: "Please fill out all the required information before continuing."
    },
    storage: {
      title: "Saving Failed",
      message: "We couldn't save your project. Please try again or check your storage settings."
    },
    unknown: {
      title: "Something Went Wrong",
      message: "An unexpected error occurred. Please try again or refresh the page."
    }
  };
  
  // Get basic message
  const errorInfo = errorMessages[errorType];
  
  // If we should show details and we have an original error
  if (showDetails && originalError) {
    // Try to extract a more specific message
    let detailedMessage = "";
    
    try {
      if (originalError.data && originalError.data.message) {
        detailedMessage = originalError.data.message;
      } else if (originalError.message) {
        detailedMessage = originalError.message;
      } else if (typeof originalError === 'string') {
        detailedMessage = originalError;
      }
      
      // If we got a detailed message, append it
      if (detailedMessage) {
        return {
          title: errorInfo.title,
          message: `${errorInfo.message} (${detailedMessage})`,
          duration
        };
      }
    } catch (e) {
      console.error("Error parsing error details:", e);
    }
  }
  
  // If validation error, usually want it to stay on screen longer
  const finalDuration = errorType === 'validation' ? 30000 : duration;
  
  // Return the basic message
  return {
    title: errorInfo.title,
    message: errorInfo.message,
    duration: finalDuration
  };
}
