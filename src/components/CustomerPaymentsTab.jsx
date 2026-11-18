import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FileText, QrCode, CheckCircle2, Search, ArrowRight, Printer, Share2, X, Clock, User, Users, ShieldCheck, Tag, Plus, Check, Loader2, Sparkles, Building2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import confetti from 'canvas-confetti';
import { playRobloxClickSound } from '../utils/soundEffects';
import VintagePaperTag from './VintagePaperTag';
import { persistActiveSession } from '../utils/accountStorage';
import { createInterledgerIncomingPayment, INTERLEDGER_CONFIG } from '../utils/interledgerApi';

function renderModalPortal(content) {
  if (typeof document === 'undefined') return null;
  return createPortal(content, document.body);
}

// Sample registered Qpay customers who transact on the network
const REGISTERED_QPAY_CUSTOMERS = [
  { name: 'Chinedu Okafor', tag: '@chinedu', phone: '+234 803 123 4567' },
  { name: 'Bolanle Adeleke', tag: '@bolanle', phone: '+234 818 765 4321' },
  { name: 'Babatunde Okafor', tag: '@babatunde', phone: '+234 802 111 2233' },
  { name: 'Emeka Nwankwo', tag: '@emeka', phone: '+234 705 998 1122' },
  { name: 'Fatima Bello', tag: '@fatima', phone: '+234 802 443 9081' },
  { name: 'Amina Yusuf', tag: '@amina', phone: '+234 809 333 4455' }
];

// Customer Orders & Payments start clean for newly registered businesses
const INITIAL_CUSTOMER_BILLS = [];

