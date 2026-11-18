/**
 * Interledger Open Payments Backend Service
 *
 * Powers Qpay's payment rails via live HTTP-signed API calls to the
 * Interledger Open Payments API (@interledger/open-payments).
 */

import 'dotenv/config';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  createAuthenticatedClient,
  isFinalizedGrant,
  isPendingGrant
} from '@interledger/open-payments';

const SESSION_CACHE_FILE = path.join(os.tmpdir(), 'qpay-interledger-sessions.json');

// In-memory store backed by a temp file so interactive grant redirects survive dev restarts
const sessionStore = new Map();

function loadSessionCache() {
  try {
    if (fs.existsSync(SESSION_CACHE_FILE)) {
      const raw = JSON.parse(fs.readFileSync(SESSION_CACHE_FILE, 'utf8'));
      for (const [k, v] of Object.entries(raw)) {
        sessionStore.set(k, v);
      }
    }
  } catch {
    // Non-fatal if cache cannot be read
  }
}

function persistSessionCache() {
  try {
    const obj = {};
    // Keep only the most recent 200 sessions
    const entries = Array.from(sessionStore.entries()).slice(-200);
    for (const [k, v] of entries) {
      obj[k] = v;
    }
    fs.writeFileSync(SESSION_CACHE_FILE, JSON.stringify(obj, null, 2), 'utf8');
  } catch {
    // Non-fatal in read-only serverless environments
  }
}

loadSessionCache();

/**
 * Normalize a payment pointer ($host/path) or URL into an Open Payments Wallet Address URL
 */
export function normalizeWalletAddress(address) {
  const fallback = process.env.INTERLEDGER_WALLET_ADDRESS || 'https://ilp.interledger-test.dev/qpay';
  if (!address || typeof address !== 'string') return fallback;
  const trimmed = address.trim();
  if (!trimmed) return fallback;
  if (trimmed.startsWith('$')) {
    return 'https://' + trimmed.slice(1);
  }
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  if (trimmed.includes('.') && trimmed.includes('/')) {
    return 'https://' + trimmed;
  }
  return fallback;
}

/**
 * Format a Wallet Address URL into human-readable $ payment pointer notation
 */
export function toPaymentPointer(url) {
  if (!url) return '$ilp.interledger-test.dev/qpay';
  return url.replace(/^https?:\/\//i, '$');
}

/**
 * Normalize Ed25519 PEM private keys pasted across .env or Vercel Environment Variables
 */
function normalizePrivateKeyPem(raw) {
  if (!raw || typeof raw !== 'string') return '';
  let cleaned = raw.trim();
  // Strip accidental surrounding quotes from dashboard/env copy-paste
  if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
    cleaned = cleaned.slice(1, -1).trim();
  }
  cleaned = cleaned.replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n').replace(/\r\n/g, '\n').trim();
  // Reconstruct valid PEM line breaks if newlines were collapsed into spaces
  const singleLineMatch = cleaned.match(/^-----BEGIN PRIVATE KEY-----\s+([A-Za-z0-9+/=\s]+?)\s+-----END PRIVATE KEY-----$/);
  if (singleLineMatch) {
    const body = singleLineMatch[1].replace(/\s+/g, '');
    return `-----BEGIN PRIVATE KEY-----\n${body}\n-----END PRIVATE KEY-----`;
  }
  return cleaned;
}

/**
 * Encrypt/decrypt stateless session tokens (AES-256-GCM) so interactive grant redirects
 * survive cold starts across separate serverless instances on Vercel.
 */
function deriveSessionSecretKey() {
  const { privateKeyPem, keyId } = getInterledgerConfig();
  return crypto.createHash('sha256').update(`${privateKeyPem}|${keyId}|qpay-ilp-v1`).digest();
}

export function sealSessionToken(sessionData) {
  try {
    const key = deriveSessionSecretKey();
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const plaintext = JSON.stringify(sessionData);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return Buffer.concat([iv, authTag, encrypted]).toString('base64url');
  } catch {
    return null;
  }
}

