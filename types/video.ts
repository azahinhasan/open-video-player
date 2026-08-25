export type VideoAsset = {
  id: string;
  uri: string;
  filename: string;
  sizeBytes: number;
  modificationTime: number | null;
  duration: number | null;
  thumbnailUri: string | null;
  subtitleUri: string | null;
};
