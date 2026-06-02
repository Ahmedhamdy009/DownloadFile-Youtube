import { spawn, exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import { Server } from 'socket.io';
import { VideoInfo, VideoFormat, DownloadProgress } from '../types';

const isWindows = process.platform === 'win32';
const rootDir = process.cwd();

// Paths to binaries
export const getDlpPath = (): string => {
  const localPath = path.join(rootDir, 'yt-dlp.exe');
  if (isWindows && fs.existsSync(localPath)) {
    return localPath;
  }
  return 'yt-dlp';
};

export const getFfmpegPath = (): string => {
  const localPath = path.join(rootDir, 'ffmpeg.exe');
  if (isWindows && fs.existsSync(localPath)) {
    return localPath;
  }
  return 'ffmpeg';
};

// Temp downloads dir
export const getDownloadsDir = (): string => {
  const dir = path.join(rootDir, 'downloads');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
};

// Helper: Format seconds to HH:MM:SS
const formatDuration = (seconds: number): string => {
  if (!seconds) return '00:00';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hrs > 0) {
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

// Fetch Video Info
export const fetchVideoInfo = (url: string): Promise<VideoInfo> => {
  return new Promise((resolve, reject) => {
    const dlpPath = getDlpPath();
    const args = ['--dump-json', '--flat-playlist', '--no-warnings', url];
    
    let stdoutData = '';
    let stderrData = '';
    
    const child = spawn(dlpPath, args);
    
    child.stdout.on('data', (data) => {
      stdoutData += data.toString();
    });
    
    child.stderr.on('data', (data) => {
      stderrData += data.toString();
    });
    
    child.on('close', (code) => {
      if (code !== 0) {
        console.error(`yt-dlp info error (code ${code}):`, stderrData);
        return reject(new Error('Failed to retrieve video information. Please ensure the URL is valid.'));
      }
      
      try {
        const parsed = JSON.parse(stdoutData);
        
        // Map formats
        const formats: VideoFormat[] = (parsed.formats || []).map((f: any) => ({
          formatId: f.format_id || '',
          ext: f.ext || '',
          resolution: f.resolution || (f.height ? `${f.height}p` : 'audio'),
          filesize: f.filesize || null,
          filesizeApprox: f.filesize_approx || null,
          fps: f.fps || null,
          vcodec: f.vcodec || '',
          acodec: f.acodec || '',
          qualityLabel: f.format_note || null,
          hasVideo: f.vcodec !== 'none' && f.vcodec !== undefined,
          hasAudio: f.acodec !== 'none' && f.acodec !== undefined,
        }));
        
        const videoInfo: VideoInfo = {
          id: parsed.id || '',
          title: parsed.title || 'Unknown Title',
          thumbnail: parsed.thumbnail || (parsed.thumbnails && parsed.thumbnails.length ? parsed.thumbnails[parsed.thumbnails.length - 1].url : ''),
          duration: parsed.duration || 0,
          durationString: formatDuration(parsed.duration || 0),
          uploader: parsed.uploader || 'Unknown Channel',
          viewCount: parsed.view_count || null,
          uploadDate: parsed.upload_date || null,
          formats,
        };
        
        resolve(videoInfo);
      } catch (err) {
        reject(new Error('Error parsing video metadata.'));
      }
    });
  });
};

// Map of active progress to monitor from Express / Socket.io
export const activeDownloads = new Map<string, DownloadProgress>();

// Execute Download
export const executeDownload = (
  downloadId: string,
  url: string,
  format: 'mp3' | 'mp4',
  quality: string, // e.g. '1080', '720', 'best' for MP4 or 'best' for MP3
  io: Server
): void => {
  const dlpPath = getDlpPath();
  const ffmpegPath = getFfmpegPath();
  const downloadsDir = getDownloadsDir();
  
  // Set initial progress
  const progress: DownloadProgress = {
    downloadId,
    status: 'pending',
    percent: 0,
    speed: '0 KiB/s',
    eta: '--:--',
    totalSize: 'Calculating...',
  };
  
  activeDownloads.set(downloadId, progress);
  io.to(downloadId).emit('progress', progress);
  
  let args: string[] = [];
  let fileExtension = 'mp4';
  
  if (format === 'mp3') {
    fileExtension = 'mp3';
    args = [
      '-x',
      '--audio-format', 'mp3',
      '--audio-quality', '0',
      '--ffmpeg-location', ffmpegPath,
      '-o', path.join(downloadsDir, `${downloadId}.%(ext)s`),
      url
    ];
  } else {
    // Quality selector
    let formatSelector = 'bestvideo+bestaudio/best';
    if (quality && quality !== 'best') {
      const height = parseInt(quality, 10);
      if (!isNaN(height)) {
        formatSelector = `bestvideo[height<=${height}]+bestaudio/best[height<=${height}]`;
      }
    }
    
    args = [
      '-f', formatSelector,
      '--merge-output-format', 'mp4',
      '--ffmpeg-location', ffmpegPath,
      '-o', path.join(downloadsDir, `${downloadId}.%(ext)s`),
      url
    ];
  }
  
  console.log(`Starting download ${downloadId} with arguments:`, args.join(' '));
  
  const child = spawn(dlpPath, args);
  progress.status = 'downloading';
  
  const progressRegex = /\[download\]\s+(\d+(?:\.\d+)?)%\s+of\s+(?:~\s*)?(\S+)\s+at\s+(\S+)\s+ETA\s+(\S+)/;
  
  child.stdout.on('data', (data) => {
    const line = data.toString().trim();
    
    // Check if merging
    if (line.includes('[Merger]') || line.includes('Merging formats')) {
      progress.status = 'merging';
      progress.percent = 99;
      io.to(downloadId).emit('progress', progress);
      return;
    }
    
    // Parse progress regex
    const match = line.match(progressRegex);
    if (match) {
      const percent = parseFloat(match[1]);
      const totalSize = match[2];
      const speed = match[3];
      const eta = match[4];
      
      progress.percent = percent;
      progress.totalSize = totalSize;
      progress.speed = speed;
      progress.eta = eta;
      progress.status = 'downloading';
      
      activeDownloads.set(downloadId, progress);
      io.to(downloadId).emit('progress', progress);
    }
  });
  
  child.stderr.on('data', (data) => {
    console.error(`[download ${downloadId} stderr]:`, data.toString());
  });
  
  child.on('close', (code) => {
    if (code !== 0) {
      console.error(`Download process exited with code ${code}`);
      progress.status = 'failed';
      progress.error = 'Download failed. Check the URL and selected formats.';
      activeDownloads.set(downloadId, progress);
      io.to(downloadId).emit('progress', progress);
      return;
    }
    
    // Verify file exists
    const finalFile = path.join(downloadsDir, `${downloadId}.${fileExtension}`);
    if (fs.existsSync(finalFile)) {
      progress.status = 'completed';
      progress.percent = 100;
      progress.filePath = `/api/files/${downloadId}`;
      progress.fileName = `${downloadId}.${fileExtension}`;
      
      // Update local storage map
      activeDownloads.set(downloadId, progress);
      io.to(downloadId).emit('progress', progress);
      console.log(`Download ${downloadId} completed successfully! Saved to: ${finalFile}`);
    } else {
      // Sometimes it is merged into mkv or something else if not specified, check
      // But we specified merge format mp4 and audio format mp3, so it should exist.
      // If it doesn't, let's find any files starting with downloadId in the folder
      const files = fs.readdirSync(downloadsDir);
      const matchedFile = files.find(f => f.startsWith(downloadId));
      if (matchedFile) {
        const ext = path.extname(matchedFile).substring(1);
        progress.status = 'completed';
        progress.percent = 100;
        progress.filePath = `/api/files/${downloadId}`;
        progress.fileName = matchedFile;
        activeDownloads.set(downloadId, progress);
        io.to(downloadId).emit('progress', progress);
        console.log(`Download ${downloadId} completed with alternative file: ${matchedFile}`);
      } else {
        progress.status = 'failed';
        progress.error = 'Downloaded file was not found on the server.';
        activeDownloads.set(downloadId, progress);
        io.to(downloadId).emit('progress', progress);
      }
    }
  });
};
