import { create } from 'zustand';
import { guestStorage, type GuestSession } from '../lib/guest-storage';
import { parseUtmFromUrl, type UtmParams } from '../lib/utm';
import { getRandomBytesAsync } from 'expo-crypto';
import { Platform } from 'react-native';
import * as Linking from 'expo-linking';

interface GuestSessionState {
  session: GuestSession | null;
  /** Парсит UTM/ref из URL и сохраняет в гостевую сессию (если ещё нет). */
  captureFromUrl: (url?: string | null) => void;
  /** Возвращает текущие UTM-параметры (для подмешивания в analytics/register). */
  getUtm: () => UtmParams;
  clear: () => void;
  ensure: () => Promise<GuestSession>;
}

export const useGuestSessionStore = create<GuestSessionState>((set, get) => ({
  session: guestStorage.get(),

  captureFromUrl: (url?: string | null) => {
    if (Platform.OS !== 'web') return;
    const existing = get().session;
    if (existing) {
      return;
    }

    const utm = parseUtmFromUrl(url);

    const session: GuestSession = {
      utm,
      createdAt: new Date().toISOString(),
    };
    guestStorage.set(session);
    set({ session });
  },

  getUtm: () => get().session?.utm ?? {},
  ensure: async () => {
    if (initializing) return initializing;
    initializing = (async () => {
      let session =
        get().session ??
        (ignoreStoredSession ? null : await guestStorage.load());
      if (
        session &&
        Date.now() - Date.parse(session.createdAt) >
          (session.retentionDays ?? 30) * 86400000 &&
        !session.linkedUserId
      ) {
        guestStorage.clear();
        session = null;
      }
      if (!session)
        session = {
          utm: parseUtmFromUrl(
            Platform.OS === 'web' ? undefined : await Linking.getInitialURL()
          ),
          createdAt: new Date().toISOString(),
        };
      if (!session.guestId) {
        const bytes = await getRandomBytesAsync(32);
        session = {
          ...session,
          guestId: Array.from(bytes, (b) =>
            b.toString(16).padStart(2, '0')
          ).join(''),
        };
      }
      await guestStorage.set(session);
      ignoreStoredSession = false;
      set({ session });
      return session;
    })();
    try {
      return await initializing;
    } finally {
      initializing = null;
    }
  },

  clear: () => {
    ignoreStoredSession = true;
    guestStorage.clear();
    set({ session: null });
  },
}));
let initializing: Promise<GuestSession> | null = null;
let ignoreStoredSession = false;
