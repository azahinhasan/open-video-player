import { useEffect } from 'react';
import * as NavigationBar from 'expo-navigation-bar';

/**
 * Hides/shows the Android system navigation bar in step with `hidden`, using
 * overlay-swipe behavior so a deliberate edge-swipe can still peek it without
 * that being tracked as app state. Restores it to visible on unmount so
 * leaving the player never strands the rest of the app with a hidden bar.
 */
export function useImmersiveMode(hidden: boolean) {
  useEffect(() => {
    NavigationBar.setBehaviorAsync('overlay-swipe').catch(() => {});
  }, []);

  useEffect(() => {
    NavigationBar.setVisibilityAsync(hidden ? 'hidden' : 'visible').catch(() => {});
  }, [hidden]);

  useEffect(() => {
    return () => {
      NavigationBar.setVisibilityAsync('visible').catch(() => {});
    };
  }, []);
}
