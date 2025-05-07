import { useEffect, useState } from 'react';

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
  const [lastChanged, setLastChanged] = useState(0);

  // Save to context whenever data changes (with debounce)
  useEffect(() => {
    // Skip initial render/mount
    if (lastChanged === 0) return;
    
    // Optional logging
    if (logPrefix) {
      console.log(`${logPrefix}: Change detected, will save in ${debounceMs}ms`);
    }
    
    // Set up debounced save
    const timeoutId = setTimeout(() => {
      saveFunction(data);
      
      // Optional logging
      if (logPrefix) {
        console.log(`${logPrefix}: Saved data to context`);
      }
    }, debounceMs);
    
    // Cleanup timeout
    return () => clearTimeout(timeoutId);
  }, [data, lastChanged, saveFunction, debounceMs, logPrefix]);

  // Update lastChanged whenever data changes
  useEffect(() => {
    // Skip initial render
    if (lastChanged === 0) {
      setLastChanged(Date.now());
      return;
    }
    
    setLastChanged(Date.now());
  }, [data]);
}