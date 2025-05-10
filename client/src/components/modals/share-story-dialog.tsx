import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Copy, Facebook, Twitter, Mail, Check, Share as ShareIcon, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useVnContext } from '@/context/vn-context';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

interface ShareStoryDialogProps {
  projectId: number;
  projectTitle: string;
  // Acts are numbered 1-5
  actNumber?: number;
  trigger: React.ReactNode;
}

export function ShareStoryDialog({
  projectId,
  projectTitle,
  actNumber = 1,
  trigger,
}: ShareStoryDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [shareLink, setShareLink] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const { hasUnsavedChanges, saveProject } = useVnContext();

  // Function to generate a share link
  const generateShareLink = async () => {
    setIsLoading(true);
    try {
      // Call your API endpoint to generate a share ID
      const response = await fetch('/api/share', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId,
          actNumber,
          title: projectTitle,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate share link');
      }

      const data = await response.json();
      
      // Construct the full share URL
      // Use the actual URL path returned from the API
      const shareUrl = `${window.location.origin}${data.url}`;
      setShareLink(shareUrl);
    } catch (error) {
      console.error('Error sharing story:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate share link',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Function to save project then generate share link
  const saveAndShare = async () => {
    try {
      setIsLoading(true);
      console.log('[Share Dialog] Starting saveAndShare process');
      
      // Save the project first - await to make sure it completes
      const savedProject = await saveProject();
      console.log('[Share Dialog] Project saved successfully');
      
      // Add a delay to ensure all state updates have been processed
      // This helps address potential race conditions with React state updates
      console.log('[Share Dialog] Adding delay before share link generation');
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Verify that changes are actually saved
      console.log('[Share Dialog] Rechecking for unsaved changes after save');
      const stillHasChanges = hasUnsavedChanges(savedProject);
      console.log('[Share Dialog] Project still has unsaved changes?', stillHasChanges);
      
      if (stillHasChanges) {
        console.warn('[Share Dialog] Warning: Project still reports unsaved changes after saving');
      }

      // Then generate the share link
      console.log('[Share Dialog] Generating share link');
      await generateShareLink();
      setIsAlertOpen(false);
      setIsOpen(true); // Make sure dialog opens
    } catch (error) {
      console.error('[Share Dialog] Error saving project before sharing:', error);
      toast({
        title: 'Error',
        description: 'Failed to save project before sharing',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Function to handle dialog open/close
  const handleOpenChange = (open: boolean) => {
    // If closing, simply close
    if (!open) {
      console.log('[Share Dialog] Closing dialog');
      setIsOpen(open);
      // Reset state when dialog closes
      setShareLink('');
      setCopied(false);
      return;
    }
    
    setIsOpen(open);
    generateShareLink();
  };

  // Function to copy link to clipboard
  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareLink);
    setCopied(true);
    toast({
      title: 'Copied!',
      description: 'Link copied to clipboard',
    });
    setTimeout(() => setCopied(false), 2000);
  };

  // Function to open social sharing
  const shareToSocial = (platform: 'twitter' | 'facebook' | 'email') => {
    const text = `Check out my visual novel: ${projectTitle}`;
    const url = shareLink;

    let shareUrl = '';

    switch (platform) {
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
        break;
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
        break;
      case 'email':
        shareUrl = `mailto:?subject=${encodeURIComponent(text)}&body=${encodeURIComponent(`${text}\n\n${url}`)}`;
        break;
    }

    window.open(shareUrl, '_blank');
  };

  return (
    <>
      {/* Unsaved changes warning dialog */}
      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes Detected</AlertDialogTitle>
            <AlertDialogDescription>
              Your project has unsaved changes. If you share it now, these changes won't be included in the shared version. Would you like to save your project first?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              // Continue without saving
              setIsAlertOpen(false);
              setIsOpen(true);
              generateShareLink();
            }}>Continue Without Saving</AlertDialogCancel>
            <AlertDialogAction onClick={saveAndShare} disabled={isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Save and Share
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Main share dialog */}
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          {trigger}
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Share This Story</DialogTitle>
            <DialogDescription>
              Share your visual novel with friends and on social media.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center space-x-2 mt-4">
            <div className="grid flex-1 gap-2">
              <Label htmlFor="share-link" className="sr-only">
                Share Link
              </Label>
              {isLoading ? (
                <div className="h-10 rounded-md border border-input bg-background flex items-center justify-center">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="ml-2 text-sm">Generating link...</span>
                </div>
              ) : (
                <Input
                  id="share-link"
                  value={shareLink}
                  readOnly
                  className="h-10"
                />
              )}
            </div>
            <Button 
              type="button" 
              size="sm" 
              className="px-3" 
              onClick={copyToClipboard}
              disabled={isLoading || !shareLink}
            >
              {copied ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              <span className="sr-only">Copy</span>
            </Button>
          </div>
          
          <div className="flex justify-center space-x-4 mt-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => shareToSocial('twitter')}
              disabled={isLoading || !shareLink}
              className="h-10 w-10 rounded-full"
            >
              <Twitter className="h-4 w-4" />
              <span className="sr-only">Share on Twitter</span>
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => shareToSocial('facebook')}
              disabled={isLoading || !shareLink}
              className="h-10 w-10 rounded-full"
            >
              <Facebook className="h-4 w-4" />
              <span className="sr-only">Share on Facebook</span>
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => shareToSocial('email')}
              disabled={isLoading || !shareLink}
              className="h-10 w-10 rounded-full"
            >
              <Mail className="h-4 w-4" />
              <span className="sr-only">Share via Email</span>
            </Button>
          </div>

          <DialogFooter className="sm:justify-start">
            <DialogDescription className="text-xs text-muted-foreground">
              Anyone with this link will be able to view this story.
            </DialogDescription>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