export function unsealSessionToken(token) {
  if (!token || typeof token !== 'string') return null;
  try {
    const raw = Buffer.from(token, 'base64url');
    if (raw.length < 29) return null;
    const iv = raw.subarray(0, 12);
    const authTag = raw.subarray(12, 28);
    const ciphertext = raw.subarray(28);
    const key = deriveSessionSecretKey();
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
    return JSON.parse(decrypted);
  } catch {
    return null;
  }
}

/**
 * Read Interledger configuration from environment variables
 */
export function getInterledgerConfig() {
  const walletAddressUrl = normalizeWalletAddress(process.env.INTERLEDGER_WALLET_ADDRESS);
  const keyId = (process.env.INTERLEDGER_KEY_ID || '').trim();
  const rawPrivateKey = normalizePrivateKeyPem(process.env.INTERLEDGER_PRIVATE_KEY || '');
  const ngnToUsdRate = Number(process.env.INTERLEDGER_NGN_TO_USD_RATE || 1600) || 1600;

  return {
    walletAddressUrl,
    paymentPointer: toPaymentPointer(walletAddressUrl),
    keyId,
    privateKeyPem: rawPrivateKey,
    ngnToUsdRate,
    configured: Boolean(walletAddressUrl && keyId && rawPrivateKey)
  };
}

let cachedClient = null;
let cachedClientFingerprint = null;

/**
 * Create (or reuse) an authenticated @interledger/open-payments client
 */
export async function getAuthenticatedClient() {
  const config = getInterledgerConfig();
  if (!config.configured) {
    throw new Error(
      'Interledger Open Payments credentials are missing. Configure INTERLEDGER_WALLET_ADDRESS, INTERLEDGER_KEY_ID, and INTERLEDGER_PRIVATE_KEY in .env.'
    );
  }

  const fingerprint = `${config.walletAddressUrl}|${config.keyId}`;
  if (cachedClient && cachedClientFingerprint === fingerprint) {
    return cachedClient;
  }

  cachedClient = await createAuthenticatedClient({
    walletAddressUrl: config.walletAddressUrl,
    privateKey: Buffer.from(config.privateKeyPem, 'utf8'),
    keyId: config.keyId,
    validateResponses: false
  });
  cachedClientFingerprint = fingerprint;
  return cachedClient;
}

/**
 * Convert Qpay display NGN amount into Open Payments minor units for a wallet's asset
 */
export function convertNgnToAssetMinorUnits(amountNgn, assetCode = 'USD', assetScale = 2) {
  const numeric = Math.max(0, Number(amountNgn) || 0);
  const { ngnToUsdRate } = getInterledgerConfig();
  const scaleFactor = Math.pow(10, Number(assetScale) || 2);

  let majorAmount = numeric;
  if (assetCode && assetCode.toUpperCase() !== 'NGN') {
    majorAmount = numeric / ngnToUsdRate;
  }

  const minorUnits = Math.max(1, Math.round(majorAmount * scaleFactor));
  return {
    value: String(minorUnits),
    assetCode: assetCode || 'USD',
    assetScale: Number(assetScale ?? 2),
    displayFormatted: formatAssetAmount(minorUnits, assetCode || 'USD', Number(assetScale ?? 2))
  };
}

export function formatAssetAmount(minorValue, assetCode = 'USD', assetScale = 2) {
  const scaleFactor = Math.pow(10, Number(assetScale) || 2);
  const major = Number(minorValue || 0) / scaleFactor;
  return `${assetCode} ${major.toFixed(Number(assetScale) || 2)}`;
}

/**
 * 1. Resolve an Interledger Wallet Address live via Open Payments API
 */
