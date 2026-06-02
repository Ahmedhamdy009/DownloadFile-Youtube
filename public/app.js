// DOM State Cache
const states = {
  search: document.getElementById('search-section'),
  skeleton: document.getElementById('skeleton-section'),
  result: document.getElementById('result-section'),
  progress: document.getElementById('progress-section'),
  success: document.getElementById('success-section'),
};

const forms = {
  urlForm: document.getElementById('url-form'),
  urlInput: document.getElementById('url-input'),
  pasteBtn: document.getElementById('paste-btn'),
  submitBtn: document.getElementById('submit-btn'),
  errorBox: document.getElementById('error-message'),
  errorText: document.getElementById('error-text'),
};

const resultEl = {
  thumbnail: document.getElementById('video-thumbnail'),
  duration: document.getElementById('video-duration'),
  title: document.getElementById('video-title'),
  uploader: document.getElementById('video-uploader'),
  views: document.getElementById('video-views'),
  date: document.getElementById('video-date'),
  tabBtns: document.querySelectorAll('.tab-btn'),
  tabContents: document.querySelectorAll('.tab-content'),
  videoQuality: document.getElementById('video-quality'),
  audioQuality: document.getElementById('audio-quality'),
  downloadBtn: document.getElementById('download-btn'),
  cancelBtn: document.getElementById('cancel-result-btn'),
};

const progressEl = {
  title: document.getElementById('progress-title'),
  badge: document.getElementById('progress-status-badge'),
  barFill: document.getElementById('progress-bar-fill'),
  circleFill: document.getElementById('progress-fill-circle'),
  percentage: document.getElementById('progress-percentage'),
  speed: document.getElementById('progress-speed'),
  eta: document.getElementById('progress-eta'),
  size: document.getElementById('progress-size'),
  statusMsg: document.getElementById('status-message'),
};

const successEl = {
  videoTitle: document.getElementById('success-video-title'),
  saveBtn: document.getElementById('save-file-btn'),
  resetBtn: document.getElementById('reset-btn'),
};

// Global App variables
let socket = null;
let currentVideoData = null;
let activeTab = 'video'; // video or audio

// Helper: Transition interface state
function setUIState(activeStateKey) {
  Object.keys(states).forEach((key) => {
    if (key === activeStateKey) {
      states[key].classList.remove('hidden');
    } else {
      states[key].classList.add('hidden');
    }
  });
}

// Helper: Show Error Alert
function showError(message) {
  forms.errorText.textContent = message;
  forms.errorBox.classList.remove('hidden');
  setTimeout(() => {
    forms.errorBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, 50);
}

function hideError() {
  forms.errorBox.classList.add('hidden');
}

// Clipboard Paste Integration
forms.pasteBtn.addEventListener('click', async () => {
  try {
    const text = await navigator.clipboard.readText();
    if (text) {
      forms.urlInput.value = text;
      hideError();
    }
  } catch (err) {
    showError('Could not read from clipboard. Please paste manually.');
  }
});

// Format Views Helper
function formatViews(views) {
  if (!views) return 'N/A';
  return new Intl.NumberFormat().format(views);
}

// Format Date Helper (YYYYMMDD to YYYY-MM-DD)
function formatDate(dateStr) {
  if (!dateStr || dateStr.length !== 8) return 'N/A';
  return dateStr.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3');
}

// Submit URL & fetch metadata
forms.urlForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  hideError();
  
  const url = forms.urlInput.value.trim();
  if (!url) return;
  
  setUIState('skeleton');
  
  try {
    const response = await fetch('/api/info', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url }),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch video details.');
    }
    
    currentVideoData = data;
    renderVideoResult(data);
    setUIState('result');
  } catch (err) {
    console.error('Fetch error:', err);
    showError(err.message);
    setUIState('search');
  }
});

// Render fetched metadata
function renderVideoResult(data) {
  resultEl.thumbnail.src = data.thumbnail || 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=800';
  resultEl.duration.textContent = data.durationString;
  resultEl.title.textContent = data.title;
  resultEl.uploader.innerHTML = `<i class="fa-solid fa-circle-check"></i> ${data.uploader}`;
  resultEl.views.textContent = formatViews(data.viewCount);
  resultEl.date.textContent = formatDate(data.uploadDate);
  
  // Populate quality selects
  resultEl.videoQuality.innerHTML = '';
  
  // Extract unique heights from formats having video streams
  const uniqueHeights = new Set();
  const sortedVideoFormats = data.formats
    .filter(f => f.hasVideo && f.resolution.includes('p'))
    .sort((a, b) => {
      const hA = parseInt(a.resolution, 10) || 0;
      const hB = parseInt(b.resolution, 10) || 0;
      return hB - hA;
    });
    
  sortedVideoFormats.forEach(f => {
    const height = parseInt(f.resolution, 10);
    if (!isNaN(height) && !uniqueHeights.has(height)) {
      uniqueHeights.add(height);
      
      // Calculate estimated file size
      let sizeText = '';
      const bytes = f.filesize || f.filesizeApprox;
      if (bytes) {
        sizeText = ` (~${(bytes / (1024 * 1024)).toFixed(1)} MB)`;
      }
      
      const option = document.createElement('option');
      option.value = height.toString();
      option.textContent = `${height}p${f.fps ? ` (${f.fps}fps)` : ''}${sizeText}`;
      resultEl.videoQuality.appendChild(option);
    }
  });
  
  // Default 'best' option
  const bestOption = document.createElement('option');
  bestOption.value = 'best';
  bestOption.textContent = 'Best Available Resolution';
  resultEl.videoQuality.insertBefore(bestOption, resultEl.videoQuality.firstChild);
  resultEl.videoQuality.value = 'best';
}

