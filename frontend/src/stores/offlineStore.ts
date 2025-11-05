import { create } from 'zustand';

interface OfflineState {
  isOffline: boolean;
  pendingEntries: number;
  setOffline: (value: boolean) => void;
  setPendingEntries: (count: number) => void;
}

const initialOffline = typeof navigator !== 'undefined' ? !navigator.onLine : false;

export const useOfflineStore = create<OfflineState>((set) => ({
  isOffline: initialOffline,
  pendingEntries: 0,
  setOffline: (value) => set({ isOffline: value }),
  setPendingEntries: (count) => set({ pendingEntries: count }),
}));