export async function resolveWalletAddress(address) {
  const client = await getAuthenticatedClient();
  const targetUrl = normalizeWalletAddress(address);
  const wallet = await client.walletAddress.get({ url: targetUrl });

  return {
    live: true,
    id: wallet.id,
    paymentPointer: toPaymentPointer(wallet.id),
    publicName: wallet.publicName || 'Interledger Wallet',
    assetCode: wallet.assetCode,
    assetScale: wallet.assetScale,
    authServer: wallet.authServer,
    resourceServer: wallet.resourceServer
  };
}

/**
 * Health check that verifies live connectivity with the configured Interledger Test Wallet
 */
export async function getInterledgerHealth() {
  const config = getInterledgerConfig();
  const wallet = await resolveWalletAddress(config.walletAddressUrl);
  return {
    status: 'connected',
    live: true,
    protocol: 'Interledger Open Payments',
    keyId: config.keyId,
    ngnToUsdRate: config.ngnToUsdRate,
    wallet
  };
}

/**
 * 2. Create a LIVE Incoming Payment on Interledger Open Payments
 */
export async function createIncomingPayment({
  amountNgn,
  receiverWalletAddress,
  description = 'Qpay Instant Settlement',
  externalRef,
  metadata = {}
}) {
  const client = await getAuthenticatedClient();
  const receiverUrl = normalizeWalletAddress(receiverWalletAddress);
  const receiverWallet = await client.walletAddress.get({ url: receiverUrl });

  const reference =
    externalRef || 'ILP_QPAY_' + Math.floor(100000 + Math.random() * 900000) + '_' + Date.now().toString().slice(-4);

  // Request non-interactive incoming-payment grant
  const grant = await client.grant.request(
    { url: receiverWallet.authServer },
    {
      access_token: {
        access: [
          {
            type: 'incoming-payment',
            actions: ['create', 'read', 'read-all', 'complete', 'list']
          }
        ]
      }
    }
  );

  if (!isFinalizedGrant(grant)) {
    throw new Error('Incoming payment grant was not finalized by the Interledger auth server.');
  }

  const incomingAmount = convertNgnToAssetMinorUnits(
    amountNgn,
    receiverWallet.assetCode,
    receiverWallet.assetScale
  );

  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

  const incomingPayment = await client.incomingPayment.create(
    {
      url: receiverWallet.resourceServer,
      accessToken: grant.access_token.value
    },
    {
      walletAddress: receiverWallet.id,
      incomingAmount: {
        value: incomingAmount.value,
        assetCode: incomingAmount.assetCode,
        assetScale: incomingAmount.assetScale
      },
      expiresAt,
      metadata: {
        description,
        externalRef: reference,
        amountNgn: String(Number(amountNgn) || 0),
        ...Object.fromEntries(
          Object.entries(metadata || {}).map(([k, v]) => [k, String(v ?? '')])
        )
      }
    }
  );

  const record = {
    reference,
    incomingPaymentId: incomingPayment.id,
    incomingAccessToken: grant.access_token.value,
    receiverWallet,
    amountNgn: Number(amountNgn) || 0,
    incomingAmount: incomingPayment.incomingAmount,
    createdAt: Date.now(),
    status: incomingPayment.completed ? 'PAID' : 'PENDING'
  };

  sessionStore.set(reference, record);
  sessionStore.set(incomingPayment.id, record);
  persistSessionCache();

  return {
    live: true,
    reference,
    incomingPaymentId: incomingPayment.id,
    walletAddress: receiverWallet.id,
    paymentPointer: toPaymentPointer(receiverWallet.id),
    publicName: receiverWallet.publicName,
    incomingAmount: incomingPayment.incomingAmount,
    receivedAmount: incomingPayment.receivedAmount,
    displayAmount: incomingAmount.displayFormatted,
    amountNgn: Number(amountNgn) || 0,
    completed: Boolean(incomingPayment.completed),
    expiresAt: incomingPayment.expiresAt || expiresAt,
    metadata: incomingPayment.metadata
  };
}

/**
 * 3. Check LIVE status of an Incoming Payment on Interledger Open Payments
 */
