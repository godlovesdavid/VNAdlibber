import { useState, useEffect } from "react";
import { useVnContext } from "@/context/vn-context";
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
import { Copy, Twitter, Facebook, Mail, Share, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShareDialog({ open, onOpenChange }: ShareDialogProps) {
  const { toast } = useToast();
  const [shareUrl, setShareUrl] = useState("https://vn-adlibber.replit.com/s/echoes-of-tomorrow");
  
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
      <DialogContent className="w-[95vw] max-w-[95vw] sm:max-w-md rounded-md p-4 sm:p-6">
        <DialogHeader className="pb-2 sm:pb-4">
          <DialogTitle className="text-lg sm:text-xl">Share Your Story</DialogTitle>
          <DialogDescription className="text-sm">
            Share your visual novel with friends or the community.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-3 sm:space-y-4 py-2 sm:py-4">
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Share Link</label>
            <div className="flex">
              <Input
                value={shareUrl}
                readOnly
                className="flex-grow rounded-r-none bg-muted text-xs sm:text-sm h-8 sm:h-10"
              />
              <Button
                type="button"
                variant="secondary"
                className="rounded-l-none h-8 sm:h-10 px-2 sm:px-3"
                onClick={handleCopy}
              >
                <Copy className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
            </div>
          </div>
          
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Share To</label>
            <div className="flex flex-col sm:flex-row gap-2 sm:space-x-3">
              <Button
                type="button"
                variant="outline"
                className="flex-1 py-1 sm:py-2 text-xs sm:text-sm h-8 sm:h-auto"
                onClick={() => handleShare("twitter")}
              >
                <Twitter className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" /> X
              </Button>
              <Button
                type="button"
                variant="outline"
                className="flex-1 py-1 sm:py-2 text-xs sm:text-sm h-8 sm:h-auto"
                onClick={() => handleShare("facebook")}
              >
                <Facebook className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" /> Facebook
              </Button>
              <Button
                type="button"
                variant="outline"
                className="flex-1 py-1 sm:py-2 text-xs sm:text-sm h-8 sm:h-auto"
                onClick={() => handleShare("email")}
              >
                <Mail className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" /> Email
              </Button>
            </div>
          </div>
        </div>
        
        <DialogFooter className="mt-2 sm:mt-4">
          <Button 
            type="button" 
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto text-xs sm:text-sm"
            size="sm"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
