import { useEffect } from 'react';
import * as ScreenOrientation from 'expo-screen-orientation';

export function useOrientationLock(orientation: ScreenOrientation.OrientationLock) {
  useEffect(() => {
    ScreenOrientation.lockAsync(orientation).catch(() => {});
    return () => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
    };
  }, [orientation]);
}
