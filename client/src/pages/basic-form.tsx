import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useVnContext } from "@/context/vn-context";
import { useRegisterFormSave } from "@/hooks/use-form-save";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAutosave } from "@/hooks/use-simple-autosave";
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

  // Helper function to save basic data
  function saveBasicData() {
    const values = form.getValues();
    
    // Convert to BasicData type
    const formData: BasicData = {
      theme: values.theme as string,
      tone: values.tone as string,
      genre: values.genre as string,
      setting: values.setting as string
    };
    
    setBasicData(formData);
    return formData;
  }
  
  // Register with form save system
  useRegisterFormSave('basic', saveBasicData);
  
  // Create a typed save function for the autosave hook
  const handleAutosave = (values: Record<string, any>) => {
    if (!values) return;
    
    console.log("Project saved with current form data from basic");
    
    // Convert to BasicData type
    const formData: BasicData = {
      theme: values.theme || "",
      tone: values.tone || "",
      genre: values.genre || "",
      setting: values.setting || ""
    };
    
    // Save to context
    setBasicData(formData);
    
    // Save to server if we have a project ID
    if (projectData?.id) {
      console.log("Saving to server via autosave hook...");
      saveProject().catch(err => {
        console.error("Error saving to server:", err);
      });
    }
  };
  
  // Set up autosave with the FormProvider context
  useAutosave('basic', handleAutosave);
  
  // Keep this empty component to avoid changing our JSX structure
  const BasicFormAutosave = () => null;

  // Proceed to next step
  const handleSubmit = form.handleSubmit(async (values) => {
    // Convert to BasicData type
    const formData: BasicData = {
      theme: values.theme as string,
      tone: values.tone as string,
      genre: values.genre as string,
      setting: values.setting as string
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
            <BasicFormAutosave />
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
                      <FormField
                        control={form.control}
                        name="tone"
                        render={({ field }) => (
                          <FormItem>
                            <Select 
                              value={field.value} 
                              onValueChange={field.onChange}
                            >
                              <SelectTrigger className="w-44 h-8 text-base border-b-2 border-blue-500 rounded-none bg-transparent focus:ring-0">
                                <SelectValue placeholder="tone" />
                              </SelectTrigger>
                              <SelectContent className="min-w-[180px]">
                                <SelectItem value="adventurous">adventurous</SelectItem>
                                <SelectItem value="dark">dark</SelectItem>
                                <SelectItem value="gritty">gritty</SelectItem>
                                <SelectItem value="lighthearted">
                                  lighthearted
                                </SelectItem>
                                <SelectItem value="melancholic">melancholic</SelectItem>
                                <SelectItem value="romantic">romantic</SelectItem>
                                <SelectItem value="satirical">satirical</SelectItem>
                                <SelectItem value="suspenseful">suspenseful</SelectItem>
                                <SelectItem value="tragicomic">tragicomic</SelectItem>
                                <SelectItem value="uplifting">uplifting</SelectItem>
                                <SelectItem value="whimsical">whimsical</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Genre Dropdown */}
                    <div className="inline-block">
                      <FormField
                        control={form.control}
                        name="genre"
                        render={({ field }) => (
                          <FormItem>
                            <Select 
                              value={field.value} 
                              onValueChange={field.onChange}
                            >
                              <SelectTrigger className="w-44 h-8 text-base border-b-2 border-green-500 rounded-none bg-transparent focus:ring-0">
                                <SelectValue placeholder="genre" />
                              </SelectTrigger>
                              <SelectContent className="min-w-[180px]">
                                <SelectItem value="mystery">mystery</SelectItem>
                                <SelectItem value="romance">romance</SelectItem>
                                <SelectItem value="sci_fi">sci-fi</SelectItem>
                                <SelectItem value="adventure">adventure</SelectItem>
                                <SelectItem value="slice_of_life">
                                  slice of life
                                </SelectItem>
                                <SelectItem value="thriller">thriller</SelectItem>
                                <SelectItem value="comedy">comedy</SelectItem>
                                <SelectItem value="horror">horror</SelectItem>
                                <SelectItem value="drama">drama</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <span className="text-gray-700">about</span>

                    {/* Theme Dropdown */}
                    <div className="inline-block">
                      <FormField
                        control={form.control}
                        name="theme"
                        render={({ field }) => (
                          <FormItem>
                            <Select 
                              value={field.value} 
                              onValueChange={field.onChange}
                            >
                              <SelectTrigger className="w-52 h-8 text-base border-b-2 border-purple-500 rounded-none bg-transparent focus:ring-0">
                                <SelectValue placeholder="theme" />
                              </SelectTrigger>
                              <SelectContent className="min-w-[200px]">
                                <SelectItem value="forgiveness">forgiveness</SelectItem>
                                <SelectItem value="freedom_vs_control">
                                  freedom vs control
                                </SelectItem>
                                <SelectItem value="growth">growth</SelectItem>
                                <SelectItem value="identity">identity</SelectItem>
                                <SelectItem value="love_vs_duty">
                                  love vs duty
                                </SelectItem>
                                <SelectItem value="revenge_and_justice">
                                  revenge & justice
                                </SelectItem>
                                <SelectItem value="technology_vs_humanity">
                                  tech vs humanity
                                </SelectItem>
                                <SelectItem value="sacrifice">sacrifice</SelectItem>
                                <SelectItem value="trust_and_betrayal">
                                  trust & betrayal
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <span className="text-gray-700">set in</span>

                    {/* Setting Dropdown */}
                    <div className="inline-block">
                      <FormField
                        control={form.control}
                        name="setting"
                        render={({ field }) => (
                          <FormItem>
                            <Select 
                              value={field.value} 
                              onValueChange={field.onChange}
                            >
                              <SelectTrigger className="w-52 h-8 text-base border-b-2 border-amber-500 rounded-none bg-transparent focus:ring-0">
                                <SelectValue placeholder="setting" />
                              </SelectTrigger>
                              <SelectContent className="min-w-[200px]">
                                <SelectItem value="cyberpunk_world">
                                  cyberpunk world
                                </SelectItem>
                                <SelectItem value="steampunk_world">
                                  steampunk world
                                </SelectItem>
                                <SelectItem value="noir_setting">
                                  noir setting
                                </SelectItem>
                                <SelectItem value="modern_day">modern day</SelectItem>
                                <SelectItem value="school">school</SelectItem>
                                <SelectItem value="history">history</SelectItem>
                                <SelectItem value="mythology">mythology</SelectItem>
                                <SelectItem value="space">space</SelectItem>
                                <SelectItem value="dystopia">dystopia</SelectItem>
                                <SelectItem value="utopia">utopia</SelectItem>
                                <SelectItem value="urban_city">urban city</SelectItem>
                                <SelectItem value="haunted_place">
                                  a haunted place
                                </SelectItem>
                                <SelectItem value="countryside">countryside</SelectItem>
                                <SelectItem value="post_apocalypse">
                                  post-apocalypse
                                </SelectItem>
                                <SelectItem value="virtual_reality">
                                  virtual reality
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
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
