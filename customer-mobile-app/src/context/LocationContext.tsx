import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../services/api.service';
import { locationService, StateInfo } from '../services/location.service';

interface LocationContextValue {
  selectedAddressId: string | null;
  selectedState: string;
  selectedDistrict: string;
  setLocation: (addressId: string | null, state: string, district: string) => Promise<void>;
  addressSelectorOpen: boolean;
  setAddressSelectorOpen: (open: boolean) => void;
  comingSoonOpen: boolean;
  comingSoonState: string;
  comingSoonDistrict?: string;
  setComingSoon: (open: boolean, stateName?: string, districtName?: string) => void;
  activeStates: StateInfo[];
  allStates: StateInfo[];
  districtRequired: boolean;
}

const LocationContext = createContext<LocationContextValue>({
  selectedAddressId: null,
  selectedState: 'Karnataka',
  selectedDistrict: 'Mysuru',
  setLocation: async () => {},
  addressSelectorOpen: false,
  setAddressSelectorOpen: () => {},
  comingSoonOpen: false,
  comingSoonState: '',
  setComingSoon: () => {},
  activeStates: [],
  allStates: [],
  districtRequired: true,
});

export const LocationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [selectedState, setSelectedState] = useState<string>('Karnataka');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('Mysuru');
  const [addressSelectorOpen, setAddressSelectorOpen] = useState(false);
  const [comingSoonOpen, setComingSoonOpen] = useState(false);
  const [comingSoonState, setComingSoonState] = useState('');
  const [comingSoonDistrict, setComingSoonDistrict] = useState<string | undefined>(undefined);
  const [activeStates, setActiveStates] = useState<StateInfo[]>([]);
  const [allStates, setAllStates] = useState<StateInfo[]>([]);
  const [districtRequired, setDistrictRequired] = useState(true);

  useEffect(() => {
    const initLocation = async () => {
      try {
        const storedState = await AsyncStorage.getItem(STORAGE_KEYS.LOCATION_STATE);
        const storedDistrict = await AsyncStorage.getItem(STORAGE_KEYS.LOCATION_DISTRICT);
        const storedAddrId = await AsyncStorage.getItem(STORAGE_KEYS.LOCATION_ADDRESS_ID);

        if (storedState) setSelectedState(storedState);
        if (storedDistrict) setSelectedDistrict(storedDistrict);
        if (storedAddrId) setSelectedAddressId(storedAddrId);

        // Fetch operational states
        const config = await locationService.getStates();
        setActiveStates(config.states.filter((s) => s.isEnabled));
        setAllStates(config.allStates);
        setDistrictRequired(config.districtRequired);

        if (!storedState && config.states.length > 0) {
          const first = config.states[0].name;
          setSelectedState(first);
          await AsyncStorage.setItem(STORAGE_KEYS.LOCATION_STATE, first);
        }
      } catch {
        // Fallback defaults
      }
    };
    initLocation();
  }, []);

  const setLocation = async (addressId: string | null, state: string, district: string) => {
    setSelectedAddressId(addressId);
    setSelectedState(state);
    setSelectedDistrict(district);

    try {
      if (addressId) {
        await AsyncStorage.setItem(STORAGE_KEYS.LOCATION_ADDRESS_ID, addressId);
      } else {
        await AsyncStorage.removeItem(STORAGE_KEYS.LOCATION_ADDRESS_ID);
      }
      await AsyncStorage.setItem(STORAGE_KEYS.LOCATION_STATE, state);
      await AsyncStorage.setItem(STORAGE_KEYS.LOCATION_DISTRICT, district);
    } catch {
      // Ignore storage error
    }
  };

  const setComingSoon = (open: boolean, stateName: string = '', districtName?: string) => {
    setComingSoonOpen(open);
    setComingSoonState(stateName);
    setComingSoonDistrict(districtName);
  };

  return (
    <LocationContext.Provider
      value={{
        selectedAddressId,
        selectedState,
        selectedDistrict,
        setLocation,
        addressSelectorOpen,
        setAddressSelectorOpen,
        comingSoonOpen,
        comingSoonState,
        comingSoonDistrict,
        setComingSoon,
        activeStates,
        allStates,
        districtRequired,
      }}
    >
      {children}
    </LocationContext.Provider>
  );
};

export const useLocation = () => useContext(LocationContext);
