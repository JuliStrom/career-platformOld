import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import type { AnalysisAccess } from '../model/analysis';

interface State {
  access: AnalysisAccess | null;
  pendingUnlock: boolean;
  setAccess: (access: AnalysisAccess) => void;
  setPendingUnlock: (pending: boolean) => void;
}
export const useAnalysisStore = create<State>()(
  persist(
    (set) => ({
      access: null,
      pendingUnlock: false,
      setAccess: (access) => set({ access, pendingUnlock: false }),
      setPendingUnlock: (pendingUnlock) => set({ pendingUnlock }),
    }),
    {
      name: 'resume-analysis-access',
      storage: createJSONStorage(() => ({
        getItem: (key) => {
          if (Platform.OS !== 'web') return SecureStore.getItemAsync(key);
          try {
            return typeof sessionStorage === 'undefined'
              ? null
              : sessionStorage.getItem(key);
          } catch {
            return null;
          }
        },
        setItem: (key, value) => {
          if (Platform.OS === 'web') {
            try {
              if (typeof sessionStorage !== 'undefined')
                sessionStorage.setItem(key, value);
            } catch {
              /* The current in-memory session still works when storage is blocked. */
            }
          } else return SecureStore.setItemAsync(key, value);
        },
        removeItem: (key) => {
          if (Platform.OS === 'web') {
            try {
              if (typeof sessionStorage !== 'undefined')
                sessionStorage.removeItem(key);
            } catch {
              /* Storage may be disabled by browser policy. */
            }
          } else return SecureStore.deleteItemAsync(key);
        },
      })),
    }
  )
);
