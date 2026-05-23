import { create } from 'zustand';

export const useLoadingStore = create((set) => ({
  isLoading: false,
  setLoading: (status) => set({ isLoading: status }),
}));