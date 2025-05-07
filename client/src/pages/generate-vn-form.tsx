import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useVnContext } from "@/context/vn-context";
import { useVnData } from "@/hooks/use-vn-data";
import { useToast, toast } from "@/hooks/use-toast";
import { CreationProgress } from "@/components/creation-progress";
import { NavBar } from "@/components/nav-bar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
  CardDescription,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Download, Wand2, Play, Share } from "lucide-react";
import { ShareStoryDialog } from "@/components/modals/share-story-dialog";
import { PlayerData, GeneratedAct, VnProjectData } from "@/types/vn";
import { ConfirmationModal } from "@/components/modals/confirmation-modal";
import { GenerationResult } from "@/lib/openai";

// Helper functions for accessing act data safely
function getActTitle(actNumber: number, projectData: VnProjectData | null): string {
  // Check if plotData exists
  if (!projectData?.plotData) return `Act ${actNumber}`;
  
  const actKey = `act${actNumber}`;
  
  // Try to get the act from plotData directly first
  const plotData = projectData.plotData as Record<string, any>; // Temporary cast to avoid TypeScript errors
  
  if (plotData[actKey] && typeof plotData[actKey] === 'object') {
    const actData = plotData[actKey];
    if (actData && 'title' in actData) {
      return String(actData.title);
    }
  }
  
  
  return `Act ${actNumber}`;
}

function getActSummary(actNumber: number, projectData: VnProjectData | null): string {
  // Check if plotData exists and contains plot information
  if (!projectData?.plotData) return "No summary available";
  
  const actKey = `act${actNumber}`;
  
  // Try to get the act from plotData directly first
  const plotData = projectData.plotData as Record<string, any>; // Temporary cast to avoid TypeScript errors
  
  if (plotData[actKey] && typeof plotData[actKey] === 'object') {
    const actData = plotData[actKey];
    if (actData && 'summary' in actData) {
      return String(actData.summary);
    }
  }
  
  
  return "No summary available";
}

