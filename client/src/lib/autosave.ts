import { useEffect, useRef } from 'react';

/**
 * Simple hook for automatic debounced saving to context
 * 
 * @param data The data object to watch for changes
 * @param saveFunction The function to call to save changes
 * @param debounceMs Time to wait before saving (default: 1500ms)
 * @param logPrefix Optional prefix for console logs (for debugging)
 */
export function useSimpleAutosave<T>(
  data: T,
  saveFunction: (data: T) => void,
  debounceMs = 1500,
  logPrefix?: string
) {
  // Use a ref to hold the timeout ID
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Previous value reference to detect changes
  const previousValueRef = useRef<T | null>(null);
  
  // Setup effect to watch for changes and save with debounce
  useEffect(() => {
    // Skip if this is the first render or no actual change
    const isFirstRender = previousValueRef.current === null;
    
    // Update the previous value
    previousValueRef.current = data;
    
    // Skip the first render
    if (isFirstRender) return;
    
    // Optional logging
    if (logPrefix) {
      console.log(`${logPrefix}: Content changed, queueing autosave in ${debounceMs}ms...`);
    }
    
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // Set up a new timeout
    timeoutRef.current = setTimeout(() => {
      saveFunction(data);
      
      if (logPrefix) {
        console.log(`${logPrefix}: Autosaved data to context`);
      }
    }, debounceMs);
    
    // Cleanup function
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [data, saveFunction, debounceMs, logPrefix]);
}