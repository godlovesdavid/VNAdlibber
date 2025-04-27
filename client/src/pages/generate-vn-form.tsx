import { useState, useEffect, Fragment } from "react";
import { useLocation } from "wouter";
import { useVnContext } from "@/context/vn-context";
import { useVnData } from "@/hooks/use-vn-data";
import { CreationProgress } from "@/components/creation-progress";
import { NavBar } from "@/components/nav-bar";
import { 
  Button, 
  buttonVariants 
} from "@/components/ui/button";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardFooter,
  CardDescription
} from "@/components/ui/card";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Download, Play, Wand2 } from "lucide-react";
import { ConfirmationModal } from "@/components/modals/confirmation-modal";
import { PlayerData, GeneratedAct } from "@/types/vn";

export default function GenerateVnForm() {
  const [, setLocation] = useLocation();
  const { 
    projectData, 
    setGeneratedAct, 
    playerData, 
    updatePlayerData, 
    resetPlayerData,
    exportActs,
    goToStep 
  } = useVnContext();
  
  const { 
    generateActData, 
    isGenerating, 
    cancelGeneration 
  } = useVnData();
  
  // Form state
  const [scenesPerAct, setScenesPerAct] = useState<number>(10);
  const [currentGeneratingAct, setCurrentGeneratingAct] = useState<number | null>(null);
  const [regenerateConfirmOpen, setRegenerateConfirmOpen] = useState(false);
  const [actToRegenerate, setActToRegenerate] = useState<number | null>(null);
  const [showBackWarning, setShowBackWarning] = useState(false);
  const [suppressBackWarning, setSuppressBackWarning] = useState(false);
  
  // Player data editing state
  const [editablePlayerData, setEditablePlayerData] = useState<PlayerData>({
    relationships: {},
    inventory: {},
    skills: {}
  });
  
  // Keep editable player data in sync with actual player data
  useEffect(() => {
    setEditablePlayerData({
      relationships: { ...playerData.relationships },
      inventory: { ...playerData.inventory },
      skills: { ...playerData.skills }
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
    category: 'relationships' | 'inventory' | 'skills',
    key: string,
    value: string
  ) => {
    const numValue = parseInt(value, 10);
    
    if (!isNaN(numValue)) {
      const updatedData = { ...editablePlayerData };
      updatedData[category] = {
        ...updatedData[category],
        [key]: numValue
      };
      setEditablePlayerData(updatedData);
      
      // Update the actual player data
      updatePlayerData({
        [category]: { [key]: numValue }
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
    
    const generatedAct = await generateActData(actNumber, scenesPerAct);
    
    if (generatedAct) {
      setGeneratedAct(actNumber, generatedAct);
      
      // Log generation to console
      console.log(`Generated Act ${actNumber}:`, generatedAct);
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
  
  // Show warning when going back
  const handleBack = () => {
    // Skip warning if user has chosen to suppress it
    if (suppressBackWarning) {
      goToStep(5);
    } else {
      setShowBackWarning(true);
    }
  };
  
  // Confirm going back
  const confirmGoBack = () => {
    goToStep(5);
    setShowBackWarning(false);
  };
  
  // Handle export actions
  const handleExportActs = async () => {
    await exportActs();
  };
  
  // Handle finish
  const handleFinish = () => {
    setLocation("/");
  };
  
  return (
    <>
      <NavBar />
      <CreationProgress currentStep={6} />
      
      <div className="pt-16">
        <div className="creation-container max-w-4xl mx-auto p-6">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6">Step 6: Generate Visual Novel</h2>
          <p className="text-gray-600 mb-6">Generate the scenes for each act of your visual novel. You can adjust the number of scenes per act and regenerate as needed.</p>
          
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <label htmlFor="scenes-per-act" className="block text-sm font-medium text-neutral-700 mr-3">Scenes Per Act:</label>
              <Select 
                value={scenesPerAct.toString()} 
                onValueChange={(value) => setScenesPerAct(parseInt(value, 10))}
              >
                <SelectTrigger id="scenes-per-act" className="w-32">
                  <SelectValue placeholder="Number of scenes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 Scenes</SelectItem>
                  <SelectItem value="10">10 Scenes</SelectItem>
                  <SelectItem value="15">15 Scenes</SelectItem>
                  <SelectItem value="20">20 Scenes</SelectItem>
                  <SelectItem value="25">25 Scenes</SelectItem>
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
          
          {/* Play buttons were moved to individual act cards */}

          {/* Generation progress indicator */}
          {isGenerating && currentGeneratingAct !== null && (
            <Card className="mb-6 border-primary/20 bg-primary/5">
              <CardContent className="py-4">
                <div className="flex items-center text-primary mb-2">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Generating Act {currentGeneratingAct}... This may take a moment.</span>
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
                <CardTitle className="text-lg font-semibold text-neutral-800">Act {actNumber}</CardTitle>
                <CardDescription>
                  {isActGenerated(actNumber) 
                    ? `This act has been generated and is ready to play. You can regenerate it if desired.` 
                    : `This act has not been generated yet. Click the button below to generate it.`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isActGenerated(actNumber) && projectData?.plotData?.plotOutline && (
                  <div className="border border-neutral-200 rounded-md p-4">
                    <h4 className="text-md font-medium text-neutral-700 mb-2">
                      {projectData.plotData.plotOutline[`act${actNumber}` as keyof typeof projectData.plotData.plotOutline]?.title || `Act ${actNumber}`}
                    </h4>
                    <p className="text-sm text-neutral-600 mb-4">
                      {projectData.plotData.plotOutline[`act${actNumber}` as keyof typeof projectData.plotData.plotOutline]?.summary || 'No summary available'}
                    </p>
                  </div>
                )}
                
                {/* Play button for this act */}
                {isActGenerated(actNumber) && (
                  <div className="mt-4">
                    <Button 
                      className="w-full"
                      onClick={() => playAct(actNumber)}
                    >
                      Play Act {actNumber}
                    </Button>
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex justify-end">
                <Button
                  variant="outline"
                  className={`border-primary text-primary hover:bg-primary/10 flex items-center justify-center ${isActGenerating(actNumber) ? 'opacity-75' : ''}`}
                  onClick={() => handleGenerateAct(actNumber)}
                  disabled={isGenerating}
                >
                  {isActGenerating(actNumber) ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
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
              </CardFooter>
            </Card>
          ))}
          
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-neutral-800">Player Data</CardTitle>
              <p className="text-sm text-neutral-600">These values represent relationships, inventory items, and skills your character has accumulated throughout the story. You can edit these values before playing each act.</p>
            </CardHeader>
            <CardContent>
              <div className="border border-neutral-200 rounded-md p-4">
                {/* Relationships */}
                <h4 className="text-md font-medium text-neutral-700 mb-2">Relationships</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  {Object.entries(editablePlayerData.relationships).length > 0 ? (
                    Object.entries(editablePlayerData.relationships).map(([key, value]) => (
                      <div key={key} className="flex items-center">
                        <span className="text-sm text-neutral-600 mr-2">{key}:</span>
                        <Input
                          type="number"
                          value={value}
                          onChange={(e) => handlePlayerDataChange('relationships', key, e.target.value)}
                          className="w-16"
                        />
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-neutral-500">No relationships yet. These will be updated as you play through acts.</p>
                  )}
                </div>
                
                {/* Inventory */}
                <h4 className="text-md font-medium text-neutral-700 mb-2">Inventory</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  {Object.entries(editablePlayerData.inventory).length > 0 ? (
                    Object.entries(editablePlayerData.inventory).map(([key, value]) => (
                      <div key={key} className="flex items-center">
                        <span className="text-sm text-neutral-600 mr-2">{key}:</span>
                        <Input
                          type="number"
                          value={value}
                          onChange={(e) => handlePlayerDataChange('inventory', key, e.target.value)}
                          className="w-16"
                        />
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-neutral-500">No inventory items yet. These will be updated as you play through acts.</p>
                  )}
                </div>
                
                {/* Skills */}
                <h4 className="text-md font-medium text-neutral-700 mb-2">Skills</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {Object.entries(editablePlayerData.skills).length > 0 ? (
                    Object.entries(editablePlayerData.skills).map(([key, value]) => (
                      <div key={key} className="flex items-center">
                        <span className="text-sm text-neutral-600 mr-2">{key}:</span>
                        <Input
                          type="number"
                          value={value}
                          onChange={(e) => handlePlayerDataChange('skills', key, e.target.value)}
                          className="w-16"
                        />
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-neutral-500">No skills yet. These will be updated as you play through acts.</p>
                  )}
                </div>
                
                <div className="mt-4 flex justify-end">
                  <Button
                    variant="secondary"
                    onClick={handleResetPlayerData}
                  >
                    Reset All Values
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <div className="pt-6 flex justify-between">
            <Button
              variant="outline"
              onClick={handleBack}
            >
              Back
            </Button>
            <Button onClick={handleFinish}>
              Finish
            </Button>
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
      
      {/* Back Navigation Warning Modal with Checkbox */}
      <Dialog open={showBackWarning} onOpenChange={setShowBackWarning}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive">Warning: Going Back</DialogTitle>
            <DialogDescription>
              Editing previous steps might destroy continuity with your generated content. Are you sure you want to go back?
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center space-x-2 py-2">
            <Checkbox 
              id="dont-show-again" 
              checked={suppressBackWarning}
              onCheckedChange={(checked) => setSuppressBackWarning(checked === true)}
            />
            <label
              htmlFor="dont-show-again"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Don't show this message again
            </label>
          </div>
          <DialogFooter className="sm:justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowBackWarning(false)}
            >
              Stay Here
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={confirmGoBack}
            >
              Yes, Go Back
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
