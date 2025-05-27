import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Edit, Save, X, HelpCircle, AlertTriangle, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface JsonEditorDialogProps {
  actNumber: number;
  actData: any;
  onSave: (actNumber: number, updatedData: any) => void;
  trigger?: React.ReactNode;
}

export function JsonEditorDialog({ actNumber, actData, onSave, trigger }: JsonEditorDialogProps) {
  const [open, setOpen] = useState(false);
  const [jsonText, setJsonText] = useState('');
  const [originalJsonText, setOriginalJsonText] = useState('');
  const [syntaxError, setSyntaxError] = useState<string | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const { toast } = useToast();

  // Initialize JSON text when dialog opens
  useEffect(() => {
    if (open && actData) {
      const formattedJson = JSON.stringify(actData, null, 2);
      setJsonText(formattedJson);
      setOriginalJsonText(formattedJson);
      setSyntaxError(null);
    }
  }, [open, actData]);

  // Check JSON syntax
  const validateJson = (text: string) => {
    try {
      JSON.parse(text);
      setSyntaxError(null);
      return true;
    } catch (error) {
      setSyntaxError((error as Error).message);
      return false;
    }
  };

  // Handle JSON text changes
  const handleJsonChange = (value: string) => {
    setJsonText(value);
    validateJson(value);
  };

  // Check if changes were made
  const hasChanges = () => {
    return jsonText !== originalJsonText;
  };

  // Handle save
  const handleSave = () => {
    if (!validateJson(jsonText)) {
      toast({
        title: "Invalid JSON",
        description: "Please fix the syntax errors before saving.",
        variant: "destructive",
      });
      return;
    }

    try {
      const parsedData = JSON.parse(jsonText);
      onSave(actNumber, parsedData);
      setOpen(false);
      toast({
        title: "Changes Saved",
        description: `Act ${actNumber} has been updated successfully.`,
      });
    } catch (error) {
      toast({
        title: "Save Failed",
        description: "There was an error saving your changes.",
        variant: "destructive",
      });
    }
  };

  // Handle cancel
  const handleCancel = () => {
    if (hasChanges()) {
      setShowCancelConfirm(true);
    } else {
      setOpen(false);
    }
  };

  // Confirm cancel with changes
  const confirmCancel = () => {
    setShowCancelConfirm(false);
    setOpen(false);
  };

  const guideContent = `
**JSON Scene Editor Guide**

This editor allows you to modify the structure and content of your visual novel scenes. Here are the key elements:

**Scene Structure:**
- Each scene has a unique ID (e.g., "scene1_1", "scene1_2")
- Scenes contain dialogue, choices, and settings

**Dialogue Format:**
\`\`\`json
"dialogue": [
  ["Character Name", "What the character says"],
  ["Narrator", "Narrative text"]
]
\`\`\`

**Choices Format:**
\`\`\`json
"choices": [
  {
    "text": "Choice text shown to player",
    "next": "scene_id_to_go_to"
  }
]
\`\`\`

**Scene Properties:**
- \`setting\`: Location description
- \`setting_desc\`: Detailed scene description
- \`dialogue\`: Array of character/narrator lines
- \`choices\`: Array of player choices (if any)
- \`next\`: Default next scene (if no choices)

**Tips:**
- Keep character names consistent throughout
- Ensure scene IDs in "next" fields exist
- Use proper JSON syntax (quotes, commas, brackets)
- Test your changes by playing the story
  `;

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          {trigger || (
            <Button variant="outline" size="sm">
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
          )}
        </DialogTrigger>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5" />
              Edit Act {actNumber} JSON Data
            </DialogTitle>
            <DialogDescription>
              Modify the scene data for this act. Make sure to maintain proper JSON syntax.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 flex flex-col gap-4 min-h-0">
            {/* Syntax Status */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {syntaxError ? (
                  <>
                    <AlertTriangle className="w-4 h-4 text-destructive" />
                    <span className="text-sm text-destructive">Syntax Error</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-green-600">Valid JSON</span>
                  </>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowGuide(true)}
              >
                <HelpCircle className="w-4 h-4 mr-1" />
                Guide
              </Button>
            </div>

            {/* Error Message */}
            {syntaxError && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                <p className="text-sm text-destructive font-medium">JSON Syntax Error:</p>
                <p className="text-sm text-destructive/80 mt-1">{syntaxError}</p>
              </div>
            )}

            {/* JSON Editor */}
            <div className="flex-1 min-h-0">
              <Textarea
                value={jsonText}
                onChange={(e) => handleJsonChange(e.target.value)}
                className="h-full min-h-[400px] font-mono text-sm resize-none"
                placeholder="JSON data will appear here..."
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between pt-4 border-t">
              <Button
                variant="outline"
                onClick={handleCancel}
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={!!syntaxError}
              >
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes to Act {actNumber}. Are you sure you want to cancel? 
              Your changes will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Editing</AlertDialogCancel>
            <AlertDialogAction onClick={confirmCancel}>
              Discard Changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Guide Dialog */}
      <Dialog open={showGuide} onOpenChange={setShowGuide}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5" />
              JSON Editor Guide
            </DialogTitle>
          </DialogHeader>
          <div className="prose prose-sm max-w-none">
            <pre className="whitespace-pre-wrap text-sm">{guideContent}</pre>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}