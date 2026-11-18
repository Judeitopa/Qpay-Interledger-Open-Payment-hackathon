import React, { useState } from 'react';
import { X, ShieldCheck, User, Mail, Phone, AtSign, CheckCircle2, Lock, ArrowUpRight, AlertCircle, FileCheck, Landmark, Upload, FileText, Building2, Check, FileCode, Sparkles, LogOut } from 'lucide-react';
import confetti from 'canvas-confetti';
import { resolveUserAvatar } from '../utils/avatar';

export default function ProfileKycModal({ isOpen, onClose, registeredUser, onUserUpdated, onLogout }) {
  const isBusiness = registeredUser?.type === 'business';
  const currentTier = registeredUser?.tier || 1;

  // Individual verification inputs
  const [bvnInput, setBvnInput] = useState('');
  const [ninInput, setNinInput] = useState('');
  
  // Business verification inputs
  const [cacRcNumber, setCacRcNumber] = useState('');
  const [cacFileName, setCacFileName] = useState('');
  const [cacFileSelected, setCacFileSelected] = useState(false);
  
  const [businessDocType, setBusinessDocType] = useState('director_id');
  const [businessDocFileName, setBusinessDocFileName] = useState('');
  const [businessDocFileSelected, setBusinessDocFileSelected] = useState(false);

  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationSuccess, setVerificationSuccess] = useState('');

  if (!isOpen || !registeredUser) return null;

  // Simulate file selection for CAC
  const handleCacFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setCacFileName(e.target.files[0].name);
      setCacFileSelected(true);
    } else {
      setCacFileName('CAC_Certificate_Registration_' + (registeredUser.name?.replace(/\s+/g, '_') || 'Corp') + '.pdf');
      setCacFileSelected(true);
    }
  };

  // Simulate file selection for Business ID
  const handleBusinessDocFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setBusinessDocFileName(e.target.files[0].name);
      setBusinessDocFileSelected(true);
    } else {
      setBusinessDocFileName('Business_ID_' + businessDocType + '.pdf');
      setBusinessDocFileSelected(true);
    }
  };

  // ==========================================
  // INDIVIDUAL TIER 2 UPGRADE (BVN/NIN)
  // ==========================================
  const handleIndividualUpgradeTier2 = (e) => {
    e.preventDefault();
    if (!bvnInput && !ninInput) return;

    setIsVerifying(true);
    setTimeout(() => {
      const updatedUser = {
        ...registeredUser,
        tier: 2,
        bvnVerified: true,
        bvnMasked: (bvnInput || ninInput).slice(0, 3) + '••••' + (bvnInput || ninInput).slice(-4)
      };

      onUserUpdated(updatedUser);
      setIsVerifying(false);
      setVerificationSuccess('Identity verified via Interledger Open Payments Rail! Upgraded to Tier 2 (₦500,000/day).');

      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.6 }
      });
    }, 800);
  };

  // ==========================================
  // INDIVIDUAL TIER 3 UPGRADE (Government ID)
  // ==========================================
  const handleIndividualUpgradeTier3 = () => {
    setIsVerifying(true);
    setTimeout(() => {
      const updatedUser = {
        ...registeredUser,
        tier: 3,
        idDocVerified: true
      };

      onUserUpdated(updatedUser);
      setIsVerifying(false);
      setVerificationSuccess('Government ID verified! Upgraded to Tier 3 (₦5,000,000/day limit).');

      confetti({
        particleCount: 90,
        spread: 70,
        origin: { y: 0.6 }
      });
    }, 900);
  };

  // ==========================================
  // BUSINESS TIER 2 UPGRADE (CAC Registration Certificate)
  // ==========================================
  const handleBusinessUpgradeTier2 = (e) => {
    e.preventDefault();
    if (!cacRcNumber && !cacFileName) return;

    setIsVerifying(true);
    setTimeout(() => {
      const updatedUser = {
        ...registeredUser,
        tier: 2,
        cacVerified: true,
        cacRcNumber: cacRcNumber || 'RC-' + Math.floor(100000 + Math.random() * 900000),
        cacCertificateDoc: cacFileName || 'CAC_Certificate_Registration.pdf'
      };

      onUserUpdated(updatedUser);
      setIsVerifying(false);
      setVerificationSuccess('CAC Business Certificate verified via Corporate Affairs Commission & Interledger Rail! Upgraded to Tier 2 (₦5,000,000/day).');

      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
    }, 1000);
  };

  // ==========================================
  // BUSINESS TIER 3 UPGRADE (Business Identification Documents)
  // ==========================================
  const handleBusinessUpgradeTier3 = (e) => {
    e.preventDefault();
    setIsVerifying(true);
    setTimeout(() => {
      const updatedUser = {
        ...registeredUser,
        tier: 3,
        businessIdVerified: true,
        businessDocType: businessDocType,
        businessDocFile: businessDocFileName || 'Business_Identification_Docs.pdf'
      };

      onUserUpdated(updatedUser);
      setIsVerifying(false);
      setVerificationSuccess('Business Identification Documents verified! Upgraded to Tier 3 (Unlimited Corporate Rails).');

      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.6 }
      });
    }, 1100);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg max-h-[92vh] overflow-y-auto bg-white rounded-3xl shadow-2xl p-6 sm:p-7 space-y-6 animate-scaleUp">
        
        {/* Actions: Log Out Button + Close Button */}
        <div className="absolute top-4 right-4 flex items-center gap-2">
          {onLogout && (
            <button
              onClick={() => {
                onClose();
                onLogout();
              }}
              type="button"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200/80 rounded-xl text-xs font-semibold transition cursor-pointer shadow-sm hover:shadow"
              title="Log out of Qpay"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log Out</span>
            </button>
          )}
          <button
            onClick={onClose}
            type="button"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Profile Card Header */}
        <div className="flex items-center gap-4 pb-4 border-b border-slate-100">
          <div className="relative">
            <img
              src={resolveUserAvatar(registeredUser)}
              alt={registeredUser.name}
              className="w-16 h-16 rounded-full object-cover border-2 border-indigo-100 shadow-sm"
            />
            <span className="absolute bottom-0 right-0 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900 truncate">
                {registeredUser.name}
              </h2>
              <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-semibold rounded-full capitalize">
                {registeredUser.type}
              </span>
            </div>

            <p className="text-xs font-mono font-bold text-indigo-600 mt-0.5">
              {registeredUser.qpayTag}
            </p>

            <p className="text-[11px] text-slate-400 truncate mt-0.5">
              {registeredUser.email} • {registeredUser.phone}
            </p>
          </div>
        </div>

        {/* Success Alert if upgraded */}
        {verificationSuccess && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{verificationSuccess}</span>
          </div>
        )}

        {/* FINANCIAL TIERS & LIMITS */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Account Tiers & Verification Limits
            </h3>
            <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full border border-emerald-200">
              Active: Tier {currentTier}
            </span>
          </div>

          {/* ======================================================== */}
          {/* TIER 1 CARD */}
          {/* ======================================================== */}
          <div className={`p-4 rounded-2xl border transition ${
            currentTier >= 1 ? 'border-emerald-200 bg-emerald-50/20' : 'border-slate-200 bg-white'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 font-bold text-xs flex items-center justify-center">
                  1
                </span>
                <span className="text-xs font-bold text-slate-900">
                  Tier 1 • {isBusiness ? 'Starter Business Account' : 'Basic Account'}
                </span>
              </div>
              <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Unlocked</span>
              </span>
            </div>

            {/* Daily limit: For Business ₦500,000/day, for Individual ₦50,000/day */}
            <p className="text-[11px] text-slate-500 mt-1 pl-8">
              Daily Limit: <strong>{isBusiness ? '₦500,000.00 / day' : '₦50,000.00 / day'}</strong> • Max Balance: <strong>{isBusiness ? '₦5,000,000.00' : '₦300,000.00'}</strong>
            </p>
          </div>

          {/* ======================================================== */}
          {/* TIER 2 CARD */}
          {/* ======================================================== */}
          <div className={`p-4 rounded-2xl border transition ${
            currentTier >= 2 ? 'border-emerald-200 bg-emerald-50/20' : 'border-slate-200 bg-white'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`w-6 h-6 rounded-full font-bold text-xs flex items-center justify-center ${
                  currentTier >= 2 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                }`}>
                  2
                </span>
                <span className="text-xs font-bold text-slate-900">
                  Tier 2 • {isBusiness ? 'Registered Enterprise Account' : 'Standard Account'}
                </span>
              </div>
              {currentTier >= 2 ? (
                <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Unlocked</span>
                </span>
              ) : (
                <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                  Verification Required
                </span>
              )}
            </div>

            <p className="text-[11px] text-slate-500 mt-1 pl-8">
              Daily Limit: <strong>{isBusiness ? '₦5,000,000.00 / day' : '₦500,000.00 / day'}</strong> • Max Balance: <strong>{isBusiness ? '₦20,000,000.00' : '₦2,000,000.00'}</strong>
            </p>

            {/* Verification Form if not yet Tier 2 */}
            {currentTier < 2 && (
              isBusiness ? (
                /* BUSINESS TIER 2: UPLOAD CAC BUSINESS CERTIFICATE OF REGISTRATION */
                <form onSubmit={handleBusinessUpgradeTier2} className="mt-3 pl-8 space-y-3">
                  <div className="p-3 bg-amber-50/60 border border-amber-100 rounded-xl space-y-1">
                    <div className="text-[11px] font-bold text-amber-900 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-amber-700" />
                      <span>CAC Business Registration Required</span>
                    </div>
                    <p className="text-[10px] text-slate-600 leading-relaxed">
                      Upload your CAC Certificate of Incorporation or Business Name Registration to unlock ₦5,000,000.00/day limit.
                    </p>
                  </div>

                  {/* CAC RC / BN Number Input */}
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-700 mb-1">
                      CAC Registration Number (RC / BN)
                    </label>
                    <div className="relative">
                      <FileCode className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={cacRcNumber}
                        onChange={(e) => setCacRcNumber(e.target.value)}
                        placeholder="e.g. RC-1849204 or BN-3920194"
                        required
                        className="w-full bg-[#F8FAFD] border border-slate-200 rounded-xl py-2 pl-9 pr-3 text-xs font-mono text-slate-900 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  {/* CAC Certificate Document File Upload */}
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-700 mb-1">
                      Upload CAC Certificate of Registration (PDF, PNG, JPG)
                    </label>
                    <label className="border-2 border-dashed border-indigo-200 hover:border-indigo-500 bg-indigo-50/30 rounded-2xl p-3 flex flex-col items-center justify-center cursor-pointer transition text-center group">
                      <input
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg"
                        onChange={handleCacFileChange}
                        className="hidden"
                      />
                      <Upload className="w-5 h-5 text-indigo-500 group-hover:scale-110 transition-transform mb-1" />
                      {cacFileName ? (
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="truncate max-w-[200px]">{cacFileName}</span>
                        </div>
                      ) : (
                        <div className="space-y-0.5">
                          <span className="text-xs font-semibold text-indigo-600">Choose file or drag & drop</span>
                          <p className="text-[10px] text-slate-400">CAC Certificate of Incorporation (Max 10MB)</p>
                        </div>
                      )}
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={isVerifying || (!cacRcNumber && !cacFileName)}
                    className="w-full py-2.5 px-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    {isVerifying ? (
                      <span>Verifying CAC Certificate...</span>
                    ) : (
                      <>
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload CAC Certificate & Unlock Tier 2</span>
                      </>
                    )}
                  </button>
                </form>
              ) : (
                /* INDIVIDUAL TIER 2: BVN / NIN VERIFICATION */
                <form onSubmit={handleIndividualUpgradeTier2} className="mt-3 pl-8 space-y-2.5">
                  <div className="text-[11px] text-slate-600 font-medium">
                    Provide your BVN or NIN to verify your legal identity and unlock ₦500,000/day limits:
                  </div>
                  <div className="relative">
                    <Landmark className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      maxLength={11}
                      value={bvnInput}
                      onChange={(e) => setBvnInput(e.target.value)}
                      placeholder="Enter 11-digit BVN or NIN (e.g. 22189401928)"
                      required
                      className="w-full bg-[#F8FAFD] border border-slate-200 rounded-xl py-2 pl-9 pr-3 text-xs font-mono text-slate-900 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isVerifying}
                    className="w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition"
                  >
                    {isVerifying ? 'Verifying Identity...' : 'Verify & Unlock Tier 2'}
                  </button>
                </form>
              )
            )}
          </div>

          {/* ======================================================== */}
          {/* TIER 3 CARD */}
          {/* ======================================================== */}
          <div className={`p-4 rounded-2xl border transition ${
            currentTier >= 3 ? 'border-emerald-200 bg-emerald-50/20' : 'border-slate-200 bg-white'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`w-6 h-6 rounded-full font-bold text-xs flex items-center justify-center ${
                  currentTier >= 3 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                }`}>
                  3
                </span>
                <span className="text-xs font-bold text-slate-900">
                  Tier 3 • {isBusiness ? 'Unlimited Corporate Merchant' : 'VIP & Unlimited Merchant'}
                </span>
              </div>
              {currentTier >= 3 ? (
                <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Unlocked</span>
                </span>
              ) : (
                <span className="text-xs font-semibold text-slate-400">
                  Locked
                </span>
              )}
            </div>

            <p className="text-[11px] text-slate-500 mt-1 pl-8">
              Daily Limit: <strong>{isBusiness ? 'Unlimited / ₦50,000,000.00' : '₦5,000,000.00'}</strong> • Max Balance: <strong>Unlimited</strong>
            </p>

            {currentTier === 2 && (
              isBusiness ? (
                /* BUSINESS TIER 3: UPLOAD BUSINESS IDENTIFICATION DOCUMENTS */
                <form onSubmit={handleBusinessUpgradeTier3} className="mt-3 pl-8 space-y-3">
                  <div className="p-3 bg-indigo-50/60 border border-indigo-100 rounded-xl space-y-1">
                    <div className="text-[11px] font-bold text-indigo-900 flex items-center gap-1.5">
                      <FileCheck className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Business Identification Documents</span>
                    </div>
                    <p className="text-[10px] text-slate-600 leading-relaxed">
                      Upload business identification documents (Director's Government ID, Tax Identification Number TIN, or Utility Bill) to unlock unlimited corporate limits.
                    </p>
                  </div>

                  {/* Document Type Selector */}
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-700 mb-1">
                      Identification Document Type
                    </label>
                    <select
                      value={businessDocType}
                      onChange={(e) => setBusinessDocType(e.target.value)}
                      className="w-full bg-[#F8FAFD] border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
                    >
                      <option value="director_id">Director / Proprietor Government ID (Passport / Drivers License)</option>
                      <option value="tin_document">FIRS Tax Identification Number (TIN) Certificate</option>
                      <option value="memart">MEMART (Memorandum & Articles of Association)</option>
                      <option value="utility_bill">Corporate Utility Bill / Proof of Physical Address</option>
                    </select>
                  </div>

                  {/* File Upload Box */}
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-700 mb-1">
                      Upload Identification Document (PDF, PNG, JPG)
                    </label>
                    <label className="border-2 border-dashed border-indigo-200 hover:border-indigo-500 bg-indigo-50/30 rounded-2xl p-3 flex flex-col items-center justify-center cursor-pointer transition text-center group">
                      <input
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg"
                        onChange={handleBusinessDocFileChange}
                        className="hidden"
                      />
                      <Upload className="w-5 h-5 text-indigo-500 group-hover:scale-110 transition-transform mb-1" />
                      {businessDocFileName ? (
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="truncate max-w-[200px]">{businessDocFileName}</span>
                        </div>
                      ) : (
                        <div className="space-y-0.5">
                          <span className="text-xs font-semibold text-indigo-600">Select business identification file</span>
                          <p className="text-[10px] text-slate-400">Government ID or TIN Certificate (Max 10MB)</p>
                        </div>
                      )}
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={isVerifying}
                    className="w-full py-2.5 px-3 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    {isVerifying ? (
                      <span>Verifying Business Identification...</span>
                    ) : (
                      <>
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload Documents & Unlock Tier 3</span>
                      </>
                    )}
                  </button>
                </form>
              ) : (
                /* INDIVIDUAL TIER 3: UPLOAD GOVERNMENT ID */
                <div className="mt-3 pl-8 space-y-2">
                  <p className="text-[11px] text-slate-600">
                    Upload Government ID (Passport / Drivers License) to unlock VIP limits:
                  </p>
                  <button
                    type="button"
                    onClick={handleIndividualUpgradeTier3}
                    disabled={isVerifying}
                    className="w-full py-2 px-3 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Document & Upgrade to Tier 3</span>
                  </button>
                </div>
              )
            )}
          </div>
        </div>

        {/* Security Footer */}
        <div className="p-3 bg-[#F8FAFD] border border-slate-200/80 rounded-2xl flex items-center gap-2 text-[11px] text-slate-500">
          <ShieldCheck className="w-4 h-4 text-emerald-500 flex-shrink-0" />
          <span>Data verified through Qpay & Interledger Open Payments compliance infrastructure.</span>
        </div>

        {/* Account Logout Action */}
        {onLogout && (
          <div className="pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                onClose();
                onLogout();
              }}
              className="w-full py-2.5 px-4 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 hover:text-rose-800 rounded-2xl text-xs font-semibold transition flex items-center justify-center gap-2 cursor-pointer shadow-sm hover:shadow"
            >
              <LogOut className="w-4 h-4 text-rose-600" />
              <span>Log Out of Qpay Account</span>
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
