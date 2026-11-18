import React, { useState } from 'react';
import { ArrowLeft, Phone, Lock, Eye, EyeOff, ShieldCheck, ArrowRight, AlertCircle, LogIn, User, Building2 } from 'lucide-react';
import { loginWithCredentials, getLastPhone } from '../utils/accountStorage';

export default function LoginView({ 
  accountType = 'individual', 
  onLoginSuccess, 
  onSwitchToRegister, 
  onBackToLanding,
  onChangeAccountType
}) {
  const safeAccountType = accountType === 'business' ? 'business' : 'individual';
  const isBusiness = safeAccountType === 'business';

  const [phone, setPhone] = useState(() => getLastPhone(safeAccountType));
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!phone.trim()) {
      setError('Please enter your phone number.');
      return;
    }

    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      const result = loginWithCredentials(phone.trim(), password, safeAccountType);
      setIsLoading(false);

      if (result.success && result.user) {
        onLoginSuccess(result.user);
      } else {
        setError(result.error || `Invalid ${safeAccountType} credentials. Please try again.`);
      }
    }, 350);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFD] flex flex-col font-sans select-none relative">
      
      {/* Top Accent Gradient Bar matching Qpay theme */}
      <div className="w-full h-[3px] bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600 fixed top-0 left-0 z-50" />

      {/* Top Navigation Bar */}
      <header className="w-full px-6 sm:px-12 py-5 flex items-center justify-between border-b border-slate-100 bg-white/70 backdrop-blur-sm">
        <button
          type="button"
          onClick={() => onBackToLanding && onBackToLanding()}
          className={`flex items-center gap-3 ${onBackToLanding ? 'cursor-pointer hover:opacity-80 transition' : 'cursor-default'}`}
          title={onBackToLanding ? 'Return to Qpay landing page' : undefined}
        >
          <img
            src="/logo.jpg"
            alt="Qpay Logo"
            className="w-11 h-11 rounded-xl object-contain shadow-sm border border-slate-100"
          />
          <span className="text-2xl font-bold tracking-tight text-slate-900">
            Qpay
          </span>
        </button>

        <div className="flex items-center gap-4">
          {onChangeAccountType ? (
            <button
              type="button"
              onClick={onChangeAccountType}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Change Account Type</span>
            </button>
          ) : onBackToLanding ? (
            <button
              type="button"
              onClick={onBackToLanding}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          ) : null}
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span className="hidden sm:inline">Secure Interledger Login</span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 -mt-4">
        <div className="w-full max-w-md bg-white border border-slate-100 rounded-3xl shadow-xl p-7 sm:p-8 space-y-6 animate-scaleUp">
          
          {/* Header Title Section */}
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 uppercase tracking-wider bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
                {isBusiness ? <Building2 className="w-3 h-3 text-indigo-600" /> : <User className="w-3 h-3 text-indigo-600" />}
                <span>{isBusiness ? 'Business Terminal Log In' : 'Individual Wallet Log In'}</span>
              </span>
            </div>
            
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Log In as {isBusiness ? 'Business' : 'Individual'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto">
              {isBusiness
                ? 'Enter your business phone number and password to access your merchant terminal.'
                : 'Enter your phone number and password to access your individual wallet.'}
            </p>
          </div>

          {/* Error Message Box */}
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-2.5 text-xs text-rose-700 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
              <span className="leading-relaxed">{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Phone Number Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                <span>{isBusiness ? 'Business Phone Number' : 'Phone Number'}</span>
                <span className="text-[11px] text-slate-400 font-normal">Nigerian Mobile</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Phone className="w-4 h-4" />
                </div>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    setError('');
                  }}
                  placeholder="e.g. 08012345678"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 rounded-xl text-xs sm:text-sm text-slate-800 transition outline-none"
                  autoFocus
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError('');
                  }}
                  placeholder="Enter your account password"
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 rounded-xl text-xs sm:text-sm text-slate-800 transition outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Log In Action Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white rounded-xl text-xs sm:text-sm font-semibold transition flex items-center justify-center gap-2 shadow-sm cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <span>Logging in...</span>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Log In as {isBusiness ? 'Business' : 'Individual'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

          </form>

          {/* Switch to Register link */}
          <div className="pt-2 text-center space-y-2">
            <p className="text-xs text-slate-500">
              Don't have {isBusiness ? 'a business' : 'an individual'} account?{' '}
              <button
                type="button"
                onClick={() => onSwitchToRegister && onSwitchToRegister(safeAccountType)}
                className="font-semibold text-indigo-600 hover:text-indigo-800 underline underline-offset-2 transition cursor-pointer"
              >
                Register as {isBusiness ? 'Business' : 'Individual'}
              </button>
            </p>

            {onChangeAccountType && (
              <p className="text-xs text-slate-400">
                Want to switch?{' '}
                <button
                  type="button"
                  onClick={onChangeAccountType}
                  className="font-semibold text-slate-600 hover:text-indigo-600 underline underline-offset-2 transition cursor-pointer"
                >
                  Switch to {isBusiness ? 'Individual' : 'Business'}
                </button>
              </p>
            )}
          </div>

          {/* Security Footnote */}
          <div className="pt-2 border-t border-slate-100 text-center">
            <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>Powered by Interledger Open Payments • 256-bit Secure Encryption</span>
            </span>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-4 text-center text-xs text-slate-400 border-t border-slate-100 bg-white">
        © 2026 Qpay Africa • Powered by Interledger Open Payments
      </footer>

    </div>
  );
}
