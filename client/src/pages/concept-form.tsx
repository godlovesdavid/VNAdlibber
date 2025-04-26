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

export default function ConceptForm() {
  const [, setLocation] = useLocation();
  const { projectData, setConceptData, goToStep } = useVnContext();
  const { generateConceptData, isGenerating, cancelGeneration } = useVnData();

  // Form state
  const [title, setTitle] = useState("");
  const [tagline, setTagline] = useState("");
  const [premise, setPremise] = useState("");

  // Load existing data if available
  useEffect(() => {
    if (projectData?.conceptData) {
      setTitle(projectData.conceptData.title || "");
      setTagline(projectData.conceptData.tagline || "");
      setPremise(projectData.conceptData.premise || "");
    }
  }, [projectData]);

  // Go back to previous step
  const handleBack = () => {
    goToStep(1);
  };

  // Proceed to next step
  const handleNext = () => {
    // Validate form
    if (!title || !tagline || !premise) {
      alert("Please fill in all required fields");
      return;
    }

    // Save data
    setConceptData({
      title,
      tagline,
      premise,
    });

    // Navigate to next step
    setLocation("/create/characters");
  };

  // Generate concept using AI
  const handleGenerateConcept = async () => {
    const generatedConcept = await generateConceptData();

    if (generatedConcept) {
      setTitle(generatedConcept.title);
      setTagline(generatedConcept.tagline);
      setPremise(generatedConcept.premise);

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
                onChange={(e) => setTitle(e.target.value)}
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
                onChange={(e) => setTagline(e.target.value)}
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
                onChange={(e) => setPremise(e.target.value)}
              />
            </div>

            <div className="pt-6 flex justify-between">
              <Button variant="outline" onClick={handleBack}>
                Back
              </Button>
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
