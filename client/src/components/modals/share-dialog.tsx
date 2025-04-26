import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Twitter, Facebook, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShareDialog({ open, onOpenChange }: ShareDialogProps) {
  const { toast } = useToast();
  const [shareUrl, setShareUrl] = useState("https://vn-adlibber.com/s/echoes-of-tomorrow");
  
  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      toast({
        description: "Link copied to clipboard",
      });
    }).catch(err => {
      console.error('Failed to copy text: ', err);
      toast({
        variant: "destructive",
        description: "Failed to copy link",
      });
    });
  };
  
  const handleShare = (platform: string) => {
    let url = "";
    
    switch(platform) {
      case "twitter":
        url = `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent("Check out my visual novel created with VN Adlibber!")}`;
        break;
      case "facebook":
        url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
        break;
      case "email":
        url = `mailto:?subject=${encodeURIComponent("Check out my visual novel")}&body=${encodeURIComponent(`I created a visual novel with VN Adlibber! Check it out here: ${shareUrl}`)}`;
        break;
    }
    
    if (url) {
      window.open(url, "_blank");
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Your Story</DialogTitle>
          <DialogDescription>
            Share your visual novel with friends or the community.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Share Link</label>
            <div className="flex">
              <Input
                value={shareUrl}
                readOnly
                className="flex-grow rounded-r-none bg-muted"
              />
              <Button
                type="button"
                variant="secondary"
                className="rounded-l-none"
                onClick={handleCopy}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Share To</label>
            <div className="flex space-x-3">
              <Button
                type="button"
                variant="outline"
                className="flex-1 py-2"
                onClick={() => handleShare("twitter")}
              >
                <Twitter className="mr-2 h-4 w-4" /> X
              </Button>
              <Button
                type="button"
                variant="outline"
                className="flex-1 py-2"
                onClick={() => handleShare("facebook")}
              >
                <Facebook className="mr-2 h-4 w-4" /> Facebook
              </Button>
              <Button
                type="button"
                variant="outline"
                className="flex-1 py-2"
                onClick={() => handleShare("email")}
              >
                <Mail className="mr-2 h-4 w-4" /> Email
              </Button>
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button type="button" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