export async function getIncomingPaymentStatus({ incomingPaymentId, reference }) {
  const client = await getAuthenticatedClient();
  const cached = sessionStore.get(incomingPaymentId) || sessionStore.get(reference);

  const targetPaymentId = incomingPaymentId || cached?.incomingPaymentId;
  if (!targetPaymentId) {
    throw new Error('Missing incomingPaymentId or reference');
  }

  let accessToken = cached?.incomingAccessToken;
  if (!accessToken) {
    const config = getInterledgerConfig();
    const wallet = await client.walletAddress.get({ url: config.walletAddressUrl });
    const grant = await client.grant.request(
      { url: wallet.authServer },
      {
        access_token: {
          access: [{ type: 'incoming-payment', actions: ['read', 'read-all', 'complete'] }]
        }
      }
    );
    if (isFinalizedGrant(grant)) {
      accessToken = grant.access_token.value;
    }
  }

  const livePayment = await client.incomingPayment.get({
    url: targetPaymentId,
    accessToken
  });

  const receivedVal = BigInt(livePayment.receivedAmount?.value || '0');
  const expectedVal = BigInt(livePayment.incomingAmount?.value || '0');
  const isPaid = Boolean(livePayment.completed) || (expectedVal > 0n && receivedVal >= expectedVal);

  return {
    live: true,
    reference: reference || cached?.reference || livePayment.metadata?.externalRef,
    incomingPaymentId: livePayment.id,
    completed: Boolean(livePayment.completed),
    status: isPaid ? 'PAID' : 'PENDING',
    incomingAmount: livePayment.incomingAmount,
    receivedAmount: livePayment.receivedAmount,
    receivedDisplay: formatAssetAmount(
      livePayment.receivedAmount?.value,
      livePayment.receivedAmount?.assetCode,
      livePayment.receivedAmount?.assetScale
    ),
    metadata: livePayment.metadata
  };
}

/**
 * 4. Complete a LIVE Incoming Payment on the Open Payments resource server
 */
export async function completeIncomingPayment({ incomingPaymentId, reference }) {
  const client = await getAuthenticatedClient();
  const cached = sessionStore.get(incomingPaymentId) || sessionStore.get(reference);
  const targetPaymentId = incomingPaymentId || cached?.incomingPaymentId;

  if (!targetPaymentId) {
    throw new Error('Missing incomingPaymentId or reference to complete');
  }

  let accessToken = cached?.incomingAccessToken;
  if (!accessToken) {
    const config = getInterledgerConfig();
    const wallet = await client.walletAddress.get({ url: config.walletAddressUrl });
    const grant = await client.grant.request(
      { url: wallet.authServer },
      {
        access_token: {
          access: [{ type: 'incoming-payment', actions: ['read', 'read-all', 'complete'] }]
        }
      }
    );
    if (!isFinalizedGrant(grant)) {
      throw new Error('Could not obtain grant to complete incoming payment');
    }
    accessToken = grant.access_token.value;
  }

  const completed = await client.incomingPayment.complete({
    url: targetPaymentId,
    accessToken
  });

  if (cached) {
    cached.status = 'PAID';
    sessionStore.set(cached.reference, cached);
    sessionStore.set(cached.incomingPaymentId, cached);
    persistSessionCache();
  }

  return {
    live: true,
    incomingPaymentId: completed.id,
    completed: Boolean(completed.completed),
    incomingAmount: completed.incomingAmount,
    receivedAmount: completed.receivedAmount,
    status: 'PAID'
  };
}

/**
 * 5. Create a LIVE Open Payments Quote (method: 'ilp')
 */
