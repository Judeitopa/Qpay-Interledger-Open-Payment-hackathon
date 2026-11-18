import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { handleInterledgerRequest } from './server/apiRouter.js';

function interledgerApiPlugin() {
  const middleware = (req, res, next) => {
    if (req.url && req.url.startsWith('/api/interledger')) {
      handleInterledgerRequest(req, res).catch((err) => {
        console.error('[Interledger Vite Middleware Error]', err);
        if (!res.headersSent) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: false, error: err?.message || 'Internal server error' }));
        }
      });
      return;
    }
    next();
  };

  return {
    name: 'qpay-interledger-open-payments-api',
    configureServer(server) {
      server.middlewares.use(middleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware);
    }
  };
}

export default defineConfig({
  plugins: [react(), interledgerApiPlugin()],
  server: {
    port: 3000,
    open: false
  }
});