export default function GenerateVnForm() {
  const [location, setLocation] = useLocation();
  const {
    projectData,
    setGeneratedAct,
    playerData,
    updatePlayerData,
    resetPlayerData,
    exportActs,
    goToStep,
  } = useVnContext();

  const { generateActData, isGenerating, cancelGeneration } = useVnData();

  // Form state
  const [scenesPerAct, setScenesPerAct] = useState<number>(10);
  const [currentGeneratingAct, setCurrentGeneratingAct] = useState<
    number | null
  >(null);
  const [regenerateConfirmOpen, setRegenerateConfirmOpen] = useState(false);
  const [actToRegenerate, setActToRegenerate] = useState<number | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const { hasUnsavedChanges } = useVnContext();
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

  // autosave playerData to context
  useEffect(() => {
      if (playerData) 
        updatePlayerData(playerData);
  }, [playerData]);

  // Player data editing state
  const [editablePlayerData, setEditablePlayerData] = useState<PlayerData>({
    relationships: {},
    inventory: {},
    skills: {},
  });

  // Keep editable player data in sync with actual player data
  useEffect(() => {
    setEditablePlayerData({
      relationships: { ...playerData.relationships },
      inventory: { ...playerData.inventory },
      skills: { ...playerData.skills },
    });
  }, [playerData]);

  // Handle reset player data
  const handleResetPlayerData = () => {
    if (window.confirm("Are you sure you want to reset all player values?")) {
      resetPlayerData();
    }
  };

  // Handle updating player data values
  const handlePlayerDataChange = (
    category: "relationships" | "inventory" | "skills",
    key: string,
    value: string,
  ) => {
    const numValue = parseInt(value, 10);

    if (!isNaN(numValue)) {
      const updatedData = { ...editablePlayerData };
      updatedData[category] = {
        ...updatedData[category],
        [key]: numValue,
      };
      setEditablePlayerData(updatedData);

      // Update the actual player data
      updatePlayerData({
        [category]: { [key]: numValue },
      });
    }
  };

  // Generate act using AI
  const handleGenerateAct = async (actNumber: number) => {
    // Check if act already exists and needs regeneration
    if (projectData?.generatedActs?.[`act${actNumber}`]) {
      setActToRegenerate(actNumber);
      setRegenerateConfirmOpen(true);
      return;
    }

    await generateAct(actNumber);
  };

  // Actual generation function
  const generateAct = async (actNumber: number) => {
    setCurrentGeneratingAct(actNumber);

    const result = await generateActData(actNumber, scenesPerAct);

    // Check if we received an error from validation
    if (result && "error" in result && result.error) {
      // Handle validation error
      setValidationError(result.error || "Unknown validation error");
      setTimeout(() => setValidationError(null), 8000); // Auto-dismiss after 8 seconds
    } else if (result && "data" in result && result.data) {
      // No error, process the generated act
      const actData = result.data as unknown as GeneratedAct;
      setGeneratedAct(actNumber, actData);

      // Log generation and project data to console
      console.log(`Generated Act ${actNumber}:`, result.data);
      console.log(`Current project data:`, projectData);
      console.log(`Act title:`, getActTitle(actNumber, projectData));
      console.log(`Act summary:`, getActSummary(actNumber, projectData));
    }

    setCurrentGeneratingAct(null);
  };

  // Confirm regeneration
  const confirmRegeneration = () => {
    if (actToRegenerate !== null) {
      generateAct(actToRegenerate);
    }
    setRegenerateConfirmOpen(false);
  };

  // Play an act
  const playAct = (actNumber: number) => {
    setLocation(`/player/${actNumber}`);
  };

  // Check if an act has been generated
  const isActGenerated = (actNumber: number): boolean => {
    return Boolean(projectData?.generatedActs?.[`act${actNumber}`]);
  };

  // Check if an act is currently being generated
  const isActGenerating = (actNumber: number): boolean => {
    return currentGeneratingAct === actNumber && isGenerating;
  };

  // Go back to previous step
  const handleBack = () => {
    goToStep(5);
  };

  // Handle export actions
  const handleExportActs = async () => {
    await exportActs();
  };

  // Handle finish
  const handleFinish = () => {
    const hasChanges = hasUnsavedChanges();
    console.log("[NavBar] hasUnsavedChanges returned:", hasChanges);

    if (hasChanges) {
      console.log("[NavBar] Showing confirmation dialog");
      setConfirmDialogOpen(true);
    } else {
      // No unsaved changes, just go back to main menu
      console.log("[NavBar] No unsaved changes, going back to main menu");
      setLocation("/");
    }
  };

  return (
    <>
      <NavBar />
      <CreationProgress currentStep={6} />

      <div className="pt-16">
        <div className="creation-container max-w-4xl mx-auto p-6">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6">
            Step 6: Generate Visual Novel
          </h2>
          <p className="text-gray-600 mb-6">
            Generate the scenes for each act of your visual novel. You can
            adjust the number of scenes per act and regenerate as needed.
          </p>

          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <label
                htmlFor="scenes-per-act"
                className="block text-sm font-medium text-neutral-700 mr-3"
              >
                Scenes Per Act:
              </label>
              <Select
                value={scenesPerAct.toString()}
                onValueChange={(value) => setScenesPerAct(parseInt(value, 10))}
              >
                <SelectTrigger id="scenes-per-act" className="w-32">
                  <SelectValue placeholder="Number of scenes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 Scenes</SelectItem>
                  <SelectItem value="15">15 Scenes</SelectItem>
                  <SelectItem value="20">20 Scenes</SelectItem>
                  <SelectItem value="25">25 Scenes</SelectItem>
                  <SelectItem value="30">30 Scenes</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              className="flex items-center"
              onClick={handleExportActs}
              disabled={!Object.keys(projectData?.generatedActs || {}).length}
            >
              <Download className="mr-1 h-4 w-4" /> Export Acts
            </Button>
          </div>

          {/* Generation progress indicator */}
          {isGenerating && currentGeneratingAct !== null && (
            <Card className="mb-6 border-primary/20 bg-primary/5">
              <CardContent className="py-4">
                <div className="flex items-center text-primary mb-2">
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5"
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
                  <span>
                    Generating Act {currentGeneratingAct}... This may take a
                    moment.
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-600 border-red-300 hover:bg-red-50"
                  onClick={cancelGeneration}
                >
                  Cancel Generation
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Act cards with generate buttons */}
          {[1, 2, 3, 4, 5].map((actNumber) => (
            <Card key={`act-section-${actNumber}`} className="mb-6">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-neutral-800">
                  Act {actNumber}
                  {isActGenerated(actNumber) &&
                    projectData?.generatedActs?.[`act${actNumber}`] &&
                    ` (${Object.keys(projectData.generatedActs[`act${actNumber}`]).length} scenes)`}
                </CardTitle>
                <CardDescription>
                  {isActGenerated(actNumber)
                    ? `This act has been generated and is ready to play. You can regenerate it if desired.`
                    : `This act has not been generated yet. Click the button below to generate it.`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isActGenerated(actNumber) && (
                  <div className="border border-neutral-200 rounded-md p-4">
                    <h4 className="text-md font-medium text-neutral-700 mb-2">
                      {getActTitle(actNumber, projectData)}
                    </h4>
                    <p className="text-sm text-neutral-600 mb-4">
                      {getActSummary(actNumber, projectData)}
                    </p>
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex justify-between">
                <div>
                  {/* Share button on the left if act is generated */}
                  {isActGenerated(actNumber) && projectData?.id && (
                    <ShareStoryDialog
                      projectId={projectData.id}
                      projectTitle={projectData.title || `Visual Novel Act ${actNumber}`}
                      trigger={
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex items-center"
                        >
                          <Share className="mr-1 h-4 w-4" /> Share
                        </Button>
                      }
                    />
                  )}
                </div>

                <div className="flex space-x-2">
                  {/* Play button first, then Regenerate */}
                  {isActGenerated(actNumber) && (
                    <Button
                      className="flex items-center"
                      onClick={() => playAct(actNumber)}
                    >
                      <Play className="mr-1 h-4 w-4" /> Play
                    </Button>
                  )}

                  <Button
                    variant="outline"
                    className={`border-primary text-primary hover:bg-primary/10 flex items-center justify-center ${isActGenerating(actNumber) ? "opacity-75" : ""}`}
                    onClick={() => handleGenerateAct(actNumber)}
                    disabled={isGenerating}
                  >
                    {isActGenerating(actNumber) ? (
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
                        <Wand2 className="mr-1 h-4 w-4" />
                        {isActGenerated(actNumber) ? "Regenerate" : "Generate"}
                      </>
                    )}
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ))}

          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-neutral-800">
                Player Data
              </CardTitle>
              <p className="text-sm text-neutral-600">
                These values represent relationships, inventory items, and
                skills your character has accumulated throughout the story. You
                can edit these values before playing each act.
              </p>
            </CardHeader>
            <CardContent>
              <div className="border border-neutral-200 rounded-md p-4">
                {/* Relationships */}
                <h4 className="text-md font-medium text-neutral-700 mb-2">
                  Relationships
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  {Object.entries(editablePlayerData.relationships).length >
                  0 ? (
                    Object.entries(editablePlayerData.relationships).map(
                      ([key, value]) => (
                        <div key={key} className="flex items-center">
                          <span className="text-sm text-neutral-600 mr-2">
                            {key}:
                          </span>
                          <Input
                            type="number"
                            value={value}
                            onChange={(e) =>
                              handlePlayerDataChange(
                                "relationships",
                                key,
                                e.target.value,
                              )
                            }
                            className="w-16"
                          />
                        </div>
                      ),
                    )
                  ) : (
                    <p className="text-sm text-neutral-500">
                      No relationships yet. These will be updated as you play
                      through acts.
                    </p>
                  )}
                </div>

                {/* Inventory */}
                <h4 className="text-md font-medium text-neutral-700 mb-2">
                  Inventory
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  {Object.entries(editablePlayerData.inventory).length > 0 ? (
                    Object.entries(editablePlayerData.inventory).map(
                      ([key, value]) => (
                        <div key={key} className="flex items-center">
                          <span className="text-sm text-neutral-600 mr-2">
                            {key}:
                          </span>
                          <Input
                            type="number"
                            value={value}
                            onChange={(e) =>
                              handlePlayerDataChange(
                                "inventory",
                                key,
                                e.target.value,
                              )
                            }
                            className="w-16"
                          />
                        </div>
                      ),
                    )
                  ) : (
                    <p className="text-sm text-neutral-500">
                      No inventory items yet. These will be updated as you play
                      through acts.
                    </p>
                  )}
                </div>

                {/* Skills */}
                <h4 className="text-md font-medium text-neutral-700 mb-2">
                  Skills
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {Object.entries(editablePlayerData.skills).length > 0 ? (
                    Object.entries(editablePlayerData.skills).map(
                      ([key, value]) => (
                        <div key={key} className="flex items-center">
                          <span className="text-sm text-neutral-600 mr-2">
                            {key}:
                          </span>
                          <Input
                            type="number"
                            value={value}
                            onChange={(e) =>
                              handlePlayerDataChange(
                                "skills",
                                key,
                                e.target.value,
                              )
                            }
                            className="w-16"
                          />
                        </div>
                      ),
                    )
                  ) : (
                    <p className="text-sm text-neutral-500">
                      No skills yet. These will be updated as you play through
                      acts.
                    </p>
                  )}
                </div>

                <div className="mt-4 flex justify-end">
                  <Button variant="secondary" onClick={handleResetPlayerData}>
                    Reset All Values
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="pt-6 flex justify-between">
            <Button variant="outline" onClick={handleBack}>
              Back
            </Button>
            <Button onClick={handleFinish}>Finish</Button>
          </div>
        </div>
      </div>

      {/* Regeneration Confirmation Modal */}
      <ConfirmationModal
        open={regenerateConfirmOpen}
        onOpenChange={setRegenerateConfirmOpen}
        title="Confirm Regeneration"
        description={`Are you sure you want to regenerate Act ${actToRegenerate}? This will overwrite the existing act.`}
        confirmText="Regenerate"
        onConfirm={confirmRegeneration}
      />

      {/* Validation Error Alert */}
      {validationError && (
        <div className="fixed bottom-6 right-6 z-50 max-w-md">
          <Card className="border border-red-300 bg-red-50 shadow-lg">
            <CardHeader className="py-3">
              <CardTitle className="text-red-600 text-base">
                Content Validation Error
              </CardTitle>
            </CardHeader>
            <CardContent className="py-2">
              <p className="text-sm text-red-800">{validationError}</p>
            </CardContent>
            <CardFooter className="py-2 flex justify-end">
              <Button
                size="sm"
                variant="outline"
                className="text-red-600 border-red-300 hover:bg-red-100"
                onClick={() => setValidationError(null)}
              >
                Dismiss
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </>
  );
}
