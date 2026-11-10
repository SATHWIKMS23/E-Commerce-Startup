import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { brandingService, BrandingData, DEFAULT_BRANDING, normalizeBranding } from '../services/branding.service';
import { STORAGE_KEYS } from '../services/api.service';

interface BrandingContextValue {
  branding: BrandingData;
  isLoading: boolean;
  refreshBranding: () => Promise<void>;
}

const BrandingContext = createContext<BrandingContextValue>({
  branding: DEFAULT_BRANDING,
  isLoading: false,
  refreshBranding: async () => {},
});

export const BrandingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [branding, setBranding] = useState<BrandingData>(DEFAULT_BRANDING);
  const [isLoading, setIsLoading] = useState(false);

  const loadCached = async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.BRANDING);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          setBranding(normalizeBranding(parsed));
        }
      }
    } catch {
      // Ignore cache read error
    }
  };

  const fetchLive = async () => {
    try {
      const live = await brandingService.fetchBranding();
      if (live && live.name) {
        setBranding(live);
        await AsyncStorage.setItem(STORAGE_KEYS.BRANDING, JSON.stringify(live));
      }
    } catch {
      // Use fallback
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCached().then(() => fetchLive());
  }, []);

  return (
    <BrandingContext.Provider
      value={{
        branding,
        isLoading,
        refreshBranding: fetchLive,
      }}
    >
      {children}
    </BrandingContext.Provider>
  );
};

export const useBranding = () => useContext(BrandingContext);
