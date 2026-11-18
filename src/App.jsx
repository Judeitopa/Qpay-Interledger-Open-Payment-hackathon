import React, { useState, useEffect } from 'react';
import { ArrowDownToLine, QrCode, ShieldCheck, RefreshCw, Receipt, WalletCards, Package, Trophy, User, LogOut, TrendingUp } from 'lucide-react';
import RegisterView from './components/RegisterView';
import LoginView from './components/LoginView';
import LandingPage from './components/LandingPage';
import BalanceDashboard from './components/BalanceDashboard';
import CustomerPaymentsTab from './components/CustomerPaymentsTab';
import BusinessInventoryTab from './components/BusinessInventoryTab';
import CustomerLeaderboardTab from './components/CustomerLeaderboardTab';
import BusinessPerformanceTab from './components/BusinessPerformanceTab';
import ProfileKycModal from './components/ProfileKycModal';
import AddMoneyModal from './components/AddMoneyModal';
import InstallModal from './components/InstallModal';
import ConnectModal from './components/ConnectModal';
import CameraPermissionModal from './components/CameraPermissionModal';
import ScannerView from './components/ScannerView';
import ReceiveView from './components/ReceiveView';
import TransactionHistoryView from './components/TransactionHistoryView';
import SendView from './components/SendView';
import SettingsView from './components/SettingsView';
import HelpView from './components/HelpView';
import IndividualNav from './components/IndividualNav';
import AiAssistantChat from './components/AiAssistantChat';
import { checkInterledgerWalletReady } from './utils/deviceCheck';
import {
  getStoredInterledgerUser,
  setStoredInterledgerUser,
  finalizeInterledgerPayment,
  getPendingInterledgerPayment,
  clearPendingInterledgerPayment
} from './utils/interledgerApi';
import { completePaymentInvoice } from './utils/paymentSync';
import confetti from 'canvas-confetti';
import { playRobloxClickSound } from './utils/soundEffects';
import { persistActiveSession, clearActiveSession, hasRegisteredAccount } from './utils/accountStorage';
import { resolveUserAvatar, DEFAULT_UNISEX_AVATAR } from './utils/avatar';

