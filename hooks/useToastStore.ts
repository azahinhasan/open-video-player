import { create } from 'zustand';

type ToastState = {
  message: string | null;
  /**
   * Bumped on every show() call, including repeats of the same message —
   * ToastHost keys its auto-dismiss timer off this rather than `message` so
   * showing the same text twice in a row still resets the visible window.
   */
  token: number;
  show: (message: string) => void;
};

export const useToastStore = create<ToastState>((set) => ({
  message: null,
  token: 0,
  show: (message) => set((s) => ({ message, token: s.token + 1 })),
}));
