import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useVnContext } from "@/context/vn-context";
import { useVnData } from "@/hooks/use-vn-data";
import { CreationProgress } from "@/components/creation-progress";
import { NavBar } from "@/components/nav-bar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MinimalInput } from "@/components/ui/minimal-input";
import { MinimalTextarea } from "@/components/ui/minimal-textarea";
import { Wand2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { validateFormContent } from "@/lib/validation";
import { useSimpleAutosave } from "@/lib/autosave";
import { useTranslation } from "react-i18next";

export default function ConceptForm() {
  const [location, setLocation] = useLocation();
  const { projectData, setConceptData, goToStep, saveProject, hasUnsavedChanges, setConfirmDialogOpen } = useVnContext();
  const { generateConceptData, isGenerating, cancelGeneration } = useVnData();
  const { toast } = useToast();
  const { t } = useTranslation();

  // Form state
  const [title, setTitle] = useState("");
  const [tagline, setTagline] = useState("");
  const [premise, setPremise] = useState("");
  const [autosaving, setAutosaving] = useState(false);

  // Create form data object for autosave
  const formData = { title, tagline, premise };

  // Setup autosave
  // useSimpleAutosave(
  //   formData, 
  //   (data) => {
  //     // Skip saving if not enough data
  //     if (!data.title && !data.tagline && !data.premise) return;

  //     // Show autosaving indicator
  //     setAutosaving(true);

  //     // Save to context
  //     setConceptData({
  //       title: data.title,
  //       tagline: data.tagline,
  //       premise: data.premise
  //     });

  //     // Clear autosaving indicator after a short delay
  //     setTimeout(() => setAutosaving(false), 300);
  //   },
  //   500, // 1.5 second delay
  //   "ConceptForm" // Log prefix
  // );

  // Generic field change handler for all form fields
  // const handleFieldChange = (
  //   field: 'title' | 'tagline' | 'premise',
  //   value: string
  // ) => {
  //   // Update the appropriate field based on the field name
  //   if (field === 'title') setTitle(value);
  //   else if (field === 'tagline') setTagline(value);
  //   else if (field === 'premise') setPremise(value);
  // };


  //save and return buttons
  useEffect(() => {
    const returnButtonHandler = () => {
      if (projectData) 
      {
          setConceptData({
                          title,
                          tagline,
                          premise,
                        })
          hasUnsavedChanges({...projectData, conceptData: {
                               title,
                               tagline,
                               premise,
                             }, currentStep: 2})? setConfirmDialogOpen(true) : setLocation("/")
      }
      else
      {
        setLocation("/")
      }
    }
    const saveFormHandler = () => {
      if (projectData)
        saveProject({...projectData, conceptData: {
                      title,
                      tagline,
                      premise,
                    }, currentStep: 2});
    }
    document.addEventListener("return", returnButtonHandler);
    document.addEventListener("save", saveFormHandler);

    return () => {
      document.removeEventListener("return", returnButtonHandler);
      document.removeEventListener("save", saveFormHandler);
    };
  }, [title, tagline, premise]);


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
  const handleGenerateConcept = async (e?: React.MouseEvent) => {
    // Prevent default form submission if this was triggered by a form
    if (e) {
      e.preventDefault();
    }

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

      // Log the manual save
    }
  };

  // Reset form fields to empty values with confirmation
  const handleResetForm = () => {
    // Ask for confirmation before clearing
    if (!window.confirm("Are you sure?")) {
      return; // User canceled the reset
    }

    // Reset all form fields
    setTitle("");
    setTagline("");
    setPremise("");

    // Show toast notification
    toast({
      title: "Form Reset",
      description: "Concept form has been reset.",
      variant: "default"
    });
  };

  return (
    <>
      <NavBar />
      <CreationProgress currentStep={2} />

      <div className="pt-16">
        <div className="creation-container max-w-4xl mx-auto p-6">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6">
            {t('conceptForm.title', 'Concept')}
          </h2>
          <p className="text-gray-600 mb-6">
            {t('conceptForm.description', 'Define the central concept of your visual novel with a catchy title, tagline, and premise.')}
          </p>

          <div className="space-y-6">
            {/* Title */}
            <div className="form-group">
              <p className="text-xs text-gray-500 mb-2">
                {t('conceptForm.titleHelp', 'Create a memorable title for your visual novel')}
              </p>
              <MinimalInput
                id="title"
                label={t('conceptForm.title', 'Title')}
                placeholder=""
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            {/* Tagline */}
            <div className="form-group">
              <p className="text-xs text-gray-500 mb-2">
                {t('conceptForm.taglineHelp', "A phrase that captures the essence of your story")}
              </p>
              <MinimalInput
                id="tagline"
                label={t('conceptForm.tagline', 'Tagline')}
                placeholder=""
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
              />
            </div>

            {/* Premise */}
            <div className="form-group">
              <p className="text-xs text-gray-500 mb-2">
                {t('conceptForm.premiseHelp')}
              </p>
              <MinimalTextarea
                id="premise"
                label={t('conceptForm.premise', "Brief description of your story's setting and central conflict")}
                rows={4}
                placeholder=""
                value={premise}
                onChange={(e) => setPremise(e.target.value)}
              />
            </div>

            <div className="pt-6 flex justify-between">
              <div className="flex items-center">
                <Button variant="outline" onClick={handleBack}>
                  {t('conceptForm.back', 'back')}
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
                    {t('common.saving', 'Saving...')}
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
                      {t('common.generating', 'Generating...')}
                    </>
                  ) : (
                    <>
                      <Wand2 className="mr-2 h-4 w-4" />
                      {t('conceptForm.generate')}
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  className="border-red-300 text-red-600 hover:bg-red-50"
                  onClick={handleResetForm}
                  disabled={isGenerating}
                >
                  {t('conceptForm.reset', 'reset')}
                </Button>
                <Button onClick={handleNext}>{t('conceptForm.next', 'next')}: {t('characterForm.title', 'Title').split(':')[0]}</Button>
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
                  {t('common.cancel', 'cancel')}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}