import React, { useState, useRef, useEffect } from 'react';
import { Eye, EyeOff, ShieldCheck, Wallet, Plus, ChevronRight, ChevronDown, TrendingUp, Receipt, Check } from 'lucide-react';

const CURRENCY_OPTIONS = [
  { shortCode: 'NG', assetCode: 'NGN', symbol: '₦' },
  { shortCode: 'US', assetCode: 'USD', symbol: '$' },
  { shortCode: 'EU', assetCode: 'EUR', symbol: '€' },
  { shortCode: 'GB', assetCode: 'GBP', symbol: '£' },
  { shortCode: 'ZA', assetCode: 'ZAR', symbol: 'R' },
  { shortCode: 'MX', assetCode: 'MXN', symbol: 'MX$' },
  { shortCode: 'KE', assetCode: 'KES', symbol: 'KSh' },
  { shortCode: 'CA', assetCode: 'CAD', symbol: 'CA$' }
];

export default function BalanceDashboard({ 
  registeredUser, 
  onAddMoneyClick, 
  onOpenProfile, 
  onOpenTransactionHistory,
  customerPaymentsTotal = 0 
}) {
  const [showBalance, setShowBalance] = useState(true);
  const [currencyMenuOpen, setCurrencyMenuOpen] = useState(false);
  const [incomingNotice, setIncomingNotice] = useState('');
  const dropdownRef = useRef(null);
  const noticeTimerRef = useRef(null);
  const isIndividual = registeredUser?.type !== 'business';
  const tier = registeredUser?.tier || 1;

  useEffect(() => {
    return () => {
      if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!currencyMenuOpen) return;
    const handleOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setCurrencyMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [currencyMenuOpen]);

  const handleCurrencySelect = (curr) => {
    if (curr.assetCode === 'NGN') {
      setIncomingNotice('');
      setCurrencyMenuOpen(false);
      return;
    }

    setIncomingNotice('Incoming feature');
    setCurrencyMenuOpen(false);
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    noticeTimerRef.current = setTimeout(() => {
      setIncomingNotice('');
    }, 2500);
  };

  // For Business, total customer payments received reflects in total balance dashboard
  const balanceAmount = isIndividual
    ? (registeredUser?.balance ?? 0)
    : ((registeredUser?.balance ?? 0) + (customerPaymentsTotal || 0));

  // Tier 1 for business is 500,000/day, while individual remains 50,000/day
  const tierLimits = isIndividual ? {
    1: '₦50,000.00 / day',
    2: '₦500,000.00 / day',
    3: '₦5,000,000.00 / day'
  } : {
    1: '₦500,000.00 / day',
    2: '₦5,000,000.00 / day',
    3: 'Unlimited / day'
  };

  const formattedBalance = new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 2,
  }).format(balanceAmount);

  return (
    <div className="w-full max-w-xl mx-auto mb-8 animate-fadeIn">
      {/* 1. Main Available Balance Card (Original Layout Preserved) */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] p-6 sm:p-7 relative">
        
        {/* Subtle decorative background gradient */}
        <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none">
          <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-indigo-50/70 to-transparent rounded-bl-full" />
        </div>

        <div className="relative z-10 space-y-4">
          
          {/* Top Row: Label, Tiny NG Currency Dropdown, Eye toggle, Account Type Tag */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#EEF2FF] text-[#4F46E5] flex items-center justify-center">
                <Wallet className="w-4 h-4 stroke-[2]" />
              </div>
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                Available Balance
              </span>

              {/* Tiny NG Currency Pill with Hover Dropdown */}
              <div
                ref={dropdownRef}
                className="relative inline-flex items-center"
                onMouseEnter={() => setCurrencyMenuOpen(true)}
                onMouseLeave={() => setCurrencyMenuOpen(false)}
              >
                <button
                  type="button"
                  onClick={() => setCurrencyMenuOpen((prev) => !prev)}
                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/80 text-[10px] font-bold tracking-wide transition cursor-pointer leading-none"
                  aria-haspopup="listbox"
                  aria-expanded={currencyMenuOpen}
                >
                  <span>NG</span>
                  <ChevronDown className={`w-2.5 h-2.5 transition-transform ${currencyMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {currencyMenuOpen && (
                  <div className="absolute left-0 top-full pt-1.5 z-50">
                    <div
                      role="listbox"
                      className="w-44 bg-white border border-slate-200/90 rounded-xl shadow-xl py-1 animate-fadeIn"
                    >
                      {CURRENCY_OPTIONS.map((curr) => {
                        const isNaira = curr.assetCode === 'NGN';
                        return (
                          <button
                            key={curr.assetCode}
                            type="button"
                            role="option"
                            aria-selected={isNaira}
                            onClick={() => handleCurrencySelect(curr)}
                            className={`w-full px-3 py-1.5 text-left flex items-center justify-between gap-2 text-xs transition cursor-pointer ${
                              isNaira
                                ? 'bg-indigo-50/80 text-indigo-700 font-semibold'
                                : 'text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="inline-flex items-center justify-center w-6 px-1 py-0.5 rounded bg-slate-100 text-[10px] font-bold text-slate-700 flex-shrink-0">
                                {curr.shortCode}
                              </span>
                              <div className="truncate">
                                <span className="font-semibold">{curr.assetCode}</span>
                                <span className="text-[10px] text-slate-400 ml-1">{curr.symbol}</span>
                              </div>
                            </div>
                            {isNaira && <Check className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {incomingNotice && (
                  <div className="absolute left-0 top-full mt-1.5 z-50 whitespace-nowrap px-2.5 py-1 rounded-lg bg-slate-900 text-white text-[11px] font-medium shadow-lg animate-fadeIn">
                    {incomingNotice}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => setShowBalance(!showBalance)}
                className="text-slate-400 hover:text-slate-600 transition p-1 rounded-lg cursor-pointer"
                title={showBalance ? "Hide balance" : "Show balance"}
              >
                {showBalance ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Account Type Badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-50 border border-slate-200/80 rounded-full text-xs font-medium text-slate-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="capitalize">{registeredUser?.type || 'Individual'} Account</span>
            </div>
          </div>

          {/* Balance Display with Add Money CTA for Individual */}
          <div className="pt-1 flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 font-sans">
                {showBalance ? formattedBalance : '₦ ••••••••'}
              </div>
              
              <div className="flex items-center gap-2 flex-wrap mt-1">
                <p className="text-xs text-slate-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Powered by Interledger Open Payments</span>
                </p>

                {/* For Business: Reflect total customer payments received */}
                {!isIndividual && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                    <TrendingUp className="w-3 h-3 text-emerald-600" />
                    <span>Customer Payments: ₦{(customerPaymentsTotal || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}</span>
                  </span>
                )}
              </div>
            </div>

            {/* "Add money" tab/button with + icon for Individual Dashboard */}
            {isIndividual && (
              <button
                type="button"
                onClick={onAddMoneyClick}
                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/20 transition active:scale-95 cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Add money</span>
              </button>
            )}
          </div>

          {/* Quick Balance Indicators Bar */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">Tag:</span>
              <span className="font-semibold text-indigo-700 font-mono text-[11px] bg-indigo-50/80 px-2 py-0.5 rounded-md border border-indigo-100">
                {registeredUser?.qpayTag || '@' + (registeredUser?.name?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'user')}
              </span>
            </div>

            {/* Tier limit indicator with clickable upgrade trigger */}
            <button
              type="button"
              onClick={onOpenProfile}
              className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-indigo-600 font-medium transition group cursor-pointer"
            >
              <span>Tier {tier} Limit: {tierLimits[tier] || '₦50,000.00 / day'}</span>
              <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>

        </div>
      </div>

      {/* 2. "Transaction history" Button Just Below AVAILABLE BALANCE (Only for Individual accounts) */}
      {isIndividual && (
        <div className="mt-3">
          <button
            type="button"
            onClick={onOpenTransactionHistory}
            className="w-full flex items-center justify-between p-3.5 sm:p-4 bg-white hover:bg-slate-50/80 rounded-2xl border border-slate-100 hover:border-indigo-200 shadow-[0_2px_12px_rgba(0,0,0,0.02)] hover:shadow-sm transition cursor-pointer group select-none"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#EEF2FF] text-[#4F46E5] flex items-center justify-center group-hover:scale-105 transition-transform">
                <Receipt className="w-4 h-4 stroke-[2]" />
              </div>
              <div className="text-left">
                <span className="text-xs font-bold text-slate-800 group-hover:text-indigo-600 transition block">
                  Transaction history
                </span>
                <p className="text-[11px] text-slate-400">
                  View all previous transactions
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 text-xs font-semibold text-indigo-600 group-hover:translate-x-0.5 transition-transform">
              <span>View</span>
              <ChevronRight className="w-4 h-4" />
            </div>
          </button>
        </div>
      )}

    </div>
  );
}
