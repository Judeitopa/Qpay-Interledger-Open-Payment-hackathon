import React, { useState } from 'react';
import {
  ArrowLeft,
  HelpCircle,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  CheckCircle2,
  Mail,
  Send
} from 'lucide-react';

const FAQS = [
  {
    q: 'How do bank transfers on the Send page work?',
    a: 'For account safety, Qpay lets you permanently register one traditional Nigerian bank account on the Send tab. Once registered, you can transfer funds from your Qpay balance directly to that account anytime via Interledger Open Payments rails.'
  },
  {
    q: 'How do I pay a business or merchant with Scan to Pay?',
    a: 'Tap "Scan to Pay" on the Home dashboard, grant camera permission, and hold a valid payment QR code inside the camera frame to load and authorize the invoice.'
  },
  {
    q: 'How do I check my total transactions for a specific month?',
    a: 'Click "Transaction history" right below your Available Balance card, then pick any month from the Month selector dropdown to inspect your monthly transaction total and itemized history.'
  },
  {
    q: 'How can I upgrade my daily transaction limit?',
    a: 'Open Profile from the top-right corner or the bottom navigation bar to verify your BVN/NIN for Tier 2 (₦500,000/day) or submit your Government ID for Tier 3 (₦5,000,000/day).'
  }
];

export default function HelpView({ onBack, registeredUser }) {
  const [openFaq, setOpenFaq] = useState(0);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submittedRef, setSubmittedRef] = useState('');

  const handleSendSupport = (e) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;

    const ref = 'SUP-' + Math.floor(100000 + Math.random() * 900000);
    setSubmittedRef(ref);
    setSubject('');
    setMessage('');
  };

  return (
    <div className="w-full max-w-xl mx-auto space-y-5 animate-fadeIn px-2 sm:px-0">
      
      {/* Top Header */}
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
          <span>24/7 Qpay Help Desk</span>
        </div>
      </div>

      {/* FAQ Container */}
      <div className="bg-white border border-slate-100 rounded-3xl p-6 sm:p-7 shadow-sm space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
          <div className="w-11 h-11 rounded-2xl bg-[#EEF2FF] text-[#4F46E5] flex items-center justify-center border border-indigo-100">
            <HelpCircle className="w-5 h-5 stroke-[2]" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Help & Support</h2>
            <p className="text-xs text-slate-500">
              Frequently asked questions and support assistance
            </p>
          </div>
        </div>

        <div className="space-y-2.5">
          {FAQS.map((item, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={idx}
                className={`rounded-2xl border transition ${
                  isOpen
                    ? 'border-indigo-200 bg-indigo-50/30'
                    : 'border-slate-200/80 bg-[#F8FAFD] hover:border-slate-300'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? -1 : idx)}
                  className="w-full flex items-center justify-between p-3.5 text-left gap-3 cursor-pointer"
                >
                  <span className="text-xs font-bold text-slate-800">{item.q}</span>
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  )}
                </button>
                {isOpen && (
                  <div className="px-3.5 pb-3.5 text-xs text-slate-600 leading-relaxed">
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Contact Support Form Card */}
      <div className="bg-white border border-slate-100 rounded-3xl p-6 sm:p-7 shadow-sm space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <MessageSquare className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-900">Send Us a Message</h3>
          </div>
          <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
            <Mail className="w-3 h-3 text-indigo-600" />
            <span>support@qpay.africa</span>
          </span>
        </div>

        {submittedRef ? (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-2 animate-fadeIn">
            <CheckCircle2 className="w-7 h-7 text-emerald-600 mx-auto" />
            <p className="text-xs font-bold text-emerald-900">
              Support Request Received ({submittedRef})
            </p>
            <p className="text-[11px] text-emerald-700">
              Our team will reply to {registeredUser?.email || 'your registered email'} shortly.
            </p>
            <button
              type="button"
              onClick={() => setSubmittedRef('')}
              className="mt-1 inline-block text-[11px] font-semibold text-indigo-600 hover:underline cursor-pointer"
            >
              Send another inquiry
            </button>
          </div>
        ) : (
          <form onSubmit={handleSendSupport} className="space-y-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Topic / Subject
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Question about bank transfer or QR scan"
                required
                className="w-full bg-[#F8FAFD] border border-slate-200 focus:border-indigo-500 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-none transition"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Message
              </label>
              <textarea
                rows={3}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Describe how we can help..."
                required
                className="w-full bg-[#F8FAFD] border border-slate-200 focus:border-indigo-500 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-none transition resize-none"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Submit Support Message</span>
            </button>
          </form>
        )}
      </div>

    </div>
  );
}
