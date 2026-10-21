import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { useAuthStore } from '@/features/auth/store/auth.store';
import {
  ensureServerGuest,
  readGuestDraft,
  saveGuestDraft,
} from '../api/session';
import { useAnalysisStore } from '../store/analysis.store';
import { useResumeUploadStore } from '../store/resume-upload.store';
import { useNoResumeStore } from '../store/no-resume.store';
import { transferGuestAnalyses } from '../api/analysis';
import { useTranslation } from '@/shared/lib/hooks/useTranslation';
import { guestStorage } from '../lib/guest-storage';

/** Runs for every auth method and direct entry page, with retry after connectivity returns. */
export function GuestSessionBridge() {
  const userId = useAuthStore((state) =>
    state.isAuthenticated ? state.user?.id : undefined
  );
  const access = useAnalysisStore((state) => state.access);
  const { currentLanguage } = useTranslation('guest');
  const previousUser = useRef(userId);
  const pendingDirty = useRef(false);
  useEffect(() => {
    if (previousUser.current && !userId) {
      useNoResumeStore.setState({
        draft: useNoResumeStore.getInitialState().draft,
      });
      pendingDirty.current = false;
    }
    previousUser.current = userId;
    let active = true;
    let running = false;
    let loaded = false;
    let dirty = pendingDirty.current;
    pendingDirty.current = false;
    let guestId: string | null = null;
    let debounce: ReturnType<typeof setTimeout>;
    const snapshot = () => ({
      language: currentLanguage,
      upload: useResumeUploadStore.getState().form,
      builder: useNoResumeStore.getState().draft,
    });
    const save = () => {
      dirty = true;
      if (guestId) guestStorage.setDraft(guestId, snapshot());
      clearTimeout(debounce);
      if (!loaded || !active) return;
      debounce = setTimeout(() => {
        if (!active) return;
        void saveGuestDraft(snapshot(), !!userId, guestId).catch(() => {
          dirty = true;
        });
      }, 1000);
    };
    const stopUpload = useResumeUploadStore.subscribe(save);
    const stopBuilder = useNoResumeStore.subscribe(save);
    const sync = async () => {
      if (!active || running) return;
      running = true;
      try {
        guestId = await ensureServerGuest();
        if (active && userId) {
          await transferGuestAnalyses(userId);
          guestId = await ensureServerGuest();
        }
        if (!active) return;
        if (!loaded) {
          const cached = guestStorage.getDraft(guestId);
          const draft = cached || (await readGuestDraft(!!userId));
          if (!active) return;
          if (draft && typeof draft === 'object' && !dirty) {
            const restored = draft as ReturnType<typeof snapshot>;
            if (restored.upload)
              useResumeUploadStore.setState({
                form: {
                  ...restored.upload,
                  // Browsers cannot restore a local File handle after a reload.
                  fileName: useResumeUploadStore.getState().file?.name ?? null,
                  fileSize: useResumeUploadStore.getState().file?.size ?? null,
                },
              });
            if (restored.builder)
              useNoResumeStore.setState({ draft: restored.builder });
          }
          loaded = true;
        }
        if (dirty) {
          await saveGuestDraft(snapshot(), !!userId, guestId);
          dirty = false;
        }
      } catch {
        /* Retried automatically; never discard an untransferred guest session. */
      } finally {
        running = false;
      }
    };
    void sync();
    const timer = setInterval(() => {
      void sync();
    }, 30000);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void sync();
    });
    return () => {
      pendingDirty.current = dirty;
      active = false;
      clearInterval(timer);
      clearTimeout(debounce);
      subscription.remove();
      stopUpload();
      stopBuilder();
    };
  }, [userId, access, currentLanguage]);
  return null;
}
