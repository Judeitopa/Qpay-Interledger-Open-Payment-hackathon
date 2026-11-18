import React, { useState, useEffect, useCallback } from 'react';
import { 
  ArrowLeft, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Receipt, 
  CheckCircle2, 
  X, 
  CreditCard, 
  Building2, 
  Calendar, 
  Hash, 
  Wallet,
  TrendingUp,
  ShieldCheck,
  Filter
} from 'lucide-react';

export default function TransactionHistoryView({ 
  onBack, 
  registeredUser, 
  customerPaymentsTotal = 0 
}) {
  const now = new Date();
  const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [selectedMonth, setSelectedMonth] = useState(currentYearMonth);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [transactions, setTransactions] = useState([]);

  const isIndividual = registeredUser?.type !== 'business';

  // Compute live balance
  const balanceAmount = isIndividual
    ? (registeredUser?.balance ?? 0)
    : ((registeredUser?.balance ?? 0) + (customerPaymentsTotal || 0));

  // Load documented transactions and seed initial realistic transactions if none exist
  const loadTransactions = useCallback(() => {
    try {
      const saved = localStorage.getItem('qpay_transactions');
      let txList = [];
      if (saved) {
        txList = JSON.parse(saved);
      }

      // Start empty if no transactions exist yet
      if (!txList) {
        txList = [];
      }

      // Merge business customer payments from qpay_customer_payments
      if (!isIndividual) {
        try {
          const customerPayments = JSON.parse(localStorage.getItem('qpay_customer_payments') || '[]');
          const formattedCustomerBills = customerPayments
            .filter(b => b.status === 'SUCCESSFUL' || b.status === 'PAID')
            .map(b => ({
              id: 'cp_' + b.id,
              title: `Customer Payment - ${b.customerName || 'Shopper'}`,
              type: 'credit',
              amount: b.amountPaid || 0,
              date: b.date || new Date(b.timeIso || Date.now()).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
              timeIso: b.timeIso || new Date().toISOString(),
              ref: b.billRef || ('KP_QPAY_BILL_' + Math.floor(100000 + Math.random() * 900000)),
              status: 'Successful',
              rail: 'Customer Terminal QR',
              channel: b.customerTag || 'Qpay QR Rail'
            }));

          const seenRefs = new Set();
          const merged = [];

          [...formattedCustomerBills, ...txList].forEach(item => {
            const key = item.ref || item.id;
            if (!seenRefs.has(key)) {
              seenRefs.add(key);
              merged.push(item);
            }
          });

          merged.sort((a, b) => new Date(b.timeIso || 0) - new Date(a.timeIso || 0));
          setTransactions(merged);
          return;
        } catch (e) {}
      }

      txList.sort((a, b) => new Date(b.timeIso || 0) - new Date(a.timeIso || 0));
      setTransactions(txList);
    } catch (e) {
      console.error('Error loading transactions:', e);
    }
  }, [isIndividual]);

  useEffect(() => {
    loadTransactions();

    const handleUpdate = () => loadTransactions();
    window.addEventListener('qpay_transactions_updated', handleUpdate);
    window.addEventListener('qpay_payments_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      window.removeEventListener('qpay_transactions_updated', handleUpdate);
      window.removeEventListener('qpay_payments_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [loadTransactions]);

  // Extract YYYY-MM string from a transaction record
  const getTxYearMonth = (tx) => {
    if (tx.timeIso) {
      const d = new Date(tx.timeIso);
      if (!isNaN(d.getTime())) {
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      }
    }
    if (tx.date) {
      const monthMap = {
        Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
        Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12'
      };
      const match = tx.date.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{4})\b/);
      if (match) {
        return `${match[2]}-${monthMap[match[1]]}`;
      }
    }
    return currentYearMonth;
  };

  // Format YYYY-MM into readable "November 2026"
  const formatMonthLabel = (ym) => {
    if (ym === 'all') return 'All Months';
    const [year, month] = ym.split('-').map(Number);
    const d = new Date(year, (month || 1) - 1, 1);
    return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  // Build available month options (all 12 months of current year + any extra months from transactions)
  const monthOptionsSet = new Set();
  const activeYear = now.getFullYear();
  for (let m = 12; m >= 1; m--) {
    monthOptionsSet.add(`${activeYear}-${String(m).padStart(2, '0')}`);
  }
  transactions.forEach((tx) => {
    monthOptionsSet.add(getTxYearMonth(tx));
  });
  const monthOptions = Array.from(monthOptionsSet).sort((a, b) => b.localeCompare(a));

  // Filter transactions by selected month
  const filteredTransactions = transactions.filter((tx) => {
    if (selectedMonth === 'all') return true;
    return getTxYearMonth(tx) === selectedMonth;
  });

  // Total transaction volume for chosen month
  const monthlyTotalAmount = filteredTransactions
    .filter((t) => t.status === 'Successful' || t.status === 'SUCCESSFUL')
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  const selectedMonthLabel = formatMonthLabel(selectedMonth);

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6 animate-fadeIn px-2 sm:px-0">
      
      {/* Top Header with Back Button */}
      <div className="flex items-center justify-between bg-white border border-slate-100 p-4 rounded-3xl shadow-sm">
        <button
          onClick={onBack}
          type="button"
          className="flex items-center gap-2 px-3.5 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-700 hover:text-slate-900 transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </button>

        <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Verified Interledger Rail</span>
        </div>
      </div>

      {/* Overview Summary Cards: Current Balance & Selected Month Total */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        
        {/* Total Available Balance */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-5">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Current Balance</span>
            <Wallet className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-slate-900 font-mono tracking-tight">
            ₦{balanceAmount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {isIndividual ? 'Individual Wallet' : 'Business Store Balance'}
          </p>
        </div>

        {/* Monthly Total Transactions Summary Card */}
        <div className="bg-indigo-50/70 rounded-2xl border border-indigo-100/90 shadow-sm p-4 sm:p-5">
          <div className="flex items-center justify-between text-indigo-700 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">
              {selectedMonth === 'all' ? 'All Transactions Total' : `${selectedMonthLabel} Total`}
            </span>
            <div className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <Calendar className="w-3.5 h-3.5 stroke-[2.2]" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-indigo-700 font-mono tracking-tight">
            ₦{monthlyTotalAmount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-indigo-600/80 mt-1 font-medium">
            {filteredTransactions.length} transaction{filteredTransactions.length === 1 ? '' : 's'} in {selectedMonthLabel}
          </p>
        </div>

      </div>

      {/* Main Transactions Container */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 sm:p-7 space-y-4">
        
        {/* Header & Month Selector Row */}
        <div className="flex items-center justify-between flex-wrap gap-3 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
              <Receipt className="w-5 h-5 stroke-[2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">
                  Transaction History
                </h2>
                <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-full border border-indigo-100">
                  {filteredTransactions.length}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Full chronological ledger of your previous transactions
              </p>
            </div>
          </div>

          {/* Month Selector Control */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-1.5">
            <Calendar className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0" />
            <label htmlFor="tx-month-select" className="sr-only">Choose Month</label>
            <select
              id="tx-month-select"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer pr-1"
            >
              <option value="all">All Months</option>
              {monthOptions.map((ym) => (
                <option key={ym} value={ym}>
                  {formatMonthLabel(ym)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Transaction Items List */}
        <div className="space-y-2.5">
          {filteredTransactions.length === 0 ? (
            <div className="py-16 text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-400 mx-auto flex items-center justify-center border border-slate-100">
                <Receipt className="w-6 h-6 stroke-[1.5]" />
              </div>
              <p className="text-sm font-semibold text-slate-700">
                No transactions for {selectedMonthLabel}
              </p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                There are no recorded transactions for {selectedMonthLabel}. Select another month above to view earlier transactions.
              </p>
            </div>
          ) : (
            filteredTransactions.map((tx) => {
              const isCredit = tx.type === 'credit';
              return (
                <div
                  key={tx.id}
                  onClick={() => setSelectedTransaction(tx)}
                  className="group flex items-center justify-between p-3.5 sm:p-4 rounded-2xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/20 transition cursor-pointer"
                >
                  {/* Left: Direction Icon + Title + Meta */}
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105 ${
                        isCredit 
                          ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                          : 'bg-slate-100 text-slate-700 border border-slate-200/60'
                      }`}
                    >
                      {isCredit ? (
                        <ArrowDownLeft className="w-5 h-5 stroke-[2.2]" />
                      ) : (
                        <ArrowUpRight className="w-5 h-5 stroke-[2.2]" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-semibold text-slate-900 truncate">
                        {tx.title}
                      </p>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5 truncate">
                        <span>{tx.date}</span>
                        <span>•</span>
                        <span className="font-mono truncate">{tx.ref}</span>
                        {tx.rail && (
                          <>
                            <span className="hidden sm:inline">•</span>
                            <span className="hidden sm:inline">{tx.rail}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Amount + Status */}
                  <div className="text-right flex-shrink-0 pl-3">
                    <div
                      className={`text-sm sm:text-base font-bold font-mono tracking-tight ${
                        isCredit ? 'text-emerald-600' : 'text-slate-900'
                      }`}
                    >
                      {isCredit ? '+' : '-'} ₦{Number(tx.amount || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                    </div>
                    <div className="inline-flex items-center gap-1 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span className="text-[10px] font-semibold text-emerald-700">Successful</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

      </div>

      {/* ========================================================
          TRANSACTION DETAIL RECEIPT MODAL
         ======================================================== */}
      {selectedTransaction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-sm bg-white border border-slate-100 rounded-3xl shadow-2xl p-6 space-y-4 animate-scaleUp">
            
            {/* Close button */}
            <button
              type="button"
              onClick={() => setSelectedTransaction(null)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header / Status Badge */}
            <div className="text-center space-y-1.5 pt-1">
              <div className={`mx-auto w-12 h-12 rounded-2xl flex items-center justify-center shadow-xs ${
                selectedTransaction.type === 'credit'
                  ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                  : 'bg-slate-100 text-slate-700 border border-slate-200'
              }`}>
                {selectedTransaction.type === 'credit' ? (
                  <ArrowDownLeft className="w-6 h-6 stroke-[2]" />
                ) : (
                  <ArrowUpRight className="w-6 h-6 stroke-[2]" />
                )}
              </div>

              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                <span>Transaction Successful</span>
              </div>

              <h3 className="text-2xl font-extrabold text-slate-900 pt-1 font-mono tracking-tight">
                {selectedTransaction.type === 'credit' ? '+' : '-'} ₦{Number(selectedTransaction.amount || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                {selectedTransaction.title}
              </p>
            </div>

            {/* Details Table */}
            <div className="bg-[#F8FAFD] border border-slate-200/80 rounded-2xl p-4 space-y-2.5 text-xs">
              <div className="flex justify-between pb-2 border-b border-slate-200/60">
                <span className="text-slate-400 flex items-center gap-1">
                  <Hash className="w-3 h-3" /> Reference
                </span>
                <span className="font-mono font-semibold text-slate-800">
                  {selectedTransaction.ref}
                </span>
              </div>

              <div className="flex justify-between pb-2 border-b border-slate-200/60">
                <span className="text-slate-400 flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> Date & Time
                </span>
                <span className="font-medium text-slate-800">
                  {selectedTransaction.date}
                </span>
              </div>

              <div className="flex justify-between pb-2 border-b border-slate-200/60">
                <span className="text-slate-400 flex items-center gap-1">
                  <CreditCard className="w-3 h-3" /> Payment Rail
                </span>
                <span className="font-medium text-slate-800">
                  {selectedTransaction.rail || 'Interledger Open Payments'}
                </span>
              </div>

              {selectedTransaction.channel && (
                <div className="flex justify-between pb-2 border-b border-slate-200/60">
                  <span className="text-slate-400 flex items-center gap-1">
                    <Building2 className="w-3 h-3" /> Channel
                  </span>
                  <span className="font-medium text-slate-800">
                    {selectedTransaction.channel}
                  </span>
                </div>
              )}

              {(selectedTransaction.outgoingPaymentId || selectedTransaction.incomingPaymentId) && (
                <div className="flex justify-between pb-2 border-b border-slate-200/60 gap-3">
                  <span className="text-slate-400 flex-shrink-0">Open Payments ID</span>
                  <span className="font-mono text-[11px] font-semibold text-indigo-700 truncate max-w-[180px]">
                    {(selectedTransaction.outgoingPaymentId || selectedTransaction.incomingPaymentId).split('/').pop()}
                  </span>
                </div>
              )}

              <div className="flex justify-between">
                <span className="text-slate-400">Account Tag</span>
                <span className="font-mono font-semibold text-indigo-700">
                  {registeredUser?.qpayTag || '@user'}
                </span>
              </div>
            </div>

            {/* Done button */}
            <button
              type="button"
              onClick={() => setSelectedTransaction(null)}
              className="w-full py-2.5 px-4 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-semibold shadow-sm transition cursor-pointer"
            >
              Close Receipt
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