export async function createQuote({ incomingPaymentId, senderWalletAddress }) {
  const client = await getAuthenticatedClient();
  const senderUrl = normalizeWalletAddress(senderWalletAddress);
  const senderWallet = await client.walletAddress.get({ url: senderUrl });

  const quoteGrant = await client.grant.request(
    { url: senderWallet.authServer },
    {
      access_token: {
        access: [{ type: 'quote', actions: ['create', 'read'] }]
      }
    }
  );

  if (!isFinalizedGrant(quoteGrant)) {
    throw new Error('Quote grant was not finalized by the Interledger auth server.');
  }

  const quote = await client.quote.create(
    {
      url: senderWallet.resourceServer,
      accessToken: quoteGrant.access_token.value
    },
    {
      walletAddress: senderWallet.id,
      receiver: incomingPaymentId,
      method: 'ilp'
    }
  );

  return {
    live: true,
    quoteId: quote.id,
    walletAddress: senderWallet.id,
    receiver: quote.receiver,
    debitAmount: quote.debitAmount,
    receiveAmount: quote.receiveAmount,
    debitDisplay: formatAssetAmount(
      quote.debitAmount?.value,
      quote.debitAmount?.assetCode,
      quote.debitAmount?.assetScale
    ),
    receiveDisplay: formatAssetAmount(
      quote.receiveAmount?.value,
      quote.receiveAmount?.assetCode,
      quote.receiveAmount?.assetScale
    ),
    expiresAt: quote.expiresAt
  };
}

/**
 * 6. Initiate a full LIVE Open Payments Outgoing Payment flow:
 *    - Creates a live Incoming Payment (if incomingPaymentId wasn't already created)
 *    - Creates a live ILP Quote
 *    - Requests a live Interactive Outgoing Payment Grant (GNAP)
 */
