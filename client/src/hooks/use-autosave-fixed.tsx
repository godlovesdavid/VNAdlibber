import { useEffect, useRef } from 'react';
import { useFormContext } from 'react-hook-form';
import { useToast } from '@/hooks/use-toast';
import { useVnContext } from '@/context/vn-context';

/**
 * A hook that automatically saves form data when the form values change
 * Uses a debounce mechanism to avoid excessive saves
 * 
 * @param formId - Identifier for the form
 * @param saveFunction - Function to be called to save the form data
 * @param debounceMs - Debounce time in milliseconds (default: 2000 ms = 2 seconds)
 * @param showToast - Whether to show a toast notification on autosave (default: true)
 */
export const useAutosave = (
  formId: string,
  saveFunction: (data: any) => void,
  debounceMs = 2000, // 2 seconds default debounce
  showToast = true,
  customForm?: { watch: Function, getValues: Function } // Allow passing the form instance directly
) => {
  const { toast } = useToast();
  const contextForm = useFormContext();
  const form = customForm || contextForm; // Use passed form or form context
  const { projectData, saveProject } = useVnContext();
  
  const lastSavedRef = useRef<any>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const formReadyRef = useRef<boolean>(false);

  // Save form data to server and local state
  const performSave = async (values: any) => {
    try {
      // Skip if nothing changed
      if (JSON.stringify(values) === JSON.stringify(lastSavedRef.current)) {
        console.log(`[Autosave] ${formId} - No changes detected, skipping save`);
        return;
      }
      
      // Update local state
      console.log(`[Autosave] ${formId} - Saving form data locally...`, values);
      saveFunction(values);
      lastSavedRef.current = values;
      
      // Save to server if project exists
      if (projectData?.id) {
        try {
          console.log(`[Autosave] ${formId} - Saving to server (project ID: ${projectData.id})...`);
          await saveProject();
          console.log(`[Autosave] ${formId} - Saved to server successfully`);
          
          if (showToast) {
            toast({
              title: "Changes Saved",
              description: `${formId} saved automatically`,
              duration: 2000,
            });
          }
        } catch (err) {
          console.error(`[Autosave] ${formId} - Failed to save to server:`, err);
        }
      } else {
        console.log(`[Autosave] ${formId} - Server save skipped (no project ID yet)`);
      }
    } catch (error) {
      console.error(`[Autosave] ${formId} - Error during save:`, error);
      
      if (showToast) {
        toast({
          title: "Save Failed",
          description: `Could not save ${formId} changes automatically`,
          variant: "destructive",
          duration: 3000,
        });
      }
    }
  };

  // Setup watch subscription for form changes
  useEffect(() => {
    // Skip if form is not available, but try again in 500ms
    if (!form || typeof form.watch !== 'function' || typeof form.getValues !== 'function') {
      console.warn(`[Autosave] ${formId} - FormContext not ready, retrying in 500ms`);
      
      // Retry with a delay to allow form context to initialize
      const retryTimer = setTimeout(() => {
        const formIsReady = form && typeof form.watch === 'function' && typeof form.getValues === 'function';
        if (formIsReady) {
          console.log(`[Autosave] ${formId} - FormContext now available after retry`);
          // We can't trigger a re-render here, but the form will be ready on the next render
        } else {
          console.error(`[Autosave] ${formId} - FormContext still not available after retry`);
        }
      }, 500);
      
      return () => clearTimeout(retryTimer);
    }

    console.log(`[Autosave] ${formId} - Setting up autosave with ${debounceMs}ms debounce`);
    
    // Initialize with current values
    const initialValues = form.getValues();
    lastSavedRef.current = initialValues;
    formReadyRef.current = true;
    console.log(`[Autosave] ${formId} - Initialized with values:`, initialValues);

    // Subscribe to form changes
    const subscription = form.watch((formValue: any, { name, type }: { name: string, type: string }) => {
      // Log the change event for debugging
      console.log(`[Autosave] ${formId} - Form change detected:`, { field: name, type });
      
      // Clear previous timeout to implement debouncing
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      // Set new timeout
      timeoutRef.current = setTimeout(() => {
        const currentValues = form.getValues();
        console.log(`[Autosave] ${formId} - Debounce completed, saving values:`, currentValues);
        performSave(currentValues);
      }, debounceMs);
      
      // Return cleanup function for this specific subscription callback
      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      };
    });
    
    // Cleanup subscription when component unmounts
    return () => {
      console.log(`[Autosave] ${formId} - Cleaning up autosave`);
      subscription.unsubscribe();
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [form, formId, debounceMs, saveFunction, saveProject, projectData?.id, showToast, toast]);
  
  // Return utility functions
  return {
    // Force an immediate save
    performSave: () => {
      if (!form || typeof form.getValues !== 'function') return;
      const values = form.getValues();
      console.log(`[Autosave] ${formId} - Manual save triggered`);
      performSave(values);
    },
    // Update what's considered the "last saved" state
    setLastSaved: (values: any) => {
      lastSavedRef.current = values;
      console.log(`[Autosave] ${formId} - Last saved state updated manually`);
    },
    // Form ID for debugging
    formId
  };
};