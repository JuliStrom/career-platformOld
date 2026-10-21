import { Platform } from 'react-native';
import type { UtmParams } from './utm';

const GUEST_SESSION_KEY = 'guest_session';

export interface GuestSession {
  utm: UtmParams;
  createdAt: string;
}

/**
 * Хранилище гостевой сессии (UTM/реферальный код).
 * На web — localStorage, на native — AsyncStorage-совместимый fallback через SecureStore не нужен:
 * UTM не секретны, поэтому используем localStorage на web и in-memory на native до появления AsyncStorage.
 */
export const guestStorage = {
  get(): GuestSession | null {
    if (Platform.OS !== 'web' || typeof window === 'undefined') {
      return null;
    }
    try {
      const raw = localStorage.getItem(GUEST_SESSION_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as GuestSession;
    } catch {
      return null;
    }
  },

  set(session: GuestSession): void {
    if (Platform.OS !== 'web' || typeof window === 'undefined') {
      return;
    }
    try {
      localStorage.setItem(GUEST_SESSION_KEY, JSON.stringify(session));
    } catch {
      // ignore
    }
  },

  clear(): void {
    if (Platform.OS !== 'web' || typeof window === 'undefined') {
      return;
    }
    try {
      localStorage.removeItem(GUEST_SESSION_KEY);
    } catch {
      // ignore
    }
  },
};
