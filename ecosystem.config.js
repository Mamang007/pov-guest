module.exports = {
  apps: [
    {
      name: 'pov-guest',
      script: 'node_modules/.bin/next',
      args: 'start --hostname 0.0.0.0 --port 3000',
      cwd: '/home/ubuntu/pov-guest',
      env: {
        NODE_ENV: 'production',
        PORT: '3000',
        UPLOAD_DIR: '/var/data/pov-guest/uploads',
        DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/pov_guest',
      },
      instances: 1,
      autorestart: true,
      max_memory_restart: '512M',
    },
  ],
}
