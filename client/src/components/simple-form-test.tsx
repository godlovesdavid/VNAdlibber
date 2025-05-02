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
  useEffect(() => {
    const subscription = watch((values) => {
      // Clear existing timeout to debounce
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      // Set a new timeout for debounced save
      timeoutRef.current = setTimeout(() => {
        const currentValues = getValues();
        console.log("SimpleFormTest debounced save with values:", currentValues);
        
        // Convert to BasicData type
        const formData: BasicData = {
          theme: currentValues.theme || "",
          tone: currentValues.tone || "", 
          genre: currentValues.genre || "",
          setting: currentValues.setting || ""
        };
        
        // Save to context
        setBasicData(formData);
        
        timeoutRef.current = null;
      }, 1000);
    });
    
    // Clean up
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      subscription.unsubscribe();
    };
  }, [watch, getValues, setBasicData]);
  
  const handleSave = () => {
    // This will get triggered by a button click
    const values = getValues();
    
    // Convert to BasicData type
    const formData: BasicData = {
      theme: values.theme || "",
      tone: values.tone || "",
      genre: values.genre || "",
      setting: values.setting || ""
    };
    
    // Save the data
    console.log("Manually saving form data:", formData);
    setBasicData(formData);
    
    // Save to server if we have a project ID
    if (projectData?.id) {
      console.log("Saving to server via manual save...");
      saveProject().then(() => {
        console.log("Saved to server successfully via manual save");
      }).catch(err => {
        console.error("Error saving to server:", err);
      });
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
