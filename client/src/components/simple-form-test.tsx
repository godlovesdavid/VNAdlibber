import { useFormContext } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { useVnContext } from "@/context/vn-context";
import { BasicData } from "@/types/vn";

export function SimpleFormTest() {
  const { register, getValues } = useFormContext();
  const { setBasicData, projectData, saveProject } = useVnContext();
  
  const handleSave = () => {
    // This will get triggered by a button click
    const values = getValues();
    
    // Convert to BasicData type
    const formData: BasicData = {
      theme: values.theme as string,
      tone: values.tone as string,
      genre: values.genre as string,
      setting: values.setting as string
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
        This form should automatically save when fields change thanks to FormProvider + useAutosave hook.
        The button is just for manual testing.
      </p>
    </div>
  );
}