export default function App() {
  // Registered user state: initially null to show "Register as a business" / "Register as an individual"
  const [registeredUser, setRegisteredUser] = useState(() => {
    const saved = localStorage.getItem('qpay_registered_user');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.type === 'individual' && (!parsed.avatar || parsed.avatar.includes('photo-1573496359142-b8d87734a5a2'))) {
          parsed.avatar = DEFAULT_UNISEX_AVATAR;
        }
        return parsed;
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  // Screen views: 'home' | 'scanner' | 'receive'
  const [currentView, setCurrentView] = useState('home');

  // Unauthenticated sub-screen toggle: false -> LandingPage, true -> Auth View
  const [showAuthScreen, setShowAuthScreen] = useState(false);
  const [authView, setAuthView] = useState('selection'); // 'selection' | 'login' | 'register'
  const [authType, setAuthType] = useState('individual'); // 'individual' | 'business'
  
  // Business tabs: 'terminal' | 'inventory' | 'customer_payments'
  const [businessTab, setBusinessTab] = useState('terminal');

  // Modals state
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [showAddMoneyModal, setShowAddMoneyModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showCameraPermissionModal, setShowCameraPermissionModal] = useState(false);
  const [actionAttempted, setActionAttempted] = useState('');

  // Interledger Connection State
  const [connectedUser, setConnectedUser] = useState(() => {
    return getStoredInterledgerUser();
  });

  // Interledger Wallet Ready state
  const [interledgerReady, setInterledgerReady] = useState(() => {
    const saved = localStorage.getItem('qpay_interledger_wallet_ready');
    return saved !== 'false';
  });

  // Banner shown after returning from Interledger Test Wallet interactive grant redirect
  const [ilpSettlementNotice, setIlpSettlementNotice] = useState(null);

  // Calculate total customer payments received to reflect in total balance dashboard
  const [customerPaymentsTotal, setCustomerPaymentsTotal] = useState(() => {
    try {
      const saved = localStorage.getItem('qpay_customer_payments');
      if (saved) {
        const bills = JSON.parse(saved);
        return bills
          .filter(b => b.status === 'SUCCESSFUL' || b.status === 'PAID')
          .reduce((acc, curr) => acc + (curr.amountPaid || 0), 0);
      }
      return 0; // Starts at 0 for new business
    } catch (e) {
      return 0;
    }
  });

  const updateCustomerPaymentsTotal = (newTotal) => {
    if (typeof newTotal === 'number') {
      setCustomerPaymentsTotal(newTotal);
    } else {
      try {
        const saved = localStorage.getItem('qpay_customer_payments');
        if (saved) {
          const bills = JSON.parse(saved);
          const total = bills
            .filter(b => b.status === 'SUCCESSFUL' || b.status === 'PAID')
            .reduce((acc, curr) => acc + (curr.amountPaid || 0), 0);
          setCustomerPaymentsTotal(total);
        }
      } catch (e) {}
    }
  };

  useEffect(() => {
    updateCustomerPaymentsTotal();
  }, [businessTab]);

  // Persistent background settlement runner for simulated 10s payments
  // Ensures bills settle as successful after 10s even if the user leaves the tab or closes the modal
  useEffect(() => {
    const checkPendingSettlements = () => {
      try {
        const saved = localStorage.getItem('qpay_customer_payments');
        if (!saved) return;
        const bills = JSON.parse(saved);
        let changed = false;
        const now = Date.now();

        const updatedBills = bills.map(bill => {
          if (bill.status === 'PENDING') {
            const settleTime = bill.settleAt || (new Date(bill.timeIso || Date.now()).getTime() + 10000);
            if (now >= settleTime) {
              changed = true;
              const registeredCustomers = [
                { name: 'Chinedu Okafor', tag: '@chinedu', phone: '+234 803 123 4567' },
                { name: 'Bolanle Adeleke', tag: '@bolanle', phone: '+234 818 765 4321' },
                { name: 'Babatunde Okafor', tag: '@babatunde', phone: '+234 802 111 2233' },
                { name: 'Emeka Nwankwo', tag: '@emeka', phone: '+234 705 998 1122' },
                { name: 'Fatima Bello', tag: '@fatima', phone: '+234 802 443 9081' }
              ];
              const resolvedCustomer = registeredCustomers[Math.floor(Math.random() * registeredCustomers.length)];
              return {
                ...bill,
                customerName: resolvedCustomer.name,
                customerTag: resolvedCustomer.tag,
                phone: resolvedCustomer.phone,
                status: 'SUCCESSFUL'
              };
            }
          }
          return bill;
        });

        if (changed) {
          localStorage.setItem('qpay_customer_payments', JSON.stringify(updatedBills));
          const total = updatedBills
            .filter(b => b.status === 'SUCCESSFUL' || b.status === 'PAID')
            .reduce((acc, curr) => acc + (curr.amountPaid || 0), 0);
          setCustomerPaymentsTotal(total);
          window.dispatchEvent(new CustomEvent('qpay_payments_updated', { detail: { bills: updatedBills } }));
        }
      } catch (e) {
        console.error('Error in settlement interval:', e);
      }
    };

    const interval = setInterval(checkPendingSettlements, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    localStorage.setItem('qpay_interledger_wallet_ready', interledgerReady.toString());
  }, [interledgerReady]);

  // Handle Interledger Open Payments interactive grant callback redirect (?ilp_session=...&interact_ref=...)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const paymentSessionId = params.get('ilp_session');
    const interactRef = params.get('interact_ref');
    if (!paymentSessionId || !interactRef) return;

    // Immediately clean query parameters so refresh does not re-trigger
    const cleanUrl = window.location.pathname;
    window.history.replaceState({}, document.title, cleanUrl);

    const finalizeCallback = async () => {
      try {
        const pending = getPendingInterledgerPayment();
        const result = await finalizeInterledgerPayment({
          paymentSessionId,
          interactRef,
          sessionToken: pending?.sessionToken || undefined
        });

        const settledAmount = Number(pending?.amount || result?.amountNgn || 0);
        const ref = result?.reference || pending?.reference || ('ILP_QPAY_' + Date.now());

        // If this was a Scan-to-Pay interactive authorization, deduct balance & log transaction
        if (pending?.flow === 'scan_to_pay' && settledAmount > 0) {
          setRegisteredUser((prev) => {
            if (!prev) return prev;
            const updated = {
              ...prev,
              balance: Math.max(0, Number(prev.balance || 0) - settledAmount)
            };
            localStorage.setItem('qpay_registered_user', JSON.stringify(updated));
            persistActiveSession();
            return updated;
          });

          try {
            const existingTx = JSON.parse(localStorage.getItem('qpay_transactions') || '[]');
            const alreadyLogged = existingTx.some((t) => t.ref === ref);
            if (!alreadyLogged) {
              const newTx = {
                id: 'tx_ilp_' + Date.now(),
                title: 'Payment to ' + (pending?.invoice?.accountName || 'Interledger Merchant'),
                type: 'debit',
                amount: settledAmount,
                date: new Date().toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                }),
                timeIso: new Date().toISOString(),
                ref,
                incomingPaymentId: result?.incomingPaymentId || pending?.incomingPaymentId || null,
                quoteId: result?.quoteId || pending?.quoteId || null,
                outgoingPaymentId: result?.outgoingPaymentId || null,
                status: 'Successful',
                rail: 'Interledger Open Payments'
              };
              localStorage.setItem('qpay_transactions', JSON.stringify([newTx, ...existingTx]));
              window.dispatchEvent(new Event('qpay_transactions_updated'));
            }
          } catch {}

          // Complete cross-device sync notice for receiver
          try {
            const activeUser = JSON.parse(localStorage.getItem('qpay_registered_user') || 'null');
            await completePaymentInvoice({
              syncId: pending?.invoice?.syncId,
              reference: ref,
              incomingPaymentId: result?.incomingPaymentId,
              outgoingPaymentId: result?.outgoingPaymentId,
              quoteId: result?.quoteId,
              amount: settledAmount,
              payerUser: activeUser,
              recipientData: pending?.invoice
            });
          } catch {}
        }

        clearPendingInterledgerPayment();
        setIlpSettlementNotice({
          status: 'success',
          message: `Interledger Open Payments transfer authorized & settled (${result?.debitDisplay || 'Live Outgoing Payment'})`,
          outgoingPaymentId: result?.outgoingPaymentId,
          reference: ref
        });

        try {
          confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
        } catch {}
      } catch (err) {
        setIlpSettlementNotice({
          status: 'error',
          message: err?.message || 'Could not finalize Interledger Open Payments grant.'
        });
      }
    };

    finalizeCallback();
  }, []);

  // Global listener for cross-device balance credits & multi-tab synchronizations
  useEffect(() => {
    const handleSync = () => {
      try {
        const saved = localStorage.getItem('qpay_registered_user');
        if (saved) {
          const parsed = JSON.parse(saved);
          setRegisteredUser(parsed);
        }
      } catch (e) {}
    };

    const handleStorageChange = (e) => {
      if (e.key === 'qpay_registered_user' && e.newValue) {
        try {
          setRegisteredUser(JSON.parse(e.newValue));
        } catch (err) {}
      }
    };

    window.addEventListener('qpay_balance_credited', handleSync);
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('qpay_balance_credited', handleSync);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Handle registration completion
  const handleRegisterComplete = (user) => {
    setRegisteredUser(user);
    setShowAuthScreen(false);
    localStorage.setItem('qpay_registered_user', JSON.stringify(user));
    persistActiveSession();
    updateCustomerPaymentsTotal();
  };

  // Confirmed log out handler
  const handleConfirmLogout = () => {
    setShowLogoutModal(false);
    clearActiveSession();
    setRegisteredUser(null);
    setShowAuthScreen(false);
    setAuthView('selection');
    setCustomerPaymentsTotal(0);
    setCurrentView('home');
    setBusinessTab('terminal');
    window.scrollTo({ top: 0, behavior: 'auto' });
  };

  // Switch or reset account registration
  const handleResetRegistration = () => {
    setShowLogoutModal(true);
  };

  // Top-up wallet balance via permanent card
  const handleBalanceAdded = (amountAdded) => {
    setRegisteredUser((prev) => {
      const updated = {
        ...prev,
        balance: (prev?.balance || 0) + amountAdded
      };
      localStorage.setItem('qpay_registered_user', JSON.stringify(updated));
      persistActiveSession();
      return updated;
    });
  };

  // Deduct from wallet balance (e.g. bank transfer on Send page)
  const handleBalanceDeducted = (amountDeducted) => {
    setRegisteredUser((prev) => {
      const updated = {
        ...prev,
        balance: Math.max(0, (prev?.balance || 0) - amountDeducted)
      };
      localStorage.setItem('qpay_registered_user', JSON.stringify(updated));
      persistActiveSession();
      return updated;
    });
  };

  // User profile / KYC updated
  const handleUserUpdated = (updatedUser) => {
    setRegisteredUser(updatedUser);
    localStorage.setItem('qpay_registered_user', JSON.stringify(updatedUser));
    persistActiveSession();
  };

  /**
   * Action trigger for Scan to Pay or Receive
   * Directly asks for Camera Permission with 3 options instead of "checking device for korapay"
   */
  const handleActionClick = (actionType) => {
    setActionAttempted(actionType === 'scan' ? 'Scan to Pay' : 'Receive');

    if (actionType === 'scan') {
      const cameraPerm = localStorage.getItem('qpay_camera_permission');
      if (cameraPerm === 'always_allow') {
        setCurrentView('scanner');
      } else {
        // Shows permission modal with Always allow, Always ask for permission, Never allow
        setShowCameraPermissionModal(true);
      }
    } else {
      // Receive: open immediately
      playRobloxClickSound();
      setCurrentView('receive');
    }
  };

  const handleCameraPermissionSelect = (option) => {
    localStorage.setItem('qpay_camera_permission', option);
    setShowCameraPermissionModal(false);
    if (option === 'always_allow' || option === 'always_ask') {
      setCurrentView('scanner');
    }
  };

  const handleSimulateInstalled = () => {
    setInterledgerReady(true);
    setShowInstallModal(false);
    
    if (actionAttempted === 'Scan to Pay') {
      setCurrentView('scanner');
    } else {
      setCurrentView('receive');
    }
  };

  const handleConnectedSuccess = (user) => {
    setConnectedUser(user);
    setStoredInterledgerUser(user);
  };

  const sanitizeAuthType = (t) => {
    return (typeof t === 'string' && t.toLowerCase() === 'business') ? 'business' : 'individual';
  };

  // If user has not yet registered/logged in, show LandingPage first, then selection, login, or register
  if (!registeredUser) {
    if (!showAuthScreen) {
      return (
        <LandingPage
          onLoginClick={() => {
            setAuthView('selection');
            setShowAuthScreen(true);
            window.scrollTo({ top: 0, behavior: 'auto' });
          }}
        />
      );
    }

    if (authView === 'login') {
      return (
        <LoginView
          accountType={sanitizeAuthType(authType)}
          onLoginSuccess={handleRegisterComplete}
          onSwitchToRegister={(type) => {
            setAuthType(sanitizeAuthType(type));
            setAuthView('register');
          }}
          onChangeAccountType={() => {
            setAuthView('selection');
          }}
          onBackToLanding={() => {
            setShowAuthScreen(false);
            window.scrollTo({ top: 0, behavior: 'auto' });
          }}
        />
      );
    }

    return (
      <RegisterView
        key={authView === 'selection' ? 'selection' : `reg_${sanitizeAuthType(authType)}`}
        initialSelectedType={authView === 'register' ? sanitizeAuthType(authType) : null}
        onRegisterComplete={handleRegisterComplete}
        onSwitchToLogin={(type) => {
          setAuthType(sanitizeAuthType(type));
          setAuthView('login');
        }}
        onChangeAccountType={() => {
          setAuthView('selection');
        }}
        onBackToLanding={() => {
          setShowAuthScreen(false);
          window.scrollTo({ top: 0, behavior: 'auto' });
        }}
      />
    );
  }

  const isBusiness = registeredUser.type === 'business';

  return (
    <div className="min-h-screen bg-[#F8FAFD] flex flex-col font-sans select-none relative">
      
      {/* Top Accent Gradient Bar matching theme */}
      <div className="w-full h-[3px] bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600 fixed top-0 left-0 z-50" />

      {/* Top Navigation Bar - Full Width Web Layout */}
      <header className="w-full px-6 sm:px-12 py-5 flex items-center justify-between border-b border-slate-100 bg-white/70 backdrop-blur-sm">
        
        {/* Left: Logo & App Name */}
        <div className="flex items-center gap-3">
          <img
            src="/logo.jpg"
            alt="Qpay Logo"
            className="w-11 h-11 rounded-xl object-contain shadow-sm border border-slate-100"
          />
          <span className="text-2xl font-bold tracking-tight text-slate-900">
            Qpay
          </span>
          {isBusiness && (
            <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 text-xs font-semibold rounded-full border border-indigo-100 hidden sm:inline-block">
              Business Portal
            </span>
          )}
        </div>

        {/* Right: Profile Button Pill + User Avatar */}
        <div className="flex items-center gap-3 sm:gap-4">
          
          {/* Profile Pill */}
          <button
            type="button"
            onClick={() => setShowProfileModal(true)}
            className="flex items-center gap-2 px-3.5 py-1.5 bg-white hover:bg-slate-50 border border-slate-200/80 hover:border-indigo-300 rounded-full shadow-[0_1px_2px_rgba(0,0,0,0.03)] text-xs font-semibold text-slate-700 hover:text-indigo-600 transition cursor-pointer group"
            title="View Profile and Tier Verification"
          >
            <User className="w-3.5 h-3.5 text-indigo-600 group-hover:scale-110 transition-transform" />
            <span>Profile</span>
          </button>

          {/* User Profile Avatar */}
          <div 
            onClick={() => setShowProfileModal(true)}
            title="Click to view Profile & Verify Credentials"
            className="relative w-9 h-9 rounded-full overflow-hidden border-2 border-indigo-200 hover:border-indigo-500 hover:scale-105 shadow-sm flex-shrink-0 cursor-pointer transition"
          >
            <img
              src={resolveUserAvatar(registeredUser)}
              alt={registeredUser.name}
              className="w-full h-full object-cover"
            />
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full" />
          </div>

        </div>

      </header>

      {/* Main Content Area - Full Width Web Layout */}
      <main className="flex-1 flex flex-col items-center justify-start p-6">
        {ilpSettlementNotice && (
          <div
            className={`w-full max-w-xl mb-4 p-3.5 rounded-2xl border text-xs flex items-center justify-between gap-3 shadow-sm animate-fadeIn ${
              ilpSettlementNotice.status === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <ShieldCheck className="w-4 h-4 flex-shrink-0" />
              <div className="truncate">
                <span className="font-semibold block">{ilpSettlementNotice.message}</span>
                {ilpSettlementNotice.outgoingPaymentId && (
                  <span className="font-mono text-[11px] opacity-80 block truncate">
                    Ref: {ilpSettlementNotice.reference}
                  </span>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIlpSettlementNotice(null)}
              className="px-2.5 py-1 rounded-lg bg-white/70 hover:bg-white text-[11px] font-semibold cursor-pointer flex-shrink-0"
            >
              Dismiss
            </button>
          </div>
        )}
        
        {currentView === 'home' && (
          <div className="w-full max-w-4xl flex flex-col items-center justify-center animate-fadeIn">
            
            {/* Welcome User Banner */}
            <div className="w-full mb-6 text-center">
              <div className="flex flex-col items-center justify-center">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center justify-center gap-2">
                  <span>Welcome,</span>
                  <span className="text-indigo-600">{registeredUser?.name || 'User'}</span>
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 mt-1 text-center max-w-lg mx-auto">
                  {isBusiness 
                    ? 'Business Terminal • Manage sales, inventory and incoming customer payments'
                    : 'Individual Account • Instant contactless QR payments powered by Interledger Open Payments'}
                </p>
              </div>
            </div>

            {/* BUSINESS TABS NAVIGATION (Only for Business accounts) */}
            {isBusiness && (
              <div className="flex items-center gap-1.5 p-1.5 bg-white border border-slate-200/80 rounded-2xl shadow-sm mb-6 flex-wrap justify-center">
                <button
                  type="button"
                  onClick={() => setBusinessTab('terminal')}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
                    businessTab === 'terminal'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <WalletCards className="w-4 h-4" />
                  <span>Receive</span>
                </button>

                <button
                  type="button"
                  onClick={() => setBusinessTab('inventory')}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
                    businessTab === 'inventory'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Package className="w-4 h-4" />
                  <span>Sales</span>
                </button>

                <button
                  type="button"
                  onClick={() => setBusinessTab('customer_payments')}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
                    businessTab === 'customer_payments'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Receipt className="w-4 h-4" />
                  <span>Payments</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    businessTab === 'customer_payments' ? 'bg-white/20 text-white' : 'bg-indigo-100 text-indigo-700'
                  }`}>
                    {(() => {
                      try {
                        const raw = localStorage.getItem('qpay_customer_payments');
                        return raw ? JSON.parse(raw).length : 0;
                      } catch (e) {
                        return 0;
                      }
                    })()}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setBusinessTab('leaderboard')}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    businessTab === 'leaderboard'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Trophy className="w-4 h-4" />
                  <span>Leaderboard</span>
                </button>

                <button
                  type="button"
                  onClick={() => setBusinessTab('performance')}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    businessTab === 'performance'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <TrendingUp className="w-4 h-4" />
                  <span>Performance</span>
                </button>
              </div>
            )}

            {/* TAB CONTENT 1: Items for Sale (For Business) */}
            {isBusiness && businessTab === 'inventory' ? (
              <div className="w-full flex flex-col items-center">
                <BusinessInventoryTab businessUser={registeredUser} />
                <div className="w-full pt-4">
                  <IndividualNav
                    currentView={currentView}
                    isProfileOpen={showProfileModal}
                    onNavigate={(view) => {
                      if (view === 'home' && isBusiness) setBusinessTab('terminal');
                      setCurrentView(view);
                    }}
                    onOpenProfile={() => setShowProfileModal(true)}
                  />
                </div>
              </div>
            ) : isBusiness && businessTab === 'customer_payments' ? (
              /* TAB CONTENT 2: Customer Payments */
              <div className="w-full flex flex-col items-center">
                <CustomerPaymentsTab 
                  businessName={registeredUser.name} 
                  onPaymentsUpdated={updateCustomerPaymentsTotal}
                />
                <div className="w-full pt-4">
                  <IndividualNav
                    currentView={currentView}
                    isProfileOpen={showProfileModal}
                    onNavigate={(view) => {
                      if (view === 'home' && isBusiness) setBusinessTab('terminal');
                      setCurrentView(view);
                    }}
                    onOpenProfile={() => setShowProfileModal(true)}
                  />
                </div>
              </div>
            ) : isBusiness && businessTab === 'leaderboard' ? (
              /* TAB CONTENT 3: Customer Relations Leaderboard */
              <div className="w-full flex flex-col items-center">
                <CustomerLeaderboardTab businessName={registeredUser.name} />
                <div className="w-full pt-4">
                  <IndividualNav
                    currentView={currentView}
                    isProfileOpen={showProfileModal}
                    onNavigate={(view) => {
                      if (view === 'home' && isBusiness) setBusinessTab('terminal');
                      setCurrentView(view);
                    }}
                    onOpenProfile={() => setShowProfileModal(true)}
                  />
                </div>
              </div>
            ) : isBusiness && businessTab === 'performance' ? (
              /* TAB CONTENT 4: Business Performance & Growth Analytics */
              <div className="w-full flex flex-col items-center">
                <BusinessPerformanceTab businessUser={registeredUser} />
                <div className="w-full pt-4">
                  <IndividualNav
                    currentView={currentView}
                    isProfileOpen={showProfileModal}
                    onNavigate={(view) => {
                      if (view === 'home' && isBusiness) setBusinessTab('terminal');
                      setCurrentView(view);
                    }}
                    onOpenProfile={() => setShowProfileModal(true)}
                  />
                </div>
              </div>
            ) : (
              /* TAB CONTENT 4: Main Terminal View (Dashboard + Action Cards) */
              <div className="w-full flex flex-col items-center">
                
                {/* 1. Balance Dashboard with Add Money button (Reflecting Customer Payments) */}
                <BalanceDashboard
                  registeredUser={registeredUser}
                  customerPaymentsTotal={customerPaymentsTotal}
                  onAddMoneyClick={() => setShowAddMoneyModal(true)}
                  onOpenProfile={() => setShowProfileModal(true)}
                  onOpenTransactionHistory={() => setCurrentView('transactions')}
                />

                {/* 2. Action Cards - Side by Side Cards Web Layout */}
                <div className="flex flex-row items-center justify-center gap-6 sm:gap-8 flex-wrap">
                  
                  {/* FOR INDIVIDUALS ONLY: "Scan to Pay" */}
                  {!isBusiness && (
                    <div
                      onClick={() => handleActionClick('scan')}
                      className="w-60 h-64 sm:w-64 sm:h-64 bg-white rounded-2xl border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)] card-hover-lift cursor-pointer flex flex-col items-center justify-center p-6 text-center select-none group"
                    >
                      {/* Icon Container */}
                      <div className="w-14 h-14 bg-[#EEF2FF] text-[#4F46E5] rounded-xl flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                        <QrCode className="w-6 h-6 stroke-[1.8]" />
                      </div>

                      <h3 className="text-sm font-semibold text-slate-900 mb-1.5">
                        Scan to Pay
                      </h3>
                      <p className="text-xs text-slate-500 leading-relaxed max-w-[150px]">
                        Pay a merchant or friend instantly
                      </p>
                    </div>
                  )}

                  {/* FOR BOTH (And exclusively for Business): "Receive" */}
                  <div
                    onClick={() => handleActionClick('receive')}
                    className="w-60 h-64 sm:w-64 sm:h-64 bg-white rounded-2xl border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)] card-hover-lift cursor-pointer flex flex-col items-center justify-center p-6 text-center select-none group"
                  >
                    {/* Icon Container */}
                    <div className="w-14 h-14 bg-[#EEF2FF] text-[#4F46E5] rounded-xl flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                      <ArrowDownToLine className="w-6 h-6 stroke-[1.8]" />
                    </div>

                    <h3 className="text-sm font-semibold text-slate-900 mb-1.5">
                      Receive
                    </h3>
                    <p className="text-xs text-slate-500 leading-relaxed max-w-[150px]">
                      {isBusiness 
                        ? 'Display merchant QR to receive payments'
                        : 'Show QR or request payment'}
                    </p>
                  </div>

                </div>

                {/* 3. Navigation Tabs directly below Scan to Pay & Receive */}
                <IndividualNav
                  currentView={currentView}
                  isProfileOpen={showProfileModal}
                  onNavigate={(view) => {
                    if (view === 'home' && isBusiness) setBusinessTab('terminal');
                    setCurrentView(view);
                  }}
                  onOpenProfile={() => setShowProfileModal(true)}
                />

              </div>
            )}

          </div>
        )}

        {/* View 2: Live Camera QR Scanner */}
        {currentView === 'scanner' && (
          <div className="w-full flex justify-center py-4 animate-fadeIn">
            <ScannerView
              onBack={() => setCurrentView('home')}
              connectedUser={registeredUser}
              onBalanceDeducted={handleBalanceDeducted}
            />
          </div>
        )}

        {/* View 3: Receive QR Code */}
        {currentView === 'receive' && (
          <div className="w-full flex justify-center py-4 animate-fadeIn">
            <ReceiveView
              onBack={() => setCurrentView('home')}
              connectedUser={registeredUser}
              onUserUpdated={handleUserUpdated}
            />
          </div>
        )}

        {/* View 4: Transaction History View */}
        {currentView === 'transactions' && (
          <div className="w-full flex justify-center py-4 animate-fadeIn">
            <TransactionHistoryView
              onBack={() => setCurrentView('home')}
              registeredUser={registeredUser}
              customerPaymentsTotal={customerPaymentsTotal}
            />
          </div>
        )}

        {/* View 5: Send to Permanent Traditional Bank */}
        {currentView === 'send' && (
          <div className="w-full flex justify-center py-4 animate-fadeIn">
            <SendView
              onBack={() => setCurrentView('home')}
              registeredUser={registeredUser}
              onBalanceDeducted={handleBalanceDeducted}
            />
          </div>
        )}

        {/* View 6: Account Settings */}
        {currentView === 'settings' && (
          <div className="w-full flex justify-center py-4 animate-fadeIn">
            <SettingsView
              onBack={() => setCurrentView('home')}
              registeredUser={registeredUser}
              onOpenProfile={() => setShowProfileModal(true)}
              onOpenTransactions={() => setCurrentView('transactions')}
            />
          </div>
        )}

        {/* View 7: Help & Support */}
        {currentView === 'help' && (
          <div className="w-full flex justify-center py-4 animate-fadeIn">
            <HelpView
              onBack={() => setCurrentView('home')}
              registeredUser={registeredUser}
            />
          </div>
        )}

        {/* Persistent Navigation Bar across sub-views */}
        {currentView !== 'home' && (
          <div className="w-full pb-4">
            <IndividualNav
              currentView={currentView}
              isProfileOpen={showProfileModal}
              onNavigate={(view) => {
                if (view === 'home' && isBusiness) {
                  setBusinessTab('terminal');
                }
                setCurrentView(view);
              }}
              onOpenProfile={() => setShowProfileModal(true)}
            />
          </div>
        )}

      </main>

      {/* Lower Bottom Footer with Logout Option */}
      {!isBusiness ? (
        <footer className="w-full mt-auto py-6 px-6 sm:px-12 border-t border-slate-200/60 bg-white/50 flex items-center justify-between gap-4">
          <p className="text-[11px] text-slate-400">
            Qpay Africa • Powered by Interledger Open Payments
          </p>
          <button
            type="button"
            onClick={() => setShowLogoutModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition cursor-pointer active:scale-95 shadow-xs flex-shrink-0"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Log Out</span>
          </button>
        </footer>
      ) : (
        <footer className="w-full mt-auto py-8 border-t border-slate-200/60 bg-white/50 flex flex-col items-center justify-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowLogoutModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition cursor-pointer active:scale-95 shadow-xs"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Log Out</span>
          </button>
          <p className="text-[11px] text-slate-400">
            Qpay Africa • Powered by Interledger Open Payments
          </p>
        </footer>
      )}

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-sm bg-white border border-slate-100 rounded-3xl shadow-2xl p-6 text-center space-y-4 animate-scaleUp">
            <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto border border-rose-100">
              <LogOut className="w-6 h-6 stroke-[2]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Log Out of Qpay?</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Are you sure you want to log out? Once confirmed, you will be redirected back to the landing page.
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmLogout}
                className="flex-1 py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-sm transition cursor-pointer"
              >
                Yes, Log Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Camera Permission Modal (Always allow, Always ask for permission, Never allow) */}
      <CameraPermissionModal
        isOpen={showCameraPermissionModal}
        onClose={() => setShowCameraPermissionModal(false)}
        onSelectOption={handleCameraPermissionSelect}
      />

      {/* Profile & KYC Tier Verification Modal */}
      <ProfileKycModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        registeredUser={registeredUser}
        onUserUpdated={handleUserUpdated}
        onLogout={() => setShowLogoutModal(true)}
      />

      {/* Add Money Modal (Permanent Card top-up) */}
      <AddMoneyModal
        isOpen={showAddMoneyModal}
        onClose={() => setShowAddMoneyModal(false)}
        onBalanceUpdated={handleBalanceAdded}
        currentBalance={registeredUser.balance || 0}
      />

      {/* Connect to Korapay Modal */}
      <ConnectModal
        isOpen={showConnectModal}
        onClose={() => setShowConnectModal(false)}
        onConnected={handleConnectedSuccess}
      />

      {/* Required Error Modal: "Korapay needs to be installed" */}
      <InstallModal
        isOpen={showInstallModal}
        onClose={() => setShowInstallModal(false)}
        actionAttempted={actionAttempted}
        onSimulateInstall={handleSimulateInstalled}
      />

      {/* Floating AI Assistant Chatbox */}
      <AiAssistantChat
        registeredUser={registeredUser}
        onNavigate={(view) => {
          if (['terminal', 'inventory', 'customer_payments', 'leaderboard'].includes(view)) {
            setBusinessTab(view);
            setCurrentView('home');
          } else {
            setCurrentView(view);
          }
        }}
        onOpenProfile={() => setShowProfileModal(true)}
        onOpenAddMoney={() => setShowAddMoneyModal(true)}
        customerPaymentsTotal={customerPaymentsTotal}
      />

    </div>
  );
}
