import { useEffect, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useVnContext } from '@/context/vn-context';

/**
 * A hook that automatically saves component state at regular intervals
 * 
 * @param formId - Identifier for the form or component
 * @param saveFunction - Function to be called to save the state data
 * @param interval - Interval in milliseconds between autosaves (default: 30 seconds)
 * @param showToast - Whether to show a toast notification on autosave (default: true)
 */
export function useStateAutosave(
  componentId: string,
  saveFunction: () => any,
  interval = 30000,
  showToast = true
) {
  const { toast } = useToast();
  const { projectData, saveProject } = useVnContext();
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedRef = useRef<any>(null);

  // Setup autosave timer
  useEffect(() => {
    console.log(`Setting up autosave for ${componentId} with ${interval}ms interval`);
    
    // Function to save state data
    const performSave = async () => {
      console.log(`Autosave triggered for ${componentId}`);
      
      try {
        // Save locally using the provided function
        const savedData = saveFunction();
        console.log(`State saved for ${componentId}:`, savedData);
        
        // Skip if nothing changed or no data returned
        if (!savedData || JSON.stringify(savedData) === JSON.stringify(lastSavedRef.current)) {
          console.log(`No changes detected for ${componentId}, skipping save`);
          return;
        }
        
        lastSavedRef.current = savedData;
        
        // Save to server if project exists
        if (projectData?.id) {
          console.log(`Saving ${componentId} to server...`);
          try {
            await saveProject();
            console.log(`Successfully saved ${componentId} to server`);
            if (showToast) {
              toast({
                title: "Project Saved",
                description: `${componentId} saved automatically`,
                duration: 2000,
              });
            }
          } catch (err) {
            console.error(`Failed to save ${componentId} to server:`, err);
          }
        } else {
          console.log(`No project ID available, skipping server save for ${componentId}`);
        }
      } catch (error) {
        console.error(`Error in autosave for ${componentId}:`, error);
      }
    };
    
    // Clear any existing timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    // Setup new timer
    timerRef.current = setInterval(performSave, interval);
    console.log(`Autosave timer set for ${componentId} (interval: ${interval}ms)`);
    
    // Initialize last saved values
    const initialData = saveFunction();
    console.log(`Initial data for ${componentId}:`, initialData);
    lastSavedRef.current = initialData;
    
    // Cleanup on unmount
    return () => {
      console.log(`Cleaning up autosave timer for ${componentId}`);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [componentId, interval, saveFunction, saveProject, projectData?.id, showToast, toast]);
  
  // Return utility functions
  return {
    performSave: async () => {
      console.log(`Manual save triggered for ${componentId}`);
      try {
        const savedData = saveFunction();
        lastSavedRef.current = savedData;
        
        if (projectData?.id) {
          await saveProject();
          console.log(`Successfully saved ${componentId} to server (manual)`);
        }
        
        return savedData;
      } catch (error) {
        console.error(`Error in manual save for ${componentId}:`, error);
        return null;
      }
    },
    setLastSaved: (data: any) => {
      lastSavedRef.current = data;
    }
  };
}
