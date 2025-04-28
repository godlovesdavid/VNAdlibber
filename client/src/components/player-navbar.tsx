import { useState } from "react";
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

interface PlayerNavbarProps {
  actNumber: number;
  onRestart: () => void;
  onReturn: () => void;
  dialogueLog: Array<{speaker: string, text: string}>;
}

export function PlayerNavbar({ actNumber, onRestart, onReturn, dialogueLog }: PlayerNavbarProps) {
  const { playerData, updatePlayerData, resetPlayerData } = useVnContext();
  const [showLog, setShowLog] = useState(false);
  const [showDataEditor, setShowDataEditor] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  
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
    if (window.confirm('Are you sure you want to reset all player values?')) {
      resetPlayerData();
      setEditableData({
        relationships: {},
        inventory: {},
        skills: {},
      });
    }
  };
  
  return (
    <div className="fixed top-0 left-0 w-full bg-neutral-800 text-white text-sm px-3 py-2 z-20">
      <div className="flex justify-between items-center">
        <div className="flex space-x-4">
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-white hover:text-primary-300 h-8 w-8" 
            title="Restart Act"
            onClick={onRestart}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          
          <Sheet open={showLog} onOpenChange={setShowLog}>
            <SheetTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-white hover:text-primary-300 h-8 w-8" 
                title="Show Log"
              >
                <FileText className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[400px] sm:w-[540px]">
              <SheetHeader>
                <SheetTitle>Dialogue Log</SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-4 max-h-[calc(100vh-120px)] overflow-y-auto">
                {dialogueLog.map((entry, index) => (
                  <div key={index} className="space-y-1">
                    <p className="font-medium text-primary">{entry.speaker}</p>
                    <p className="text-sm text-gray-700">{entry.text}</p>
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
                className="text-white hover:text-primary-300 h-8 w-8" 
                title="Edit Data"
              >
                <Database className="h-4 w-4" />
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
        
        <div className="text-neutral-300 text-xs">
          {/* Display relationships, inventory, and skills */}
          {Object.entries(playerData.relationships).map(([key, value]) => (
            <span key={key} className="mx-1">{key}: {value}</span>
          ))}
          {Object.entries(playerData.inventory).map(([key, value]) => (
            <span key={key} className="mx-1">{key}: {value}</span>
          ))}
          {Object.entries(playerData.skills).map(([key, value]) => (
            <span key={key} className="mx-1">{key}: {value}</span>
          ))}
        </div>
        
        <div className="flex space-x-4">
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-white hover:text-primary-300 h-8 w-8" 
            title="Return to Generator"
            onClick={onReturn}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          
          <Sheet open={showOptions} onOpenChange={setShowOptions}>
            <SheetTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-white hover:text-primary-300 h-8 w-8" 
                title="Options"
              >
                <Settings className="h-4 w-4" />
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
                      variant="outline" 
                      size="sm"
                      onClick={() => window.dispatchEvent(new CustomEvent('vnSetTextSpeed', { detail: 1 }))}
                    >
                      Slow
                    </Button>
                    <Button 
                      variant="default" 
                      size="sm"
                      onClick={() => window.dispatchEvent(new CustomEvent('vnSetTextSpeed', { detail: 5 }))}
                    >
                      Normal
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => window.dispatchEvent(new CustomEvent('vnSetTextSpeed', { detail: 10 }))}
                    >
                      Fast
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Image Generation</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" size="sm">Off</Button>
                    <Button variant="outline" size="sm" disabled>On</Button>
                  </div>
                  <p className="text-xs text-muted-foreground">Coming soon</p>
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
