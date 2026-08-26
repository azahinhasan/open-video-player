export type VideoAsset = {
  id: string;
  uri: string;
  filename: string;
  modificationTime: number | null;
  creationTime: number | null;
  duration: number | null;
  width: number;
  height: number;
  thumbnailUri: string | null;
  folderId: string;
};

export type VideoFolder = {
  id: string;
  name: string;
  videoCount: number;
  thumbnailUri: string | null;
};
