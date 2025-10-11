/**
 * Custom Next.js Server with Socket.io
 *
 * This custom server is required to initialize Socket.io alongside Next.js
 */

const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
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

  // Initialize Socket.io ONLY in production or when explicitly needed
  // In development, Next.js dev server doesn't support custom servers well
  if (!dev || process.env.ENABLE_SOCKET_SERVER === 'true') {
    // Dynamically import Socket.io server (ESM module)
    import('./src/lib/socket-server.js')
      .then(({ initSocketServer }) => {
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
    console.warn('⚠️  Socket.io server disabled in development mode');
    console.warn('   Set ENABLE_SOCKET_SERVER=true to enable it');
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
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  process.exit(0);
});
