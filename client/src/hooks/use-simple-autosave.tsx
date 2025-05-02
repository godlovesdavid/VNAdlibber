import React, { useEffect, useRef } from "react";
import { useFormContext } from "react-hook-form";

/**
 * useAutosave hook
 * @param saveFn Function to call after debounce period (e.g. save to localStorage or API)
 * @param delay Debounce delay in ms (default: 2000ms)
 */
export function useAutosave(saveFn: (data: any) => void, delay = 2000) {
  const { watch, getValues } = useFormContext();
  
  // Use a reference to store the timeout ID
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Clear any existing timeout when component unmounts
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const subscription = watch(() => {
      // Clear any existing timeout to prevent multiple calls
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      // Set a new timeout
      timeoutRef.current = setTimeout(() => {
        const values = getValues();
        console.log('Debounced autosave with values:', values);
        saveFn(values);
        timeoutRef.current = null;
      }, delay);
    });

    return () => subscription.unsubscribe();
  }, [watch, getValues, saveFn, delay]);
}
