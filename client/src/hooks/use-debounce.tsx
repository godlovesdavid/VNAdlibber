import { useState, useEffect } from 'react';

/**
 * A hook that provides a debounced version of a value
 * @param value The value to debounce
 * @param delay The delay in milliseconds
 * @returns The debounced value
 */
export function useDebounce<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Set a timeout to update the debounced value after the specified delay
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Clean up the timeout if the value changes before the delay has passed
    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * A hook that provides a debounced callback function
 * @param callback The callback to debounce
 * @param delay The delay in milliseconds
 * @returns A tuple containing [debouncedCallback, isPending]
 */
export function useDebounceCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 500
): [(...args: Parameters<T>) => void, boolean] {
  const [isPending, setIsPending] = useState(false);
  const [args, setArgs] = useState<Parameters<T> | null>(null);

  useEffect(() => {
    if (args === null) return;

    setIsPending(true);
    const timer = setTimeout(() => {
      callback(...args);
      setIsPending(false);
      setArgs(null);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [args, callback, delay]);

  const debouncedCallback = (...newArgs: Parameters<T>) => {
    setArgs(newArgs);
  };

  return [debouncedCallback, isPending];
}