// Tab selections toggle
resultEl.tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    resultEl.tabBtns.forEach(b => b.classList.remove('active'));
    resultEl.tabContents.forEach(c => c.classList.remove('active'));
    
    btn.classList.add('active');
    activeTab = btn.getAttribute('data-tab');
    document.getElementById(`${activeTab}-tab`).classList.add('active');
  });
});

// Go Back button handler
resultEl.cancelBtn.addEventListener('click', () => {
  setUIState('search');
});

// Trigger download initialization
resultEl.downloadBtn.addEventListener('click', async () => {
  if (!currentVideoData) return;
  
  const format = activeTab === 'video' ? 'mp4' : 'mp3';
  const quality = format === 'mp4' ? resultEl.videoQuality.value : 'best';
  const url = forms.urlInput.value.trim();
  const title = currentVideoData.title;
  
  // Update progress screen labels early
  progressEl.title.textContent = `Downloading: ${title}`;
  progressEl.badge.textContent = 'Queueing';
  progressEl.badge.className = 'badge-status';
  progressEl.statusMsg.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Contacting download servers...';
  
  // Reset progress rings
  updateProgressBar(0);
  progressEl.speed.textContent = '0 KB/s';
  progressEl.eta.textContent = '--:--';
  progressEl.size.textContent = 'Calculating...';
  
  setUIState('progress');
  
  try {
    const response = await fetch('/api/download', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url, format, quality, title }),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to initialize download task.');
    }
    
    const downloadId = data.downloadId;
    initializeWebSocket(downloadId);
  } catch (err) {
    console.error('Download init error:', err);
    showError(err.message);
    setUIState('search');
  }
});

// Handle circular and bar fill ratios
function updateProgressBar(percent) {
  progressEl.percentage.textContent = `${Math.round(percent)}%`;
  progressEl.barFill.style.width = `${percent}%`;
  
  // Radial SVG math: Circumference is 314.159 (R=50)
  const circumference = 314.159;
  const offset = circumference - (percent / 100) * circumference;
  progressEl.circleFill.style.strokeDashoffset = offset;
}

// Websocket sync
function initializeWebSocket(downloadId) {
  // Initialize Socket.io connection if not already created
  if (!socket) {
    socket = io();
  } else if (!socket.connected) {
    socket.connect();
  }
  
  // Join the download progress room
  socket.emit('join', downloadId);
  
  socket.off('progress'); // Clear duplicate listeners
  
  socket.on('progress', (data) => {
    if (data.downloadId !== downloadId) return;
    
    const { status, percent, speed, eta, totalSize, filePath, error } = data;
    
    updateProgressBar(percent);
    
    if (status === 'downloading') {
      progressEl.badge.textContent = 'Downloading';
      progressEl.badge.className = 'badge-status';
      progressEl.speed.textContent = speed || '0 KB/s';
      progressEl.eta.textContent = eta || '--:--';
      progressEl.size.textContent = totalSize || 'Calculating...';
      progressEl.statusMsg.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Downloading high-speed streams...';
    } 
    else if (status === 'merging') {
      progressEl.badge.textContent = 'Merging';
      progressEl.badge.className = 'badge-status merging';
      progressEl.speed.textContent = 'Processing';
      progressEl.eta.textContent = 'Merging';
      progressEl.statusMsg.innerHTML = '<i class="fa-solid fa-compact-disc fa-spin"></i> Multiplexing high-quality video & audio tracks (FFmpeg)...';
    } 
    else if (status === 'completed') {
      progressEl.badge.textContent = 'Done';
      progressEl.badge.className = 'badge-status';
      
      // Update success card
      successEl.videoTitle.textContent = currentVideoData.title;
      successEl.saveBtn.href = filePath;
      
      // Automatically close socket and transition
      socket.disconnect();
      setUIState('success');
      
      // Automatically prompt browser save for premium immediate experience
      setTimeout(() => {
        successEl.saveBtn.click();
      }, 500);
    } 
    else if (status === 'failed') {
      socket.disconnect();
      showError(error || 'An unexpected download error occurred.');
      setUIState('search');
    }
  });
}

// Reset / Download Another button handler
successEl.resetBtn.addEventListener('click', () => {
  forms.urlInput.value = '';
  currentVideoData = null;
  hideError();
  setUIState('search');
});
