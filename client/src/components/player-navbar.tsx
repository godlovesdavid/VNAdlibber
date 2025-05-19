import { useState, useEffect } from "react";
import { useVnContext } from "@/context/vn-context";
import { 
  RefreshCw,
  FileText,
  Database,
  ArrowLeft,
  Settings
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { useTranslation } from "react-i18next";

interface PlayerNavbarProps {
  actNumber: number;
  onRestart: () => void;
  onReturn: () => void;
  dialogueLog: Array<{speaker: string, text: string}>;
  title?: string; // Optional story title
}

export function PlayerNavbar({ actNumber, onRestart, onReturn, dialogueLog, title }: PlayerNavbarProps) {
  const { playerData, updatePlayerData, resetPlayerData } = useVnContext();
  const { t } = useTranslation();
  const [showLog, setShowLog] = useState(false);
  const [showDataEditor, setShowDataEditor] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [activeTextSpeed, setActiveTextSpeed] = useState<'slow' | 'normal' | 'fast'>('normal'); // Track active text speed button
  const [imageGenerationEnabled, setImageGenerationEnabled] = useState(true); // Track image generation state
  
  // Create a copy of the player data for editing
  const [editableData, setEditableData] = useState({
    relationships: { ...playerData.relationships },
    inventory: { ...playerData.inventory },
    skills: { ...playerData.skills },
  });
  
  const handleValueChange = (category: 'relationships' | 'inventory' | 'skills', key: string, value: string) => {
    const numericValue = parseInt(value, 10);
    
    setEditableData(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: isNaN(numericValue) ? 0 : numericValue,
      },
    }));
  };
  
  const saveChanges = () => {
    updatePlayerData(editableData);
    setShowDataEditor(false);
  };
  
  const handleReset = () => {
    if (window.confirm(t('playerNavbar.confirmReset', 'Are you sure you want to reset all player values?'))) {
      resetPlayerData();
      setEditableData({
        relationships: {},
        inventory: {},
        skills: {},
      });
    }
  };
  
  // Listen for player components changing text speed
  // This keeps the options menu buttons in sync with player speed controls
  useEffect(() => {
    // When VN player components update their text speed, sync with our UI
    const handlePlayerTextSpeedChange = (e: CustomEvent) => {
      const speedValue = e.detail;
      if (speedValue === 2) {
        setActiveTextSpeed('slow');
      } else if (speedValue === 7) {
        setActiveTextSpeed('normal');
      } else if (speedValue === 10) {
        setActiveTextSpeed('fast');
      }
    };
    
    // Listen for text speed change events
    window.addEventListener('vnSetTextSpeed', handlePlayerTextSpeedChange as EventListener);
    
    // Clean up event listener on unmount
    return () => {
      window.removeEventListener('vnSetTextSpeed', handlePlayerTextSpeedChange as EventListener);
    };
  }, []);
  
  // Listen for image generation toggle events
  useEffect(() => {
    // When VN player components toggle image generation, sync with our UI
    const handleImageGenerationChange = (e: CustomEvent) => {
      const isEnabled = e.detail;
      setImageGenerationEnabled(isEnabled);
    };
    
    // Listen for image generation toggle events
    window.addEventListener('vnToggleImageGeneration', handleImageGenerationChange as EventListener);
    
    // Clean up event listener on unmount
    return () => {
      window.removeEventListener('vnToggleImageGeneration', handleImageGenerationChange as EventListener);
    };
  }, []);
  
  return (
    <div className="fixed top-0 left-0 w-full bg-neutral-800 text-white text-[10px] sm:text-xs md:text-sm px-2 sm:px-3 py-1 sm:py-2 z-20">
      <div className="flex justify-between items-center">
        <div className="flex space-x-2 sm:space-x-4">
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-white hover:text-primary-300 h-6 w-6 sm:h-8 sm:w-8" 
            title={t('playerNavbar.restartAct', 'Restart Act')}
            onClick={onRestart}
          >
            <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4" />
          </Button>
          
          <Sheet open={showLog} onOpenChange={setShowLog}>
            <SheetTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-white hover:text-primary-300 h-6 w-6 sm:h-8 sm:w-8" 
                title={t('playerNavbar.showLog', 'Show Log')}
              >
                <FileText className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[400px] sm:w-[540px]">
              <SheetHeader>
                <SheetTitle>{t('playerNavbar.dialogueLog', 'Dialogue Log')}</SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-4 max-h-[calc(100vh-120px)] overflow-y-auto">
                {dialogueLog.map((entry, index) => (
                  <div key={index} className="space-y-1">
                    <p className="font-medium text-primary">{entry.speaker}</p>
                    <p className="text-sm text-gray-700 font-dialogue">{entry.text}</p>
                  </div>
                ))}
              </div>
            </SheetContent>
          </Sheet>
          
          <Sheet open={showDataEditor} onOpenChange={setShowDataEditor}>
            <SheetTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-white hover:text-primary-300 h-6 w-6 sm:h-8 sm:w-8" 
                title="Edit Data"
              >
                <Database className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[400px] sm:w-[540px]">
              <SheetHeader>
                <SheetTitle>Edit Player Data</SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-6 max-h-[calc(100vh-120px)] overflow-y-auto">
                {/* Relationships */}
                <div className="space-y-3">
                  <h3 className="font-medium text-lg">Relationships</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {Object.entries(editableData.relationships).map(([key, value]) => (
                      <div key={key} className="flex items-center">
                        <span className="text-sm text-gray-600 mr-2">{key}:</span>
                        <Input 
                          type="number" 
                          value={value} 
                          onChange={(e) => handleValueChange('relationships', key, e.target.value)}
                          className="w-16"
                        />
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Inventory */}
                <div className="space-y-3">
                  <h3 className="font-medium text-lg">Inventory</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {Object.entries(editableData.inventory).map(([key, value]) => (
                      <div key={key} className="flex items-center">
                        <span className="text-sm text-gray-600 mr-2">{key}:</span>
                        <Input 
                          type="number" 
                          value={value} 
                          onChange={(e) => handleValueChange('inventory', key, e.target.value)}
                          className="w-16"
                        />
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Skills */}
                <div className="space-y-3">
                  <h3 className="font-medium text-lg">Skills</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {Object.entries(editableData.skills).map(([key, value]) => (
                      <div key={key} className="flex items-center">
                        <span className="text-sm text-gray-600 mr-2">{key}:</span>
                        <Input 
                          type="number" 
                          value={value} 
                          onChange={(e) => handleValueChange('skills', key, e.target.value)}
                          className="w-16"
                        />
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="flex justify-between mt-6">
                  <Button 
                    variant="destructive" 
                    onClick={handleReset}
                  >
                    Reset All Values
                  </Button>
                  <Button 
                    onClick={saveChanges}
                  >
                    Save Changes
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
        
        <div className="text-white font-medium text-[9px] sm:text-xs md:text-sm max-w-[200px] sm:max-w-none truncate text-center">
          {/* Display story title and act number */}
          <span>Act {actNumber} - {title || playerData.storyTitle || "Visual Novel"}</span>
        </div>
        
        <div className="flex space-x-2 sm:space-x-4">
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-white hover:text-primary-300 h-6 w-6 sm:h-8 sm:w-8" 
            title="Return to Generator"
            onClick={onReturn}
          >
            <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4" />
          </Button>
          
          <Sheet open={showOptions} onOpenChange={setShowOptions}>
            <SheetTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-white hover:text-primary-300 h-6 w-6 sm:h-8 sm:w-8" 
                title="Options"
              >
                <Settings className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[400px]">
              <SheetHeader>
                <SheetTitle>Options</SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-6">
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Text Speed</h3>
                  <div className="grid grid-cols-3 gap-2">
                    <Button 
                      variant={activeTextSpeed === 'slow' ? 'default' : 'outline'} 
                      size="sm"
                      onClick={() => {
                        // Dispatch event to set text speed (back to original value)
                        window.dispatchEvent(new CustomEvent('vnSetTextSpeed', { detail: 1 }));
                        // Update state to track active button
                        setActiveTextSpeed('slow');
                      }}
                    >
                      Slow
                    </Button>
                    <Button 
                      variant={activeTextSpeed === 'normal' ? 'default' : 'outline'} 
                      size="sm"
                      onClick={() => {
                        // Dispatch event to set text speed (increased from 5 to 7)
                        window.dispatchEvent(new CustomEvent('vnSetTextSpeed', { detail: 7 }));
                        // Update state to track active button
                        setActiveTextSpeed('normal');
                      }}
                    >
                      Normal
                    </Button>
                    <Button 
                      variant={activeTextSpeed === 'fast' ? 'default' : 'outline'} 
                      size="sm"
                      onClick={() => {
                        // Dispatch event to set text speed
                        window.dispatchEvent(new CustomEvent('vnSetTextSpeed', { detail: 10 }));
                        // Update state to track active button
                        setActiveTextSpeed('fast');
                      }}
                    >
                      Fast
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Image Generation</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <Button 
                      variant={!imageGenerationEnabled ? 'default' : 'outline'} 
                      size="sm"
                      onClick={() => {
                        // Dispatch event to disable image generation
                        window.dispatchEvent(new CustomEvent('vnToggleImageGeneration', { detail: false }));
                        // Update state to track active button
                        setImageGenerationEnabled(false);
                      }}
                    >
                      Off
                    </Button>
                    <Button 
                      variant={imageGenerationEnabled ? 'default' : 'outline'} 
                      size="sm"
                      onClick={() => {
                        // Dispatch event to enable image generation
                        window.dispatchEvent(new CustomEvent('vnToggleImageGeneration', { detail: true }));
                        // Update state to track active button
                        setImageGenerationEnabled(true);
                      }}
                    >
                      On
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Audio</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" size="sm">Off</Button>
                    <Button variant="outline" size="sm" disabled>On</Button>
                  </div>
                  <p className="text-xs text-muted-foreground">Coming soon</p>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </div>
  );
}
