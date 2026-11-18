import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeWalletAddress,
  toPaymentPointer,
  convertNgnToAssetMinorUnits,
  getInterledgerConfig,
  sealSessionToken,
  unsealSessionToken,
  resolveWalletAddress,
  createIncomingPayment,
  createQuote,
  initiateOutgoingPayment,
  getIncomingPaymentStatus,
  completeIncomingPayment
} from '../server/interledgerService.js';
import vercelHandler from '../api/interledger.js';

describe('Interledger Open Payments Backend Rail Tests', () => {
  it('1. Normalizes payment pointers ($host/path) and HTTPS wallet addresses', () => {
    assert.strictEqual(
      normalizeWalletAddress('$ilp.interledger-test.dev/qpay'),
      'https://ilp.interledger-test.dev/qpay'
    );
    assert.strictEqual(
      toPaymentPointer('https://ilp.interledger-test.dev/qpay'),
      '$ilp.interledger-test.dev/qpay'
    );
  });

  it('2. Converts Qpay NGN amounts into Open Payments wallet asset minor units', () => {
    const converted = convertNgnToAssetMinorUnits(3200, 'USD', 2);
    assert.strictEqual(converted.assetCode, 'USD');
    assert.strictEqual(converted.assetScale, 2);
    assert.strictEqual(Number(converted.value) > 0, true);
  });

  it('2b. Seals and unseals stateless encrypted session tokens for Vercel serverless cold starts', () => {
    const sample = {
      paymentSessionId: 'ilp_sess_test_123',
      reference: 'ILP_QPAY_TEST_999',
      continueUri: 'https://auth.interledger-test.dev/continue/abc',
      continueAccessToken: 'secret_continue_token_xyz'
    };
    const token = sealSessionToken(sample);
    assert.ok(token && typeof token === 'string', 'Must return an encrypted opaque token');
    assert.ok(!token.includes('secret_continue_token_xyz'), 'Token must not expose raw access token');
    const recovered = unsealSessionToken(token);
    assert.deepStrictEqual(recovered, sample, 'Unsealed payload must match original session');
    assert.strictEqual(unsealSessionToken(token + 'tampered'), null, 'Tampered token must fail GCM auth');
  });

  it('2c. Vercel serverless handler rewrites ?__route=... and preserves query parameters', async (t) => {
    const cfg = getInterledgerConfig();
    if (!cfg.configured) {
      t.skip('Interledger Open Payments credentials not configured in .env');
      return;
    }

    let statusCode = 0;
    let bodyText = '';
    const mockReq = {
      method: 'GET',
      url: '/api/interledger?__route=health'
    };
    const mockRes = {
      setHeader: () => {},
      end: (chunk) => { bodyText = String(chunk || ''); },
      set statusCode(code) { statusCode = code; },
      get statusCode() { return statusCode; }
    };

    await vercelHandler(mockReq, mockRes);
    assert.strictEqual(statusCode, 200, 'Vercel handler must return HTTP 200 for /health');
    const json = JSON.parse(bodyText);
    assert.strictEqual(json.success, true);
    assert.strictEqual(json.live, true);
  });

  it('3. Live Open Payments flow: Wallet -> Incoming Payment -> Quote -> Interactive Grant -> Complete', async (t) => {
    const cfg = getInterledgerConfig();
    if (!cfg.configured) {
      t.skip('Interledger Open Payments credentials not configured in .env');
      return;
    }

    // 1. Live wallet resolution
    const wallet = await resolveWalletAddress('$ilp.interledger-test.dev/qpay');
    assert.strictEqual(wallet.live, true);
    assert.strictEqual(wallet.id, 'https://ilp.interledger-test.dev/qpay');
    assert.ok(wallet.authServer, 'Wallet must return authServer');
    assert.ok(wallet.resourceServer, 'Wallet must return resourceServer');

    // 2. Live Incoming Payment creation
    const incoming = await createIncomingPayment({
      amountNgn: 4800,
      description: 'Automated Qpay Open Payments Verification'
    });
    assert.strictEqual(incoming.live, true);
    assert.ok(incoming.incomingPaymentId.includes('/incoming-payments/'));

    // 3. Live Quote creation
    const quote = await createQuote({ incomingPaymentId: incoming.incomingPaymentId });
    assert.strictEqual(quote.live, true);
    assert.ok(quote.quoteId.includes('/quotes/'));
    assert.ok(quote.debitAmount?.value);

    // 4. Live Interactive Outgoing Payment Grant initiation
    const initiated = await initiateOutgoingPayment({
      incomingPaymentId: incoming.incomingPaymentId,
      quoteId: quote.quoteId,
      amountNgn: 4800,
      redirectUri: 'http://localhost:3000/'
    });
    assert.strictEqual(initiated.live, true);
    assert.ok(initiated.paymentSessionId);
    assert.ok(initiated.interactRedirectUrl || initiated.outgoingPaymentId);

    // 5. Live Incoming Payment status & completion
    const statusBefore = await getIncomingPaymentStatus({
      incomingPaymentId: incoming.incomingPaymentId
    });
    assert.strictEqual(statusBefore.live, true);

    const completed = await completeIncomingPayment({
      incomingPaymentId: incoming.incomingPaymentId
    });
    assert.strictEqual(completed.live, true);
    assert.strictEqual(completed.completed, true);
  });
});
