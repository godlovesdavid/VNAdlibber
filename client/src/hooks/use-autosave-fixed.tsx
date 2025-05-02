import { useEffect, useRef } from 'react';
import { useFormContext } from 'react-hook-form';
import { useToast } from '@/hooks/use-toast';
import { useVnContext } from '@/context/vn-context';

/**
 * A hook that automatically saves form data at regular intervals
 * 
 * @param formId - Identifier for the form
 * @param saveFunction - Function to be called to save the form data
 * @param interval - Interval in milliseconds between autosaves (default: 30 seconds)
 * @param showToast - Whether to show a toast notification on autosave (default: true)
 */
export const useAutosave = (
  formId: string,
  saveFunction: (data: any) => void,
  interval = 30000, // 30 seconds default
  showToast = true
) => {
  const { toast } = useToast();
  const form = useFormContext();
  const { projectData, saveProject } = useVnContext();
  
  // State to track if the hook is ready
  const [isReady, setIsReady] = useState(false);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedRef = useRef<any>(null);
  const initAttemptsRef = useRef(0);

  // Effect to check if form is ready and retry if needed
  useEffect(() => {
    // If already ready, skip this effect
    if (isReady) return;
    
    console.log(`[Autosave] Checking form readiness for ${formId}...`);
    
    // Check if form is available with getValues method
    if (form && typeof form.getValues === 'function') {
      console.log(`[Autosave] Form context is ready for ${formId}`);
      setIsReady(true);
    } else {
      // Form not ready yet, setup retry with increasing backoff
      initAttemptsRef.current += 1;
      const delay = Math.min(1000 * initAttemptsRef.current, 3000); // Max 3 second delay
      
      console.warn(`[Autosave] FormContext not ready for ${formId}, retry #${initAttemptsRef.current} in ${delay}ms`);
      
      // Try again after delay
      const timeoutId = setTimeout(() => {
        // This will trigger this effect again
        if (!isReady) {
          console.log(`[Autosave] Retrying form readiness check for ${formId}...`);
          setIsReady(false); // Force re-render
        }
      }, delay);
      
      return () => clearTimeout(timeoutId);
    }
  }, [form, formId, isReady]);

  // Setup autosave timer when form is ready
  useEffect(() => {
    // Only proceed if ready
    if (!isReady) return;
    
    console.log(`[Autosave] Setting up autosave for ${formId} (interval: ${interval}ms)`);
    console.log(`[Autosave] Form context available for ${formId}`);

    
    // Function to save form data
    const performSave = async () => {
      if (!form.getValues) return;
      
      try {
        // Get current values
        const currentValues = form.getValues();
        
        // Skip if nothing changed
        if (JSON.stringify(currentValues) === JSON.stringify(lastSavedRef.current)) {
          return;
        }
        
        // Save locally
        console.log(`[Autosave] Saving ${formId} form data...`, currentValues);
        saveFunction(currentValues);
        lastSavedRef.current = currentValues;
        console.log(`[Autosave] ${formId} form data saved locally`);
        
        // Save to server if project exists
        if (projectData?.id) {
          try {
            console.log(`[Autosave] Saving ${formId} to server (project ID: ${projectData.id})...`);
            await saveProject();
            console.log(`[Autosave] ${formId} saved to server successfully`);
            
            if (showToast) {
              toast({
                title: "Project Saved",
                description: `${formId} saved automatically`,
                duration: 2000,
              });
            }
          } catch (err) {
            console.error(`[Autosave] Failed to save ${formId} to server:`, err);
          }
        } else {
          console.log(`[Autosave] Server save skipped for ${formId} (no project ID yet)`);
        }
      } catch (error) {
        // Log detailed error information
        console.error(`[Autosave] Error in ${formId} autosave:`, error);
        
        // Show error toast to user
        if (showToast) {
          toast({
            title: "Autosave Failed",
            description: `Could not save ${formId} data automatically`,
            variant: "destructive",
            duration: 3000,
          });
        }
      }
    };
    
    // Clear any existing timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    // Setup new timer with interval tracking
    console.log(`[Autosave] Starting autosave timer for ${formId} every ${interval/1000} seconds`);
    timerRef.current = setInterval(() => {
      console.log(`[Autosave] Autosave interval triggered for ${formId}`);
      performSave();
    }, interval);
    
    // Initialize last saved values
    if (form.getValues) {
      const initialValues = form.getValues();
      lastSavedRef.current = initialValues;
      console.log(`[Autosave] Initialized ${formId} with values:`, initialValues);
    }
    
    // Cleanup on unmount
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [formId, form, interval, saveFunction, saveProject, projectData?.id, showToast, toast, isReady]);
  
  // Return utility functions and state
  return {
    performSave: () => {
      if (!form || !form.getValues) return;
      const values = form.getValues();
      saveFunction(values);
      lastSavedRef.current = values;
    },
    setLastSaved: (values: any) => {
      lastSavedRef.current = values;
    },
    isReady, // Expose whether the autosave is ready
    formId   // Expose the form ID for debugging
  };
};