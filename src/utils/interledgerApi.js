/**
 * Interledger Open Payments Frontend Client Service
 *
 * Communicates with the Qpay backend (/api/interledger/*) which executes
 * live HTTP-signed API calls against Interledger Open Payments servers.
 */

export const INTERLEDGER_CONFIG = {
  apiBaseUrl: '/api/interledger',
  defaultWalletAddress: 'https://ilp.interledger-test.dev/qpay',
  defaultPaymentPointer: '$ilp.interledger-test.dev/qpay',
  defaultUser: {
    id: 'ilp_usr_qpay',
    name: 'Amara Nwosu',
    email: 'amara.nwosu@qpay.africa',
    businessName: 'Amara Stores (Interledger Verified)',
    walletAddress: 'https://ilp.interledger-test.dev/qpay',
    paymentPointer: '$ilp.interledger-test.dev/qpay',
    accountNumber: '0234891102',
    bankName: 'Interledger Open Payments',
    currency: 'NGN',
    assetCode: 'USD',
    assetScale: 2,
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=120&auto=format&fit=crop&q=80',
    connectedAt: new Date().toISOString()
  }
};

const CONNECTED_USER_STORAGE_KEY = 'qpay_interledger_connected_user';
const PENDING_ILP_PAYMENT_KEY = 'qpay_pending_interledger_payment';

/**
 * Helper to call the backend Interledger Open Payments API
 */
