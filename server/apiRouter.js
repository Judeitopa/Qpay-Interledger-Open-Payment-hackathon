/**
 * Framework-agnostic HTTP Router for Interledger Open Payments API Endpoints
 *
 * Works identically inside:
 *  - Vite dev/preview server middleware (vite.config.js)
 *  - Standalone Node HTTP backend (server/index.js)
 *  - Vercel Serverless Functions (api/interledger/[...route].js)
 */

import {
  getInterledgerHealth,
  resolveWalletAddress,
  createIncomingPayment,
  getIncomingPaymentStatus,
  completeIncomingPayment,
  createQuote,
  initiateOutgoingPayment,
  finalizeOutgoingPayment,
  listIncomingPayments
} from './interledgerService.js';

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.end(JSON.stringify(payload));
}

async function readJsonBody(req) {
  if (req.body && typeof req.body === 'object') {
    return req.body;
  }
  if (typeof req.body === 'string' && req.body.trim()) {
    try {
      return JSON.parse(req.body);
    } catch {
      throw new Error('Invalid JSON request body');
    }
  }
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 1_000_000) {
        reject(new Error('Request payload too large'));
      }
    });
    req.on('end', () => {
      if (!raw.trim()) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error('Invalid JSON request body'));
      }
    });
    req.on('error', reject);
  });
}

function extractRoutePath(reqUrl) {
  const parsed = new URL(reqUrl, 'http://localhost');
  const pathname = parsed.pathname.replace(/^\/api\/interledger\/?/, '/').replace(/\/+$/, '') || '/';
  return { pathname, searchParams: parsed.searchParams };
}

/**
 * Main request handler for /api/interledger/*
 */
export async function handleInterledgerRequest(req, res) {
  if (req.method === 'OPTIONS') {
    return sendJson(res, 204, {});
  }

  const { pathname, searchParams } = extractRoutePath(req.url || '/');
  const method = (req.method || 'GET').toUpperCase();

  try {
    // GET /api/interledger/health
    if (method === 'GET' && (pathname === '/health' || pathname === '/')) {
      const data = await getInterledgerHealth();
      return sendJson(res, 200, { success: true, ...data });
    }

    // GET /api/interledger/wallet?address=...
    if (method === 'GET' && pathname === '/wallet') {
      const address = searchParams.get('address') || undefined;
      const wallet = await resolveWalletAddress(address);
      return sendJson(res, 200, { success: true, wallet });
    }

    // POST /api/interledger/incoming-payments
    if (method === 'POST' && pathname === '/incoming-payments') {
      const body = await readJsonBody(req);
      const data = await createIncomingPayment({
        amountNgn: body.amountNgn ?? body.amount,
        receiverWalletAddress: body.receiverWalletAddress || body.walletAddress,
        description: body.description || body.note,
        externalRef: body.externalRef || body.reference,
        metadata: body.metadata
      });
      return sendJson(res, 201, { success: true, ...data });
    }

    // GET /api/interledger/incoming-payments/status?id=...&ref=...
    if (method === 'GET' && pathname === '/incoming-payments/status') {
      const incomingPaymentId = searchParams.get('id') || undefined;
      const reference = searchParams.get('ref') || undefined;
      const data = await getIncomingPaymentStatus({ incomingPaymentId, reference });
      return sendJson(res, 200, { success: true, ...data });
    }

    // POST /api/interledger/incoming-payments/complete
    if (method === 'POST' && pathname === '/incoming-payments/complete') {
      const body = await readJsonBody(req);
      const data = await completeIncomingPayment({
        incomingPaymentId: body.incomingPaymentId || body.id,
        reference: body.reference || body.ref
      });
      return sendJson(res, 200, { success: true, ...data });
    }

    // POST /api/interledger/quotes
    if (method === 'POST' && pathname === '/quotes') {
      const body = await readJsonBody(req);
      if (!body.incomingPaymentId) {
        return sendJson(res, 400, { success: false, error: 'incomingPaymentId is required' });
      }
      const data = await createQuote({
        incomingPaymentId: body.incomingPaymentId,
        senderWalletAddress: body.senderWalletAddress
      });
      return sendJson(res, 201, { success: true, ...data });
    }

    // POST /api/interledger/payments/initiate
    if (method === 'POST' && pathname === '/payments/initiate') {
      const body = await readJsonBody(req);
      const data = await initiateOutgoingPayment({
        incomingPaymentId: body.incomingPaymentId,
        quoteId: body.quoteId,
        senderWalletAddress: body.senderWalletAddress,
        receiverWalletAddress: body.receiverWalletAddress,
        amountNgn: body.amountNgn ?? body.amount,
        description: body.description || body.note,
        externalRef: body.externalRef || body.reference,
        redirectUri: body.redirectUri,
        metadata: body.metadata
      });
      return sendJson(res, 201, { success: true, ...data });
    }

    // POST /api/interledger/payments/finalize
    if (method === 'POST' && pathname === '/payments/finalize') {
      const body = await readJsonBody(req);
      if (!body.paymentSessionId || !body.interactRef) {
        return sendJson(res, 400, {
          success: false,
          error: 'paymentSessionId and interactRef are required'
        });
      }
      const data = await finalizeOutgoingPayment({
        paymentSessionId: body.paymentSessionId,
        interactRef: body.interactRef,
        sessionToken: body.sessionToken
      });
      return sendJson(res, 200, { success: true, ...data });
    }

    // GET /api/interledger/payments/list
    if (method === 'GET' && pathname === '/payments/list') {
      const walletAddress = searchParams.get('address') || undefined;
      const limit = searchParams.get('limit') || 10;
      const data = await listIncomingPayments({ walletAddress, limit });
      return sendJson(res, 200, { success: true, ...data });
    }

    return sendJson(res, 404, {
      success: false,
      error: `Unknown Interledger API route: ${method} ${pathname}`
    });
  } catch (err) {
    const status = err?.status && Number.isInteger(err.status) ? err.status : 500;
    const message = err?.description || err?.message || 'Interledger Open Payments request failed';
    console.error('[Interledger API Error]', method, pathname, message);
    return sendJson(res, status, {
      success: false,
      error: message,
      code: err?.code || 'INTERLEDGER_API_ERROR'
    });
  }
}
