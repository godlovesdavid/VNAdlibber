import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Share2 } from 'lucide-react';
import { useTranslation } from 'i18next';

interface SocialShareButtonsProps {
  title: string;
  url?: string; // Optional - if not provided, will use current URL
}

export function SocialShareButtons({ title, url }: SocialShareButtonsProps) {
  const { toast } = useToast();
  const [isExpanded, setIsExpanded] = useState(false);
  const { t } = useTranslation();

  // Get the current URL if none provided
  const shareUrl = url || window.location.href;
  const shareText = `Check out this visual novel: ${title}`;

  const handleShare = (platform: 'twitter' | 'facebook' | 'email' | 'copy') => {
    switch (platform) {
      case 'twitter':
        window.open(
          `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`,
          '_blank'
        );
        break;
      case 'facebook':
        window.open(
          `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
          '_blank'
        );
        break;
      case 'email':
        window.open(
          `mailto:?subject=${encodeURIComponent(shareText)}&body=${encodeURIComponent(`${shareText}\n\n${shareUrl}`)}`,
          '_blank'
        );
        break;
      case 'copy':
        navigator.clipboard.writeText(shareUrl)
          .then(() => {
            toast({
              title: "Link Copied",
              description: "Share link copied to clipboard",
              duration: 2000
            });
          })
          .catch(() => {
            toast({
              title: "Copy Failed",
              description: "Could not copy the link to clipboard",
              variant: "destructive"
            });
          });
        break;
    }
  };

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className="fixed right-[7px] top-[52px] z-30 flex flex-col gap-2 p-1.5 bg-transparent rounded-l-md">
      {/* Main Share Button */}
      <button
        onClick={toggleExpand}
        className="w-7 h-7 flex items-center justify-center rounded-full bg-white text-black hover:bg-gray-100 transition-colors shadow-md"
        aria-label="Share"
        title="Share"
      >
        <Share2 className="h-4 w-4" />
      </button>

      {/* Expandable Share Options */}
      <div className={cn(
        "flex flex-col gap-2 transition-all duration-300 overflow-hidden", 
        isExpanded ? "max-h-[200px] opacity-100" : "max-h-0 opacity-0 pointer-events-none"
      )}>
        {/* Twitter Button */}
        <button
          onClick={() => handleShare('twitter')}
          className="w-7 h-7 flex items-center justify-center rounded-full bg-white text-[#1DA1F2] hover:bg-gray-100 hover:text-[#1DA1F2]/80 transition-colors"
          aria-label="Share on Twitter"
          title="Share on Twitter"
        >
          <svg className="h-4 w-4" aria-hidden="true" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
          </svg>
        </button>

        {/* Facebook Button */}
        <button
          onClick={() => handleShare('facebook')}
          className="w-7 h-7 flex items-center justify-center rounded-full bg-white text-[#4267B2] hover:bg-gray-100 hover:text-[#4267B2]/80 transition-colors"
          aria-label="Share on Facebook"
          title="Share on Facebook"
        >
          <svg className="h-4 w-4" aria-hidden="true" fill="currentColor" viewBox="0 0 24 24">
            <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
          </svg>
        </button>

        {/* Email Button */}
        <button
          onClick={() => handleShare('email')}
          className="w-7 h-7 flex items-center justify-center rounded-full bg-white text-gray-600 hover:bg-gray-100 hover:text-gray-800 transition-colors"
          aria-label="Share via Email"
          title="Share via Email"
        >
          <svg className="h-4 w-4" aria-hidden="true" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </button>
      </div>
    </div>
  );
}