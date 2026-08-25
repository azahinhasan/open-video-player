export function hslToHex(h: number, s: number, l: number): string {
  const sat = s / 100;
  const light = l / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = sat * Math.min(light, 1 - light);
  const f = (n: number) => light - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toHex = (x: number) =>
    Math.round(x * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
}

export function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  const delta = max - min;
  if (delta !== 0) {
    s = delta / (1 - Math.abs(2 * l - 1));
    switch (max) {
      case r:
        h = ((g - b) / delta) % 6;
        break;
      case g:
        h = (b - r) / delta + 2;
        break;
      default:
        h = (r - g) / delta + 4;
        break;
    }
    h *= 60;
    if (h < 0) {
      h += 360;
    }
  }
  return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
}

/**
 * Slightly lighter/more saturated variant of an accent color, for a
 * pressed/active state. Calibrated to match the Tomato Rail spec's literal
 * accentHover (#E64536 -> #F0523F) so it generalizes to any chosen accent.
 */
export function accentHoverColor(hex: string): string {
  const { h, s, l } = hexToHsl(hex);
  return hslToHex(h, Math.min(100, s + 8), Math.min(100, l + 4));
}

/**
 * Very dark, low-lightness tint of an accent color, for backgrounds behind
 * accent-colored text/badges (e.g. a selected chip fill). Calibrated to
 * match the Tomato Rail spec's literal accentMuted (#E64536 -> #3A1712).
 */
export function accentMutedColor(hex: string): string {
  const { h, s } = hexToHsl(hex);
  return hslToHex(h, Math.max(0, s - 25), 15);
}
