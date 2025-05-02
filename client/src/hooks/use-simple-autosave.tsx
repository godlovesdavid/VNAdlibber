import React, { useEffect, useRef } from "react";
import { useFormContext } from "react-hook-form";

type FormValues = Record<string, any>;

/**
 * useAutosave hook - Modified version that prevents form value clearing
 * @param formId Identifier for the form (for logging)
 * @param saveFn Function to call after debounce period (e.g. save to localStorage or API)
 * @param delay Debounce delay in ms (default: 2000ms)
 */
export function useAutosave(formId: string, saveFn: (data: FormValues) => void, delay = 2000) {
  const formContext = useFormContext();
  
  // Use a reference to store the timeout ID
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  // Track last saved values to prevent unnecessary saves and form resets
  const lastSavedValuesRef = useRef<FormValues | null>(null);

  // Bail out gracefully if no form context
  if (!formContext) {
    console.warn(`useAutosave(${formId}): No FormContext found`);
    return;
  }

  const { watch, getValues } = formContext;

  useEffect(() => {
    // Clear any existing timeout when component unmounts
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    // Initialize with current values
    if (!lastSavedValuesRef.current) {
      lastSavedValuesRef.current = getValues();
    }

    // Set up watch subscription for changes
    const subscription = watch((formValues) => {  
      // Clear any existing timeout to prevent multiple calls
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      // Set a new timeout
      timeoutRef.current = setTimeout(() => {
        const values = getValues();
        
        // Check if values actually changed to avoid unnecessary saves
        if (JSON.stringify(values) !== JSON.stringify(lastSavedValuesRef.current)) {
          console.log(`Autosaving form ${formId} with values:`, values);
          saveFn(values);
          // Update last saved values (clone the object to avoid reference issues)
          lastSavedValuesRef.current = {...values};
        }
        
        timeoutRef.current = null;
      }, delay);
    });

    return () => subscription.unsubscribe();
  }, [watch, getValues, saveFn, delay, formId]);
}
