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
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedRef = useRef<any>(null);

  // Setup autosave timer
  useEffect(() => {
    console.log(`[Autosave] Setting up autosave for ${formId} (interval: ${interval}ms)`);
    
    // Skip setup if form is not available or doesn't have getValues
    if (!form || typeof form.getValues !== 'function') {
      console.warn(`[Autosave] useAutosave - FormContext not ready for ${formId}`);
      // We'll retry on form changes instead of failing completely
      return;
    }
    
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
  }, [formId, form, interval, saveFunction, saveProject, projectData?.id, showToast, toast]);
  
  // Return utility functions
  return {
    performSave: () => {
      if (!form || !form.getValues) return;
      const values = form.getValues();
      saveFunction(values);
      lastSavedRef.current = values;
    },
    setLastSaved: (values: any) => {
      lastSavedRef.current = values;
    }
  };
};