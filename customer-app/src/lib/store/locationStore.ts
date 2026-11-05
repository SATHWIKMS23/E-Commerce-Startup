import { create } from 'zustand';

interface LocationState {
  comingSoonOpen: boolean;
  comingSoonState: string;
  comingSoonDistrict?: string;
  onChooseAnotherState?: () => void;
  onClose?: () => void;
  setComingSoon: (
    open: boolean,
    stateName?: string,
    districtName?: string,
    onChooseAnother?: () => void,
    onClose?: () => void
  ) => void;
  activeStates: string[];
  districtRequired: boolean;
  setActiveStatesData: (states: string[], districtRequired: boolean) => void;
  // Selected location tracking
  selectedAddressId: string | null;
  selectedState: string;
  selectedDistrict: string;
  addressSelectorOpen: boolean;
  setAddressSelectorOpen: (open: boolean) => void;
  setLocation: (addressId: string | null, state: string, district: string) => void;
}

export const useLocationStore = create<LocationState>((set) => ({
  comingSoonOpen: false,
  comingSoonState: '',
  comingSoonDistrict: '',
  setComingSoon: (open, stateName = '', districtName = '', onChooseAnother, onClose) => 
    set({ 
      comingSoonOpen: open, 
      comingSoonState: stateName, 
      comingSoonDistrict: districtName,
      onChooseAnotherState: onChooseAnother, 
      onClose: onClose 
    }),
  activeStates: [],
  districtRequired: true,
  setActiveStatesData: (states, districtRequired) => set({ activeStates: states, districtRequired }),
  // Selected location tracking initial values
  selectedAddressId: null,
  selectedState: 'Karnataka',
  selectedDistrict: 'Mysuru',
  addressSelectorOpen: false,
  setAddressSelectorOpen: (open) => set({ addressSelectorOpen: open }),
  setLocation: (addressId, state, district) => 
    set({ 
      selectedAddressId: addressId, 
      selectedState: state, 
      selectedDistrict: district 
    }),
}));

