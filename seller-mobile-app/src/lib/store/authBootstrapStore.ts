import { create } from 'zustand';

interface AuthBootstrapStore {
  bootstrapped: boolean;
  setBootstrapped: (value: boolean) => void;
}

export const useAuthBootstrapStore = create<AuthBootstrapStore>((set) => ({
  bootstrapped: false,
  setBootstrapped: (value) => set({ bootstrapped: value }),
}));
