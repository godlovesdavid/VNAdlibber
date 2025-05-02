import { useEffect, useRef } from 'react';
import { useFormContext } from 'react-hook-form';

interface AutoSaveFormProps {
  onSave: (data: any) => void;
  projectId?: number;
  formId: string;
  debounceMs?: number;
}

/**
 * A component that automatically saves form data when values change
 * Must be placed inside a FormProvider context
 */
export function AutoSaveForm({ 
  onSave, 
  projectId, 
  formId, 
  debounceMs = 1000 
}: AutoSaveFormProps) {
  // Get form methods from context
  const { watch, getValues } = useFormContext();
  
  // Refs for debouncing and tracking last saved values
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedRef = useRef<Record<string, any> | null>(null);
  
  // Set up the watcher effect
  useEffect(() => {
    console.log(`[AutoSave:${formId}] Effect running, projectId:`, projectId);
    
    // Subscribe to form value changes
    const subscription = watch((formData) => {
      console.log(`[AutoSave:${formId}] Form values changed:`, formData);
      
      // Clear existing timeout for debouncing
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      // Set new timeout for debounced save
      timeoutRef.current = setTimeout(() => {
        const currentValues = getValues();
        console.log(`[AutoSave:${formId}] Debounce complete, current values:`, currentValues);
        
        // Don't save if values haven't changed since last save
        if (JSON.stringify(currentValues) !== JSON.stringify(lastSavedRef.current)) {
          console.log(`[AutoSave:${formId}] Values changed, saving...`);
          
          // Call the save function provided by parent
          onSave(currentValues);
          
          // Update last saved values
          lastSavedRef.current = { ...currentValues };
        } else {
          console.log(`[AutoSave:${formId}] Values unchanged, skipping save`);
        }
        
        timeoutRef.current = null;
      }, debounceMs);
    });
    
    // Clean up subscription and timeouts
    return () => {
      console.log(`[AutoSave:${formId}] Cleaning up effect`);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      subscription.unsubscribe();
    };
  }, [watch, getValues, onSave, formId, debounceMs, projectId]);
  
  // This component doesn't render anything
  return null;
}