import { create } from 'zustand';
import { db } from './db';

interface SyncState {
  pending: number;
  online: boolean;
  syncing: boolean;
  refresh: () => Promise<void>;
  setOnline: (v: boolean) => void;
  setSyncing: (v: boolean) => void;
}

export const useSyncStore = create<SyncState>((set) => ({
  pending: 0,
  online: typeof navigator !== 'undefined' ? navigator.onLine : true,
  syncing: false,
  refresh: async () => {
    const count = await db.mutations.count();
    set({ pending: count });
  },
  setOnline: (online) => set({ online }),
  setSyncing: (syncing) => set({ syncing }),
}));
