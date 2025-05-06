import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useVnContext } from "@/context/vn-context";
import { useVnData } from "@/hooks/use-vn-data";
import { CreationProgress } from "@/components/creation-progress";
import { NavBar } from "@/components/nav-bar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Wand2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { validateFormContent } from "@/lib/validation";

export default function ConceptForm() {
  const [location, setLocation] = useLocation();
  const { projectData, setConceptData, goToStep } = useVnContext();
  const { generateConceptData, isGenerating, cancelGeneration } = useVnData();
  const { toast } = useToast();

  // Form state
  const [title, setTitle] = useState("");
  const [tagline, setTagline] = useState("");
  const [premise, setPremise] = useState("");
  const [autosaving, setAutosaving] = useState(false);
  const [saveCount, setSaveCount] = useState(0);
  const [lastEdited, setLastEdited] = useState(0);
  
  // Simple debounced autosave when any form field changes
  useEffect(() => {
    // Skip the initial load
    if (lastEdited === 0) return;
    
    // Only attempt to save if project exists and we have data to save
    if (!projectData || !(title || tagline || premise)) return;
    
    // Show autosaving indicator
    setAutosaving(true);
    
    // Log to browser console (open DevTools to see these)
    window.console.log("Content changed, queueing autosave in 1.5 seconds...");
    
    // Set a timeout to save after 1.5 seconds of no changes
    const timeoutId = setTimeout(() => {
      // Increment save counter for debugging
      const newSaveCount = saveCount + 1;
      setSaveCount(newSaveCount);
      
      // Log the save operation
      window.console.log(`Autosaving to context (save #${newSaveCount}):`, {
        title,
        tagline,
        premise
      });
      
      // Save to context
      setConceptData({
        title,
        tagline,
        premise
      });
      
      // Clear autosaving indicator
      setAutosaving(false);
    }, 1500);
    
    // Clean up timeout if component unmounts or dependencies change
    return () => {
      clearTimeout(timeoutId);
    };
  }, [title, tagline, premise, lastEdited, projectData, setConceptData, saveCount]);
  
  // Handle form field changes
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
    setLastEdited(Date.now()); // Track edit time for debounce
  };
  
  const handleTaglineChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTagline(e.target.value);
    setLastEdited(Date.now()); // Track edit time for debounce
  };
  
  const handlePremiseChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPremise(e.target.value);
    setLastEdited(Date.now()); // Track edit time for debounce
  };
  
  // Load existing data if available or clear form if starting a new project
  useEffect(() => {
    // If project data exists and has concept data
    if (projectData?.conceptData) {
      console.log("Loading concept data from project:", projectData.conceptData);
      setTitle(projectData.conceptData.title || "");
      setTagline(projectData.conceptData.tagline || "");
      setPremise(projectData.conceptData.premise || "");
    } else {
      // Clear form values if no project data or it's a new project
      console.log("No concept data found in project, clearing form");
      setTitle("");
      setTagline("");
      setPremise("");
    }
  }, [projectData]);
  
  // No need for extra cleanup as our main useEffect handles it

  // Go back to previous step
  const handleBack = () => {
    // Save current form state to context before navigating back
    console.log("Saving concept data before navigating back:", { title, tagline, premise });
    setConceptData({
      title,
      tagline,
      premise,
    });
    
    goToStep(1);
  };

  // Proceed to next step
  const handleNext = async () => {
    // Local validation
    if (!title.trim() || !tagline.trim() || !premise.trim()) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields before proceeding.",
        variant: "destructive",
      });
      return;
    }

    if (!projectData) {
      toast({
        title: "Error",
        description: "Project data is missing",
        variant: "destructive",
      });
      return;
    }

    try {
      // Important: Save the current form data to context BEFORE navigating
      // This ensures the latest form state is saved to context
      console.log("Saving concept data to context before navigation:", { title, tagline, premise });
      setConceptData({
        title,
        tagline,
        premise,
      });
      
      // Navigate to the next step
      setLocation("/create/characters");
    } catch (error) {
      console.error("Error saving concept data:", error);
      toast({
        title: "Error",
        description: "Failed to save your concept data.",
        variant: "destructive",
      });
    }
  };

  // Generate concept using AI
  const handleGenerateConcept = async () => {
    const generatedConcept = await generateConceptData();

    if (generatedConcept) {
      // First update local state
      setTitle(generatedConcept.title);
      setTagline(generatedConcept.tagline);
      setPremise(generatedConcept.premise);

      // Log generation to console
      console.log("Generated concept:", generatedConcept);

      // Then save the generated values to context (not using the state variables which would have old values)
      // This prevents a race condition where we'd save the old state values before they're updated
      setConceptData({
        title: generatedConcept.title,
        tagline: generatedConcept.tagline,
        premise: generatedConcept.premise,
      });
      
      // Also increment save counter to show this was an explicit save
      const newSaveCount = saveCount + 1;
      setSaveCount(newSaveCount);
      console.log(`Manual save after generation (save #${newSaveCount})`);
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

          <div className="space-y-6">
            {/* Title */}
            <div className="form-group">
              <label
                htmlFor="title"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Title
              </label>
              <p className="text-xs text-gray-500 mb-2">
                Create a memorable title for your visual novel
              </p>
              <Input
                id="title"
                placeholder="e.g. Chronicles of the Hidden City"
                value={title}
                onChange={handleTitleChange}
              />
            </div>

            {/* Tagline */}
            <div className="form-group">
              <label
                htmlFor="tagline"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Tagline
              </label>
              <p className="text-xs text-gray-500 mb-2">
                A single sentence that captures the essence of your story
              </p>
              <Input
                id="tagline"
                placeholder="e.g. When secrets become weapons, who can you trust?"
                value={tagline}
                onChange={handleTaglineChange}
              />
            </div>

            {/* Premise */}
            <div className="form-group">
              <label
                htmlFor="premise"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Premise
              </label>
              <p className="text-xs text-gray-500 mb-2">
                Brief description of your story's setting and central conflict
              </p>
              <Textarea
                id="premise"
                rows={4}
                placeholder="e.g. In a city where memories can be traded like currency, a young archivist discovers a forbidden memory that reveals a conspiracy at the heart of society. As they navigate a web of deception, they must choose between exposing the truth or protecting those they love."
                value={premise}
                onChange={handlePremiseChange}
              />
            </div>

            <div className="pt-6 flex justify-between">
              <div className="flex items-center">
                <Button variant="outline" onClick={handleBack}>
                  Back
                </Button>
                {/* Autosave indicator */}
                {autosaving && (
                  <div className="ml-3 flex items-center text-xs text-gray-500">
                    <svg
                      className="animate-spin mr-1 h-3 w-3 text-gray-500"
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
                    Autosaving...
                  </div>
                )}
              </div>
              <div className="flex space-x-3">
                <Button
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
                <Button onClick={handleNext}>Next: Characters</Button>
              </div>
            </div>

            {isGenerating && (
              <div className="pt-3 flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-600 border-red-300 hover:bg-red-50"
                  onClick={cancelGeneration}
                >
                  Cancel Generation
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
