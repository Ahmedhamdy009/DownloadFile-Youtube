import fs from 'fs';
import path from 'path';
import { getDownloadsDir, activeDownloads } from './downloader';

const FILE_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes
const CLEANUP_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

export const startCleanupJob = (): void => {
  console.log('Temporary file cleanup job initialized.');
  
  setInterval(() => {
    const downloadsDir = getDownloadsDir();
    
    fs.readdir(downloadsDir, (err, files) => {
      if (err) {
        console.error('Failed to read downloads directory during cleanup:', err);
        return;
      }
      
      const now = Date.now();
      
      files.forEach((file) => {
        const filePath = path.join(downloadsDir, file);
        
        fs.stat(filePath, (statErr, stats) => {
          if (statErr) {
            console.error(`Failed to stat file ${file}:`, statErr);
            return;
          }
          
          if (now - stats.mtime.getTime() > FILE_EXPIRY_MS) {
            fs.unlink(filePath, (unlinkErr) => {
              if (unlinkErr) {
                console.error(`Failed to delete expired file ${file}:`, unlinkErr);
              } else {
                console.log(`Successfully deleted expired file: ${file}`);
                
                // Also clean up from memory map
                const downloadId = path.basename(file, path.extname(file));
                if (activeDownloads.has(downloadId)) {
                  activeDownloads.delete(downloadId);
                  console.log(`Cleaned up memory session for: ${downloadId}`);
                }
              }
            });
          }
        });
      });
    });
  }, CLEANUP_INTERVAL_MS);
};
