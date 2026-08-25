import * as Notifications from 'expo-notifications';

const SCAN_CHANNEL_ID = 'library-scan';
let channelReady = false;
let permissionChecked = false;

/**
 * Sets up a dedicated, low-importance Android notification channel for scan
 * progress — no sound/vibration, so it reads as a background status like
 * VLC's "scanning media library" notification rather than an alert.
 */
async function ensureScanChannel(): Promise<void> {
  if (channelReady) {
    return;
  }
  channelReady = true;
  try {
    await Notifications.setNotificationChannelAsync(SCAN_CHANNEL_ID, {
      name: 'Library scan',
      importance: Notifications.AndroidImportance.LOW,
      enableVibrate: false,
      showBadge: false,
    });
  } catch {
    // Best-effort — a missing channel just means no scan notification, not a broken app.
  }
}

/**
 * Requests notification permission at most once per app session. Never
 * throws and never blocks the scan itself — if the user declines, or the
 * platform can't show notifications, scanning just proceeds silently.
 */
async function hasNotificationPermission(): Promise<boolean> {
  try {
    const existing = await Notifications.getPermissionsAsync();
    if (existing.granted) {
      return true;
    }
    if (permissionChecked) {
      // Already asked once this session — Android won't let us prompt again
      // after a decline, so don't keep retrying.
      return false;
    }
    permissionChecked = true;
    const response = await Notifications.requestPermissionsAsync();
    return response.granted;
  } catch {
    return false;
  }
}

/**
 * Shows an ongoing, silent "scanning your videos" notification, mirroring
 * how VLC surfaces its background library scan. Returns the notification id
 * to pass to `dismissScanNotification`, or null if it couldn't be shown
 * (permission denied, platform unsupported, etc.) — callers should treat
 * that as a no-op, never as a reason to skip or slow down the actual scan.
 */
export async function showScanNotification(): Promise<string | null> {
  try {
    if (!(await hasNotificationPermission())) {
      return null;
    }
    await ensureScanChannel();
    return await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Open Video Player',
        body: 'Scanning your videos…',
        sound: false,
        priority: Notifications.AndroidNotificationPriority.LOW,
        sticky: true,
        autoDismiss: false,
      },
      trigger: { channelId: SCAN_CHANNEL_ID },
    });
  } catch {
    return null;
  }
}

export async function dismissScanNotification(notificationId: string | null): Promise<void> {
  if (!notificationId) {
    return;
  }
  try {
    await Notifications.dismissNotificationAsync(notificationId);
  } catch {
    // Best-effort — a notification left behind briefly is harmless.
  }
}
