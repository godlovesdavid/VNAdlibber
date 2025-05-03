import React from 'react';
import { useAds } from '@/context/ad-context';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";

interface AdSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AdSettingsDialog({ open, onOpenChange }: AdSettingsDialogProps) {
  const { adConfig, updateAdConfig } = useAds();
  
  // Handle toggle changes
  const handleEnabledChange = (checked: boolean) => {
    updateAdConfig({ enabled: checked });
  };
  
  const handleBannerAdsChange = (checked: boolean) => {
    updateAdConfig({ bannerAds: checked });
  };
  
  const handleInterstitialAdsChange = (checked: boolean) => {
    updateAdConfig({ interstitialAds: checked });
  };
  
  // Handle frequency change
  const handleFrequencyChange = (value: number[]) => {
    updateAdConfig({ frequency: value[0] });
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Advertisement Settings</DialogTitle>
          <DialogDescription>
            Customize your advertisement experience. Ad revenue helps keep this app free to use.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Main toggle */}
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="ads-enabled" className="font-medium">Enable Advertisements</Label>
              <p className="text-sm text-muted-foreground">Show ads to support the app</p>
            </div>
            <Switch
              id="ads-enabled"
              checked={adConfig.enabled}
              onCheckedChange={handleEnabledChange}
            />
          </div>
          
          <div className="border-t pt-4">
            <h4 className="text-sm font-medium mb-2">Ad Types</h4>
            
            {/* Banner Ads toggle */}
            <div className="flex items-center justify-between mb-3">
              <div>
                <Label htmlFor="banner-ads" className="text-sm">Banner Ads</Label>
                <p className="text-xs text-muted-foreground">Show banner ads in the app</p>
              </div>
              <Switch
                id="banner-ads"
                checked={adConfig.bannerAds}
                onCheckedChange={handleBannerAdsChange}
                disabled={!adConfig.enabled}
              />
            </div>
            
            {/* Interstitial Ads toggle */}
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="interstitial-ads" className="text-sm">Interstitial Ads</Label>
                <p className="text-xs text-muted-foreground">Show full-screen ads between actions</p>
              </div>
              <Switch
                id="interstitial-ads"
                checked={adConfig.interstitialAds}
                onCheckedChange={handleInterstitialAdsChange}
                disabled={!adConfig.enabled}
              />
            </div>
          </div>
          
          {/* Frequency settings */}
          <div className="border-t pt-4">
            <div className="mb-2">
              <Label htmlFor="ad-frequency" className="text-sm font-medium">Ad Frequency</Label>
              <p className="text-xs text-muted-foreground">How often ads appear (higher = less frequent)</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs">More</span>
              <Slider
                id="ad-frequency"
                value={[adConfig.frequency]}
                min={1}
                max={10}
                step={1}
                onValueChange={handleFrequencyChange}
                disabled={!adConfig.enabled}
                className="flex-1"
              />
              <span className="text-xs">Less</span>
            </div>
            <p className="text-center text-xs mt-1">
              {adConfig.frequency === 1 
                ? "After every action"
                : `After every ${adConfig.frequency} actions`}
            </p>
          </div>
        </div>
        
        <DialogFooter>
          <Button type="button" onClick={() => onOpenChange(false)}>
            Save Settings
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