export async function initiateOutgoingPayment({
  incomingPaymentId,
  quoteId,
  senderWalletAddress,
  receiverWalletAddress,
  amountNgn,
  description = 'Qpay Payment via Interledger Open Payments',
  externalRef,
  redirectUri,
  metadata = {}
}) {
  const client = await getAuthenticatedClient();
  const senderUrl = normalizeWalletAddress(senderWalletAddress);
  const senderWallet = await client.walletAddress.get({ url: senderUrl });

  let activeIncomingId = incomingPaymentId;
  let activeReference =
    externalRef || 'ILP_QPAY_' + Math.floor(100000 + Math.random() * 900000);
  let createdIncoming = null;

  // Step 1: Ensure we have a live Incoming Payment URL on the Interledger resource server
  if (!activeIncomingId) {
    createdIncoming = await createIncomingPayment({
      amountNgn,
      receiverWalletAddress: receiverWalletAddress || senderUrl,
      description,
      externalRef: activeReference,
      metadata
    });
    activeIncomingId = createdIncoming.incomingPaymentId;
    activeReference = createdIncoming.reference;
  }

  // Step 2: Create a live ILP Quote
  const quoteResult = quoteId
    ? {
        quoteId,
        debitAmount: convertNgnToAssetMinorUnits(amountNgn, senderWallet.assetCode, senderWallet.assetScale),
        receiveAmount: convertNgnToAssetMinorUnits(amountNgn, senderWallet.assetCode, senderWallet.assetScale)
      }
    : await createQuote({
        incomingPaymentId: activeIncomingId,
        senderWalletAddress: senderWallet.id
      });

  // Step 3: Request a live Interactive Outgoing Payment Grant (GNAP)
  const paymentSessionId = 'ilp_sess_' + crypto.randomBytes(8).toString('hex');
  const nonce = crypto.randomUUID();
  const baseRedirect = redirectUri || 'http://localhost:3000/';
  const finishUrl = new URL(baseRedirect);
  finishUrl.searchParams.set('ilp_session', paymentSessionId);

  const outgoingGrant = await client.grant.request(
    { url: senderWallet.authServer },
    {
      access_token: {
        access: [
          {
            type: 'outgoing-payment',
            actions: ['create', 'read', 'list'],
            identifier: senderWallet.id,
            limits: {
              debitAmount: {
                value: quoteResult.debitAmount.value,
                assetCode: quoteResult.debitAmount.assetCode,
                assetScale: quoteResult.debitAmount.assetScale
              }
            }
          }
        ]
      },
      interact: {
        start: ['redirect'],
        finish: {
          method: 'redirect',
          uri: finishUrl.toString(),
          nonce
        }
      }
    }
  );

  // If the auth server immediately finalized a non-interactive grant, create the outgoing payment right away
  if (isFinalizedGrant(outgoingGrant)) {
    const outgoingPayment = await client.outgoingPayment.create(
      {
        url: senderWallet.resourceServer,
        accessToken: outgoingGrant.access_token.value
      },
      {
        walletAddress: senderWallet.id,
        quoteId: quoteResult.quoteId,
        metadata: {
          description,
          externalRef: activeReference
        }
      }
    );

    return {
      live: true,
      requiresInteraction: false,
      status: 'PAID',
      paymentSessionId,
      reference: activeReference,
      incomingPaymentId: activeIncomingId,
      quoteId: quoteResult.quoteId,
      outgoingPaymentId: outgoingPayment.id,
      debitAmount: quoteResult.debitAmount,
      receiveAmount: quoteResult.receiveAmount,
      debitDisplay: formatAssetAmount(
        quoteResult.debitAmount.value,
        quoteResult.debitAmount.assetCode,
        quoteResult.debitAmount.assetScale
      ),
      receiveDisplay: formatAssetAmount(
        quoteResult.receiveAmount.value,
        quoteResult.receiveAmount.assetCode,
        quoteResult.receiveAmount.assetScale
      )
    };
  }

  if (!isPendingGrant(outgoingGrant)) {
    throw new Error('Unexpected grant state returned by Interledger auth server.');
  }

  // Persist pending interactive grant session for continuation after redirect
  const pendingSession = {
    paymentSessionId,
    reference: activeReference,
    incomingPaymentId: activeIncomingId,
    quoteId: quoteResult.quoteId,
    senderWallet,
    debitAmount: quoteResult.debitAmount,
    receiveAmount: quoteResult.receiveAmount,
    amountNgn: Number(amountNgn) || 0,
    description,
    metadata,
    continueUri: outgoingGrant.continue.uri,
    continueAccessToken: outgoingGrant.continue.access_token.value,
    interactRedirectUrl: outgoingGrant.interact.redirect,
    nonce,
    status: 'AWAITING_INTERACTION',
    createdAt: Date.now()
  };

  sessionStore.set(paymentSessionId, pendingSession);
  persistSessionCache();

  // Stateless encrypted session token so finalize works across Vercel serverless cold starts
  const sessionToken = sealSessionToken(pendingSession);

  return {
    live: true,
    requiresInteraction: true,
    status: 'AWAITING_INTERACTION',
    paymentSessionId,
    sessionToken,
    reference: activeReference,
    incomingPaymentId: activeIncomingId,
    quoteId: quoteResult.quoteId,
    walletAddress: senderWallet.id,
    paymentPointer: toPaymentPointer(senderWallet.id),
    debitAmount: quoteResult.debitAmount,
    receiveAmount: quoteResult.receiveAmount,
    debitDisplay: formatAssetAmount(
      quoteResult.debitAmount.value,
      quoteResult.debitAmount.assetCode,
      quoteResult.debitAmount.assetScale
    ),
    receiveDisplay: formatAssetAmount(
      quoteResult.receiveAmount.value,
      quoteResult.receiveAmount.assetCode,
      quoteResult.receiveAmount.assetScale
    ),
    interactRedirectUrl: outgoingGrant.interact.redirect,
    continueUri: outgoingGrant.continue.uri
  };
}

/**
 * 7. Finalize an Interactive Outgoing Payment after user approval on Interledger Test Wallet
 */
