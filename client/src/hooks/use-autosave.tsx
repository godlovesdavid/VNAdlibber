import { useState, useEffect } from 'react';

/**
 * A hook that provides automatic saving functionality with debounce
 * 
 * @param saveFunction Function to call for saving data
 * @param data The data to be saved
 * @param delay Debounce delay in milliseconds (default: 1500ms)
 * @returns { lastSaved: number } Last timestamp when data was saved
 */
export function useAutosave<T>(
  saveFunction: (data: T) => void,
  data: T,
  delay: number = 1500
): { lastSaved: number } {
  const [lastEdited, setLastEdited] = useState(0);
  const [lastSaved, setLastSaved] = useState(0);
  
  // Update lastEdited whenever data changes
  useEffect(() => {
    // Skip initial render
    if (lastEdited === 0) return;
    
    const timeoutId = setTimeout(() => {
      // Call the save function
      saveFunction(data);
      // Update last saved timestamp
      setLastSaved(Date.now());
    }, delay);
    
    // Cleanup timeout on unmount or when dependencies change
    return () => {
      clearTimeout(timeoutId);
    };
  }, [data, lastEdited, saveFunction, delay]);
  
  // Set lastEdited whenever data changes
  useEffect(() => {
    setLastEdited(Date.now());
  }, [data]);
  
  return { lastSaved };
}