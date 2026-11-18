import React, { useState } from 'react';
import {
  ArrowRight,
  QrCode,
  Store,
  User,
  Clock,
  ShoppingBag,
  LogIn
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import VintagePaperTag from './VintagePaperTag';

const DEMO_AMOUNTS = [
  { label: '₦5,000', value: 5000, itemLabel: 'Lunch Split' },
  { label: '₦14,500', value: 14500, itemLabel: '2x Jollof & Chapman' },
  { label: '₦28,000', value: 28000, itemLabel: 'Group Table Bill' }
];

const REGULARS = [
  {
    id: 'chinedu',
    name: 'Chinedu Okafor',
    tag: '@chinedu',
    visits: 4,
    totalSpend: '₦68,400',
    activeDays: [false, false, false, false, true, true, false], // Mon-Sun (Fri, Sat)
    windowLabel: 'Fridays & Saturdays • 5:00 PM – 8:30 PM',
    monthCycle: 'First & last weekends every month',
    topBuys: [
      { item: 'Smoky Jollof Bowl', qty: '7 orders', pct: 90 },
      { item: 'Chilled Chapman', qty: '5 orders', pct: 66 }
    ]
  },
  {
    id: 'bolanle',
    name: 'Bolanle Adeleke',
    tag: '@bolanle',
    visits: 3,
    totalSpend: '₦41,200',
    activeDays: [false, false, true, false, false, false, false], // Wed
    windowLabel: 'Wednesdays • 12:30 PM – 2:30 PM',
    monthCycle: 'Weekly mid-week office lunch',
    topBuys: [
      { item: 'Grilled Chicken Wrap', qty: '5 orders', pct: 84 },
      { item: 'Fresh Pineapple Juice', qty: '4 orders', pct: 62 }
    ]
  },
  {
    id: 'fatima',
    name: 'Fatima Bello',
    tag: '@fatima',
    visits: 2,
    totalSpend: '₦24,800',
    activeDays: [false, false, false, false, false, false, true], // Sun
    windowLabel: 'Sundays • 3:00 PM – 6:00 PM',
    monthCycle: 'Month-end family visits',
    topBuys: [
      { item: 'Family Pastry Box', qty: '3 orders', pct: 82 },
      { item: 'Iced Caramel Latte', qty: '3 orders', pct: 74 }
    ]
  }
];

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export default function LandingPage({ onLoginClick }) {
  const [scanMode, setScanMode] = useState('merchant'); // 'merchant' | 'peer'
  const [selectedAmountIdx, setSelectedAmountIdx] = useState(1);
  const [activeRegularId, setActiveRegularId] = useState('chinedu');

  const activeAmount = DEMO_AMOUNTS[selectedAmountIdx];
  const activeRegular =
    REGULARS.find((r) => r.id === activeRegularId) || REGULARS[0];

  const receiptReceiver =
    scanMode === 'merchant'
      ? {
          title: 'Amara Bites',
          handle: '@amarabites',
          subtitle: 'Merchant Counter • ' + activeAmount.itemLabel,
          qrValue: `qpay://pay?to=@amarabites&type=business&amount=${activeAmount.value}`
        }
      : {
          title: 'Tunde Adeyemi',
          handle: '@tunde',
          subtitle: 'Fellow Qpay User • Instant Transfer',
          qrValue: `qpay://pay?to=@tunde&type=individual&amount=${activeAmount.value}`
        };

  return (
    <div className="min-h-screen bg-[#F8FAFD] text-slate-900 font-sans flex flex-col selection:bg-indigo-100 selection:text-indigo-900">
      {/* Signature hairline top accent */}
      <div className="w-full h-[3px] bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600 fixed top-0 left-0 z-50" />

      {/* Minimal Header — Unchanged top-left brand sizing */}
      <header className="sticky top-[3px] z-40 w-full bg-[#F8FAFD]/90 backdrop-blur-md border-b border-slate-200/70">
        <div className="max-w-6xl mx-auto px-6 sm:px-10 h-20 flex items-center justify-between">
          {/* Upper Top-Left Logo & Brand Text */}
          <a href="#top" className="flex items-center gap-3 focus:outline-none">
            <img
              src="/logo.jpg"
              alt="Qpay Logo"
              className="w-11 h-11 rounded-xl object-contain shadow-sm border border-slate-100"
            />
            <span className="text-2xl font-bold tracking-tight text-slate-900">
              Qpay
            </span>
          </a>

          <div className="flex items-center gap-6 sm:gap-8">
            <nav className="hidden md:flex items-center gap-7 text-xs font-semibold text-slate-500">
              <a href="#scan-flow" className="hover:text-slate-900 transition-colors">
                How It Works
              </a>
              <a href="#retention" className="hover:text-slate-900 transition-colors">
                Customer Insights
              </a>
            </nav>

            <button
              type="button"
              onClick={onLoginClick}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-slate-900 hover:bg-indigo-600 text-white text-xs font-semibold transition-colors cursor-pointer active:scale-[0.98]"
            >
              <span>Log In</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      <main id="top" className="flex-1">
        {/* ============================================================ */}
        {/* HERO: LARGE BREATHABLE EDITORIAL + TACTILE THERMAL RECEIPT   */}
        {/* ============================================================ */}
        <section className="max-w-6xl mx-auto px-6 sm:px-10 pt-12 pb-20 sm:pt-20 sm:pb-28">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-14 items-center">
            {/* Editorial Copy Side */}
            <div className="lg:col-span-6 space-y-7">
              <h1 className="text-4xl sm:text-5xl lg:text-[54px] font-extrabold text-slate-900 tracking-[-0.03em] leading-[1.06]">
                One simple scan. Zero wrong transfers.
              </h1>

              <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-lg">
                Qpay removes 10-digit account numbers from everyday payments. Set the exact amount straight inside a QR code to pay fellow Qpay users or businesses in seconds—while merchants learn exactly what keeps their customers coming back.
              </p>

              <div className="flex flex-wrap items-center gap-5 pt-1">
                <button
                  type="button"
                  onClick={onLoginClick}
                  className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-sm transition cursor-pointer active:scale-[0.98] group"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Log In</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </button>

                <a
                  href="#retention"
                  className="text-sm font-semibold text-slate-600 hover:text-indigo-600 transition-colors underline underline-offset-4 decoration-slate-300 hover:decoration-indigo-400"
                >
                  Why merchants switch to Qpay
                </a>
              </div>

              <div className="pt-4 border-t border-slate-200/80 grid grid-cols-3 gap-4 max-w-md text-xs">
                <div>
                  <span className="block font-bold text-slate-900">Zero Digits</span>
                  <span className="text-slate-500">No account typos</span>
                </div>
                <div>
                  <span className="block font-bold text-slate-900">Exact QR Total</span>
                  <span className="text-slate-500">Baked into the code</span>
                </div>
                <div>
                  <span className="block font-bold text-slate-900">Habit Insights</span>
                  <span className="text-slate-500">Built for retention</span>
                </div>
              </div>
            </div>

            {/* Interactive Artifact: Sleek Counter Pad + Tactile Sawtooth QR Receipt */}
            <div className="lg:col-span-6">
              <div className="bg-slate-900 rounded-[32px] p-6 sm:p-8 shadow-[0_24px_60px_-20px_rgba(15,23,42,0.35)] max-w-md mx-auto relative">
                {/* Counter Controls Above Paper */}
                <div className="flex items-center justify-between gap-2 mb-7">
                  <div className="inline-flex rounded-full bg-slate-800 p-1">
                    <button
                      type="button"
                      onClick={() => setScanMode('merchant')}
                      className={`px-3 py-1.5 rounded-full text-[11px] font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                        scanMode === 'merchant'
                          ? 'bg-white text-slate-900'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Store className="w-3 h-3" />
                      <span>Business</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setScanMode('peer')}
                      className={`px-3 py-1.5 rounded-full text-[11px] font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                        scanMode === 'peer'
                          ? 'bg-white text-slate-900'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <User className="w-3 h-3" />
                      <span>Fellow User</span>
                    </button>
                  </div>

                  {/* Interactive Embedded Amount Chooser */}
                  <div className="flex items-center gap-1">
                    {DEMO_AMOUNTS.map((amt, idx) => (
                      <button
                        key={amt.label}
                        type="button"
                        onClick={() => setSelectedAmountIdx(idx)}
                        className={`px-2 py-1 rounded-lg font-mono text-[10px] font-semibold transition cursor-pointer ${
                          selectedAmountIdx === idx
                            ? 'bg-indigo-500 text-white'
                            : 'bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {amt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Authentic Qpay Thermal Paper Ticket */}
                <div className="thermal-bill-container px-6 pt-5 pb-6 mx-auto relative">
                  <div className="thermal-bill-sawtooth-top" />
                  <div className="thermal-bill-sawtooth-bottom" />

                  {/* Struck-out Bank Account Error Line */}
                  <div className="flex items-center justify-between text-[11px] font-mono border-b border-dashed border-slate-300 pb-3 mb-4">
                    <span className="text-slate-400 line-through">
                      ACCT: 012 948 1102
                    </span>
                    <span className="text-emerald-700 font-bold">
                      {receiptReceiver.handle}
                    </span>
                  </div>

                  {/* Receiver + Embedded Amount */}
                  <div className="flex items-start justify-between gap-4 mb-5">
                    <div>
                      <p className="text-sm font-bold text-slate-900">
                        {receiptReceiver.title}
                      </p>
                      <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                        {receiptReceiver.subtitle}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="block text-[9px] font-mono uppercase tracking-wider text-slate-400">
                        Embedded Total
                      </span>
                      <span className="text-xl font-extrabold font-mono text-slate-900">
                        {activeAmount.label}
                      </span>
                    </div>
                  </div>

                  {/* Embedded QR Code */}
                  <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col items-center relative overflow-hidden">
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute left-4 right-4 h-0.5 bg-indigo-500/70 shadow-[0_0_8px_rgba(79,70,229,0.6)] animate-scanBeam"
                    />
                    <QRCodeSVG
                      value={receiptReceiver.qrValue}
                      size={136}
                      level="M"
                      fgColor="#0F172A"
                      bgColor="#FFFFFF"
                    />
                    <span className="mt-2.5 text-[10px] font-mono text-slate-400 tracking-tight">
                      SCAN WITH QPAY TO PAY {activeAmount.label}
                    </span>
                  </div>

                  {/* Ticket Bottom Row */}
                  <div className="mt-4 pt-3 border-t border-dashed border-slate-300 flex items-center justify-between">
                    <span className="text-[10px] font-mono text-slate-500">
                      ZERO MANUAL DIGITS
                    </span>
                    {scanMode === 'merchant' ? (
                      <VintagePaperTag count={4} />
                    ) : (
                      <span className="text-[10px] font-mono font-bold text-indigo-700">
                        INSTANT P2P
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/* CHAPTER 2: ARCHITECTURAL SPLIT — HOW IT SOLVES TRANSFERS     */}
        {/* ============================================================ */}
        <section
          id="scan-flow"
          className="border-t border-slate-200/80 bg-white py-20 sm:py-24 px-6 sm:px-10"
        >
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
            <div className="lg:col-span-5 lg:sticky lg:top-28 space-y-4">
              <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-indigo-600 font-semibold">
                Built around the scan
              </p>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-[1.12]">
                Stop typing account numbers into bank apps.
              </h2>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                One mistyped digit sends money to a stranger. Qpay locks the verified recipient and the exact figure inside one dynamic QR code before anyone pays.
              </p>
            </div>

            {/* Clean Typographic Hairline Rows instead of 3 Card Boxes */}
            <div className="lg:col-span-7 divide-y divide-slate-200 border-y border-slate-200">
              <div className="py-7 sm:py-8 flex items-start gap-6">
                <span className="font-mono text-xs font-bold text-indigo-600 pt-1">
                  01
                </span>
                <div className="space-y-1.5">
                  <h3 className="text-lg font-bold text-slate-900">
                    The receiver sets the amount inside the QR
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Whether a storefront ringing up an order or a friend splitting dinner, enter the amount once. Qpay embeds it directly inside the QR—the payer never guesses what to send.
                  </p>
                </div>
              </div>

              <div className="py-7 sm:py-8 flex items-start gap-6">
                <span className="font-mono text-xs font-bold text-indigo-600 pt-1">
                  02
                </span>
                <div className="space-y-1.5">
                  <h3 className="text-lg font-bold text-slate-900">
                    Scan to pay businesses or fellow Qpay users
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Point your Qpay camera at the code. The receiver name and exact figure load cleanly—ideal for fast customer-to-vendor checkouts as well as everyday transfers to friends.
                  </p>
                </div>
              </div>

              <div className="py-7 sm:py-8 flex items-start gap-6">
                <span className="font-mono text-xs font-bold text-indigo-600 pt-1">
                  03
                </span>
                <div className="space-y-1.5">
                  <h3 className="text-lg font-bold text-slate-900">
                    Instant confirmation with zero confusion
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Payment settles seamlessly to the verified receiver account—no asking waiters for bank names, reading out 10-digit NUBANs across noisy counters, or dealing with wrong transfers.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/* CHAPTER 3: MERCHANT RETENTION & HABIT ENGINE (MAIN HOOK)     */}
        {/* ============================================================ */}
        <section
          id="retention"
          className="border-t border-slate-200/80 bg-[#F8FAFD] py-20 sm:py-28 px-6 sm:px-10"
        >
          <div className="max-w-6xl mx-auto space-y-12">
            {/* Editorial Headline */}
            <div className="max-w-2xl space-y-3">
              <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-indigo-600 font-semibold">
                Why businesses choose Qpay
              </p>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-[1.12]">
                Know who buys from you—and how to keep them returning.
              </h2>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                Every customer scan automatically builds live relationship intelligence for businesses and vendors. Understand buyer habits deeply enough to operate efficiently and turn walk-ins into lifelong regulars.
              </p>
            </div>

            {/* Clean Architectural Ledger Board (No heavy neon gradients) */}
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-[0_12px_40px_-20px_rgba(15,23,42,0.08)] overflow-hidden grid grid-cols-1 lg:grid-cols-12">
              {/* Left Rail: Selectable Returning Regulars */}
              <div className="lg:col-span-5 border-b lg:border-b-0 lg:border-r border-slate-200/80 p-6 sm:p-8 flex flex-col justify-between bg-[#FCFDFE]">
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[11px] uppercase tracking-wider font-semibold text-slate-400">
                      Most Patronizing Customers
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Select to inspect
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {REGULARS.map((person) => {
                      const active = person.id === activeRegular.id;
                      return (
                        <button
                          key={person.id}
                          type="button"
                          onClick={() => setActiveRegularId(person.id)}
                          className={`w-full text-left px-4 py-3.5 rounded-2xl border transition cursor-pointer flex items-center justify-between gap-3 ${
                            active
                              ? 'bg-white border-indigo-600 shadow-xs'
                              : 'bg-transparent border-transparent hover:bg-slate-100/70'
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-bold text-slate-900 truncate">
                                {person.name}
                              </span>
                              <VintagePaperTag count={person.visits} />
                            </div>
                            <span className="text-xs font-mono text-slate-400">
                              {person.tag}
                            </span>
                          </div>
                          <span className="text-xs font-bold font-mono text-slate-700 flex-shrink-0">
                            {person.totalSpend}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <p className="text-xs text-slate-500 pt-6 mt-6 border-t border-slate-100 leading-relaxed">
                  Repeat buyers earn an animated returning paper tag automatically—no punch cards or phone numbers needed.
                </p>
              </div>

              {/* Right Panel: Selected Regular's Habits (What + When) */}
              <div className="lg:col-span-7 p-6 sm:p-9 space-y-8">
                {/* Header Row */}
                <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-100">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h3 className="text-xl font-bold text-slate-900">
                        {activeRegular.name}
                      </h3>
                      <VintagePaperTag count={activeRegular.visits} />
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      {activeRegular.visits} verified scans • Lifetime spend{' '}
                      <span className="font-semibold text-slate-800">
                        {activeRegular.totalSpend}
                      </span>
                    </p>
                  </div>

                  <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full">
                    Verified Regular
                  </span>
                </div>

                {/* Habit 1: What They Like to Purchase Most */}
                <div className="space-y-3.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                    <ShoppingBag className="w-4 h-4 text-indigo-600" />
                    <span>What they like to buy most</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {activeRegular.topBuys.map((entry) => (
                      <div key={entry.item} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-800">
                            {entry.item}
                          </span>
                          <span className="font-mono text-slate-500">
                            {entry.qty}
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-indigo-600 rounded-full transition-all duration-300"
                            style={{ width: `${entry.pct}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Habit 2: Days & Times of Week / Month */}
                <div className="space-y-3.5 pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                    <Clock className="w-4 h-4 text-indigo-600" />
                    <span>When they patronize your business</span>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    {/* Crisp M-S Day Dots */}
                    <div className="flex items-center gap-1.5">
                      {WEEKDAYS.map((day, i) => {
                        const isHot = activeRegular.activeDays[i];
                        return (
                          <div
                            key={`${day}-${i}`}
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold transition-colors ${
                              isHot
                                ? 'bg-indigo-600 text-white'
                                : 'bg-slate-100 text-slate-400'
                            }`}
                          >
                            {day}
                          </div>
                        );
                      })}
                    </div>

                    <div className="text-xs sm:text-right">
                      <p className="font-semibold text-slate-900">
                        {activeRegular.windowLabel}
                      </p>
                      <p className="text-slate-500 mt-0.5">
                        {activeRegular.monthCycle}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/* CHAPTER 4: CLEAN CLOSING CTA (INDIVIDUAL OR BUSINESS)        */}
        {/* ============================================================ */}
        <section className="border-t border-slate-200/80 bg-white py-20 sm:py-24 px-6 sm:px-10">
          <div className="max-w-4xl mx-auto text-center space-y-6">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Pay a friend or grow your business—with one scan.
            </h2>
            <p className="text-sm sm:text-base text-slate-500 max-w-xl mx-auto leading-relaxed">
              Log in to choose an Individual account or open your Business terminal.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={onLoginClick}
                className="inline-flex items-center gap-2.5 px-8 py-4 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-sm transition cursor-pointer active:scale-[0.98] group"
              >
                <QrCode className="w-4 h-4" />
                <span>Log In to Qpay</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* Clean Compact Footer */}
      <footer className="w-full py-6 px-6 sm:px-10 border-t border-slate-200/70 bg-[#F8FAFD]">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-400">
          <span className="font-medium text-slate-500">Qpay Africa</span>
          <span>Powered by Interledger Open Payments</span>
        </div>
      </footer>
    </div>
  );
}
