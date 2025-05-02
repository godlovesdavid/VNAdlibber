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
    // Even without a project ID, we should set up autosave for new projects
    const performAutosave = () => {
      const currentValues = form.getValues();
      
      // Skip if values haven't changed since last save
      if (JSON.stringify(currentValues) === JSON.stringify(lastSavedRef.current)) {
        return;
      }

      // Save the form data
      saveFunction(currentValues);
      lastSavedRef.current = currentValues;
      
      // If we have a project with an ID, save it to the server
      if (projectData?.id) {
        // Debounce the save to avoid too many server requests
        setTimeout(async () => {
          try {
            // Call the saveProject function from context
            await saveProject();
            
            if (showToast) {
              toast({
                title: "Project Saved",
                description: `${formId} form has been automatically saved to server`,
                duration: 2000,
              });
            }
          } catch (error) {
            console.error("Error saving project in autosave:", error);
            if (showToast) {
              toast({
                title: "Save Error",
                description: "Could not save to server. Changes saved locally only.",
                variant: "destructive",
                duration: 3000,
              });
            }
          }
        }, 500);  // 500ms debounce
      } else if (showToast) {
        // Just show a toast for local save if no project exists yet
        toast({
          title: "Autosaved",
          description: `${formId} form has been automatically saved locally`,
          duration: 2000,
        });
      }
    };

    // Clear any existing timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    // Set up new timer
    timerRef.current = setInterval(performAutosave, interval);

    // Initial autosave after loading
    if (form.formState.isDirty) {
      performAutosave();
    }

    // Store initial values
    lastSavedRef.current = form.getValues();

    // Clean up timer on unmount
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [formId, saveFunction, form, interval, projectData?.id, showToast, toast, saveProject]);

  // Return controls for manual saving
  return {
    performSave: () => {
      const currentValues = form.getValues();
      saveFunction(currentValues);
      lastSavedRef.current = currentValues;
    },
    setLastSaved: (values: any) => {
      lastSavedRef.current = values;
    }
  };
};
