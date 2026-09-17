import { create } from 'zustand';

const TOAST_DURATION_MS = 2500;

export interface ToastPayload {
  message: string;
  actionLabel?: string;
  actionHref?: string;
}

interface ToastState extends ToastPayload {
  visible: boolean;
  show: (payload: ToastPayload) => void;
  hide: () => void;
}

let hideTimer: ReturnType<typeof setTimeout> | null = null;

export const useToastStore = create<ToastState>((set) => ({
  visible: false,
  message: '',
  actionLabel: undefined,
  actionHref: undefined,
  show: ({ message, actionLabel, actionHref }) => {
    if (hideTimer) {
      clearTimeout(hideTimer);
    }
    set({ visible: true, message, actionLabel, actionHref });
    hideTimer = setTimeout(() => {
      set({ visible: false });
      hideTimer = null;
    }, TOAST_DURATION_MS);
  },
  hide: () => {
    if (hideTimer) {
      clearTimeout(hideTimer);
      hideTimer = null;
    }
    set({ visible: false });
  },
}));

export function showToast(payload: ToastPayload): void {
  useToastStore.getState().show(payload);
}
