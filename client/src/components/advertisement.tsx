import React, { useEffect, useRef } from 'react';

interface AdvertisementProps {
  adSlot: string;       // The ad slot ID from your ad network
  format?: 'banner' | 'rectangle' | 'leaderboard' | 'interstitial';
  className?: string;   // Additional classes for styling
}

/**
 * Advertisement component that can be placed in different parts of the application
 * 
 * This component creates a placeholder for ads that can be filled by various ad networks
 * like Google AdSense, Amazon Associates, etc.
 */
export function Advertisement({ adSlot, format = 'rectangle', className }: AdvertisementProps) {
  const adRef = useRef<HTMLDivElement>(null);
  
  // Determine dimensions based on format
  const getDimensions = () => {
    switch (format) {
      case 'banner':
        return { width: '468px', height: '60px' };
      case 'leaderboard':
        return { width: '728px', height: '90px' };
      case 'interstitial':
        return { width: '100%', height: '100%' };
      case 'rectangle':
      default:
        return { width: '300px', height: '250px' };
    }
  };
  
  const dimensions = getDimensions();
  
  useEffect(() => {
    // This is where you would initialize your ad network's code
    // For example, with Google AdSense:
    
    /*
    if (window.adsbygoogle && adRef.current) {
      const adElement = document.createElement('ins');
      adElement.className = 'adsbygoogle';
      adElement.style.display = 'block';
      adElement.dataset.adClient = 'YOUR-CLIENT-ID'; // Replace with your client ID
      adElement.dataset.adSlot = adSlot;
      adElement.dataset.adFormat = 'auto';
      adElement.dataset.fullWidthResponsive = 'true';
      
      // Clear previous contents and append new ad element
      while (adRef.current.firstChild) {
        adRef.current.removeChild(adRef.current.firstChild);
      }
      adRef.current.appendChild(adElement);
      
      // Push ad to be displayed
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    }
    */
    
    // For now, we'll just add a placeholder
    console.log(`Ad placeholder created for slot: ${adSlot}, format: ${format}`);
    
  }, [adSlot, format]);
  
  return (
    <div 
      ref={adRef}
      className={`ad-container ${className || ''}`}
      style={{
        width: dimensions.width,
        height: dimensions.height,
        background: 'rgba(0,0,0,0.05)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '1rem auto',
        borderRadius: '8px',
        overflow: 'hidden',
      }}
    >
      <div className="ad-placeholder text-center p-4">
        <p className="text-muted-foreground text-sm">Advertisement</p>
        <p className="text-xs text-muted-foreground">({format} - {adSlot})</p>
      </div>
    </div>
  );
}

// Interstitial (full-screen) advertisement component
export function InterstitialAd({
  adSlot,
  onClose,
  autoCloseAfter = 10,  // Auto-close after 10 seconds by default
}: {
  adSlot: string;
  onClose: () => void;
  autoCloseAfter?: number;
}) {
  const [timeLeft, setTimeLeft] = React.useState(autoCloseAfter);
  
  useEffect(() => {
    // Start countdown
    if (timeLeft <= 0) {
      onClose();
      return;
    }
    
    const timer = setTimeout(() => {
      setTimeLeft(timeLeft - 1);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [timeLeft, onClose]);
  
  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 max-w-xl w-full">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-medium">Advertisement</h3>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              Skip in {timeLeft}s
            </span>
            <button 
              onClick={onClose}
              className="p-1 rounded-full hover:bg-neutral-100"
            >
              &times;
            </button>
          </div>
        </div>
        
        <Advertisement adSlot={adSlot} format="rectangle" />
        
        <div className="mt-4 text-center">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-primary text-white rounded-md"
          >
            Skip Ad
          </button>
        </div>
      </div>
    </div>
  );
}

// Usage of ad hooks for advanced cases
export function useInterstitialAd(adSlot: string, triggerCondition: boolean) {
  const [showAd, setShowAd] = React.useState(false);
  
  useEffect(() => {
    if (triggerCondition) {
      setShowAd(true);
    }
  }, [triggerCondition]);
  
  const closeAd = () => setShowAd(false);
  
  // Component to render
  const AdComponent = showAd ? (
    <InterstitialAd adSlot={adSlot} onClose={closeAd} />
  ) : null;
  
  return { AdComponent, closeAd };
}
