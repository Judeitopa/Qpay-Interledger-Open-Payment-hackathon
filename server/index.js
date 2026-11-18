/**
 * Standalone Qpay Interledger Open Payments Backend Server
 */

import 'dotenv/config';
import http from 'node:http';
import { handleInterledgerRequest } from './apiRouter.js';
import { getInterledgerConfig } from './interledgerService.js';

const PORT = Number(process.env.INTERLEDGER_SERVER_PORT || 3001);

const server = http.createServer((req, res) => {
  if (req.url && req.url.startsWith('/api/interledger')) {
    handleInterledgerRequest(req, res);
    return;
  }

  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.end(
    JSON.stringify({
      service: 'Qpay Interledger Open Payments Backend',
      wallet: getInterledgerConfig().paymentPointer,
      status: 'running'
    })
  );
});

server.listen(PORT, () => {
  const cfg = getInterledgerConfig();
  console.log(`[Qpay Interledger Backend] Listening on http://localhost:${PORT}`);
  console.log(`[Qpay Interledger Backend] Wallet: ${cfg.paymentPointer} (Key ID: ${cfg.keyId})`);
});
