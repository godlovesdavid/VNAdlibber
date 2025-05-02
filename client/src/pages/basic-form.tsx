import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useVnContext } from "@/context/vn-context";
import { useRegisterFormSave } from "@/hooks/use-form-save";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { SimpleFormTest } from "@/components/simple-form-test";
import { BasicData } from "@/types/vn";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { CreationProgress } from "@/components/creation-progress";
import { NavBar } from "@/components/nav-bar";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

// Arrays for each dropdown type
const tones = [
  "adventurous",
  "dark",
  "gritty",
  "lighthearted",
  "melancholic",
  "romantic",
  "satirical",
  "suspenseful",
  "tragicomic",
  "uplifting",
  "whimsical",
];

const genres = [
  "mystery",
  "romance",
  "sci_fi",
  "adventure",
  "slice_of_life",
  "thriller",
  "comedy",
  "horror",
  "drama",
];

const themes = [
  "forgiveness",
  "freedom_vs_control",
  "growth",
  "identity",
  "love_vs_duty",
  "revenge_and_justice",
  "technology_vs_humanity",
  "sacrifice",
  "trust_and_betrayal",
];

const settings = [
  "cyberpunk_world",
  "steampunk_world",
  "noir_setting",
  "modern_day",
  "school",
  "history",
  "mythology",
  "space",
  "dystopia",
  "utopia",
  "urban_city",
  "haunted_place",
  "countryside",
  "post_apocalypse",
  "virtual_reality",
];

// Helper function to get a random item from an array
function getRandomItem(array: string[]): string {
  return array[Math.floor(Math.random() * array.length)];
}

// Define form validation schema with zod
const basicFormSchema = z.object({
  theme: z.string().min(1, { message: "Theme is required" }),
  tone: z.string().min(1, { message: "Tone is required" }),
  genre: z.string().min(1, { message: "Genre is required" }),
  setting: z.string().min(1, { message: "Setting is required" }),
});

// Define the form values type
type BasicFormValues = z.infer<typeof basicFormSchema>;

