module.exports = {
  apps: [
    {
      name: "yt-downloader-premium",
      script: "./dist/server.js",
      instances: 1, // Single instance is preferred as downloads spawn OS-level child processes
      exec_mode: "fork",
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "development",
        PORT: 5000
      },
      env_production: {
        NODE_ENV: "production",
        PORT: 5000
      }
    }
  ]
};
