import React, { useEffect, useRef } from 'react';
import { useDeviceType } from '@/hooks/use-mobile';
import { Advertisement } from '@/components/advertisement';

interface CrossPlatformAdProps {
  adSlot: string;
  format?: 'banner' | 'rectangle' | 'leaderboard' | 'interstitial';
  className?: string;
  // For mobile platform detection
  platformOverride?: 'web' | 'mobile';
}

/**
 * A cross-platform advertisement component that renders the appropriate ad
 * based on the detected platform (web or mobile)
 */
export function CrossPlatformAdvertisement({
  adSlot,
  format = 'rectangle',
  className,
  platformOverride,
}: CrossPlatformAdProps) {
  // Detect device type
  const deviceType = useDeviceType();
  
  // Determine platform - can be overridden for testing
  const isMobilePlatform = platformOverride
    ? platformOverride === 'mobile'
    : deviceType === 'mobile' || deviceType === 'tablet';
  
  // Use different ad implementations based on platform
  if (isMobilePlatform) {
    return <MobileAdComponent adSlot={adSlot} format={format} className={className} />;
  }
  
  return <Advertisement adSlot={adSlot} format={format} className={className} />;
}

/**
 * Mobile-specific advertisement component
 * This is a placeholder that would be replaced with a native implementation
 * in a proper mobile app wrapped with React Native, Ionic, etc.
 */
function MobileAdComponent({
  adSlot,
  format = 'rectangle',
  className,
}: CrossPlatformAdProps) {
  // In a real implementation, this would use native ad SDKs
  // For now, it's just a placeholder with a different style
  
  // Determine dimensions based on format
  const getDimensions = () => {
    switch (format) {
      case 'banner':
        return { width: '320px', height: '50px' }; // Mobile banner is typically 320×50
      case 'leaderboard':
        return { width: '100%', height: '90px' };
      case 'interstitial':
        return { width: '100%', height: '100%' };
      case 'rectangle':
      default:
        return { width: '300px', height: '250px' };
    }
  };
  
  const dimensions = getDimensions();
  
  return (
    <div 
      className={`mobile-ad-container ${className || ''}`}
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
        border: '1px dashed rgba(0,0,0,0.2)',
      }}
    >
      <div className="ad-placeholder text-center p-4">
        <p className="text-muted-foreground text-sm">Mobile Advertisement</p>
        <p className="text-xs text-muted-foreground">({format} - {adSlot})</p>
      </div>
    </div>
  );
}

// Mobile-specific interstitial ad
export function MobileInterstitialAd({
  adSlot,
  onClose,
  autoCloseAfter = 5, // Mobile ads typically have shorter timeouts
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
      <div className="bg-white rounded-lg p-4 max-w-xs w-full"> {/* Smaller for mobile */}
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-medium text-sm">Advertisement</h3>
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">
              {timeLeft}s
            </span>
            <button 
              onClick={onClose}
              className="p-1 rounded-full hover:bg-neutral-100"
            >
              &times;
            </button>
          </div>
        </div>
        
        <MobileAdComponent adSlot={adSlot} format="rectangle" />
        
        <div className="mt-2 text-center">
          <button
            onClick={onClose}
            className="px-3 py-1 bg-primary text-white rounded-md text-sm"
          >
            Skip
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Platform-aware interstitial ad component
 */
export function CrossPlatformInterstitialAd({
  adSlot,
  onClose,
  autoCloseAfter = 10,
  platformOverride,
}: {
  adSlot: string;
  onClose: () => void;
  autoCloseAfter?: number;
  platformOverride?: 'web' | 'mobile';
}) {
  // Detect device type
  const deviceType = useDeviceType();
  
  // Determine platform - can be overridden for testing
  const isMobilePlatform = platformOverride
    ? platformOverride === 'mobile'
    : deviceType === 'mobile' || deviceType === 'tablet';
  
  // Use different interstitial implementations based on platform
  if (isMobilePlatform) {
    return (
      <MobileInterstitialAd 
        adSlot={adSlot} 
        onClose={onClose} 
        autoCloseAfter={Math.min(5, autoCloseAfter)} // Mobile uses shorter timers
      />
    );
  }
  
  return (
    <InterstitialAd 
      adSlot={adSlot} 
      onClose={onClose} 
      autoCloseAfter={autoCloseAfter}
    />
  );
}

// Re-export from advertisement.tsx (this would be properly imported 
// in a real implementation)
function InterstitialAd({
  adSlot,
  onClose,
  autoCloseAfter = 10,
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
