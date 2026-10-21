import { create } from 'zustand';
import { guestStorage, type GuestSession } from '../lib/guest-storage';
import { hasUtmParams, parseUtmFromUrl, type UtmParams } from '../lib/utm';

interface GuestSessionState {
  session: GuestSession | null;
  /** Парсит UTM/ref из URL и сохраняет в гостевую сессию (если ещё нет). */
  captureFromUrl: (url?: string | null) => void;
  /** Возвращает текущие UTM-параметры (для подмешивания в analytics/register). */
  getUtm: () => UtmParams;
  clear: () => void;
}

export const useGuestSessionStore = create<GuestSessionState>((set, get) => ({
  session: guestStorage.get(),

  captureFromUrl: (url?: string | null) => {
    const existing = get().session;
    if (existing && hasUtmParams(existing.utm)) {
      return;
    }

    const utm = parseUtmFromUrl(url);
    if (!hasUtmParams(utm)) {
      return;
    }

    const session: GuestSession = {
      utm,
      createdAt: new Date().toISOString(),
    };
    guestStorage.set(session);
    set({ session });
  },

  getUtm: () => get().session?.utm ?? {},

  clear: () => {
    guestStorage.clear();
    set({ session: null });
  },
}));
