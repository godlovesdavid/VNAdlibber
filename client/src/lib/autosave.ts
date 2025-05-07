import { useEffect, useRef, useState } from 'react';

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
  const previousValueRef = useRef<string | null>(null);
  
  // Setup effect to watch for changes and save with debounce
  useEffect(() => {
    // Convert current data to string representation for comparison
    const currentDataString = JSON.stringify(data);
    
    // Skip if this is the first render or no actual change
    const isFirstRender = previousValueRef.current === null;
    const hasChanged = previousValueRef.current !== currentDataString;
    
    // Update the previous value
    previousValueRef.current = currentDataString;
    
    // Skip the first render or if data hasn't changed
    if (isFirstRender || !hasChanged) return;
    
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

/**
 * Enhanced hook for autosaving directly to database
 * This hook first saves to context and then directly to the database
 * 
 * @param data The data object to watch for changes
 * @param saveToContextFunction Function to save to context state
 * @param saveToDbFunction Function to save directly to database
 * @param debounceMs Time to wait before saving (default: 1500ms)
 * @param dbSaveDebounceMs Additional time to wait before saving to database (default: 1000ms)
 * @param logPrefix Optional prefix for console logs (for debugging)
 * @returns Object with saving status indicators
 */
export function useDatabaseAutosave<T>(
  data: T,
  saveToContextFunction: (data: T) => void,
  saveToDbFunction: () => Promise<any>,
  debounceMs = 1500,
  dbSaveDebounceMs = 1000,
  logPrefix?: string
): {
  savingToContext: boolean;
  savingToDb: boolean;
} {
  // Saving status indicators
  const [savingToContext, setSavingToContext] = useState(false);
  const [savingToDb, setSavingToDb] = useState(false);
  
  // Timeout refs for both save operations
  const contextTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const dbTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Previous value reference to detect changes
  const previousValueRef = useRef<string | null>(null);
  
  // Setup effect to watch for changes and save with debounce
  useEffect(() => {
    // Convert current data to string representation for comparison
    const currentDataString = JSON.stringify(data);
    
    // Skip if this is the first render or no actual change
    const isFirstRender = previousValueRef.current === null;
    const hasChanged = previousValueRef.current !== currentDataString;
    
    // Update the previous value
    previousValueRef.current = currentDataString;
    
    // Skip the first render or if data hasn't changed
    if (isFirstRender || !hasChanged) return;
    
    // Set saving to context indicator
    setSavingToContext(true);
    
    // Optional logging
    if (logPrefix) {
      console.log(`${logPrefix}: Content changed, queueing context save in ${debounceMs}ms...`);
    }
    
    // Clear existing timeouts
    if (contextTimeoutRef.current) {
      clearTimeout(contextTimeoutRef.current);
    }
    if (dbTimeoutRef.current) {
      clearTimeout(dbTimeoutRef.current);
    }
    
    // Set up context save timeout
    contextTimeoutRef.current = setTimeout(() => {
      // Save to context
      saveToContextFunction(data);
      setSavingToContext(false);
      
      if (logPrefix) {
        console.log(`${logPrefix}: Saved data to context, queueing DB save in ${dbSaveDebounceMs}ms...`);
      }
      
      // After saving to context, set up database save timeout
      setSavingToDb(true);
      dbTimeoutRef.current = setTimeout(async () => {
        try {
          // Save to database
          await saveToDbFunction();
          if (logPrefix) {
            console.log(`${logPrefix}: Saved data to database`);
          }
        } catch (error) {
          console.error(`${logPrefix}: Failed to save to database`, error);
        } finally {
          setSavingToDb(false);
        }
      }, dbSaveDebounceMs);
    }, debounceMs);
    
    // Cleanup function
    return () => {
      if (contextTimeoutRef.current) {
        clearTimeout(contextTimeoutRef.current);
      }
      if (dbTimeoutRef.current) {
        clearTimeout(dbTimeoutRef.current);
      }
    };
  }, [data, saveToContextFunction, saveToDbFunction, debounceMs, dbSaveDebounceMs, logPrefix]);
  
  return { savingToContext, savingToDb };
}