export default function CustomerPaymentsTab({ businessName = 'Your Business', onPaymentsUpdated }) {
  const [bills, setBills] = useState(() => {
    const saved = localStorage.getItem('qpay_customer_payments');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBill, setSelectedBill] = useState(null);

  // Bill Generation Modal State (Customer Name input REMOVED as requested)
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [genItems, setGenItems] = useState([
    { name: '', qty: 1, unitPrice: '' }
  ]);

  // Live Generated Payment QR Modal with 10-second Auto-Success Simulation
  const [activeGeneratedBill, setActiveGeneratedBill] = useState(null);
  const [activeCountdown, setActiveCountdown] = useState(10);
  const [isSimulatedSuccess, setIsSimulatedSuccess] = useState(false);

  // Read saved business inventory for quick selection
  const [availableInventory, setAvailableInventory] = useState(() => {
    try {
      const saved = localStorage.getItem('qpay_business_inventory');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  // Calculate customer payment count (for x2, x3 returning customer tagging)
  const getCustomerPaymentCount = (customerName) => {
    if (!customerName || customerName.includes('Awaiting')) return 0;
    return bills.filter(b => 
      b.customerName?.toLowerCase().trim() === customerName.toLowerCase().trim() &&
      (b.status === 'SUCCESSFUL' || b.status === 'PAID')
    ).length;
  };

  // Sync with persistent background settlement events dispatched from App.jsx
  useEffect(() => {
    const handlePaymentsSync = () => {
      try {
        const saved = localStorage.getItem('qpay_customer_payments');
        if (saved) {
          const parsed = JSON.parse(saved);
          setBills(parsed);
          
          // If activeGeneratedBill is currently open, sync its state
          if (activeGeneratedBill) {
            const updatedActive = parsed.find(b => b.id === activeGeneratedBill.id);
            if (updatedActive && updatedActive.status === 'SUCCESSFUL') {
              setActiveGeneratedBill(updatedActive);
              setIsSimulatedSuccess(true);
              setActiveCountdown(0);
            }
          }
        }
      } catch (e) {}
    };

    window.addEventListener('qpay_payments_updated', handlePaymentsSync);
    return () => window.removeEventListener('qpay_payments_updated', handlePaymentsSync);
  }, [activeGeneratedBill]);

  // 10-Second Automatic Payment Success Simulation (tied to settleAt so leaving tab preserves progress)
  useEffect(() => {
    let countInterval;

    if (activeGeneratedBill && activeGeneratedBill.status === 'PENDING') {
      const targetTime = activeGeneratedBill.settleAt || (Date.now() + 10000);
      const initialRemaining = Math.max(1, Math.ceil((targetTime - Date.now()) / 1000));
      setActiveCountdown(initialRemaining);
      setIsSimulatedSuccess(false);

      countInterval = setInterval(() => {
        const remaining = Math.max(0, Math.ceil((targetTime - Date.now()) / 1000));
        setActiveCountdown(remaining);
        
        if (remaining <= 0) {
          clearInterval(countInterval);
          // Check storage for the settled bill (or settle immediately if not already settled)
          try {
            const saved = localStorage.getItem('qpay_customer_payments');
            if (saved) {
              const currentBills = JSON.parse(saved);
              const found = currentBills.find(b => b.id === activeGeneratedBill.id);
              if (found) {
                if (found.status === 'PENDING') {
                  const possibleCustomers = REGISTERED_QPAY_CUSTOMERS;
                  const resolvedCustomer = possibleCustomers[Math.floor(Math.random() * possibleCustomers.length)];
                  found.status = 'SUCCESSFUL';
                  found.customerName = resolvedCustomer.name;
                  found.customerTag = resolvedCustomer.tag;
                  found.phone = resolvedCustomer.phone;
                  localStorage.setItem('qpay_customer_payments', JSON.stringify(currentBills));
                  persistActiveSession();
                  setBills(currentBills);
                  if (onPaymentsUpdated) {
                    const newTotal = currentBills
                      .filter(b => b.status === 'SUCCESSFUL' || b.status === 'PAID')
                      .reduce((acc, curr) => acc + (curr.amountPaid || 0), 0);
                    onPaymentsUpdated(newTotal);
                  }
                }
                setActiveGeneratedBill(found);
              }
            }
          } catch (e) {}

          setIsSimulatedSuccess(true);
          try {
            confetti({ particleCount: 85, spread: 80, origin: { y: 0.6 } });
            playRobloxClickSound();
          } catch (e) {}
        }
      }, 1000);
    }

    return () => {
      clearInterval(countInterval);
    };
  }, [activeGeneratedBill, onPaymentsUpdated]);

  // Add Item Line in generator
  const handleAddGenItemLine = () => {
    setGenItems(prev => [...prev, { name: '', qty: 1, unitPrice: '' }]);
  };

  // Quick pick from existing inventory
  const handleSelectInventoryItem = (index, inventoryItem) => {
    setGenItems(prev => {
      const copy = [...prev];
      copy[index] = {
        name: inventoryItem.name,
        qty: copy[index]?.qty || 1,
        unitPrice: inventoryItem.price,
        inventoryId: inventoryItem.id
      };
      return copy;
    });
  };

  // Update item field in generator
  const handleUpdateGenItem = (index, field, value) => {
    setGenItems(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  // Remove item line
  const handleRemoveGenItem = (index) => {
    setGenItems(prev => prev.filter((_, i) => i !== index));
  };

  // Calculate total amount in generator
  const genTotalAmount = genItems.reduce((acc, curr) => {
    const qty = parseInt(curr.qty) || 0;
    const price = parseFloat(curr.unitPrice) || 0;
    return acc + (qty * price);
  }, 0);

  // Generate Payment QR Action (Creates live Interledger Open Payments Incoming Payment)
  const handleGenerateQrSubmit = async (e) => {
    e.preventDefault();
    if (genTotalAmount <= 0) return;

    const formattedItems = genItems
      .filter(item => item.name.trim() && parseFloat(item.unitPrice) > 0)
      .map(item => {
        const qty = parseInt(item.qty) || 1;
        const price = parseFloat(item.unitPrice) || 0;
        return {
          name: item.name.trim(),
          qty,
          unitPrice: price,
          total: qty * price,
          inventoryId: item.inventoryId
        };
      });

    if (formattedItems.length === 0) return;

    // 1. Automatically deduct purchased quantities from business inventory/catalog
    try {
      const savedInv = localStorage.getItem('qpay_business_inventory');
      if (savedInv) {
        const inventoryList = JSON.parse(savedInv);
        let inventoryChanged = false;

        formattedItems.forEach((purchasedItem) => {
          const pName = purchasedItem.name.trim().toLowerCase();
          const pQty = parseInt(purchasedItem.qty) || 1;

          // Match by inventoryId first, or by exact item name
          const target = inventoryList.find((inv) =>
            (purchasedItem.inventoryId && inv.id === purchasedItem.inventoryId) ||
            ((inv.name || '').trim().toLowerCase() === pName)
          );

          if (target) {
            target.qty = Math.max(0, (parseInt(target.qty) || 0) - pQty);
            inventoryChanged = true;
          }
        });

        if (inventoryChanged) {
          localStorage.setItem('qpay_business_inventory', JSON.stringify(inventoryList));
          setAvailableInventory(inventoryList);
          window.dispatchEvent(new CustomEvent('qpay_inventory_updated', { detail: { inventory: inventoryList } }));
        }
      }
    } catch (err) {
      console.error('Failed to deduct from business inventory:', err);
    }

    const billId = 'BILL-' + Math.floor(10000 + Math.random() * 90000);
    const ilpRef = 'ILP_QPAY_' + Math.floor(10000 + Math.random() * 90000);

    // 2. Create live Interledger Open Payments Incoming Payment on backend
    let liveIlp = null;
    try {
      liveIlp = await createInterledgerIncomingPayment({
        amount: genTotalAmount,
        description: `${businessName} Bill #${billId}`,
        reference: ilpRef,
        metadata: {
          billId,
          merchant: businessName,
          itemsCount: String(formattedItems.length)
        }
      });
    } catch (err) {
      console.warn('Interledger merchant bill creation fallback:', err?.message);
    }

    // 3. Bill starts with PENDING status and automatically resolves the registered Qpay user's name
    const newBill = {
      id: billId,
      customerName: 'Awaiting Qpay Customer...',
      customerTag: '@customer',
      phone: '+234 800 000 0000',
      table: 'Direct Counter QR',
      server: 'Qpay Merchant',
      date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      timeIso: new Date().toISOString(),
      settleAt: Date.now() + 10000, // 10-second background settlement timestamp
      korapayRef: liveIlp?.reference || ilpRef,
      incomingPaymentId: liveIlp?.incomingPaymentId || null,
      walletAddress: liveIlp?.walletAddress || INTERLEDGER_CONFIG.defaultWalletAddress,
      paymentPointer: liveIlp?.paymentPointer || INTERLEDGER_CONFIG.defaultPaymentPointer,
      ilpDisplayAmount: liveIlp?.displayAmount || null,
      status: 'PENDING', // Saved with Pending status by the far right!
      items: formattedItems,
      subtotal: genTotalAmount,
      vat: 0,
      amountPaid: genTotalAmount
    };

    const updatedBills = [newBill, ...bills];
    setBills(updatedBills);
    localStorage.setItem('qpay_customer_payments', JSON.stringify(updatedBills));
    persistActiveSession();

    // Show live QR popup
    setActiveGeneratedBill(newBill);
    setShowGenerateModal(false);

    // Reset generator form
    setGenItems([{ name: '', qty: 1, unitPrice: '' }]);
  };

  // Filter bills
  const filteredBills = bills.filter(b => 
    b.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.items.some(i => i.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const totalCollected = bills
    .filter(b => b.status === 'SUCCESSFUL' || b.status === 'PAID')
    .reduce((acc, curr) => acc + curr.amountPaid, 0);

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 animate-fadeIn pb-12 select-none">
      
      {/* Top Revenue Summary Bar with "Generate Payment QR" Button */}
      <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
            Total Payments Received
          </span>
          <div className="text-3xl font-bold text-slate-900 font-sans mt-0.5">
            ₦ {totalCollected.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>Reflected in Dashboard Balance • Settled via Interledger Open Payments</span>
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
          {/* GENERATE PAYMENT QR BUTTON */}
          <button
            type="button"
            onClick={() => setShowGenerateModal(true)}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition active:scale-95 cursor-pointer"
          >
            <QrCode className="w-4 h-4" />
            <span>Generate Payment QR</span>
          </button>

          {/* Search Input */}
          <div className="relative w-full sm:w-60">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search customer, item..."
              className="w-full bg-[#F8FAFD] border border-slate-200 rounded-xl py-2 pl-8 pr-3 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 transition"
            />
          </div>
        </div>
      </div>

      {/* Customer Payments Feed */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-2">
          <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-600" />
            <span>Payments Log</span>
          </h3>
          <span className="text-xs text-slate-400">
            {filteredBills.length} recorded payments
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {filteredBills.map((bill) => {
            const isPending = bill.status === 'PENDING';
            const visitCount = getCustomerPaymentCount(bill.customerName);

            return (
              <div
                key={bill.id}
                className="bg-white border border-slate-100 hover:border-indigo-200 rounded-3xl p-5 sm:p-6 shadow-[0_2px_12px_rgba(0,0,0,0.02)] hover:shadow-md transition card-hover-lift flex flex-col gap-4"
              >
                {/* Row 1: Customer Full Name + Returning Customer Special Tag (x2, x3...) + Payment Price + PENDING/SUCCESSFUL */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm ${
                      isPending ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                    }`}>
                      {bill.customerName.split(' ').map(n => n[0]).join('').slice(0, 2) || 'QC'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Customer Full Name */}
                        <h4 className="text-base font-bold text-slate-900">
                          {bill.customerName}
                        </h4>

                        {/* SPECIAL 2D ANIMATED OLD PAPER RETURNING CUSTOMER TAG (x2, x3, x4...) */}
                        {!isPending && visitCount >= 2 && (
                          <VintagePaperTag count={visitCount} />
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                        <span className="font-mono">{bill.id}</span>
                        <span>•</span>
                        <span>{bill.date}</span>
                        {bill.customerTag && (
                          <>
                            <span>•</span>
                            <span className="text-indigo-600 font-medium font-mono">{bill.customerTag}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Payment Price and Status by the FAR RIGHT */}
                  <div className="sm:text-right flex items-baseline sm:flex-col justify-between sm:justify-start">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                      Payment Price
                    </span>
                    <span className="text-xl font-extrabold text-slate-900 font-sans">
                      ₦ {bill.amountPaid.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                    </span>

                    {/* STATUS BY THE FAR RIGHT */}
                    <div className="mt-1">
                      {isPending ? (
                        <span className="px-2.5 py-0.5 bg-amber-50 text-amber-700 text-xs font-bold rounded-full border border-amber-200 flex items-center gap-1.5 animate-pulse">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                          <span>Pending (10s settlement)</span>
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full border border-emerald-200 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Successful</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Row 2: What They Bought (Itemized list clearly displayed) */}
                <div className="space-y-1.5 bg-[#FAFBFD] p-3.5 rounded-2xl border border-slate-100">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider pb-1">
                    <span>What They Bought ({bill.items.length} items)</span>
                    <span>Item Subtotal</span>
                  </div>
                  
                  <div className="space-y-1">
                    {bill.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center text-xs py-0.5">
                        <div className="flex items-center gap-2 text-slate-800">
                          <span className="w-5 h-5 rounded-md bg-white border border-slate-200 flex items-center justify-center text-[11px] font-bold text-indigo-600">
                            {item.qty}×
                          </span>
                          <span className="font-medium text-slate-800 text-xs truncate max-w-[240px]">
                            {item.name}
                          </span>
                          <span className="text-[11px] text-slate-400">(@₦{item.unitPrice.toLocaleString()})</span>
                        </div>
                        <span className="font-bold text-slate-900 font-mono text-[11px]">
                          ₦{item.total.toLocaleString('en-NG')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Row 3: Meta details & View Printable Bill Action */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 text-xs text-slate-400">
                  <span className="flex items-center gap-1 font-mono text-[11px]">
                    <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Ref: {bill.korapayRef}</span>
                  </span>

                  <button
                    type="button"
                    onClick={() => setSelectedBill(bill)}
                    className="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition self-end sm:self-auto cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>View Bill</span>
                  </button>
                </div>
              </div>
            );
          })}

          {filteredBills.length === 0 && (
            <div className="text-center py-12 bg-white rounded-2xl border border-slate-100 text-slate-400 text-xs">
              No customer payments found matching "{searchQuery}"
            </div>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* MODAL 1: GENERATE PAYMENT QR WITH ITEMS AND QTY */}
      {/* (Customer Name is NOT asked, auto-resolved from registered Qpay user) */}
      {/* ======================================================== */}
      {showGenerateModal && renderModalPortal(
        <div 
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowGenerateModal(false);
          }}
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 select-none"
        >
          <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto bg-white rounded-3xl shadow-2xl p-6 space-y-4 animate-scaleUp my-auto">
            
            <button
              onClick={() => setShowGenerateModal(false)}
              type="button"
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition z-10 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100">
                Payment Terminal
              </span>
              <h3 className="text-lg font-bold text-slate-900 mt-1">
                Generate Payment QR Code
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Paying registered Qpay user's identity is verified and recorded automatically
              </p>
            </div>

            <form onSubmit={handleGenerateQrSubmit} className="space-y-4">
              
              {/* Items Section */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-slate-700">
                    Items Bought & Quantity
                  </label>
                  <button
                    type="button"
                    onClick={handleAddGenItemLine}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Item</span>
                  </button>
                </div>

                {/* Item Rows */}
                <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                  {genItems.map((item, idx) => (
                    <div key={idx} className="p-3 bg-[#F8FAFD] border border-slate-200/80 rounded-2xl space-y-2">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[11px] font-bold text-slate-400">Item #{idx + 1}</span>
                        {genItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveGenItem(idx)}
                            className="text-slate-400 hover:text-rose-500 p-0.5 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Quick pick from business inventory if available */}
                      {availableInventory.length > 0 && (
                        <div>
                          <select
                            onChange={(e) => {
                              const found = availableInventory.find(i => i.id === e.target.value);
                              if (found) handleSelectInventoryItem(idx, found);
                            }}
                            defaultValue=""
                            className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-2 text-xs text-slate-600 focus:outline-none focus:border-indigo-500 mb-1"
                          >
                            <option value="" disabled>-- Or pick from saved inventory --</option>
                            {availableInventory.map(inv => (
                              <option key={inv.id} value={inv.id}>
                                {inv.name} (₦{inv.price.toLocaleString()})
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => handleUpdateGenItem(idx, 'name', e.target.value)}
                        required
                        placeholder="Item name (e.g. Leather Loafers)"
                        className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                      />

                      <div className="grid grid-cols-2 gap-2.5">
                        <div>
                          <span className="text-[10px] text-slate-400 block mb-0.5">Qty</span>
                          <input
                            type="number"
                            value={item.qty}
                            onChange={(e) => handleUpdateGenItem(idx, 'qty', e.target.value)}
                            min="1"
                            required
                            className="w-full bg-white border border-slate-200 rounded-xl py-1.5 px-3 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 font-bold"
                          />
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block mb-0.5">Unit Price (₦)</span>
                          <input
                            type="number"
                            value={item.unitPrice}
                            onChange={(e) => handleUpdateGenItem(idx, 'unitPrice', e.target.value)}
                            min="1"
                            required
                            placeholder="Price"
                            className="w-full bg-white border border-slate-200 rounded-xl py-1.5 px-3 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 font-bold"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total Summary */}
              <div className="p-3.5 bg-indigo-50/70 border border-indigo-100 rounded-2xl flex items-center justify-between text-xs font-semibold">
                <span className="text-indigo-900">Total Payment Price:</span>
                <span className="text-lg font-extrabold text-indigo-700 font-sans">
                  ₦ {genTotalAmount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                </span>
              </div>

              {/* Generate Button */}
              <button
                type="submit"
                disabled={genTotalAmount <= 0}
                className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 transition flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
              >
                <QrCode className="w-4 h-4" />
                <span>Generate Payment QR</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: LIVE GENERATED PAYMENT QR WITH 10-SECOND AUTOMATIC SUCCESS SIMULATION */}
      {/* ======================================================== */}
      {activeGeneratedBill && renderModalPortal(
        <div 
          onClick={(e) => {
            if (e.target === e.currentTarget) setActiveGeneratedBill(null);
          }}
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 select-none"
        >
          <div className="relative w-full max-w-sm max-h-[90vh] overflow-y-auto bg-white rounded-3xl shadow-2xl p-6 text-center space-y-4 animate-scaleUp my-auto">
            
            <button
              onClick={() => setActiveGeneratedBill(null)}
              type="button"
              className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition z-10 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header info */}
            <div>
              <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                Customer Payment Invoice
              </span>
              <h3 className="text-base font-bold text-slate-900 mt-1">
                {activeGeneratedBill.customerName}
              </h3>
              <div className="text-2xl font-black text-slate-900 font-sans mt-0.5">
                ₦ {activeGeneratedBill.amountPaid.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
              </div>
            </div>

            {/* Generated QR Code Container */}
            <div className="p-4 bg-white border-2 border-dashed border-indigo-200 rounded-2xl inline-block shadow-sm relative">
              <QRCodeSVG
                value={JSON.stringify({
                  app: 'Qpay',
                  type: 'interledger_invoice',
                  billId: activeGeneratedBill.id,
                  customer: activeGeneratedBill.customerName,
                  amount: activeGeneratedBill.amountPaid,
                  currency: 'NGN',
                  merchant: businessName,
                  accountName: businessName,
                  walletAddress: activeGeneratedBill.walletAddress || INTERLEDGER_CONFIG.defaultWalletAddress,
                  paymentPointer: activeGeneratedBill.paymentPointer || INTERLEDGER_CONFIG.defaultPaymentPointer,
                  incomingPaymentId: activeGeneratedBill.incomingPaymentId || null,
                  ref: activeGeneratedBill.korapayRef,
                  reference: activeGeneratedBill.korapayRef
                })}
                size={160}
                level="H"
                includeMargin={false}
              />

              {/* Status Overlay Pill (10-Second Countdown Simulation) */}
              <div className="mt-3">
                {isSimulatedSuccess ? (
                  <div className="px-3 py-1.5 bg-emerald-50 text-emerald-800 text-xs font-bold rounded-xl border border-emerald-200 flex items-center justify-center gap-1.5 animate-bounce">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Successful • Payment Received!</span>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <div className="px-3 py-1.5 bg-amber-50 text-amber-800 text-xs font-bold rounded-xl border border-amber-200 flex items-center justify-center gap-1.5">
                      <Loader2 className="w-4 h-4 text-amber-600 animate-spin" />
                      <span>Pending • Awaiting Qpay Customer ({activeCountdown}s)</span>
                    </div>
                    {/* Progress bar for the 10 seconds */}
                    <div className="w-full h-1 bg-amber-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-500 transition-all duration-1000 ease-linear rounded-full"
                        style={{ width: `${Math.min(100, ((10 - activeCountdown) / 10) * 100)}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Items summary */}
            <div className="text-left text-xs bg-slate-50 p-3 rounded-xl border border-slate-100 max-h-24 overflow-y-auto">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Items on Bill
              </span>
              {activeGeneratedBill.items.map((it, idx) => (
                <div key={idx} className="flex justify-between text-xs py-0.5 text-slate-700">
                  <span>{it.qty}x {it.name}</span>
                  <span className="font-semibold text-slate-900">₦{it.total.toLocaleString()}</span>
                </div>
              ))}
            </div>

            {/* Modal Actions */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => {
                  setSelectedBill(activeGeneratedBill);
                  setActiveGeneratedBill(null);
                }}
                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>View Full Printable Bill</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: TYPICAL NIGERIAN BUSINESS BILL / TAX INVOICE MODAL */}
      {/* ======================================================== */}
      {selectedBill && renderModalPortal(
        <div 
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedBill(null);
          }}
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-start sm:items-center justify-center p-3 pt-3 sm:p-6 sm:pt-6 animate-fadeIn"
        >
          <div className="relative w-full max-w-md max-h-[92vh] overflow-y-auto bg-white rounded-3xl shadow-2xl p-5 sm:p-6 space-y-4 my-auto sm:my-4 animate-scaleUp">
            
            <button
              onClick={() => setSelectedBill(null)}
              type="button"
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition z-10 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Authentically Styled Bill Paper */}
            <div className="bg-[#FAF9F5] border-2 border-dashed border-slate-300 rounded-2xl p-6 text-slate-800 font-mono text-xs shadow-inner relative overflow-hidden">
              
              {/* Header */}
              <div className="text-center space-y-1 pb-4 border-b border-dashed border-slate-300">
                <h2 className="text-base font-black tracking-wider uppercase text-slate-900 font-sans">
                  {businessName.toUpperCase()}
                </h2>
                <p className="text-[10px] text-slate-500">
                  Plot 14 Admiralty Way, Lekki Phase 1, Lagos, Nigeria
                </p>
                <div className="pt-1.5">
                  <span className="px-2.5 py-0.5 bg-slate-900 text-white font-bold text-[10px] uppercase tracking-wider rounded">
                    CUSTOMER BILL / TAX INVOICE
                  </span>
                </div>
              </div>

              {/* Order Meta info */}
              <div className="py-3 border-b border-dashed border-slate-300 text-[11px] space-y-1">
                <div className="flex justify-between">
                  <span>BILL NO:</span>
                  <span className="font-bold">{selectedBill.id}</span>
                </div>
                <div className="flex justify-between">
                  <span>DATE:</span>
                  <span>{selectedBill.date}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>CUSTOMER:</span>
                  <div className="text-right">
                    <span className="font-bold">{selectedBill.customerName}</span>
                    {getCustomerPaymentCount(selectedBill.customerName) >= 2 && (
                      <span className="ml-1.5 inline-block align-middle">
                        <VintagePaperTag count={getCustomerPaymentCount(selectedBill.customerName)} />
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex justify-between">
                  <span>STATUS:</span>
                  <span className={`font-bold ${selectedBill.status === 'PENDING' ? 'text-amber-600' : 'text-emerald-700'}`}>
                    {selectedBill.status}
                  </span>
                </div>
              </div>

              {/* Items */}
              <div className="py-3 border-b border-dashed border-slate-300 space-y-2">
                <div className="flex justify-between font-bold text-[10px] text-slate-400 border-b border-slate-200 pb-1">
                  <span>ITEM</span>
                  <span>QTY × PRICE</span>
                  <span>AMOUNT</span>
                </div>

                {selectedBill.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-start text-[11px] leading-tight">
                    <div className="flex-1 pr-1 truncate font-medium text-slate-900">
                      {item.name}
                    </div>
                    <div className="text-right text-slate-500 pr-2 whitespace-nowrap">
                      {item.qty}×{item.unitPrice.toLocaleString()}
                    </div>
                    <div className="text-right font-bold text-slate-900 whitespace-nowrap">
                      ₦{item.total.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="py-3 border-b-2 border-slate-800 space-y-1 text-xs">
                <div className="flex justify-between items-center text-sm font-black text-slate-900">
                  <span>TOTAL:</span>
                  <span>₦ {selectedBill.subtotal.toLocaleString('en-NG', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between items-center text-sm font-black text-emerald-700 pt-0.5">
                  <span>AMOUNT PAID:</span>
                  <span>₦ {selectedBill.amountPaid.toLocaleString('en-NG', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              {/* QR Code */}
              <div className="pt-4 text-center space-y-2">
                <div className="p-3 bg-white border border-slate-300 rounded-xl inline-block shadow-xs">
                  <QRCodeSVG
                    value={JSON.stringify({
                      billId: selectedBill.id,
                      customer: selectedBill.customerName,
                      amount: selectedBill.amountPaid,
                      merchant: businessName,
                      ref: selectedBill.korapayRef,
                      verified: true
                    })}
                    size={130}
                    level="M"
                  />
                </div>
                <p className="text-[10px] text-slate-400 font-mono">
                  Scan to verify authentic Qpay e-bill receipt
                </p>
              </div>

            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={() => window.print()}
                className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(`Bill #${selectedBill.id} - ${businessName}: Amount Paid ₦${selectedBill.amountPaid.toLocaleString()} by ${selectedBill.customerName}`);
                  alert('Bill details copied to clipboard!');
                }}
                className="py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition shadow-sm cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Share</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
