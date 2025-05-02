import { useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useVnContext } from "@/context/vn-context";
import { useVnData } from "@/hooks/use-vn-data";
import { useRegisterFormSave } from "@/hooks/use-form-save";
import { CreationProgress } from "@/components/creation-progress";
import { NavBar } from "@/components/nav-bar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Wand2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

// Define the schema for the form
const conceptFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  tagline: z.string().min(1, "Tagline is required"),
  premise: z.string().min(1, "Premise is required"),
});

type ConceptFormValues = z.infer<typeof conceptFormSchema>;

export default function ConceptForm() {
  const [, setLocation] = useLocation();
  const { projectData, setConceptData, goToStep, saveProject } = useVnContext();
  const { generateConceptData, isGenerating, cancelGeneration } = useVnData();

  // Initialize React Hook Form
  const form = useForm<ConceptFormValues>({
    resolver: zodResolver(conceptFormSchema),
    defaultValues: {
      title: "",
      tagline: "",
      premise: "",
    },
  });

  // Load existing data if available or clear form if starting a new project
  // Using a ref to track if we've already loaded the initial data to prevent loops
  const initialDataLoadedRef = useRef(false);
  
  useEffect(() => {
    // If we've already loaded the data or there's no data to load, skip
    if (initialDataLoadedRef.current || !projectData?.conceptData) {
      return;
    }
    
    console.log("Loading initial concept data", projectData.conceptData);
    form.reset({
      title: projectData.conceptData.title || "",
      tagline: projectData.conceptData.tagline || "",
      premise: projectData.conceptData.premise || ""
    });
    
    // Mark that we've loaded the initial data
    initialDataLoadedRef.current = true;
  }, [projectData]);
  
  // Helper function to save concept data
  function saveConceptData() {
    const values = form.getValues();
    console.log("Saving concept data", values);
    setConceptData(values);
    return values;
  }
  
  // Register with form save system
  useRegisterFormSave('concept', saveConceptData);
  
  // Setup autosave using the watch method directly
  useEffect(() => {
    // Subscribe to form changes
    const subscription = form.watch(() => {
      // Use debounce inside this callback
      const handler = setTimeout(() => {
        const values = form.getValues();
        console.log("[AutosaveEffect] Form changed, saving data:", values);
        saveConceptData();
        
        // Save to server if we have a project ID
        if (projectData?.id) {
          console.log("[AutosaveEffect] Saving to server...");
          saveProject().then(() => {
            console.log("[AutosaveEffect] Saved to server successfully");
          }).catch(err => {
            console.error("[AutosaveEffect] Error saving to server:", err);
          });
        }
      }, 2000); // ← 2 seconds debounce

      // Clear previous debounce timeout
      return () => clearTimeout(handler);
    });

    console.log("[ConceptForm] Autosave with Watch method enabled (2 second debounce)");

    // Clean up subscription on unmount
    return () => subscription.unsubscribe();
  }, [form, saveProject, projectData?.id]);

  // Go back to previous step
  const handleBack = async () => {
    // Save data before navigating
    saveConceptData();
    
    // Save to server if we have a project ID
    if (projectData?.id) {
      try {
        await saveProject();
      } catch (error) {
        console.error("Error saving project:", error);
      }
    }
    
    goToStep(1);
  };

  // Proceed to next step
  const handleNext = form.handleSubmit(async (data) => {
    // Save data
    setConceptData(data);
    
    // Save to server if we have a project ID
    if (projectData?.id) {
      try {
        await saveProject();
      } catch (error) {
        console.error("Error saving project:", error);
      }
    }

    // Navigate to next step
    setLocation("/create/characters");
  });

  // Generate concept using AI
  const handleGenerateConcept = async () => {
    const generatedConcept = await generateConceptData();

    if (generatedConcept) {
      // Update form with generated values
      form.setValue('title', generatedConcept.title);
      form.setValue('tagline', generatedConcept.tagline);
      form.setValue('premise', generatedConcept.premise);
      
      // Save the generated concept data
      setConceptData({
        title: generatedConcept.title,
        tagline: generatedConcept.tagline,
        premise: generatedConcept.premise,
      });
      
      // Save to server if we have a project ID
      if (projectData?.id) {
        try {
          await saveProject();
        } catch (error) {
          console.error("Error saving project after generation:", error);
        }
      }

      // Log generation to console
      console.log("Generated concept:", generatedConcept);
    }
  };

  return (
    <>
      <NavBar />
      <CreationProgress currentStep={2} />

      <div className="pt-16">
        <div className="creation-container max-w-4xl mx-auto p-6">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6">
            Step 2: Concept
          </h2>
          <p className="text-gray-600 mb-6">
            Define the core concept of your visual novel with a compelling
            title, tagline, and premise.
          </p>

          <Form {...form}>
            <form onSubmit={handleNext} className="space-y-6">
              {/* Title */}
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-gray-700">
                      Title
                    </FormLabel>
                    <p className="text-xs text-gray-500 mb-2">
                      Create a memorable title for your visual novel
                    </p>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder="e.g. Chronicles of the Hidden City"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Tagline */}
              <FormField
                control={form.control}
                name="tagline"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-gray-700">
                      Tagline
                    </FormLabel>
                    <p className="text-xs text-gray-500 mb-2">
                      A single sentence that captures the essence of your story
                    </p>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder="e.g. When secrets become weapons, who can you trust?"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Premise */}
              <FormField
                control={form.control}
                name="premise"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-gray-700">
                      Premise
                    </FormLabel>
                    <p className="text-xs text-gray-500 mb-2">
                      Brief description of your story's setting and central conflict
                    </p>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        rows={4}
                        placeholder="e.g. In a city where memories can be traded like currency, a young archivist discovers a forbidden memory that reveals a conspiracy at the heart of society. As they navigate a web of deception, they must choose between exposing the truth or protecting those they love."
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="pt-6 flex justify-between">
                <Button type="button" variant="outline" onClick={handleBack}>
                  Back
                </Button>
                <div className="flex space-x-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="border-primary text-primary hover:bg-primary-100"
                    onClick={handleGenerateConcept}
                    disabled={isGenerating}
                  >
                    {isGenerating ? (
                      <>
                        <svg
                          className="animate-spin -ml-1 mr-2 h-4 w-4 text-primary"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        Generating...
                      </>
                    ) : (
                      <>
                        <Wand2 className="mr-2 h-4 w-4" />
                        Generate
                      </>
                    )}
                  </Button>
                  <Button type="submit">Next: Characters</Button>
                </div>
              </div>

              {isGenerating && (
                <div className="pt-3 flex justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-red-600 border-red-300 hover:bg-red-50"
                    onClick={cancelGeneration}
                  >
                    Cancel Generation
                  </Button>
                </div>
              )}
            </form>
          </Form>
        </div>
      </div>
    </>
  );
}
