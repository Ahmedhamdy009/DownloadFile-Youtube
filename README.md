# REDFIRE | Premium YouTube Downloader Platform

A production-ready, commercial-grade, and lightweight YouTube Downloader platform designed with a modern dark SaaS aesthetic. Built using a unified Node.js/Express server that runs `yt-dlp` and `ffmpeg` in the background, serving a premium, responsive, glassmorphic Vanilla HTML/CSS/JS frontend with live progress bars powered by Socket.io.

---

## Key Features

- **Media Formats**: Download videos up to 1080p (MP4) and extract audio as high-bitrate MP3s.
- **Dynamic Merging**: Automatically runs `ffmpeg` to merge separate high-definition video and audio tracks.
- **Real-Time Progress**: Instant dial and bar progress updates, download speed, and ETA synced via WebSockets.
- **UX Delights**: Features single-click URL pasting, animated loading skeletons, and original video filename preservation on download.
- **Auto-Cleanup**: Background cleanup job that automatically deletes files older than 30 minutes to manage disk usage.
- **Production DevOps Ready**: Pre-configured Docker, Docker Compose, Nginx, and PM2 settings.

---

## Project Structure

```
d:\تحميل/
├── public/                  # Premium Vanilla Frontend
│   ├── index.html           # HTML5 layout structure
│   ├── styles.css           # Glassmorphism dark mode styles
│   └── app.js               # State manager & WebSockets receiver
├── src/                     # Backend Source Code
│   ├── controllers/         # Express endpoint controllers
│   ├── routes/              # Routing configurations
│   ├── services/            # yt-dlp/ffmpeg execution & cleanup job
│   ├── types/               # Type declarations
│   └── server.ts            # Entrypoint (Express static server + Socket.io)
├── package.json             # NPM dependencies
├── tsconfig.json            # TypeScript compile configurations
├── Dockerfile               # Production container instruction
├── docker-compose.yml       # Docker orchestrator
├── nginx.conf               # Nginx reverse proxy configuration
├── pm2.config.js            # PM2 process settings
├── yt-dlp.exe               # Local Windows yt-dlp executable
└── ffmpeg.exe               # Local Windows FFmpeg executable
```

---

## Local Setup (Windows / Local Machine)

### Prerequisites
1. **Node.js** (v18 or higher recommended)
2. **Local Binaries**: `yt-dlp.exe` and `ffmpeg.exe` are already included at the root of this workspace (`d:\تحميل`). The server will automatically detect and execute them when running on Windows.

### Installation

1. Open PowerShell or command terminal in the workspace root.
2. Install npm dependencies:
   ```bash
   npm install
   ```

### Running the App

- **Development (Hot-reloading)**:
  ```bash
  npm run dev
  ```
- **Production (Compile & Run)**:
  ```bash
  npm run build
  npm start
  ```

Access the web portal in your browser at: `http://localhost:5000`

---

## Production Deployment Guide (Ubuntu VPS)

We recommend deploying using **Docker Compose** as it wraps node compiling, ffmpeg, and the latest yt-dlp automatically with zero local dependencies.

### Option A: Docker Compose Deployment (Recommended)

1. **Install Docker & Docker Compose** on your Ubuntu VPS:
   ```bash
   sudo apt update
   sudo apt install -y docker.io docker-compose
   ```
2. **Transfer Project Files**: Copy the project files to `/var/www/yt-downloader` on your VPS.
3. **Build and Run Containers**:
   ```bash
   cd /var/www/yt-downloader
   sudo docker-compose up -d --build
   ```
   This compiles the project, fetches the latest linux-compatible `yt-dlp` and `ffmpeg` utilities, and runs the server on port `5000` in the background.

---

### Option B: PM2 & Native Ubuntu Setup

If you prefer to run native PM2 without containers:

1. **Install System Dependencies** on Ubuntu:
   ```bash
   sudo apt update
   sudo apt install -y nodejs npm ffmpeg python3 curl
   ```
2. **Install yt-dlp** globally (crucial for Linux execution):
   ```bash
   sudo curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp
   sudo chmod a+rx /usr/local/bin/yt-dlp
   ```
3. **Install PM2 globally**:
   ```bash
   sudo npm install -g pm2
   ```
4. **Compile & Boot**:
   ```bash
   cd /var/www/yt-downloader
   npm install
   npm run build
   pm2 start pm2.config.js --env production
   ```
5. **Set up auto-restart on reboot**:
   ```bash
   pm2 startup
   pm2 save
   ```

---

## Reverse Proxy & SSL Setup (Nginx)

To secure the platform with HTTPS and link it to your domain (e.g., `downloader.yourdomain.com`):

1. **Install Nginx**:
   ```bash
   sudo apt install -y nginx
   ```
2. **Configure Nginx Site**:
   Replace the default Nginx configurations with the provided [nginx.conf](file:///d:/%D8%AA%D8%AD%D9%85%D9%8A%D9%84/nginx.conf):
   ```bash
   sudo cp nginx.conf /etc/nginx/sites-available/yt-downloader
   sudo ln -s /etc/nginx/sites-available/yt-downloader /etc/nginx/sites-enabled/
   sudo rm -f /etc/nginx/sites-enabled/default
   ```
3. **Install Certbot for Free SSL**:
   ```bash
   sudo apt install -y certbot python3-certbot-nginx
   sudo certbot --nginx -d downloader.yourdomain.com
   ```
4. **Restart Nginx**:
   ```bash
   sudo systemctl restart nginx
   ```

---

## Verification & Monitoring

1. **Logs**: View PM2 live processes and console outputs using `pm2 logs`.
2. **Docker Logs**: View container outputs using `docker logs -f yt-downloader-app`.
3. **Cleanup**: Expired files are checked and pruned every 10 minutes from the server disk.