export async function finalizeOutgoingPayment({ paymentSessionId, interactRef, sessionToken }) {
  const client = await getAuthenticatedClient();
  let session = sessionStore.get(paymentSessionId);

  if (!session && sessionToken) {
    const recovered = unsealSessionToken(sessionToken);
    if (recovered && (!paymentSessionId || recovered.paymentSessionId === paymentSessionId)) {
      session = recovered;
    }
  }

  if (!session) {
    throw new Error('Payment session expired or not found. Please initiate the payment again.');
  }

  if (session.status === 'PAID' && session.outgoingPaymentId) {
    return {
      live: true,
      status: 'PAID',
      paymentSessionId,
      reference: session.reference,
      incomingPaymentId: session.incomingPaymentId,
      quoteId: session.quoteId,
      outgoingPaymentId: session.outgoingPaymentId,
      amountNgn: session.amountNgn,
      debitAmount: session.debitAmount,
      receiveAmount: session.receiveAmount,
      metadata: session.metadata
    };
  }

  const finalizedGrant = await client.grant.continue(
    {
      url: session.continueUri,
      accessToken: session.continueAccessToken
    },
    {
      interact_ref: interactRef
    }
  );

  if (!isFinalizedGrant(finalizedGrant)) {
    throw new Error('Interledger grant was not finalized. Please authorize the payment in your wallet.');
  }

  const outgoingPayment = await client.outgoingPayment.create(
    {
      url: session.senderWallet.resourceServer,
      accessToken: finalizedGrant.access_token.value
    },
    {
      walletAddress: session.senderWallet.id,
      quoteId: session.quoteId,
      metadata: {
        description: session.description || 'Qpay Payment',
        externalRef: session.reference
      }
    }
  );

  session.status = 'PAID';
  session.outgoingPaymentId = outgoingPayment.id;
  session.settledAt = Date.now();
  sessionStore.set(paymentSessionId, session);
  persistSessionCache();

  return {
    live: true,
    status: 'PAID',
    paymentSessionId,
    reference: session.reference,
    incomingPaymentId: session.incomingPaymentId,
    quoteId: session.quoteId,
    outgoingPaymentId: outgoingPayment.id,
    amountNgn: session.amountNgn,
    debitAmount: outgoingPayment.debitAmount || session.debitAmount,
    receiveAmount: outgoingPayment.receiveAmount || session.receiveAmount,
    sentAmount: outgoingPayment.sentAmount,
    debitDisplay: formatAssetAmount(
      (outgoingPayment.debitAmount || session.debitAmount)?.value,
      (outgoingPayment.debitAmount || session.debitAmount)?.assetCode,
      (outgoingPayment.debitAmount || session.debitAmount)?.assetScale
    ),
    metadata: session.metadata
  };
}

/**
 * 8. List recent LIVE Incoming Payments from the Interledger Test Wallet
 */
export async function listIncomingPayments({ walletAddress, limit = 10 } = {}) {
  const client = await getAuthenticatedClient();
  const targetUrl = normalizeWalletAddress(walletAddress);
  const wallet = await client.walletAddress.get({ url: targetUrl });

  const grant = await client.grant.request(
    { url: wallet.authServer },
    {
      access_token: {
        access: [{ type: 'incoming-payment', actions: ['list', 'read', 'read-all'] }]
      }
    }
  );

  if (!isFinalizedGrant(grant)) {
    throw new Error('Could not obtain grant to list incoming payments.');
  }

  const list = await client.incomingPayment.list(
    {
      url: wallet.resourceServer,
      walletAddress: wallet.id,
      accessToken: grant.access_token.value
    },
    { first: Math.min(25, Math.max(1, Number(limit) || 10)) }
  );

  return {
    live: true,
    walletAddress: wallet.id,
    paymentPointer: toPaymentPointer(wallet.id),
    payments: (list.result || []).map((p) => ({
      id: p.id,
      completed: p.completed,
      incomingAmount: p.incomingAmount,
      receivedAmount: p.receivedAmount,
      metadata: p.metadata,
      createdAt: p.createdAt,
      expiresAt: p.expiresAt
    }))
  };
}
