export interface VideoFormat {
  formatId: string;
  ext: string;
  resolution: string;
  filesize: number | null;
  filesizeApprox: number | null;
  fps: number | null;
  vcodec: string;
  acodec: string;
  qualityLabel: string | null;
  hasVideo: boolean;
  hasAudio: boolean;
}

export interface VideoInfo {
  id: string;
  title: string;
  thumbnail: string;
  duration: number; // in seconds
  durationString: string;
  uploader: string;
  viewCount: number | null;
  uploadDate: string | null;
  formats: VideoFormat[];
}

export interface DownloadProgress {
  downloadId: string;
  status: 'pending' | 'downloading' | 'merging' | 'completed' | 'failed';
  percent: number;
  speed: string;
  eta: string;
  totalSize: string;
  filePath?: string;
  fileName?: string;
  error?: string;
}
