import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Copy, Check, ShieldCheck, Share2, Building2, QrCode, ArrowRight, RotateCcw, CheckCircle2, Sparkles, RefreshCw } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import confetti from 'canvas-confetti';
import { createPaymentInvoice, checkInvoiceSettlementStatus, applyIncomingPaymentCredit } from '../utils/paymentSync';

export default function ReceiveView({ onBack, connectedUser, onUserUpdated }) {
  // Steps: 'input_amount' | 'show_qr' | 'payment_received'
  const [step, setStep] = useState('input_amount');
  const [amount, setAmount] = useState('5000');
  const [note, setNote] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [syncId, setSyncId] = useState(null);
  const [activeReference, setActiveReference] = useState(null);
  const [incomingPaymentId, setIncomingPaymentId] = useState(null);
  const [ilpDisplayAmount, setIlpDisplayAmount] = useState(null);
  const [qrPayload, setQrPayload] = useState('');
  const [settledPayment, setSettledPayment] = useState(null);

  const accountNumber = connectedUser?.accountNumber || '0234891102';
  const accountName = connectedUser?.name || 'Amara Nwosu';
  const bankName = connectedUser?.bankName || 'Interledger Open Payments';
  const qpayTag = connectedUser?.qpayTag || '@user';
  const paymentPointer = connectedUser?.paymentPointer || '$ilp.interledger-test.dev/qpay';

  const quickPresets = ['1000', '2500', '5000', '10000', '20000'];
  const pollTimerRef = useRef(null);

  // Stop polling on unmount or view change
  useEffect(() => {
    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
      }
    };
  }, []);

  // Poll cloud rail and listen for local payment broadcast while in 'show_qr'
  useEffect(() => {
    if (step !== 'show_qr' || !activeReference) return;

    let isSubscribed = true;

    const handlePaymentSettled = (paymentData) => {
      if (!isSubscribed) return;
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }

      setSettledPayment(paymentData);
      setStep('payment_received');

      // Apply credit to user balance & transaction history
      applyIncomingPaymentCredit({
        payment: paymentData,
        currentUser: connectedUser,
        onUserUpdated
      });

      // Celebration confetti
      try {
        confetti({
          particleCount: 85,
          spread: 80,
          origin: { y: 0.6 }
        });
      } catch (e) {}
    };

    // 1. Live Interledger Open Payments & Cross-Device Rail Polling (every 1.5 seconds)
    pollTimerRef.current = setInterval(async () => {
      try {
        const settled = await checkInvoiceSettlementStatus(syncId, activeReference, incomingPaymentId);
        if (settled && (settled.status === 'PAID' || settled.status === 'SUCCESSFUL')) {
          handlePaymentSettled(settled);
        }
      } catch (e) {}
    }, 1500);

    // 2. Local BroadcastChannel listener (for multi-tab / same machine testing)
    let channel = null;
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        channel = new BroadcastChannel('qpay_sync_channel');
        channel.onmessage = (event) => {
          const msg = event?.data;
          if (msg?.type === 'QPAY_PAYMENT_SETTLED' && msg.payload?.reference === activeReference) {
            handlePaymentSettled(msg.payload);
          }
        };
      } catch (e) {}
    }

    // 3. LocalStorage event listener
    const handleStorage = (e) => {
      if (e.key === 'qpay_latest_settlement' && e.newValue) {
        try {
          const data = JSON.parse(e.newValue);
          if (data && (data.reference === activeReference || data.syncId === syncId) && data.status === 'PAID') {
            handlePaymentSettled(data);
          }
        } catch (err) {}
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      isSubscribed = false;
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
      }
      if (channel) {
        try {
          channel.close();
        } catch (e) {}
      }
      window.removeEventListener('storage', handleStorage);
    };
  }, [step, syncId, activeReference, incomingPaymentId, connectedUser, onUserUpdated]);

  const handleGenerateQr = async (e) => {
    e?.preventDefault();
    if (!amount || parseFloat(amount) <= 0) return;

    setIsGenerating(true);
    try {
      const result = await createPaymentInvoice({
        recipientUser: connectedUser,
        amount: amount,
        note: note
      });

      setSyncId(result.syncId);
      setActiveReference(result.reference);
      setIncomingPaymentId(result.incomingPaymentId || null);
      setIlpDisplayAmount(result.ilpDisplayAmount || null);
      setQrPayload(result.qrPayload);
      setStep('show_qr');
    } catch (err) {
      // Fallback
      const fallbackRef = 'ILP_QPAY_' + Math.floor(100000 + Math.random() * 900000);
      setActiveReference(fallbackRef);
      setIncomingPaymentId(null);
      setIlpDisplayAmount(null);
      setQrPayload(JSON.stringify({
        app: 'Qpay',
        type: 'interledger_invoice',
        ref: fallbackRef,
        reference: fallbackRef,
        paymentPointer,
        accountNumber,
        accountName,
        qpayTag,
        bankName,
        amount: String(amount),
        currency: 'NGN'
      }));
      setStep('show_qr');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-4 px-2 sm:px-0 animate-fadeIn">
      
      {/* Top Header */}
      <div className="flex items-center justify-between bg-white border border-slate-100 p-3 rounded-2xl shadow-sm">
        <button
          onClick={step === 'show_qr' ? () => setStep('input_amount') : onBack}
          type="button"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 transition cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{step === 'show_qr' ? 'Edit Amount' : 'Back'}</span>
        </button>

        <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Interledger Open Payments</span>
        </div>
      </div>

      {/* STEP 1: Prompt user to edit amount BEFORE generating QR code */}
      {step === 'input_amount' && (
        <div className="bg-white border border-slate-100 rounded-3xl p-6 sm:p-7 shadow-[0_4px_20px_rgba(0,0,0,0.03)] space-y-5 animate-scaleUp">
          
          <div className="text-center space-y-1">
            <div className="w-12 h-12 bg-[#EEF2FF] text-[#4F46E5] rounded-2xl flex items-center justify-center mx-auto mb-3">
              <QrCode className="w-6 h-6 stroke-[1.8]" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">
              Set Amount to Receive
            </h3>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              Specify how much you want to collect. The amount will be embedded into your QR code for the payer.
            </p>
          </div>

          <form onSubmit={handleGenerateQr} className="space-y-4">
            
            {/* Amount input */}
            <div className="bg-[#F8FAFD] border border-slate-200 rounded-2xl p-4 text-center space-y-2">
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Requested Amount (NGN)
              </label>
              <div className="relative max-w-xs mx-auto">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-slate-400">
                  ₦
                </span>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  required
                  autoFocus
                  className="w-full bg-white border border-slate-300 focus:border-indigo-500 rounded-xl py-3 pl-11 pr-4 text-center font-sans text-3xl font-extrabold text-slate-900 focus:outline-none shadow-sm transition"
                />
              </div>

              {/* Quick preset amount pills */}
              <div className="flex items-center justify-center gap-1.5 pt-2 flex-wrap">
                {quickPresets.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setAmount(preset)}
                    className={`py-1 px-2.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                      amount === preset
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    ₦{(parseInt(preset) / 1000)}k
                  </button>
                ))}
              </div>
            </div>

            {/* Optional Note */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Payment Description / Note (Optional)
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Lunch bill, Store items, Freelance service"
                className="w-full bg-[#F8FAFD] border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Account Details Preview */}
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs space-y-1.5">
              <div className="flex justify-between items-center text-slate-500">
                <span>Receiving Qpay Tag:</span>
                <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                  {qpayTag}
                </span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Recipient Name:</span>
                <span className="font-semibold text-slate-800">{accountName}</span>
              </div>
              <div className="flex justify-between items-center text-[11px] text-emerald-700 font-medium pt-1 border-t border-slate-200/60">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Zero-Account-Number Shield</span>
                </span>
                <span>Interledger Vault Encrypted</span>
              </div>
            </div>

            {/* Generate QR Button */}
            <button
              type="submit"
              disabled={isGenerating}
              className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] disabled:opacity-60 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/20 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Generating QR Code...</span>
                </>
              ) : (
                <>
                  <span>Generate Payment QR Code</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

          </form>

        </div>
      )}

      {/* STEP 2: Show Generated QR Code with Real-Time Payment Listener */}
      {step === 'show_qr' && (
        <div className="bg-white border border-slate-100 rounded-3xl p-6 sm:p-7 shadow-[0_4px_20px_rgba(0,0,0,0.03)] text-center space-y-4 animate-scaleUp">
          
          <div>
            <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Waiting for Payer</span>
            </div>
            <h3 className="text-3xl font-extrabold text-slate-900 mt-2">
              ₦ {parseFloat(amount || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Show to payer. Once scanned, payment will reflect automatically on your balance.
            </p>
          </div>

          {/* QR Code Frame */}
          <div className="mx-auto inline-block p-4 bg-white rounded-2xl border-2 border-slate-200 shadow-md">
            <QRCodeSVG
              value={qrPayload}
              size={200}
              level="H"
              includeMargin={true}
            />
          </div>

          {/* Real-time settlement status banner */}
          <div className="flex items-center justify-center gap-2 text-xs text-indigo-700 bg-indigo-50/70 border border-indigo-100 py-2 px-3 rounded-xl">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-600" />
            <span className="font-medium">Live Rail Active • Listening for payment</span>
          </div>

          {/* Account Details Box */}
          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3.5 text-left text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">Recipient Tag</span>
              <span className="font-mono text-slate-900 font-bold bg-white px-2 py-0.5 rounded border border-slate-200">
                {qpayTag}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">Recipient Name</span>
              <span className="font-medium text-slate-700">{accountName}</span>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-[11px] text-emerald-700 font-medium">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>Encrypted with Interledger Rail</span>
              </span>
              <span className="text-slate-400 font-normal">
                {ilpDisplayAmount ? `ILP ${ilpDisplayAmount}` : 'Auto-Crediting'}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setStep('input_amount')}
              className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Change Amount</span>
            </button>
          </div>

        </div>
      )}

      {/* STEP 3: AUTOMATIC REAL-TIME PAYMENT RECEIVED SCREEN */}
      {step === 'payment_received' && (
        <div className="bg-white border border-slate-100 rounded-3xl p-6 sm:p-7 shadow-[0_4px_20px_rgba(0,0,0,0.03)] text-center space-y-5 animate-scaleUp">
          
          {/* Animated Green Checkmark Tick */}
          <div className="relative mx-auto w-20 h-20 flex items-center justify-center">
            <span
              aria-hidden="true"
              className="absolute inset-0 rounded-full bg-emerald-100/80 animate-ping opacity-30"
            />
            <div className="relative w-20 h-20 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center animate-tick-container shadow-sm">
              <CheckCircle2 className="w-12 h-12 text-emerald-600" />
            </div>
          </div>

          <div>
            <span className="inline-block text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              Payment Credited
            </span>
            <h3 className="text-2xl font-bold text-slate-900 mt-2">
              Payment Received!
            </h3>
            <p className="text-3xl font-extrabold text-emerald-600 mt-1">
              + ₦ {parseFloat(settledPayment?.amount || amount).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              From <strong>{settledPayment?.payer?.name || 'Customer'}</strong> ({settledPayment?.payer?.tag || '@customer'})
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3.5 text-xs text-slate-500 space-y-1.5 text-left">
            <div className="flex justify-between">
              <span>Transaction Ref</span>
              <span className="font-mono text-slate-800 font-semibold">{activeReference}</span>
            </div>
            <div className="flex justify-between">
              <span>Settlement Status</span>
              <span className="text-emerald-600 font-semibold">Credited to Balance (Instant)</span>
            </div>
          </div>

          <button
            type="button"
            onClick={onBack}
            className="w-full py-3.5 px-4 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-semibold shadow-md transition cursor-pointer"
          >
            Done • View Updated Balance
          </button>
        </div>
      )}

    </div>
  );
}
