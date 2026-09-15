/**
 * PM2: arranca backend y frontend juntos.
 * Uso: pm2 start ecosystem.config.js
 * Errores: pm2 logs --lines 100  |  pm2 restart all  |  pm2 stop all
 * Guardar al arranque del VPS: pm2 save && pm2 startup
 */
module.exports = {
  apps: [
    {
      name: 'orbit-backend',
      cwd: './backend-node',
      script: './src/server.js',
      instances: 1,
      autorestart: true,
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'orbit-frontend',
      cwd: './',
      script: './node_modules/serve/build/main.js',
      args: 'frontend -l 3000',
      instances: 1,
      autorestart: true
    }
  ]
};