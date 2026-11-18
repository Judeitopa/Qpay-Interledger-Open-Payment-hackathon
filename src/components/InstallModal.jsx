import React from 'react';
import { AlertCircle, Download, X, ExternalLink, Smartphone, CheckCircle2 } from 'lucide-react';
import { getDeviceOS, STORE_LINKS } from '../utils/deviceCheck';

/**
 * Interledger Wallet Authorization Prompt Modal
 */
export default function InstallModal({
  isOpen,
  onClose,
  actionAttempted = 'Scan to Pay',
  onSimulateInstall
}) {
  const os = getDeviceOS();

  if (!isOpen) return null;

  const handleInstallClick = () => {
    window.open(STORE_LINKS.fallback, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
      {/* Modal Container */}
      <div className="relative w-full max-w-sm bg-white border border-slate-100 rounded-2xl shadow-xl overflow-hidden p-6 text-center space-y-5 animate-scaleUp">
        
        {/* Close button */}
        <button
          onClick={onClose}
          type="button"
          className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Warning Icon Badge */}
        <div className="mx-auto w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center border border-indigo-100">
          <AlertCircle className="w-6 h-6" />
        </div>

        {/* Text */}
        <div className="space-y-1.5">
          <h2 className="text-lg font-semibold text-slate-900">
            Connect Interledger Wallet
          </h2>
          <p className="text-xs text-slate-500 leading-relaxed px-2">
            To proceed with <strong>{actionAttempted}</strong>, open your Interledger Test Wallet to authorize Open Payments grants.
          </p>
        </div>

        {/* OS detection pill */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-50 border border-slate-200/80 rounded-full text-[11px] text-slate-600">
          <Smartphone className="w-3.5 h-3.5 text-slate-400" />
          <span>Device: {os === 'ios' ? 'iOS Web Wallet' : os === 'android' ? 'Android Web Wallet' : 'Interledger Test Wallet'}</span>
        </div>

        {/* Primary Action Button */}
        <div>
          <button
            type="button"
            onClick={handleInstallClick}
            className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium shadow-sm transition active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span>Open Interledger Wallet</span>
          </button>
        </div>

        <div className="pt-1">
          <a
            href={STORE_LINKS.fallback}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-700 transition"
          >
            <ExternalLink className="w-3 h-3 text-slate-400" />
            <span>wallet.interledger-test.dev</span>
          </a>
        </div>

        {onSimulateInstall && (
          <div className="pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onSimulateInstall}
              className="inline-flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-700 font-medium transition"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>Continue to Qpay</span>
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
