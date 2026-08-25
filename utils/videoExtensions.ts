export const VIDEO_EXTENSIONS = new Set([
  '.mp4',
  '.mkv',
  '.webm',
  '.3gp',
  '.mov',
  '.avi',
  '.ts',
]);

export function isVideoExtension(extension: string): boolean {
  return VIDEO_EXTENSIONS.has(extension.toLowerCase());
}

export function hashString(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (Math.imul(31, hash) + input.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(36);
}
