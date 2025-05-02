import { useEffect } from "react";
import { useFormContext } from "react-hook-form";

/**
 * useAutosave hook
 * @param saveFn Function to call after debounce period (e.g. save to localStorage or API)
 * @param delay Debounce delay in ms (default: 2000ms)
 */
export function useAutosave(saveFn: (data: any) => void, delay = 2000) {
  const { watch, getValues } = useFormContext();

  useEffect(() => {
    const subscription = watch(() => {
      const timer = setTimeout(() => {
        const values = getValues();
        saveFn(values);
      }, delay);

      return () => clearTimeout(timer);
    });

    return () => subscription.unsubscribe();
  }, [watch, getValues, saveFn, delay]);
}
