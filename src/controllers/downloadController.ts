import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import { fetchVideoInfo, executeDownload, activeDownloads, getDownloadsDir } from '../services/downloader';

// RegEx to check YouTube URLs
const YOUTUBE_REGEX = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be|youtube-nocookie\.com)\/(watch\?v=|embed\/|v\/|shorts\/)?([a-zA-Z0-9_-]{11})/;

export const fetchInfo = async (req: Request, res: Response) => {
  const { url } = req.body;
  
  if (!url) {
    return res.status(400).json({ error: 'YouTube URL is required.' });
  }
  
  if (!YOUTUBE_REGEX.test(url)) {
    return res.status(400).json({ error: 'Please enter a valid YouTube URL (video, shorts, or playlist).' });
  }
  
  try {
    const videoInfo = await fetchVideoInfo(url);
    return res.json(videoInfo);
  } catch (err: any) {
    console.error('Fetch info error:', err);
    return res.status(500).json({ error: err.message || 'Failed to fetch video details.' });
  }
};

export const startDownload = async (req: Request, res: Response) => {
  const { url, format, quality, title } = req.body;
  
  if (!url) {
    return res.status(400).json({ error: 'YouTube URL is required.' });
  }
  
  if (format !== 'mp3' && format !== 'mp4') {
    return res.status(400).json({ error: 'Invalid format. Must be mp3 or mp4.' });
  }
  
  try {
    const downloadId = uuidv4();
    const io = req.app.get('io');
    
    // Store metadata name for clean downloads later
    const safeTitle = (title || 'video')
      .replace(/[\\/*?:"<>|]/g, '') // sanitize filename characters
      .substring(0, 100);
      
    // Execute download in background
    executeDownload(downloadId, url, format, quality, io);
    
    // Save mapping to rename file when downloading
    const session = activeDownloads.get(downloadId);
    if (session) {
      session.fileName = `${safeTitle}.${format}`;
      activeDownloads.set(downloadId, session);
    }
    
    return res.json({ downloadId });
  } catch (err: any) {
    console.error('Start download error:', err);
    return res.status(500).json({ error: err.message || 'Failed to start download task.' });
  }
};

export const serveFile = (req: Request, res: Response) => {
  const { id } = req.params;
  const downloadsDir = getDownloadsDir();
  
  // Find any file matching downloadId in the folder
  const files = fs.readdirSync(downloadsDir);
  const file = files.find(f => f.startsWith(id));
  
  if (!file) {
    return res.status(404).json({ error: 'File not found or has expired.' });
  }
  
  const filePath = path.join(downloadsDir, file);
  
  // Retrieve clean title if available
  const session = activeDownloads.get(id);
  const downloadName = session && session.fileName ? session.fileName : file;
  
  res.download(filePath, downloadName, (err) => {
    if (err) {
      console.error(`Error sending file ${file}:`, err);
    }
  });
};
