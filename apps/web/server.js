/**
 * Custom Next.js Server with Socket.io
 *
 * This custom server is required to initialize Socket.io alongside Next.js
 */

const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0'; // Allow external connections
const port = parseInt(process.env.PORT || '3000', 10);

// Create Next.js app
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  // Create HTTP server
  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);

      // Handle Socket.io requests
      if (parsedUrl.pathname.startsWith('/api/socket')) {
        // Socket.io handles this
        return;
      }

      // Handle Next.js requests
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('Internal server error');
    }
  });

  // Initialize Socket.io by default (opt-out with DISABLE_SOCKET_SERVER=true)
  // Required for real-time messaging feature
  if (process.env.DISABLE_SOCKET_SERVER !== 'true') {
    // Dynamically import Socket.io server (ESM module)
    import('./src/lib/socket-server.ts')
      .then((module) => {
        const initSocketServer = module.initSocketServer || module.default?.initSocketServer;
        const io = initSocketServer(httpServer);
        console.log('✅ Socket.io server initialized');

        httpServer.on('upgrade', (request, socket, head) => {
          if (request.url.startsWith('/api/socket')) {
            io.engine.handleUpgrade(request, socket, head);
          }
        });
      })
      .catch((err) => {
        console.error('Failed to initialize Socket.io:', err);
      });
  } else {
    console.warn('⚠️  Socket.io server disabled');
    console.warn('   Remove DISABLE_SOCKET_SERVER=true to enable it');
  }

  // Initialize Cron Scheduler for scheduled reminders (opt-out with DISABLE_CRON_SCHEDULER=true)
  if (process.env.DISABLE_CRON_SCHEDULER !== 'true') {
    import('./src/lib/cron/scheduler.ts')
      .then((module) => {
        const initializeScheduler = module.initializeScheduler || module.default?.initializeScheduler;
        initializeScheduler();
        console.log('✅ Cron scheduler initialized');
      })
      .catch((err) => {
        console.error('Failed to initialize Cron scheduler:', err);
      });
  } else {
    console.warn('⚠️  Cron scheduler disabled');
    console.warn('   Remove DISABLE_CRON_SCHEDULER=true to enable it');
  }

  httpServer
    .once('error', (err) => {
      console.error('Server error:', err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(
        `> Server listening at http://${hostname}:${port} as ${
          dev ? 'development' : process.env.NODE_ENV
        }`
      );
    });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  // Stop cron scheduler if running
  import('./src/lib/cron/scheduler.ts')
    .then((module) => {
      const stopScheduler = module.stopScheduler || module.default?.stopScheduler;
      stopScheduler();
    })
    .catch(() => {});
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  // Stop cron scheduler if running
  import('./src/lib/cron/scheduler.ts')
    .then((module) => {
      const stopScheduler = module.stopScheduler || module.default?.stopScheduler;
      stopScheduler();
    })
    .catch(() => {});
  process.exit(0);
});
