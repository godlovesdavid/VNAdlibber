import { createContext, useContext, useState, useCallback, useEffect } from 'react';

// Define the context type
type FormSaveContextType = {
  registerSaveFunction: (path: string, saveFunction: () => void) => void;
  unregisterSaveFunction: (path: string) => void;
  saveCurrentForm: (path: string) => void;
};

// Create the context with default values
const FormSaveContext = createContext<FormSaveContextType>({
  registerSaveFunction: () => {},
  unregisterSaveFunction: () => {},
  saveCurrentForm: () => {},
});

// Provider component
export const FormSaveProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Map of paths to save functions
  const [saveFunctions, setSaveFunctions] = useState<Record<string, () => void>>({});

  // Register a save function for a specific path
  const registerSaveFunction = useCallback((path: string, saveFunction: () => void) => {
    setSaveFunctions(prev => ({
      ...prev,
      [path]: saveFunction,
    }));
  }, []);

  // Unregister a save function
  const unregisterSaveFunction = useCallback((path: string) => {
    setSaveFunctions(prev => {
      const newFunctions = { ...prev };
      delete newFunctions[path];
      return newFunctions;
    });
  }, []);

  // Save the current form based on path
  const saveCurrentForm = useCallback((path: string) => {
    const saveFunction = saveFunctions[path];
    if (saveFunction) {
      saveFunction();
    } else {
      console.log(`No save function registered for path: ${path}`);
    }
  }, [saveFunctions]);

  return (
    <FormSaveContext.Provider
      value={{
        registerSaveFunction,
        unregisterSaveFunction,
        saveCurrentForm,
      }}
    >
      {children}
    </FormSaveContext.Provider>
  );
};

// Custom hook to use the context
export const useFormSave = () => {
  return useContext(FormSaveContext);
};

// Hook for form components to register their save functions
export const useRegisterFormSave = (path: string, saveFunction: () => void) => {
  const { registerSaveFunction, unregisterSaveFunction } = useFormSave();

  // Register the save function when the component mounts
  // and unregister when it unmounts
  useEffect(() => {
    registerSaveFunction(path, saveFunction);
    
    return () => {
      unregisterSaveFunction(path);
    };
  }, [path, saveFunction, registerSaveFunction, unregisterSaveFunction]);
};


