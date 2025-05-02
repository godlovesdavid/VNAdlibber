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
  const { projectData } = useVnContext();
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedRef = useRef<any>(null);

  // Setup autosave timer
  useEffect(() => {
    // Only set up autosave if we have a valid project
    if (!projectData?.id) return;

    const performAutosave = () => {
      const currentValues = form.getValues();
      
      // Skip if values haven't changed since last save
      if (JSON.stringify(currentValues) === JSON.stringify(lastSavedRef.current)) {
        return;
      }

      // Save the form data
      saveFunction(currentValues);
      lastSavedRef.current = currentValues;

      // Show toast notification if enabled
      if (showToast) {
        toast({
          title: "Autosaved",
          description: `${formId} form has been automatically saved`,
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
  }, [formId, saveFunction, form, interval, projectData?.id, showToast, toast]);

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
