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
export function useAutosave(
  formId: string,
  saveFunction: (data: any) => void,
  interval = 2000, 
  showToast = true
) {
  const { toast } = useToast();
  const form = useFormContext();
  const { projectData, saveProject } = useVnContext();
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedRef = useRef<any>(null);

  // Setup autosave timer
  useEffect(() => {
    // Skip setup if form is not available
    if (!form) {
      console.warn("useAutosave called outside FormProvider");
      return;
    }
    
    // Function to save form data
    const performSave = async () => {
      alert('got here')
      console.log('got here')
      if (!form.getValues) return;
      
      try {
        // Get current values
        const currentValues = form.getValues();
        
        // Skip if nothing changed
        if (JSON.stringify(currentValues) === JSON.stringify(lastSavedRef.current)) {
          return;
        }
        
        // Save locally
        saveFunction(currentValues);
        lastSavedRef.current = currentValues;
        
        // Only save to server if project exists and not during initial load
        // Determined by sessionStorage flag set in createNewProject
        const isInitialSetup = sessionStorage.getItem("vn_fresh_project") === "true";
        
        if (projectData?.id && !isInitialSetup) {
          try {
            await saveProject();
            if (showToast) {
              toast({
                title: "Project Saved",
                description: `${formId} saved automatically`,
                duration: 2000,
              });
            }
          } catch (err) {
            console.error("Failed to save project", err);
          }
        }
      } catch (error) {
        console.error("Error in autosave", error);
      }
    };
    
    // Clear any existing timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    // Setup new timer
    timerRef.current = setInterval(performSave, interval);
    
    // Initialize last saved values
    if (form.getValues) {
      lastSavedRef.current = form.getValues();
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
      try {
        const values = form.getValues();
        saveFunction(values);
        lastSavedRef.current = values;
      } catch (error) {
        console.error("Error in manual save:", error);
      }
    },
    setLastSaved: (values: any) => {
      lastSavedRef.current = values;
    }
  };
}