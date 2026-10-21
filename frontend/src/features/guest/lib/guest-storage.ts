import { Platform } from 'react-native';
import type { UtmParams } from './utm';
import * as SecureStore from 'expo-secure-store';

const GUEST_SESSION_KEY = 'guest_session';

export interface GuestSession {
  guestId?: string;
  linkedUserId?: string;
  retentionDays?: number;
  utm: UtmParams;
  createdAt: string;
}

/**
 * Хранилище гостевой сессии (UTM/реферальный код).
 * На web — localStorage, на native — SecureStore для гостевого идентификатора.
 * Черновики дополнительно синхронизируются с сервером через GuestSessionBridge.
 */
export const guestStorage = {
  getDraft(guestId: string): unknown {
    try {
      if (typeof localStorage === 'undefined') return null;
      const cached = JSON.parse(
        localStorage.getItem(`guest_draft_${guestId}`) || 'null'
      );
      if (cached?.expiresAt && cached.expiresAt <= Date.now()) {
        localStorage.removeItem(`guest_draft_${guestId}`);
        return null;
      }
      return cached?.data ?? null;
    } catch {
      return null;
    }
  },
  setDraft(guestId: string, draft: unknown): void {
    try {
      const session = this.get();
      const expiresAt = session?.linkedUserId
        ? null
        : Date.parse(session?.createdAt || '') +
          (session?.retentionDays ?? 30) * 86400000;
      if (typeof localStorage !== 'undefined')
        localStorage.setItem(
          `guest_draft_${guestId}`,
          JSON.stringify({ data: draft, expiresAt })
        );
    } catch {
      /* Server synchronization remains available. */
    }
  },
  async load(): Promise<GuestSession | null> {
    if (Platform.OS === 'web') return this.get();
    try {
      return JSON.parse(
        (await SecureStore.getItemAsync(GUEST_SESSION_KEY)) || 'null'
      );
    } catch {
      return null;
    }
  },
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

  set(session: GuestSession): void | Promise<void> {
    if (Platform.OS !== 'web') {
      return SecureStore.setItemAsync(
        GUEST_SESSION_KEY,
        JSON.stringify(session)
      );
    }
    if (typeof window === 'undefined') {
      return;
    }
    try {
      localStorage.setItem(GUEST_SESSION_KEY, JSON.stringify(session));
    } catch {
      // ignore
    }
  },

  clear(): void {
    const previous = this.get();
    try {
      if (previous?.guestId && typeof localStorage !== 'undefined')
        localStorage.removeItem(`guest_draft_${previous.guestId}`);
    } catch {
      /* Storage can be disabled. */
    }
    if (Platform.OS !== 'web') {
      void SecureStore.deleteItemAsync(GUEST_SESSION_KEY);
      return;
    }
    if (typeof window === 'undefined') {
      return;
    }
    try {
      localStorage.removeItem(GUEST_SESSION_KEY);
    } catch {
      // ignore
    }
  },
};
