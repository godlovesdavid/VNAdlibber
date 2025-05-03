import { useState } from 'react';
import { Share, Copy, X, Facebook, Twitter, Mail, Loader2 } from 'lucide-react';
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
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';

interface ShareStoryDialogProps {
  projectId: number;
  projectTitle: string;
  trigger?: React.ReactNode;
}

interface ShareResponse {
  shareId: string;
  storyId: number;
  url: string;
}

export function ShareStoryDialog({ projectId, projectTitle, trigger }: ShareStoryDialogProps) {
  const [shareUrl, setShareUrl] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const baseUrl = window.location.origin;

  const shareStory = async () => {
    try {
      setLoading(true);
      
      const response = await fetch('/api/share', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ projectId })
      });
      
      if (!response.ok) {
        throw new Error('Failed to share story');
      }
      
      const data: ShareResponse = await response.json();
      const fullShareUrl = `${baseUrl}${data.url}`;
      setShareUrl(fullShareUrl);
      
      toast({
        title: 'Success!',
        description: 'Your story has been shared successfully.',
      });
    } catch (error) {
      console.error('Error sharing story:', error);
      toast({
        title: 'Error',
        description: 'Failed to share your story. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareUrl).then(
      () => {
        toast({
          title: 'Copied!',
          description: 'Share link copied to clipboard.',
        });
      },
      (err) => {
        console.error('Could not copy text: ', err);
        toast({
          title: 'Error',
          description: 'Failed to copy to clipboard.',
          variant: 'destructive',
        });
      }
    );
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen) {
      setShareUrl('');
      shareStory();
    }
  };

  const shareToTwitter = () => {
    const text = `Check out my visual novel "${projectTitle}" created with VN Adlibber!`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(url, '_blank');
  };

  const shareToFacebook = () => {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
    window.open(url, '_blank');
  };

  const shareByEmail = () => {
    const subject = `Check out my visual novel "${projectTitle}"`;
    const body = `I created a visual novel with VN Adlibber. You can play it here: ${shareUrl}`;
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="gap-2">
            <Share className="w-4 h-4" />
            Share
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share your story</DialogTitle>
          <DialogDescription>
            Share your visual novel with friends and on social media.
          </DialogDescription>
        </DialogHeader>
        
        {loading ? (
          <div className="flex flex-col items-center justify-center py-6">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="mt-4 text-sm text-center text-muted-foreground">
              Generating share link...
            </p>
          </div>
        ) : shareUrl ? (
          <>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="link" className="text-right">
                  Link
                </Label>
                <div className="col-span-3 flex items-center gap-2">
                  <Input
                    id="link"
                    value={shareUrl}
                    readOnly
                    className="h-9"
                  />
                  <Button variant="outline" size="icon" onClick={copyToClipboard}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            <Separator className="my-2" />
            
            <div className="mb-4">
              <h4 className="mb-2 text-sm font-medium">Share on social media</h4>
              <div className="flex space-x-2">
                <Button 
                  onClick={shareToTwitter}
                  variant="outline" 
                  size="icon" 
                  className="rounded-full bg-[#1DA1F2] hover:bg-[#1DA1F2]/90 text-white"
                >
                  <Twitter className="h-4 w-4" />
                </Button>
                <Button 
                  onClick={shareToFacebook}
                  variant="outline" 
                  size="icon" 
                  className="rounded-full bg-[#1877F2] hover:bg-[#1877F2]/90 text-white"
                >
                  <Facebook className="h-4 w-4" />
                </Button>
                <Button 
                  onClick={shareByEmail}
                  variant="outline" 
                  size="icon" 
                  className="rounded-full"
                >
                  <Mail className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="py-6 text-center text-muted-foreground">
            <p>Failed to generate share link. Please try again.</p>
          </div>
        )}
        
        <DialogFooter className="sm:justify-between">
          <Button
            variant="secondary"
            onClick={() => setOpen(false)}
          >
            <X className="mr-2 h-4 w-4" />
            Close
          </Button>
          {shareUrl && (
            <Button
              onClick={() => window.open(shareUrl, '_blank')}
              className="gap-2"
            >
              Preview
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