async function callInterledgerBackend(path, options = {}) {
  if (typeof fetch !== 'function') {
    throw new Error('Fetch API is not available in this environment');
  }

  const isBrowser = typeof window !== 'undefined' && window.location && window.location.origin;
  if (!isBrowser && !path.startsWith('http')) {
    throw new Error('Backend API relative path unavailable outside browser context');
  }

  const controller = new AbortController();
  const timeoutMs = options.timeoutMs || 15000;
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${INTERLEDGER_CONFIG.apiBaseUrl}${path}`, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.success === false) {
      throw new Error(data.error || `Interledger API responded with status ${response.status}`);
    }
    return data;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Check live health & wallet status on the Interledger Open Payments backend
 */
export async function checkInterledgerHealth() {
  return callInterledgerBackend('/health');
}

/**
 * Resolve an Interledger Wallet Address live ($host/path or https://host/path)
 */
export async function resolveInterledgerWallet(walletAddress) {
  const query = walletAddress ? `?address=${encodeURIComponent(walletAddress)}` : '';
  return callInterledgerBackend(`/wallet${query}`);
}

/**
 * Create a live Open Payments Incoming Payment
 */
export async function createInterledgerIncomingPayment({
  amount,
  receiverWalletAddress,
  description,
  reference,
  metadata
}) {
  return callInterledgerBackend('/incoming-payments', {
    method: 'POST',
    body: {
      amountNgn: Number(amount) || 0,
      receiverWalletAddress: receiverWalletAddress || INTERLEDGER_CONFIG.defaultWalletAddress,
      description: description || 'Qpay Instant Settlement',
      externalRef: reference,
      metadata
    }
  });
}

/**
 * Check live settlement status of an Open Payments Incoming Payment
 */
export async function getInterledgerIncomingPaymentStatus({ incomingPaymentId, reference }) {
  const params = new URLSearchParams();
  if (incomingPaymentId) params.set('id', incomingPaymentId);
  if (reference) params.set('ref', reference);
  return callInterledgerBackend(`/incoming-payments/status?${params.toString()}`, {
    timeoutMs: 6000
  });
}

/**
 * Complete a live Open Payments Incoming Payment
 */
export async function completeInterledgerIncomingPayment({ incomingPaymentId, reference }) {
  return callInterledgerBackend('/incoming-payments/complete', {
    method: 'POST',
    body: { incomingPaymentId, reference }
  });
}

/**
 * Create a live Open Payments Quote (method: 'ilp')
 */
export async function createInterledgerQuote({ incomingPaymentId, senderWalletAddress }) {
  return callInterledgerBackend('/quotes', {
    method: 'POST',
    body: {
      incomingPaymentId,
      senderWalletAddress: senderWalletAddress || INTERLEDGER_CONFIG.defaultWalletAddress
    }
  });
}

/**
 * Initiate a full live Open Payments Outgoing Payment:
 * Creates live Incoming Payment (if needed) + live Quote + live Interactive Outgoing Payment Grant
 */
export async function initiateInterledgerPayment({
  incomingPaymentId,
  quoteId,
  senderWalletAddress,
  receiverWalletAddress,
  amount,
  description,
  reference,
  redirectUri,
  metadata
}) {
  const defaultRedirect =
    typeof window !== 'undefined' && window.location
      ? `${window.location.origin}${window.location.pathname}`
      : 'http://localhost:3000/';

  return callInterledgerBackend('/payments/initiate', {
    method: 'POST',
    body: {
      incomingPaymentId,
      quoteId,
      senderWalletAddress: senderWalletAddress || INTERLEDGER_CONFIG.defaultWalletAddress,
      receiverWalletAddress: receiverWalletAddress || INTERLEDGER_CONFIG.defaultWalletAddress,
      amountNgn: Number(amount) || 0,
      description: description || 'Qpay Transfer via Interledger Open Payments',
      externalRef: reference,
      redirectUri: redirectUri || defaultRedirect,
      metadata
    }
  });
}

/**
 * Finalize an Interactive Outgoing Payment after user authorization redirect
 */
export async function finalizeInterledgerPayment({ paymentSessionId, interactRef, sessionToken }) {
  return callInterledgerBackend('/payments/finalize', {
    method: 'POST',
    body: { paymentSessionId, interactRef, sessionToken }
  });
}

/**
 * List recent live Incoming Payments on the Interledger Test Wallet
 */
export async function listInterledgerPayments({ walletAddress, limit = 10 } = {}) {
  const params = new URLSearchParams();
  if (walletAddress) params.set('address', walletAddress);
  params.set('limit', String(limit));
  return callInterledgerBackend(`/payments/list?${params.toString()}`);
}

/**
 * Persist pending interactive payment metadata across the Interledger consent redirect
 */
export function savePendingInterledgerPayment(context) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PENDING_ILP_PAYMENT_KEY, JSON.stringify({ ...context, savedAt: Date.now() }));
  } catch {
    // ignore storage errors
  }
}

export function getPendingInterledgerPayment() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(PENDING_ILP_PAYMENT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearPendingInterledgerPayment() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(PENDING_ILP_PAYMENT_KEY);
  } catch {
    // ignore
  }
}

/**
 * Get the currently connected Interledger user profile from localStorage
 */
export function getStoredInterledgerUser() {
  if (typeof window === 'undefined') return null;
  const saved =
    localStorage.getItem(CONNECTED_USER_STORAGE_KEY) ||
    localStorage.getItem('qpay_korapay_connected_user');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Save connected Interledger user
 */
export function setStoredInterledgerUser(userData) {
  if (typeof window === 'undefined') return;
  if (!userData) {
    localStorage.removeItem(CONNECTED_USER_STORAGE_KEY);
    localStorage.removeItem('qpay_korapay_connected_user');
  } else {
    localStorage.setItem(CONNECTED_USER_STORAGE_KEY, JSON.stringify(userData));
  }
}

/**
 * Connect Qpay to Interledger Open Payments via live wallet address resolution
 */
export async function connectToInterledger({ walletAddress, email, name }) {
  const targetWallet = walletAddress || INTERLEDGER_CONFIG.defaultWalletAddress;
  let liveWallet = null;

  try {
    const res = await resolveInterledgerWallet(targetWallet);
    liveWallet = res.wallet;
  } catch (err) {
    console.warn('Live Interledger wallet handshake fallback:', err?.message);
  }

  const user = {
    ...INTERLEDGER_CONFIG.defaultUser,
    name: name || liveWallet?.publicName || INTERLEDGER_CONFIG.defaultUser.name,
    email: email || INTERLEDGER_CONFIG.defaultUser.email,
    walletAddress: liveWallet?.id || targetWallet,
    paymentPointer: liveWallet?.paymentPointer || targetWallet.replace(/^https?:\/\//i, '$'),
    assetCode: liveWallet?.assetCode || 'USD',
    assetScale: liveWallet?.assetScale ?? 2,
    authServer: liveWallet?.authServer || null,
    resourceServer: liveWallet?.resourceServer || null,
    liveVerified: Boolean(liveWallet?.live),
    connectedAt: new Date().toISOString()
  };

  setStoredInterledgerUser(user);
  return { success: true, user, liveWallet };
}

export function disconnectInterledger() {
  setStoredInterledgerUser(null);
}

/**
 * Parse QR Code data (supports Qpay / Interledger Open Payments JSON payloads,
 * Open Payments payment pointers ($host/path or https://...), URIs, or raw digits)
 */
export function parseInterledgerQrData(rawText) {
  if (!rawText || typeof rawText !== 'string') return null;

  const trimmed = rawText.trim();

  // Case 1: JSON payload (Qpay / Interledger Open Payments invoice)
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed);
      return {
        syncId: parsed.syncId || null,
        incomingPaymentId: parsed.incomingPaymentId || parsed.incoming_payment_id || null,
        walletAddress:
          parsed.walletAddress ||
          parsed.wallet_address ||
          INTERLEDGER_CONFIG.defaultWalletAddress,
        paymentPointer:
          parsed.paymentPointer ||
          parsed.payment_pointer ||
          INTERLEDGER_CONFIG.defaultPaymentPointer,
        ilpAmount: parsed.ilpAmount || parsed.incomingAmount || null,
        accountNumber: parsed.accountNumber || parsed.account_number || parsed.accNo || '0234891102',
        accountName:
          parsed.accountName ||
          parsed.account_name ||
          parsed.merchant ||
          parsed.name ||
          'Interledger Verified Merchant',
        qpayTag: parsed.qpayTag || parsed.tag || null,
        bankName:
          parsed.bankName ||
          parsed.bank_name ||
          parsed.bank ||
          'Interledger Open Payments',
        amount: parsed.amount ? String(parsed.amount) : '5000',
        currency: parsed.currency || 'NGN',
        reference: parsed.reference || parsed.ref || 'ILP_QPAY_' + Date.now()
      };
    } catch {
      // Continue to next parsers
    }
  }

  // Case 2: Direct Open Payments Wallet Address / Payment Pointer ($ilp... or https://ilp...)
  if (trimmed.startsWith('$') || /^https?:\/\/[^?\s]+$/i.test(trimmed)) {
    const normalizedUrl = trimmed.startsWith('$') ? 'https://' + trimmed.slice(1) : trimmed;
    const pointer = normalizedUrl.replace(/^https?:\/\//i, '$');
    const handlePart = normalizedUrl.split('/').filter(Boolean).pop() || 'merchant';
    return {
      walletAddress: normalizedUrl,
      paymentPointer: pointer,
      accountNumber: '0234891102',
      accountName: handlePart,
      qpayTag: '@' + handlePart.toLowerCase().replace(/[^a-z0-9_]/g, ''),
      bankName: 'Interledger Open Payments',
      amount: '5000',
      currency: 'NGN',
      reference: 'ILP_QPAY_' + Date.now()
    };
  }

  // Case 3: URL / query string (e.g. interledger://pay?wallet=...&amount=5000)
  if (trimmed.includes('?') && (trimmed.includes('wallet') || trimmed.includes('account') || trimmed.includes('amount'))) {
    try {
      const url = new URL(trimmed.startsWith('http') ? trimmed : 'https://qpay.app?' + trimmed.split('?')[1]);
      const params = url.searchParams;
      return {
        walletAddress: params.get('walletAddress') || params.get('wallet') || INTERLEDGER_CONFIG.defaultWalletAddress,
        paymentPointer: params.get('paymentPointer') || INTERLEDGER_CONFIG.defaultPaymentPointer,
        incomingPaymentId: params.get('incomingPaymentId') || null,
        accountNumber: params.get('accountNumber') || params.get('account_number') || '0234891102',
        accountName: params.get('accountName') || params.get('account_name') || 'Interledger Verified Merchant',
        bankName: params.get('bankName') || params.get('bank') || 'Interledger Open Payments',
        amount: params.get('amount') || '5000',
        currency: params.get('currency') || 'NGN',
        reference: params.get('ref') || 'ILP_QPAY_' + Date.now()
      };
    } catch {
      // Continue
    }
  }

  // Case 4: Raw digits (10-digit account number)
  const digitsOnly = trimmed.replace(/\D/g, '');
  if (digitsOnly.length >= 8 && digitsOnly.length <= 12) {
    return {
      walletAddress: INTERLEDGER_CONFIG.defaultWalletAddress,
      paymentPointer: INTERLEDGER_CONFIG.defaultPaymentPointer,
      accountNumber: digitsOnly,
      accountName: 'Interledger Wallet Holder',
      bankName: 'Interledger Open Payments',
      amount: '5000',
      currency: 'NGN',
      reference: 'ILP_QPAY_' + Date.now()
    };
  }

  // Generic fallback if text is scanned
  return {
    walletAddress: INTERLEDGER_CONFIG.defaultWalletAddress,
    paymentPointer: INTERLEDGER_CONFIG.defaultPaymentPointer,
    accountNumber: '0234891102',
    accountName: trimmed.slice(0, 30) || 'Interledger Merchant',
    bankName: 'Interledger Open Payments',
    amount: '5000',
    currency: 'NGN',
    reference: 'ILP_QPAY_' + Date.now()
  };
}
