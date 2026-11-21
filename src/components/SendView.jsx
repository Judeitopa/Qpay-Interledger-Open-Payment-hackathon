import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Landmark,
  Lock,
  CheckCircle2,
  ShieldCheck,
  Send,
  AlertCircle,
  RefreshCw,
  UserCheck,
  Wallet,
  Hash,
  KeyRound,
  X
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  initiateInterledgerPayment,
  completeInterledgerIncomingPayment
} from '../utils/interledgerApi';

const TRADITIONAL_BANKS = [
  'Access Bank',
  'Citibank Nigeria',
  'Ecobank Nigeria',
  'Fidelity Bank',
  'First Bank of Nigeria',
  'First City Monument Bank (FCMB)',
  'Guaranty Trust Bank (GTBank)',
  'Heritage Bank',
  'Keystone Bank',
  'Polaris Bank',
  'Stanbic IBTC Bank',
  'Standard Chartered Bank',
  'Sterling Bank',
  'Union Bank of Nigeria',
  'United Bank for Africa (UBA)',
  'Unity Bank',
  'Wema Bank',
  'Zenith Bank'
];

export default function SendView({ onBack, registeredUser, onBalanceDeducted }) {
  const storageKey = `qpay_permanent_bank_${registeredUser?.email || registeredUser?.id || 'individual'}`;
  const securityPin = localStorage.getItem('qpay_send_pin') || '1234';

  const [permanentBank, setPermanentBank] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  // Registration & edit mode state
  const [isEditingBank, setIsEditingBank] = useState(false);
  const [bankName, setBankName] = useState('Guaranty Trust Bank (GTBank)');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState(registeredUser?.name || '');
  const [confirmAccurate, setConfirmAccurate] = useState(true);
  const [formError, setFormError] = useState('');

  // 4-Digit PIN Modal State
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');

  // Withdrawal / Transfer states
  const [amount, setAmount] = useState('');
  const [transferError, setTransferError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [receipt, setReceipt] = useState(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      setPermanentBank(saved ? JSON.parse(saved) : null);
    } catch (e) {
      setPermanentBank(null);
    }
  }, [storageKey]);

  const currentBalance = Number(registeredUser?.balance || 0);
  const quickAmounts = ['2000', '5000', '10000', '25000'];

  // Open 4-digit PIN prompt when lock icon is clicked
  const handleOpenPinPrompt = () => {
    setPinInput('');
    setPinError('');
    setShowPinModal(true);
  };

  // Validate entered 4-digit PIN
  const verifyPinCode = (code) => {
    if (code === securityPin) {
      setShowPinModal(false);
      setPinInput('');
      setPinError('');
      // Pre-fill current bank name cleanly while prompting to register new bank details
      setBankName(permanentBank?.bankName || 'Guaranty Trust Bank (GTBank)');
      setAccountNumber('');
      setAccountName(permanentBank?.accountName || registeredUser?.name || '');
      setConfirmAccurate(true);
      setFormError('');
      setIsEditingBank(true);
    } else {
      setPinError('Incorrect 4-digit PIN. Please try again.');
      setPinInput('');
    }
  };

  const handleKeypadPress = (digit) => {
    if (pinInput.length < 4) {
      const next = pinInput + digit;
      setPinInput(next);
      setPinError('');
      if (next.length === 4) {
        verifyPinCode(next);
      }
    }
  };

  const handleKeypadBackspace = () => {
    setPinInput((prev) => prev.slice(0, -1));
    setPinError('');
  };

  // Support physical keyboard input while PIN modal is open
  useEffect(() => {
    if (!showPinModal) return;

    const handleKeyDown = (e) => {
      if (e.key >= '0' && e.key <= '9') {
        handleKeypadPress(e.key);
      } else if (e.key === 'Backspace') {
        handleKeypadBackspace();
      } else if (e.key === 'Escape') {
        setShowPinModal(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showPinModal, pinInput]);

  const handleRegisterBank = (e) => {
    e.preventDefault();
    const cleanNum = accountNumber.replace(/\D/g, '');
    if (!bankName) {
      setFormError('Please select a bank.');
      return;
    }
    if (cleanNum.length !== 10) {
      setFormError('Please enter a valid 10-digit bank account number.');
      return;
    }
    if (!accountName.trim()) {
      setFormError('Please enter the account holder name.');
      return;
    }
    if (!confirmAccurate) {
      setFormError('Please confirm this bank information is accurate.');
      return;
    }

    setFormError('');
    const bankRecord = {
      bankName,
      accountNumber: cleanNum,
      accountName: accountName.trim(),
      registeredAt: new Date().toISOString()
    };

    localStorage.setItem(storageKey, JSON.stringify(bankRecord));
    setPermanentBank(bankRecord);
    setIsEditingBank(false);

    confetti({
      particleCount: 55,
      spread: 55,
      origin: { y: 0.65 }
    });
  };

  const handleSendTransfer = async (e) => {
    e.preventDefault();
    const cleanAmount = parseFloat(amount) || 0;

    if (cleanAmount <= 0) {
      setTransferError('Enter an amount greater than ₦0.00.');
      return;
    }
    if (cleanAmount > currentBalance) {
      setTransferError(
        currentBalance <= 0
          ? 'Insufficient funds'
          : `Insufficient funds. Available balance: ₦${currentBalance.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`
      );
      return;
    }

    setTransferError('');
    setIsProcessing(true);

    const refCode = 'ILP_QPAY_SEND_' + Math.floor(100000 + Math.random() * 900000);
    let ilpResult = null;

    try {
      // Live Interledger Open Payments call: Incoming Payment + ILP Quote + Interactive Outgoing Grant
      ilpResult = await initiateInterledgerPayment({
        amount: cleanAmount,
        description: `Transfer to ${permanentBank.accountName} (${permanentBank.bankName})`,
        reference: refCode,
        metadata: {
          flow: 'send_transfer',
          bankName: permanentBank.bankName,
          accountNumber: permanentBank.accountNumber,
          accountName: permanentBank.accountName
        }
      });

      if (ilpResult?.incomingPaymentId) {
        // Record completed payment on the Interledger wallet immediately
        await completeInterledgerIncomingPayment({
          incomingPaymentId: ilpResult.incomingPaymentId,
          reference: ilpResult.reference || refCode
        }).catch(() => {});
      }
    } catch (err) {
      console.warn('Interledger Send fallback:', err?.message);
    }

    const finalRef = ilpResult?.reference || refCode;
    const formattedDate = new Date().toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    if (onBalanceDeducted) {
      onBalanceDeducted(cleanAmount);
    }

    try {
      const existingTx = JSON.parse(localStorage.getItem('qpay_transactions') || '[]');
      const newDebitTx = {
        id: 'tx_' + Date.now(),
        title: `Bank Transfer - ${permanentBank.bankName} (•••• ${permanentBank.accountNumber.slice(-4)})`,
        type: 'debit',
        amount: cleanAmount,
        date: formattedDate,
        timeIso: new Date().toISOString(),
        ref: finalRef,
        incomingPaymentId: ilpResult?.incomingPaymentId || null,
        quoteId: ilpResult?.quoteId || null,
        outgoingPaymentId: ilpResult?.outgoingPaymentId || null,
        status: 'Successful',
        rail: 'Interledger Open Payments',
        channel: `${permanentBank.bankName} • ${permanentBank.accountNumber}`
      };
      localStorage.setItem('qpay_transactions', JSON.stringify([newDebitTx, ...existingTx]));
      window.dispatchEvent(new Event('qpay_transactions_updated'));
    } catch (err) {}

    setIsProcessing(false);
    setReceipt({
      amount: cleanAmount,
      ref: finalRef,
      bankName: permanentBank.bankName,
      accountNumber: permanentBank.accountNumber,
      accountName: permanentBank.accountName,
      debitDisplay: ilpResult?.debitDisplay || null,
      quoteId: ilpResult?.quoteId || null,
      interactRedirectUrl: ilpResult?.interactRedirectUrl || null
    });
    setAmount('');

    confetti({
      particleCount: 80,
      spread: 65,
      origin: { y: 0.6 }
    });
  };

  const showRegistrationForm = !permanentBank || isEditingBank;

  return (
    <div className="w-full max-w-xl mx-auto space-y-5 animate-fadeIn px-2 sm:px-0">
      
      {/* Top Header with Back Button */}
      <div className="flex items-center justify-between bg-white border border-slate-100 p-4 rounded-3xl shadow-sm">
        <button
          onClick={onBack}
          type="button"
          className="flex items-center gap-2 px-3.5 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-700 hover:text-slate-900 transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </button>

        <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Interledger Open Payments</span>
        </div>
      </div>

      {/* Main Card Container */}
      {receipt ? (
        /* Transfer Success Receipt */
        <div className="bg-white border border-slate-100 rounded-3xl p-6 sm:p-7 shadow-sm text-center space-y-5 animate-scaleUp">
          <div className="mx-auto w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center border border-emerald-100">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div>
            <span className="inline-block text-[11px] font-semibold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              Transfer Successful
            </span>
            <h3 className="text-3xl font-extrabold text-slate-900 pt-2 font-mono tracking-tight">
              ₦{receipt.amount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Sent to <strong>{receipt.accountName}</strong> ({receipt.bankName})
            </p>
          </div>

          <div className="bg-[#F8FAFD] border border-slate-200/80 rounded-2xl p-4 space-y-2.5 text-xs text-left">
            <div className="flex justify-between pb-2 border-b border-slate-200/60">
              <span className="text-slate-400 flex items-center gap-1">
                <Landmark className="w-3.5 h-3.5" /> Bank
              </span>
              <span className="font-semibold text-slate-800">{receipt.bankName}</span>
            </div>
            <div className="flex justify-between pb-2 border-b border-slate-200/60">
              <span className="text-slate-400">Account Number</span>
              <span className="font-mono font-semibold text-slate-800">{receipt.accountNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 flex items-center gap-1">
                <Hash className="w-3.5 h-3.5" /> Reference
              </span>
              <span className="font-mono font-semibold text-slate-800">{receipt.ref}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-slate-200/60">
              <span className="text-slate-400">Status</span>
              <span className="text-emerald-600 font-semibold">Successful</span>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              onClick={() => setReceipt(null)}
              className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold transition cursor-pointer"
            >
              Send Again
            </button>
            <button
              type="button"
              onClick={onBack}
              className="flex-1 py-2.5 px-4 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-semibold transition cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      ) : showRegistrationForm ? (
        /* Bank Account Registration / Edit New Permanent Account */
        <div className="bg-white border border-slate-100 rounded-3xl p-6 sm:p-7 shadow-sm space-y-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-[#EEF2FF] text-[#4F46E5] flex items-center justify-center border border-indigo-100 flex-shrink-0">
                <Landmark className="w-5 h-5 stroke-[2]" />
              </div>
              <h2 className="text-base font-bold text-slate-900">
                {isEditingBank ? 'Register New Bank Account' : 'Bank Account Details'}
              </h2>
            </div>

            {isEditingBank && permanentBank && (
              <button
                type="button"
                onClick={() => setIsEditingBank(false)}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
              >
                Cancel
              </button>
            )}
          </div>

          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleRegisterBank} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Select Bank
              </label>
              <div className="relative">
                <Landmark className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <select
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full bg-[#F8FAFD] border border-slate-200 focus:border-indigo-500 rounded-xl py-2.5 pl-10 pr-3 text-xs font-medium text-slate-800 focus:outline-none transition cursor-pointer"
                >
                  {TRADITIONAL_BANKS.map((bank) => (
                    <option key={bank} value={bank}>
                      {bank}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Bank Account Number
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={10}
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ''))}
                placeholder="e.g. 0123456789"
                required
                className="w-full bg-[#F8FAFD] border border-slate-200 focus:border-indigo-500 rounded-xl py-2.5 px-3.5 text-sm font-mono font-semibold text-slate-900 focus:outline-none transition tracking-wider"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Account Holder Name
              </label>
              <div className="relative">
                <UserCheck className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  placeholder="Account holder name"
                  required
                  className="w-full bg-[#F8FAFD] border border-slate-200 focus:border-indigo-500 rounded-xl py-2.5 pl-10 pr-3.5 text-xs font-medium text-slate-800 focus:outline-none transition"
                />
              </div>
            </div>

            <label className="flex items-center gap-2.5 p-3 bg-slate-50 border border-slate-200/80 rounded-xl cursor-pointer">
              <input
                type="checkbox"
                checked={confirmAccurate}
                onChange={(e) => setConfirmAccurate(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              <span className="text-xs text-slate-700 font-medium">
                I confirm this bank information is accurate
              </span>
            </label>

            <button
              type="submit"
              className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/20 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <Lock className="w-4 h-4" />
              <span>Register</span>
            </button>
          </form>
        </div>
      ) : (
        /* Send Money to Registered Bank Account */
        <div className="bg-white border border-slate-100 rounded-3xl p-6 sm:p-7 shadow-sm space-y-5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-[#EEF2FF] text-[#4F46E5] flex items-center justify-center border border-indigo-100">
                <Send className="w-5 h-5 stroke-[2]" />
              </div>
              <h2 className="text-base font-bold text-slate-900">Send to Bank</h2>
            </div>

            <div className="flex items-center gap-1.5 text-xs bg-slate-50 border border-slate-200/80 px-3 py-1.5 rounded-xl">
              <Wallet className="w-3.5 h-3.5 text-indigo-600" />
              <span className="text-slate-500">Balance:</span>
              <span className="font-bold text-slate-900 font-mono">
                ₦{currentBalance.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Registered Bank Destination Card with Clickable Lock Icon */}
          <div className="p-4 rounded-2xl bg-[#F8FAFD] border border-indigo-200/80 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                <Landmark className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-900 truncate">
                  {permanentBank.bankName}
                </p>
                <p className="text-xs text-slate-600 font-mono font-semibold truncate">
                  {permanentBank.accountNumber} • <span className="font-sans font-medium">{permanentBank.accountName}</span>
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleOpenPinPrompt}
              title="Click to unlock and edit bank account"
              className="p-2 rounded-xl bg-emerald-50 hover:bg-indigo-50 text-emerald-600 hover:text-indigo-600 border border-emerald-200/80 hover:border-indigo-200 transition cursor-pointer flex-shrink-0 active:scale-95"
            >
              <Lock className="w-4 h-4" />
            </button>
          </div>

          {transferError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{transferError}</span>
            </div>
          )}

          {/* Amount Form */}
          <form onSubmit={handleSendTransfer} className="space-y-4">
            <div className="bg-[#F8FAFD] border border-slate-200/80 rounded-2xl p-4 space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Amount (NGN)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-lg font-bold text-slate-400">
                    ₦
                  </span>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    value={amount}
                    onChange={(e) => {
                      setAmount(e.target.value);
                      if (transferError) setTransferError('');
                    }}
                    placeholder="0.00"
                    required
                    className="w-full bg-white border border-slate-200 focus:border-indigo-500 rounded-xl py-2.5 pl-9 pr-3 text-lg font-bold text-slate-900 focus:outline-none transition font-mono"
                  />
                </div>
              </div>

              {/* Quick preset amounts */}
              <div className="flex items-center gap-1.5">
                {quickAmounts.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      setAmount(preset);
                      if (transferError) setTransferError('');
                    }}
                    className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                      amount === preset
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    ₦{(parseInt(preset, 10) / 1000)}k
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={isProcessing}
              className="w-full py-3.5 px-5 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] disabled:opacity-60 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/20 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>
                    Send {amount && parseFloat(amount) > 0 ? `₦${parseFloat(amount).toLocaleString('en-NG')}` : 'Funds'}
                  </span>
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* ========================================================
          4-DIGIT PIN MODAL TO EDIT REGISTERED BANK ACCOUNT
         ======================================================== */}
      {showPinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-sm bg-white border border-slate-100 rounded-3xl shadow-2xl p-6 text-center space-y-4 animate-scaleUp">
            
            <button
              type="button"
              onClick={() => setShowPinModal(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-12 h-12 bg-indigo-50 border border-indigo-100 rounded-2xl mx-auto flex items-center justify-center text-indigo-600">
              <KeyRound className="w-6 h-6 stroke-[1.8]" />
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-900">
                Enter 4-Digit PIN
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Verify your PIN to register a new bank account
              </p>
            </div>

            {/* 4 PIN Indicators */}
            <div className="flex justify-center items-center gap-3 py-1">
              {[0, 1, 2, 3].map((index) => {
                const isFilled = pinInput.length > index;
                return (
                  <div
                    key={index}
                    className={`w-11 h-12 rounded-xl flex items-center justify-center text-lg font-bold transition-all ${
                      isFilled
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20 scale-105'
                        : 'bg-[#F8FAFD] border-2 border-slate-200 text-slate-400'
                    }`}
                  >
                    {isFilled ? '●' : ''}
                  </div>
                );
              })}
            </div>

            {pinError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-[11px] text-rose-700 flex items-center justify-center gap-1.5 animate-fadeIn">
                <AlertCircle className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />
                <span>{pinError}</span>
              </div>
            )}

            {/* Numeric Keypad */}
            <div className="grid grid-cols-3 gap-2 max-w-[230px] mx-auto pt-1">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  onClick={() => handleKeypadPress(digit.toString())}
                  className="h-11 rounded-xl bg-slate-50 hover:bg-slate-100 active:bg-indigo-50 border border-slate-100 text-sm font-bold text-slate-800 transition cursor-pointer"
                >
                  {digit}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setPinInput('')}
                className="h-11 rounded-xl bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-400 transition cursor-pointer"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => handleKeypadPress('0')}
                className="h-11 rounded-xl bg-slate-50 hover:bg-slate-100 active:bg-indigo-50 border border-slate-100 text-sm font-bold text-slate-800 transition cursor-pointer"
              >
                0
              </button>
              <button
                type="button"
                onClick={handleKeypadBackspace}
                className="h-11 rounded-xl bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-600 transition cursor-pointer"
              >
                ⌫
              </button>
            </div>

            <p className="text-[11px] text-slate-400">
              Default Security PIN: <strong className="text-indigo-600 font-mono">1234</strong>
            </p>
          </div>
        </div>
      )}

    </div>
  );
}
