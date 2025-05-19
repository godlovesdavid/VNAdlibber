import { ReactNode } from "react";
import { SocialShareButtons } from "@/components/social-share-buttons";
import { Helmet } from "react-helmet";

interface PlayerLayoutProps {
  children: ReactNode;
  title: string;
  description: string;
  showShareButtons?: boolean;
}

/**
 * Clean layout specifically for player pages with no navigation header
 * This provides a distraction-free experience on both mobile and desktop
 */
export function PlayerLayout({ 
  children, 
  title, 
  description,
  showShareButtons = true 
}: PlayerLayoutProps) {
  return (
    <div className="flex flex-col min-h-screen bg-black overflow-hidden">
      <Helmet>
        <title>{title} | VN Ad Lib</title>
        <meta name="description" content={description} />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content={window.location.href} />
        <meta property="og:title" content={`${title} | VN Adlibber`} />
        <meta property="og:description" content={description} />
        
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content={window.location.href} />
        <meta name="twitter:title" content={`${title} | VN Adlibber`} />
        <meta name="twitter:description" content={description} />
      </Helmet>
      
      <main className="flex flex-col flex-grow relative">
        {showShareButtons && (
          <SocialShareButtons title={title} />
        )}
        
        <div className="flex-grow bg-black">
          {children}
        </div>
      </main>
    </div>
  );
}
