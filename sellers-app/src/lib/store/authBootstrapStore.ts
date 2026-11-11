import { create } from 'zustand';

// Tracks whether the initial auth bootstrap has completed.
// The profile query in useAuth must not fire until this bootstrap settles.
interface AuthBootstrapStore {
  bootstrapped: boolean;
  setBootstrapped: (value: boolean) => void;
}

export const useAuthBootstrapStore = create<AuthBootstrapStore>((set) => ({
  bootstrapped: false,
  setBootstrapped: (value) => set({ bootstrapped: value }),
}));
