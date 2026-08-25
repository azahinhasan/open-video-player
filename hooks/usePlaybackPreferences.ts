import { create } from 'zustand';

import {
  readPlaybackPreferences,
  writePlaybackPreferences,
  type ResumeBehavior,
} from '@/utils/playbackPreferences';

type PlaybackPreferencesState = {
  resumeBehavior: ResumeBehavior;
  autoPlayNext: boolean;
  setResumeBehavior: (behavior: ResumeBehavior) => void;
  setAutoPlayNext: (value: boolean) => void;
};

const initial = readPlaybackPreferences();

export const usePlaybackPreferences = create<PlaybackPreferencesState>((set, get) => ({
  resumeBehavior: initial.resumeBehavior,
  autoPlayNext: initial.autoPlayNext,
  setResumeBehavior: (resumeBehavior) => {
    set({ resumeBehavior });
    writePlaybackPreferences({ resumeBehavior, autoPlayNext: get().autoPlayNext });
  },
  setAutoPlayNext: (autoPlayNext) => {
    set({ autoPlayNext });
    writePlaybackPreferences({ resumeBehavior: get().resumeBehavior, autoPlayNext });
  },
}));
