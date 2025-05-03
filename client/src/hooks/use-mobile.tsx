import { useEffect, useState } from 'react';

type DeviceType = 'mobile' | 'tablet' | 'desktop';

interface ScreenSizeConfig {
  breakpoints: {
    mobile: number;
    tablet: number;
  };
}

// Default breakpoints
const defaultConfig: ScreenSizeConfig = {
  breakpoints: {
    mobile: 640,  // Max width for mobile devices
    tablet: 1024, // Max width for tablet devices
  },
};

/**
 * Hook to detect if the current device is a mobile device
 */
export function useIsMobile() {
  const [isMobile, setIsMobile] = useState<boolean>(false);
  
  useEffect(() => {
    // Check if window is available (for SSR)
    if (typeof window === 'undefined') return;
    
    // Initial check
    checkMobile();
    
    // Add resize listener
    window.addEventListener('resize', checkMobile);
    
    // Cleanup
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  const checkMobile = () => {
    const width = window.innerWidth;
    setIsMobile(width <= defaultConfig.breakpoints.mobile);
  };
  
  return isMobile;
}

/**
 * Hook to get the current device type (mobile, tablet, desktop)
 */
export function useDeviceType(config: ScreenSizeConfig = defaultConfig) {
  const [deviceType, setDeviceType] = useState<DeviceType>('desktop');
  
  useEffect(() => {
    // Check if window is available (for SSR)
    if (typeof window === 'undefined') return;
    
    // Initial check
    checkDeviceType();
    
    // Add resize listener
    window.addEventListener('resize', checkDeviceType);
    
    // Cleanup
    return () => window.removeEventListener('resize', checkDeviceType);
  }, []);
  
  const checkDeviceType = () => {
    const width = window.innerWidth;
    
    if (width <= config.breakpoints.mobile) {
      setDeviceType('mobile');
    } else if (width <= config.breakpoints.tablet) {
      setDeviceType('tablet');
    } else {
      setDeviceType('desktop');
    }
  };
  
  return deviceType;
}

/**
 * Utility function to apply device-specific styles
 * 
 * @example
 * const styles = getResponsiveStyles({
 *   mobile: { fontSize: '14px', padding: '10px' },
 *   tablet: { fontSize: '16px', padding: '15px' },
 *   desktop: { fontSize: '18px', padding: '20px' },
 * });
 */
export function getResponsiveStyles<T>(
  stylesByDevice: Record<DeviceType, T>,
  currentDevice: DeviceType
): T {
  return stylesByDevice[currentDevice];
}

/**
 * Component that only renders its children on specific device types
 */
export function DeviceTypeRenderer({
  children,
  deviceTypes,
}: {
  children: React.ReactNode;
  deviceTypes: DeviceType[];
}) {
  const deviceType = useDeviceType();
  
  // Only render if current device type is in the allowed list
  if (deviceTypes.includes(deviceType)) {
    return <>{children}</>;
  }
  
  return null;
}
