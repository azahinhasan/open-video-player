import { File, Paths } from 'expo-file-system';

const PREFERENCE_FILE_NAME = 'subtitle-style-preference.json';

export type SubtitleFontSize = 'small' | 'medium' | 'large';
export type SubtitleBackgroundOpacity = 'off' | 'low' | 'medium' | 'high';

export type SubtitleStylePreference = {
  fontSize: SubtitleFontSize;
  bold: boolean;
  textColor: string;
  backgroundColor: string;
  backgroundOpacity: SubtitleBackgroundOpacity;
};

const DEFAULT_PREFERENCE: SubtitleStylePreference = {
  fontSize: 'medium',
  bold: false,
  textColor: '#FFFFFF',
  backgroundColor: '#000000',
  backgroundOpacity: 'medium',
};

const VALID_FONT_SIZES: SubtitleFontSize[] = ['small', 'medium', 'large'];
const VALID_OPACITIES: SubtitleBackgroundOpacity[] = ['off', 'low', 'medium', 'high'];
const HEX_COLOR_RE = /^#[0-9A-Fa-f]{6}$/;

function preferenceFile(): File {
  return new File(Paths.document, PREFERENCE_FILE_NAME);
}

export function readSubtitleStylePreference(): SubtitleStylePreference {
  try {
    const file = preferenceFile();
    if (!file.exists) {
      return { ...DEFAULT_PREFERENCE };
    }
    const parsed = JSON.parse(file.textSync());
    return {
      fontSize: VALID_FONT_SIZES.includes(parsed?.fontSize) ? parsed.fontSize : DEFAULT_PREFERENCE.fontSize,
      bold: typeof parsed?.bold === 'boolean' ? parsed.bold : DEFAULT_PREFERENCE.bold,
      textColor: HEX_COLOR_RE.test(parsed?.textColor) ? parsed.textColor : DEFAULT_PREFERENCE.textColor,
      backgroundColor: HEX_COLOR_RE.test(parsed?.backgroundColor)
        ? parsed.backgroundColor
        : DEFAULT_PREFERENCE.backgroundColor,
      backgroundOpacity: VALID_OPACITIES.includes(parsed?.backgroundOpacity)
        ? parsed.backgroundOpacity
        : DEFAULT_PREFERENCE.backgroundOpacity,
    };
  } catch {
    return { ...DEFAULT_PREFERENCE };
  }
}

export function writeSubtitleStylePreference(preference: SubtitleStylePreference): void {
  try {
    preferenceFile().write(JSON.stringify(preference));
  } catch {
    // Best-effort persistence — a failed write just means it resets next launch.
  }
}
