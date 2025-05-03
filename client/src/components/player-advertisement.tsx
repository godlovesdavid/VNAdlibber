import React from 'react';
import { Advertisement } from '@/components/advertisement';
import { useAds } from '@/context/ad-context';

interface PlayerAdvertisementProps {
  position: 'top' | 'bottom' | 'sidebar';
  className?: string;
}

/**
 * Component for showing advertisements within the visual novel player
 */
export function PlayerAdvertisement({ position, className }: PlayerAdvertisementProps) {
  const { adConfig, shouldShowAd } = useAds();
  
  // Don't render if ads are disabled
  if (!adConfig.enabled || !adConfig.bannerAds || !shouldShowAd()) {
    return null;
  }
  
  // Determine ad format based on position
  const getAdFormat = () => {
    switch (position) {
      case 'top':
      case 'bottom':
        return 'leaderboard';
      case 'sidebar':
        return 'rectangle';
      default:
        return 'rectangle';
    }
  };
  
  // Style based on position
  const getPositionStyle = () => {
    switch (position) {
      case 'top':
        return 'w-full mb-4';
      case 'bottom':
        return 'w-full mt-4';
      case 'sidebar':
        return 'h-full';
      default:
        return '';
    }
  };
  
  return (
    <div className={`player-ad ${getPositionStyle()} ${className || ''}`}>
      <Advertisement 
        adSlot={`player-${position}`}
        format={getAdFormat()}
      />
    </div>
  );
}

/**
 * Component that shows an ad between scenes or chapters in the visual novel
 */
export function ChapterBreakAdvertisement() {
  const { adConfig, displayInterstitial } = useAds();
  
  // Function to show interstitial ad
  const showInterstitial = () => {
    if (adConfig.enabled && adConfig.interstitialAds) {
      displayInterstitial();
    }
  };
  
  // This component doesn't render anything directly
  // It just provides a trigger function for showing interstitial ads
  return null;
}
