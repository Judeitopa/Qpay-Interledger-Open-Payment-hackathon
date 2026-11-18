import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { parseInterledgerQrData } from '../src/utils/interledgerApi.js';
import { createPaymentInvoice, applyIncomingPaymentCredit } from '../src/utils/paymentSync.js';

// Mock localStorage for Node test environment
const mockStorage = {};
global.localStorage = {
  getItem: (k) => mockStorage[k] || null,
  setItem: (k, v) => { mockStorage[k] = String(v); },
  removeItem: (k) => { delete mockStorage[k]; },
  clear: () => { Object.keys(mockStorage).forEach(k => delete mockStorage[k]); }
};
global.window = {
  dispatchEvent: () => {}
};
global.Event = class {};
global.CustomEvent = class {};

describe('Cross-Device QR Payment Architecture Tests', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('1. Device B creates an invoice with embedded syncId, qpayTag, amount and reference', async () => {
    const receiverUser = {
      id: 'usr_receiver_01',
      name: 'Dr. Chidi Obi',
      qpayTag: '@chidi',
      accountNumber: '0284918231',
      bankName: 'Interledger Open Payments',
      walletAddress: 'https://ilp.interledger-test.dev/qpay',
      balance: 10000
    };

    const invoiceResult = await createPaymentInvoice({
      recipientUser: receiverUser,
      amount: '7500',
      note: 'Medical Consulting'
    });

    assert.ok(invoiceResult.reference.startsWith('ILP_QPAY_'), 'Reference must follow Interledger Qpay pattern');
    assert.ok(invoiceResult.qrPayload, 'QR payload must be generated');

    // Parse the payload back to verify QR integrity
    const parsed = parseInterledgerQrData(invoiceResult.qrPayload);
    assert.strictEqual(parsed.accountName, 'Dr. Chidi Obi');
    assert.strictEqual(parsed.qpayTag, '@chidi');
    assert.strictEqual(parsed.amount, '7500');
    assert.strictEqual(parsed.reference, invoiceResult.reference);
  });

  it('2. Device A scans QR and parses recipient handle and exact payment amount', () => {
    const rawQrString = JSON.stringify({
      app: 'Qpay',
      type: 'interledger_invoice',
      syncId: 'sync_test_88192',
      ref: 'ILP_QPAY_991823',
      walletAddress: 'https://ilp.interledger-test.dev/qpay',
      paymentPointer: '$ilp.interledger-test.dev/qpay',
      accountNumber: '0284918231',
      accountName: 'Fatima Bello',
      qpayTag: '@fatima',
      bankName: 'Interledger Open Payments',
      amount: '12500',
      currency: 'NGN'
    });

    const invoice = parseInterledgerQrData(rawQrString);
    assert.ok(invoice, 'Invoice must be parsed from JSON payload');
    assert.strictEqual(invoice.syncId, 'sync_test_88192');
    assert.strictEqual(invoice.qpayTag, '@fatima');
    assert.strictEqual(invoice.accountName, 'Fatima Bello');
    assert.strictEqual(invoice.amount, '12500');
    assert.strictEqual(invoice.reference, 'ILP_QPAY_991823');
    assert.strictEqual(invoice.walletAddress, 'https://ilp.interledger-test.dev/qpay');
  });

  it('3. Double-entry ledger: Payer balance deducted and Recipient balance credited', () => {
    // Payer starts with 25,000 NGN
    let payerUser = { id: 'usr_payer', name: 'Amara Nwosu', balance: 25000 };
    // Receiver starts with 5,000 NGN
    let receiverUser = { id: 'usr_receiver', name: 'Babatunde Adeleke', balance: 5000 };

    const paymentAmount = 7500;

    // Payer deduction
    payerUser = { ...payerUser, balance: payerUser.balance - paymentAmount };
    assert.strictEqual(payerUser.balance, 17500, 'Payer balance must be deducted by 7,500');

    // Receiver credit
    const settlementEvent = {
      reference: 'KP_QPAY_LEDGER_TEST_01',
      amount: paymentAmount,
      payer: { name: payerUser.name, tag: '@amara' }
    };

    let updatedUserCallback = null;
    const creditedUser = applyIncomingPaymentCredit({
      payment: settlementEvent,
      currentUser: receiverUser,
      onUserUpdated: (u) => { updatedUserCallback = u; }
    });

    assert.strictEqual(creditedUser.balance, 12500, 'Receiver balance must increase from 5,000 to 12,500');
    assert.strictEqual(updatedUserCallback.balance, 12500, 'Callback must receive updated balance');

    // Conservation of money: Net transfer delta across system must be 0
    const totalBefore = 25000 + 5000;
    const totalAfter = payerUser.balance + creditedUser.balance;
    assert.strictEqual(totalAfter, totalBefore, 'Total currency in circulation must remain constant');
  });

  it('4. Idempotency: Multiple settlements of the same reference cannot double-credit', () => {
    const receiverUser = { id: 'usr_receiver_2', name: 'Seun Bakeries', balance: 20000 };
    const payment = {
      reference: 'KP_QPAY_IDEMPOTENT_REF_99',
      amount: 5000,
      payer: { name: 'Chinedu Okafor', tag: '@chinedu' }
    };

    // First credit
    const firstResult = applyIncomingPaymentCredit({ payment, currentUser: receiverUser });
    assert.strictEqual(firstResult.balance, 25000, 'First credit must increase balance');

    // Second credit attempt with the EXACT SAME transaction reference
    const secondResult = applyIncomingPaymentCredit({ payment, currentUser: firstResult });
    assert.strictEqual(secondResult, null, 'Second credit attempt must be rejected by idempotency shield');
  });
});
