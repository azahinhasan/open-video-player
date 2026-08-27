import { create } from 'zustand';

import {
  readPlaybackPreferences,
  writePlaybackPreferences,
  type ControlsLayout,
  type DefaultOrientation,
  type ResumeBehavior,
} from '@/utils/playbackPreferences';

type PlaybackPreferencesState = {
  resumeBehavior: ResumeBehavior;
  autoPlayNext: boolean;
  controlsLayout: ControlsLayout;
  defaultOrientation: DefaultOrientation;
  setResumeBehavior: (behavior: ResumeBehavior) => void;
  setAutoPlayNext: (value: boolean) => void;
  setControlsLayout: (layout: ControlsLayout) => void;
  setDefaultOrientation: (orientation: DefaultOrientation) => void;
};

const initial = readPlaybackPreferences();

export const usePlaybackPreferences = create<PlaybackPreferencesState>((set, get) => ({
  resumeBehavior: initial.resumeBehavior,
  autoPlayNext: initial.autoPlayNext,
  controlsLayout: initial.controlsLayout,
  defaultOrientation: initial.defaultOrientation,
  setResumeBehavior: (resumeBehavior) => {
    set({ resumeBehavior });
    writePlaybackPreferences({
      resumeBehavior,
      autoPlayNext: get().autoPlayNext,
      controlsLayout: get().controlsLayout,
      defaultOrientation: get().defaultOrientation,
    });
  },
  setAutoPlayNext: (autoPlayNext) => {
    set({ autoPlayNext });
    writePlaybackPreferences({
      resumeBehavior: get().resumeBehavior,
      autoPlayNext,
      controlsLayout: get().controlsLayout,
      defaultOrientation: get().defaultOrientation,
    });
  },
  setControlsLayout: (controlsLayout) => {
    set({ controlsLayout });
    writePlaybackPreferences({
      resumeBehavior: get().resumeBehavior,
      autoPlayNext: get().autoPlayNext,
      controlsLayout,
      defaultOrientation: get().defaultOrientation,
    });
  },
  setDefaultOrientation: (defaultOrientation) => {
    set({ defaultOrientation });
    writePlaybackPreferences({
      resumeBehavior: get().resumeBehavior,
      autoPlayNext: get().autoPlayNext,
      controlsLayout: get().controlsLayout,
      defaultOrientation,
    });
  },
}));
