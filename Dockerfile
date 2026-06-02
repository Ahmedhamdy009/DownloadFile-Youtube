# Production Dockerfile
FROM node:20-alpine

# Install FFmpeg, Python3 (required by yt-dlp) and curl
RUN apk add --no-cache ffmpeg python3 curl g++ make

# Install the absolute latest yt-dlp release (crucial to bypass signature patches)
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp && \
    chmod a+rx /usr/local/bin/yt-dlp

# Set working directory
WORKDIR /usr/src/app

# Copy dependency definitions
COPY package*.json tsconfig.json ./

# Install dependencies (including devDependencies for compiling typescript)
RUN npm ci

# Copy application source and public static frontend assets
COPY src/ ./src
COPY public/ ./public

# Compile TypeScript to JavaScript
RUN npm run build

# Remove development dependencies to keep the image lightweight
RUN npm prune --production

# Expose port
EXPOSE 5000

# Set environment variables
ENV PORT=5000
ENV NODE_ENV=production

# Run the server
CMD ["node", "dist/server.js"]
