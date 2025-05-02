import { useFormContext } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { useVnContext } from "@/context/vn-context";
import { BasicData } from "@/types/vn";
import { useEffect, useRef } from "react";

export function SimpleFormTest() {
  const { register, getValues, watch } = useFormContext();
  const { setBasicData, projectData, saveProject } = useVnContext();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Set up a manual watch effect to debounce saves
  // Create a ref to track last saved values
  const lastSavedValues = useRef<Record<string, any> | null>(null);
  // Add a save timeout ref for server saves
  const serverSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    const subscription = watch((values) => {
      // Clear existing timeout to debounce
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      // Set a new timeout for debounced save with a longer delay (1.5s)
      // to avoid conflicting with BasicForm's 1s delay
      timeoutRef.current = setTimeout(() => {
        const currentValues = getValues();
        console.log("SimpleFormTest debounced save with values:", currentValues);
        
        // Check if values have changed to avoid unnecessary saves
        if (JSON.stringify(currentValues) !== JSON.stringify(lastSavedValues.current)) {
          // Convert to BasicData type
          const formData: BasicData = {
            theme: currentValues.theme || "",
            tone: currentValues.tone || "", 
            genre: currentValues.genre || "",
            setting: currentValues.setting || ""
          };
          
          // Save to context
          setBasicData(formData);
          
          // Update last saved values
          lastSavedValues.current = {...currentValues};
          
          console.log("SimpleFormTest saved updated values");
          
          // Save to server if we have a project ID (with additional delay)
          if (projectData?.id) {
            // Clear existing server save timeout
            if (serverSaveTimeoutRef.current) {
              clearTimeout(serverSaveTimeoutRef.current);
            }
            
            // Set new server save timeout with additional delay
            serverSaveTimeoutRef.current = setTimeout(() => {
              console.log("SimpleFormTest saving to server...");
              saveProject().then(() => {
                console.log("SimpleFormTest saved to server successfully");
              }).catch(err => {
                console.error("SimpleFormTest error saving to server:", err);
              });
              serverSaveTimeoutRef.current = null;
            }, 500); // Extra 500ms after the form save (2s total from input)
          }
        }
        
        timeoutRef.current = null;
      }, 1500); // Use 1.5s delay to avoid race condition with BasicForm's 1s delay
    });
    
    // Clean up
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (serverSaveTimeoutRef.current) {
        clearTimeout(serverSaveTimeoutRef.current);
      }
      subscription.unsubscribe();
    };
  }, [watch, getValues, setBasicData, projectData?.id, saveProject]);
  
  const handleSave = () => {
    try {
      // This will get triggered by a button click
      const values = getValues();
      console.log("Manual save button clicked, values:", values);
      
      // Update the lastSavedValues ref to prevent duplicate saves
      lastSavedValues.current = {...values};
      
      // Convert to BasicData type
      const formData: BasicData = {
        theme: values.theme || "",
        tone: values.tone || "",
        genre: values.genre || "",
        setting: values.setting || ""
      };
      
      // Save the data to context
      console.log("Manually saving form data:", formData);
      setBasicData(formData);
      
      // Always perform direct server save
      console.log("Manual save: saving to server...");
      saveProject()
        .then((result) => {
          console.log("Manual save: server save successful", result);
        })
        .catch(err => {
          console.error("Manual save: server save error:", err);
        });
    } catch (error) {
      console.error("Error in manual save:", error);
    }
  };
  
  return (
    <div className="p-4 bg-gray-100 rounded-md mt-6">
      <h3 className="text-lg font-semibold mb-4">Simple Form Test (using register)</h3>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium mb-1">Tone:</label>
          <input 
            id="tone-field"
            {...register("tone")} 
            className="w-full p-2 border rounded"
            defaultValue={projectData?.basicData?.tone || ""}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Genre:</label>
          <input 
            id="genre-field"
            {...register("genre")} 
            className="w-full p-2 border rounded"
            defaultValue={projectData?.basicData?.genre || ""}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Theme:</label>
          <input 
            id="theme-field"
            {...register("theme")} 
            className="w-full p-2 border rounded"
            defaultValue={projectData?.basicData?.theme || ""}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Setting:</label>
          <input 
            id="setting-field"
            {...register("setting")} 
            className="w-full p-2 border rounded"
            defaultValue={projectData?.basicData?.setting || ""}
          />
        </div>
      </div>
      <div className="text-right">
        <Button onClick={handleSave} variant="outline" size="sm">
          Save Form Manually
        </Button>
      </div>
      <p className="text-xs text-gray-500 mt-2">
        This form should automatically save when fields change thanks to our custom debouncing.
        The button is just for manual testing.
      </p>
    </div>
  );
}
