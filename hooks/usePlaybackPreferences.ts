import { create } from 'zustand';

import {
  readPlaybackPreferences,
  writePlaybackPreferences,
  type ControlsLayout,
  type ResumeBehavior,
} from '@/utils/playbackPreferences';

type PlaybackPreferencesState = {
  resumeBehavior: ResumeBehavior;
  autoPlayNext: boolean;
  controlsLayout: ControlsLayout;
  setResumeBehavior: (behavior: ResumeBehavior) => void;
  setAutoPlayNext: (value: boolean) => void;
  setControlsLayout: (layout: ControlsLayout) => void;
};

const initial = readPlaybackPreferences();

export const usePlaybackPreferences = create<PlaybackPreferencesState>((set, get) => ({
  resumeBehavior: initial.resumeBehavior,
  autoPlayNext: initial.autoPlayNext,
  controlsLayout: initial.controlsLayout,
  setResumeBehavior: (resumeBehavior) => {
    set({ resumeBehavior });
    writePlaybackPreferences({ resumeBehavior, autoPlayNext: get().autoPlayNext, controlsLayout: get().controlsLayout });
  },
  setAutoPlayNext: (autoPlayNext) => {
    set({ autoPlayNext });
    writePlaybackPreferences({ resumeBehavior: get().resumeBehavior, autoPlayNext, controlsLayout: get().controlsLayout });
  },
  setControlsLayout: (controlsLayout) => {
    set({ controlsLayout });
    writePlaybackPreferences({ resumeBehavior: get().resumeBehavior, autoPlayNext: get().autoPlayNext, controlsLayout });
  },
}));
