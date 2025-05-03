import React, { createContext, useContext, useState, useEffect } from 'react';
import { InterstitialAd } from '@/components/advertisement';

// Interface for ad configuration
interface AdConfig {
  enabled: boolean;
  frequency: number;  // How often to show ads (in page views/actions)
  bannerAds: boolean;
  interstitialAds: boolean;
  adNetwork: 'adsense' | 'admanager' | 'none'; // Which ad network to use
}

// Interface for the ad context
interface AdContextType {
  // Ad configuration
  adConfig: AdConfig;
  updateAdConfig: (config: Partial<AdConfig>) => void;
  
  // Ad display state
  pageViews: number;
  showInterstitial: boolean;
  displayInterstitial: () => void;
  closeInterstitial: () => void;
  
  // Helper functions
  shouldShowAd: () => boolean;
}

// Default configuration
const defaultAdConfig: AdConfig = {
  enabled: true,
  frequency: 3,  // Show an ad every 3 page views/actions
  bannerAds: true,
  interstitialAds: true,
  adNetwork: 'none', // Default to none until configured
};

// Create the context
const AdContext = createContext<AdContextType | undefined>(undefined);

// Provider component
export const AdProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // State for ad configuration
  const [adConfig, setAdConfig] = useState<AdConfig>(() => {
    // Try to load from localStorage
    const saved = localStorage.getItem('ad_config');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse saved ad config', e);
      }
    }
    return defaultAdConfig;
  });
  
  // Track page views for frequency targeting
  const [pageViews, setPageViews] = useState<number>(0);
  
  // State for interstitial display
  const [showInterstitial, setShowInterstitial] = useState<boolean>(false);
  
  // Update ad config and persist to localStorage
  const updateAdConfig = (config: Partial<AdConfig>) => {
    const newConfig = { ...adConfig, ...config };
    setAdConfig(newConfig);
    localStorage.setItem('ad_config', JSON.stringify(newConfig));
  };
  
  // Logic to determine if an ad should be shown based on page views and frequency
  const shouldShowAd = () => {
    if (!adConfig.enabled) return false;
    return pageViews % adConfig.frequency === 0 && pageViews > 0;
  };
  
  // Display interstitial ad
  const displayInterstitial = () => {
    if (adConfig.enabled && adConfig.interstitialAds) {
      setShowInterstitial(true);
    }
  };
  
  // Close interstitial ad
  const closeInterstitial = () => {
    setShowInterstitial(false);
  };
  
  // Increment page views on route change
  useEffect(() => {
    const handleRouteChange = () => {
      setPageViews(prev => prev + 1);
    };
    
    // Add event listener for route changes
    window.addEventListener('popstate', handleRouteChange);
    
    // Clean up
    return () => {
      window.removeEventListener('popstate', handleRouteChange);
    };
  }, []);
  
  // Check if interstitial should be shown on page view change
  useEffect(() => {
    if (shouldShowAd() && adConfig.interstitialAds) {
      // Add a small delay to not interrupt user immediately
      const timer = setTimeout(() => {
        setShowInterstitial(true);
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [pageViews]);
  
  // Context value
  const value: AdContextType = {
    adConfig,
    updateAdConfig,
    pageViews,
    showInterstitial,
    displayInterstitial,
    closeInterstitial,
    shouldShowAd,
  };
  
  return (
    <AdContext.Provider value={value}>
      {children}
      {showInterstitial && (
        <InterstitialAd 
          adSlot="interstitial-1"
          onClose={closeInterstitial}
        />
      )}
    </AdContext.Provider>
  );
};

// Hook to use the ad context
export const useAds = () => {
  const context = useContext(AdContext);
  if (context === undefined) {
    throw new Error('useAds must be used within an AdProvider');
  }
  return context;
};