export default function BasicForm() {
  const [, setLocation] = useLocation();
  const { projectData, setBasicData, saveProject } = useVnContext();
  
  // State to track if the form has been initialized with random values
  const [initialized, setInitialized] = useState(false);
  
  // Define the form with React Hook Form
  const form = useForm<BasicFormValues>({
    resolver: zodResolver(basicFormSchema),
    // Use existing values from context or empty strings as defaults
    defaultValues: {
      theme: projectData?.basicData?.theme || "",
      tone: projectData?.basicData?.tone || "",
      genre: projectData?.basicData?.genre || "",
      setting: projectData?.basicData?.setting || "",
    },
  });
  
  // Effects to update form when project data changes
  useEffect(() => {
    if (projectData?.basicData) {
      console.log("Loading existing basic data:", projectData.basicData);
      form.reset({
        theme: projectData.basicData.theme || "",
        tone: projectData.basicData.tone || "",
        genre: projectData.basicData.genre || "",
        setting: projectData.basicData.setting || "",
      });
    }
  }, [projectData?.basicData, form]);

  // Function to randomize all form values
  const randomizeForm = () => {
    console.log("[BasicForm] Randomizing form values");
    const randomValues = {
      theme: getRandomItem(themes),
      tone: getRandomItem(tones),
      genre: getRandomItem(genres),
      setting: getRandomItem(settings),
    };
    
    // Update form with random values
    form.reset(randomValues);
    setInitialized(true);
    
    console.log("[BasicForm] Random values set:", randomValues);
    
    // Make sure the BasicData type is preserved correctly
    const typedData: BasicData = {
      theme: randomValues.theme,
      tone: randomValues.tone,
      genre: randomValues.genre,
      setting: randomValues.setting
    };
    
    // Save the randomized values to context
    setBasicData(typedData);
    
    // Only save the project to the server if explicitly requested by user
    // and not during initial form setup
    const isInitialSetup = sessionStorage.getItem("vn_fresh_project") === "true";
    if (projectData?.id && !isInitialSetup) {
      console.log("[BasicForm] Saving randomized values to server");
      saveProject();
    }
  };

  // Load or reset form values based on projectData
  // Using a ref to track if we've already loaded the initial data to prevent loops
  const initialDataLoadedRef = useRef(false);
  
  useEffect(() => {
    console.log("Project data changed:", projectData?.basicData);

    // Check if we need to reset (flag from createNewProject)
    const isNewProject = sessionStorage.getItem("vn_fresh_project") === "true";
    if (isNewProject) {
      console.log("New project flag found, resetting form");
      sessionStorage.removeItem("vn_fresh_project");
      randomizeForm();
      initialDataLoadedRef.current = true;
      return;
    }

    // If we've already loaded the data or there's no data to load, skip
    if (initialDataLoadedRef.current || !projectData?.basicData) {
      return;
    }
    
    // If we have project data, use it without randomizing
    console.log("Loading initial project data", projectData.basicData);
    form.reset({
      theme: projectData.basicData.theme || "",
      tone: projectData.basicData.tone || "",
      genre: projectData.basicData.genre || "",
      setting: projectData.basicData.setting || "",
    });
    
    // Explicitly set initialized to true to prevent auto-randomization
    setInitialized(true);
    initialDataLoadedRef.current = true;
  }, [projectData, randomizeForm]);

  // Helper function to save basic data
  function saveBasicData() {
    const values = form.getValues();
    
    // Convert to BasicData type
    const formData: BasicData = {
      theme: values.theme,
      tone: values.tone,
      genre: values.genre,
      setting: values.setting
    };
    
    setBasicData(formData);
    return formData;
  }
  
  // Register with form save system
  useRegisterFormSave('basic', saveBasicData);
  
  // Reference to track the save timeout
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // State to track save count for debugging
  const [saveCount, setSaveCount] = useState(0);
  const [lastSavedField, setLastSavedField] = useState<string>("");
  
  // Log project ID whenever it changes for debugging
  useEffect(() => {
    console.log(`🔄 Project ID changed: ${projectData?.id || 'none'}`);
  }, [projectData?.id]);
  
  // Log form state changes for debugging
  useEffect(() => {
    console.log(`📝 Form submission state: ${form.formState.isSubmitting ? 'submitting' : 'not submitting'}`);
    console.log(`📝 Form dirty state: ${form.formState.isDirty ? 'dirty' : 'clean'}`);
  }, [form.formState.isSubmitting, form.formState.isDirty]);
  
  // Create a direct field save handler for the form fields with enhanced debugging
  const handleFieldChange = (fieldName: "theme" | "tone" | "genre" | "setting", value: string) => {
    console.log(`🔵 Field '${fieldName}' changed to '${value}'`);
    setLastSavedField(fieldName);
    
    // Update the form value with validation
    form.setValue(fieldName, value, {
      shouldValidate: true,
      shouldDirty: true, 
      shouldTouch: true
    });
    
    // Get current form values
    const values = form.getValues();
    console.log("📋 Current form values:", values);
    
    // Convert to BasicData type
    const formData: BasicData = {
      theme: values.theme || "",
      tone: values.tone || "",
      genre: values.genre || "",
      setting: values.setting || ""
    };
    
    // Save to context immediately
    console.log("💾 Saving to context:", formData);
    setBasicData(formData);
    
    // Debounce the server save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      console.log("🔄 Cleared previous save timeout");
    }
    
    if (projectData?.id) {
      console.log(`⏱️ Setting up save timeout for project ${projectData.id}...`);
      saveTimeoutRef.current = setTimeout(() => {
        console.log(`⭐ SAVE TIMEOUT TRIGGERED for field '${fieldName}', SAVING TO SERVER...`);
        setSaveCount(prev => prev + 1);
        saveProject()
          .then(() => {
            console.log(`✅ SERVER SAVE #${saveCount} SUCCESSFUL!`);
          })
          .catch(error => console.error(`❌ SERVER SAVE #${saveCount} FAILED:`, error));
        saveTimeoutRef.current = null;
      }, 1000);
    } else {
      console.log("⚠️ NO PROJECT ID AVAILABLE, CANNOT SAVE TO SERVER");
    }
  };
  
  // Go back to main menu
  const goBack = () => {
    setLocation("/");
  };

  // Manual reset for debugging
  const handleManualReset = () => {
    console.log("Manual reset requested");

    // Clear all browser storage
    localStorage.clear();
    sessionStorage.clear();

    // Randomize form values
    randomizeForm();

    // Show confirmation
    window.alert("Form values manually reset and randomized.");
  };

  // Proceed to next step
  const handleSubmit = form.handleSubmit(async (values) => {
    // Convert to BasicData type
    const formData: BasicData = {
      theme: values.theme,
      tone: values.tone,
      genre: values.genre,
      setting: values.setting
    };
    
    // Save data
    setBasicData(formData);
    
    // Save project to server if it has an ID
    if (projectData?.id) {
      try {
        await saveProject();
      } catch (error) {
        console.error("Error saving project:", error);
      }
    }

    // Navigate to next step
    setLocation("/create/concept");
  });

  return (
    <>
      <NavBar />
      <CreationProgress currentStep={1} />

      <div className="pt-16">
        <div className="creation-container max-w-4xl mx-auto p-6">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6">
            Step 1: Basic Elements
          </h2>
          <p className="text-gray-600 mb-6">
            Select the fundamental elements that will define your visual novel's
            world and atmosphere.
          </p>

          <FormProvider {...form}>
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Sentence-style form with dropdowns */}
              <div className="bg-gray-50 p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-medium text-gray-700">
                    Create Your Story
                  </h3>
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    onClick={randomizeForm}
                    className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-4 h-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M3 2v6h6"></path>
                      <path d="M3 13a9 9 0 0 0 9 9 9 9 0 0 0 6.75-3"></path>
                      <path d="M14 10h7"></path>
                      <path d="M21 10v7"></path>
                    </svg>
                    Randomize All
                  </Button>
                </div>

                <div className="text-lg leading-relaxed space-y-6">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-gray-700">Compose me a</span>

                    {/* Tone Dropdown */}
                    <div className="inline-block">
                      <Select 
                        value={form.getValues().tone} 
                        onValueChange={(value) => handleFieldChange("tone", value)}
                      >
                        <SelectTrigger className="w-44 h-8 text-base border-b-2 border-blue-500 rounded-none bg-transparent focus:ring-0">
                          <SelectValue placeholder="tone" />
                        </SelectTrigger>
                        <SelectContent className="min-w-[180px]">
                          {tones.map((tone) => (
                            <SelectItem key={tone} value={tone}>{tone}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Genre Dropdown */}
                    <div className="inline-block">
                      <Select 
                        value={form.getValues().genre} 
                        onValueChange={(value) => handleFieldChange("genre", value)}
                      >
                        <SelectTrigger className="w-44 h-8 text-base border-b-2 border-green-500 rounded-none bg-transparent focus:ring-0">
                          <SelectValue placeholder="genre" />
                        </SelectTrigger>
                        <SelectContent className="min-w-[180px]">
                          {genres.map((genre) => (
                            <SelectItem key={genre} value={genre}>{genre}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <span className="text-gray-700">about</span>

                    {/* Theme Dropdown */}
                    <div className="inline-block">
                      <Select 
                        value={form.getValues().theme} 
                        onValueChange={(value) => handleFieldChange("theme", value)}
                      >
                        <SelectTrigger className="w-52 h-8 text-base border-b-2 border-purple-500 rounded-none bg-transparent focus:ring-0">
                          <SelectValue placeholder="theme" />
                        </SelectTrigger>
                        <SelectContent className="min-w-[200px]">
                          {themes.map((theme) => (
                            <SelectItem key={theme} value={theme}>{theme}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <span className="text-gray-700">set in</span>

                    {/* Setting Dropdown */}
                    <div className="inline-block">
                      <Select 
                        value={form.getValues().setting} 
                        onValueChange={(value) => handleFieldChange("setting", value)}
                      >
                        <SelectTrigger className="w-52 h-8 text-base border-b-2 border-amber-500 rounded-none bg-transparent focus:ring-0">
                          <SelectValue placeholder="setting" />
                        </SelectTrigger>
                        <SelectContent className="min-w-[200px]">
                          {settings.map((setting) => (
                            <SelectItem key={setting} value={setting}>{setting}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-6 flex justify-between">
                <Button variant="outline" type="button" onClick={goBack}>
                  Back
                </Button>
                <Button 
                  type="submit"
                  disabled={!form.formState.isValid}
                >
                  Next: Concept
                </Button>
              </div>

              {/* Debug button - remove in production */}
              <div className="text-center mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={handleManualReset}
                  className="text-xs text-gray-500"
                >
                  Reset Form (Debug)
                </Button>
              </div>
              
              {/* Simple form test using register directly */}
              <SimpleFormTest />
            </form>
          </FormProvider>
        </div>
      </div>
    </>
  );
}