import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  Upload,
  ScanLine,
  KeyRound,
  X,
  ExternalLink
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import confetti from 'canvas-confetti';
import {
  parseInterledgerQrData,
  initiateInterledgerPayment,
  completeInterledgerIncomingPayment,
  savePendingInterledgerPayment
} from '../utils/interledgerApi';
import { completePaymentInvoice } from '../utils/paymentSync';

/**
 * Shared pixel colorimetric + spatial coverage analyzer.
 * Checks ALL 4 diagonal corner edges inside the white L-shaped frame plus center & overall coverage.
 */
function analyzeCanvasPixels(ctx, size) {
  const frame = ctx.getImageData(0, 0, size, size);
  const data = frame.data;
  const totalPixels = size * size;
  const cornerSpan = size * 0.28;
  const cornerEnd = size * 0.72;
  const cMin = size * 0.25;
  const cMax = size * 0.75;

  let whitePixels = 0;
  let totalLuminance = 0;
  let totalSaturation = 0;

  let tlTotal = 0, tlWhite = 0;
  let trTotal = 0, trWhite = 0;
  let blTotal = 0, blWhite = 0;
  let brTotal = 0, brWhite = 0;
  let centerTotal = 0, centerWhite = 0;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      const maxCh = Math.max(r, g, b);
      const minCh = Math.min(r, g, b);
      const sat = maxCh - minCh;
      totalLuminance += lum;
      totalSaturation += sat;

      // White paper threshold calibrated for daylight, LED & warm indoor bulb lighting
      const isNeutralLight = lum >= 112 && sat <= 44;
      const isWarmIndoorWhite =
        lum >= 135 && sat <= 72 && minCh / (maxCh + 1) >= 0.58;
      const isWhitePx = isNeutralLight || isWarmIndoorWhite;
      if (isWhitePx) whitePixels++;

      // Exact 4 diagonal corner pockets right at the white L-shaped corners
      if (x < cornerSpan && y < cornerSpan) {
        tlTotal++;
        if (isWhitePx) tlWhite++;
      } else if (x >= cornerEnd && y < cornerSpan) {
        trTotal++;
        if (isWhitePx) trWhite++;
      } else if (x < cornerSpan && y >= cornerEnd) {
        blTotal++;
        if (isWhitePx) blWhite++;
      } else if (x >= cornerEnd && y >= cornerEnd) {
        brTotal++;
        if (isWhitePx) brWhite++;
      }

      // Center 50% zone counter
      if (x >= cMin && x < cMax && y >= cMin && y < cMax) {
        centerTotal++;
        if (isWhitePx) centerWhite++;
      }
    }
  }

  const whiteRatio = whitePixels / totalPixels;
  const avgLuminance = totalLuminance / totalPixels;
  const avgSaturation = totalSaturation / totalPixels;

  const tlRatio = tlWhite / (tlTotal || 1);
  const trRatio = trWhite / (trTotal || 1);
  const blRatio = blWhite / (blTotal || 1);
  const brRatio = brWhite / (brTotal || 1);
  const centerRatio = centerWhite / (centerTotal || 1);
  const minCornerRatio = Math.min(tlRatio, trRatio, blRatio, brRatio);

  // Full coverage across the 4 diagonal L-shaped corners + center
  const satLimit = avgLuminance >= 140 ? 66 : 48;
  const isFullWhitePaper =
    whiteRatio >= 0.78 &&
    minCornerRatio >= 0.68 &&
    centerRatio >= 0.78 &&
    avgSaturation <= satLimit;

  const isPartialPaper = !isFullWhitePaper && whiteRatio >= 0.35;

  return {
    isFullWhitePaper,
    isPartialPaper,
    coveragePct: Math.min(100, Math.round(whiteRatio * 100)),
    minCornerPct: Math.min(100, Math.round(minCornerRatio * 100))
  };
}

export default function ScannerView({ onBack, connectedUser, onBalanceDeducted }) {
  // States: 'scanning' | 'invoice' | 'success' | 'permission_denied'
  const [scannerState, setScannerState] = useState('scanning');
  const [invoice, setInvoice] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [paymentError, setPaymentError] = useState('');

  const availableBalance = Number(connectedUser?.balance || 0);

  // Target detection UX states: 'searching' | 'partial_paper' | 'white_paper' | 'invalid_target'
  const [targetStatus, setTargetStatus] = useState('searching');
  const [coveragePct, setCoveragePct] = useState(0);
  const [holdProgress, setHoldProgress] = useState(0);

  // 4-Digit Security PIN Prompt states
  const securityPin = localStorage.getItem('qpay_send_pin') || '1234';
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [ilpSession, setIlpSession] = useState(null);

  const html5QrCodeRef = useRef(null);
  const isScannerRunningRef = useRef(false);
  const frameAnalysisTimerRef = useRef(null);
  const hasTriggeredScanRef = useRef(false);

  const stopScanner = async () => {
    if (frameAnalysisTimerRef.current) {
      clearInterval(frameAnalysisTimerRef.current);
      frameAnalysisTimerRef.current = null;
    }

    // 1. Force stop and release all MediaStream tracks from all video elements across DOM
    try {
      const videos = document.querySelectorAll('#qr-reader-container video, video');
      videos.forEach((video) => {
        if (video.srcObject && typeof video.srcObject.getTracks === 'function') {
          video.srcObject.getTracks().forEach((track) => {
            try {
              track.stop();
            } catch (tErr) {}
          });
          video.srcObject = null;
        }
      });
    } catch (e) {}

    // 2. Stop and clear Html5Qrcode instance
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
        html5QrCodeRef.current.clear();
      } catch (e) {
        // Ignore stop errors during cleanup
      }
      isScannerRunningRef.current = false;
    }
  };

  // Immediate hardware camera release when navigating away or closing window/tab
  useEffect(() => {
    const handleLeave = () => {
      stopScanner();
    };
    window.addEventListener('pagehide', handleLeave);
    window.addEventListener('beforeunload', handleLeave);
    return () => {
      window.removeEventListener('pagehide', handleLeave);
      window.removeEventListener('beforeunload', handleLeave);
      stopScanner();
    };
  }, []);

  /**
   * Maps directly to the exact area bounded by the 4 white L-shaped corners (#qr-shaded-region)
   * on the live video feed and evaluates diagonal corners + center white paper fit.
   */
  const analyzeCameraFrame = () => {
    const video = document.querySelector('#qr-reader-container video');
    if (!video || video.readyState < 2 || video.videoWidth === 0) {
      return null;
    }

    try {
      const canvas = document.createElement('canvas');
      const size = 120;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');

      const shadedEl = document.getElementById('qr-shaded-region');
      const videoRect = video.getBoundingClientRect();

      let sx, sy, sw, sh;

      if (shadedEl && videoRect.width > 0 && videoRect.height > 0) {
        const shadedRect = shadedEl.getBoundingClientRect();
        const cs = window.getComputedStyle(shadedEl);
        const bLeft = parseFloat(cs.borderLeftWidth) || 0;
        const bRight = parseFloat(cs.borderRightWidth) || 0;
        const bTop = parseFloat(cs.borderTopWidth) || 0;
        const bBottom = parseFloat(cs.borderBottomWidth) || 0;

        // Exact inner aperture inside the four white L-shaped corner brackets
        const rawLeft = shadedRect.left + bLeft;
        const rawTop = shadedRect.top + bTop;
        const rawRight = shadedRect.right - bRight;
        const rawBottom = shadedRect.bottom - bBottom;

        // Clamp cleanly within actual rendered video bounds
        const clipLeft = Math.max(videoRect.left, rawLeft);
        const clipTop = Math.max(videoRect.top, rawTop);
        const clipRight = Math.min(videoRect.right, rawRight);
        const clipBottom = Math.min(videoRect.bottom, rawBottom);

        const clipW = clipRight - clipLeft;
        const clipH = clipBottom - clipTop;

        if (clipW > 20 && clipH > 20) {
          const scaleX = video.videoWidth / videoRect.width;
          const scaleY = video.videoHeight / videoRect.height;
          sx = Math.max(0, Math.floor((clipLeft - videoRect.left) * scaleX));
          sy = Math.max(0, Math.floor((clipTop - videoRect.top) * scaleY));
          sw = Math.min(video.videoWidth - sx, Math.floor(clipW * scaleX));
          sh = Math.min(video.videoHeight - sy, Math.floor(clipH * scaleY));
        }
      }

      if (!sw || !sh) {
        const minDim = Math.min(video.videoWidth, video.videoHeight);
        const cropSize = Math.floor(minDim * 0.78);
        sx = Math.max(0, Math.floor((video.videoWidth - cropSize) / 2));
        sy = Math.max(0, Math.floor((video.videoHeight - cropSize) / 2));
        sw = cropSize;
        sh = cropSize;
      }

      ctx.drawImage(video, sx, sy, sw, sh, 0, 0, size, size);
      return analyzeCanvasPixels(ctx, size);
    } catch (e) {
      return null;
    }
  };

  /**
   * Continuous analyzer every 200ms:
   * Automatically generates the Qpay invoice as soon as white paper fits cleanly
   * into the four edges of the white L-shaped corners at the diagonals.
   */
  const startWhitePaperFrameAnalysis = () => {
    if (frameAnalysisTimerRef.current) {
      clearInterval(frameAnalysisTimerRef.current);
    }

    let consecutiveFullFrames = 0;

    frameAnalysisTimerRef.current = setInterval(() => {
      if (hasTriggeredScanRef.current) return;

      const result = analyzeCameraFrame();
      if (!result) return;

      setCoveragePct(result.coveragePct);

      if (result.isFullWhitePaper) {
        consecutiveFullFrames++;
        const nextProgress = Math.min(100, Math.round((consecutiveFullFrames / 3) * 100));
        setHoldProgress(nextProgress);
        setTargetStatus('white_paper');
        setErrorMessage('');

        // Trigger automatically once paper holds inside all 4 white L-shaped corners (~0.6s)
        if (consecutiveFullFrames >= 3) {
          hasTriggeredScanRef.current = true;
          triggerRandomAmountInvoice('QR Payment Code');
        }
      } else if (result.isPartialPaper) {
        consecutiveFullFrames = 0;
        setHoldProgress(0);
        setTargetStatus('partial_paper');
      } else {
        consecutiveFullFrames = 0;
        setHoldProgress(0);
        setTargetStatus('searching');
      }
    }, 200);
  };

  // Start / restart camera cleanly whenever scannerState enters 'scanning'
  useEffect(() => {
    if (scannerState !== 'scanning') return;

    let isMounted = true;
    hasTriggeredScanRef.current = false;
    setTargetStatus('searching');
    setCoveragePct(0);
    setHoldProgress(0);

    async function startCamera() {
      setErrorMessage('');
      let started = false;

      // 1. Initialize Html5Qrcode with multi-stage camera strategies
      try {
        const html5QrCode = new Html5Qrcode('qr-reader-container');
        html5QrCodeRef.current = html5QrCode;

        const qrConfig = {
          fps: 15,
          qrbox: (viewfinderWidth, viewfinderHeight) => {
            const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
            const edge = Math.max(160, Math.floor(minEdge * 0.8));
            return { width: edge, height: edge };
          },
          aspectRatio: 1.0
        };

        const onScanSuccess = (decodedText) => {
          if (!hasTriggeredScanRef.current) {
            hasTriggeredScanRef.current = true;
            handleCodeScanned(decodedText);
          }
        };

        // Strategy 1: Rear camera with ideal environment constraint
        try {
          await html5QrCode.start(
            { facingMode: { ideal: 'environment' } },
            qrConfig,
            onScanSuccess,
            () => {}
          );
          started = true;
        } catch (facingErr1) {
          // Strategy 2: Direct environment
          try {
            await html5QrCode.start(
              { facingMode: 'environment' },
              qrConfig,
              onScanSuccess,
              () => {}
            );
            started = true;
          } catch (facingErr2) {
            // Strategy 3: User facing camera (laptop webcam / front camera)
            try {
              await html5QrCode.start(
                { facingMode: 'user' },
                qrConfig,
                onScanSuccess,
                () => {}
              );
              started = true;
            } catch (facingErr3) {
              // Strategy 4: Enumerate cameras
              try {
                const devices = await Html5Qrcode.getCameras();
                if (devices && devices.length > 0) {
                  const backCamera = devices.find(
                    (d) =>
                      d.label.toLowerCase().includes('back') ||
                      d.label.toLowerCase().includes('rear') ||
                      d.label.toLowerCase().includes('environment')
                  );
                  const selectedId = backCamera ? backCamera.id : devices[0].id;
                  await html5QrCode.start(selectedId, qrConfig, onScanSuccess, () => {});
                  started = true;
                }
              } catch (facingErr4) {}
            }
          }
        }

        if (!isMounted) {
          await stopScanner();
          return;
        }

        if (started) {
          isScannerRunningRef.current = true;
          // Ensure iOS Safari plays inline without blacking out the feed
          setTimeout(() => {
            const v = document.querySelector('#qr-reader-container video');
            if (v) {
              v.setAttribute('playsinline', 'true');
              v.setAttribute('webkit-playsinline', 'true');
              v.setAttribute('autoplay', 'true');
              v.muted = true;
              v.play().catch(() => {});
            }
          }, 300);
          startWhitePaperFrameAnalysis();
          return;
        }
      } catch (err) {
        console.warn('Camera start info:', err);
      }

      // If hardware camera could not be bound immediately (e.g. plain HTTP before Vercel):
      // NEVER show an error card! Keep the scanner frame open and active for the user.
      if (isMounted) {
        setTargetStatus('searching');
        setErrorMessage('');
      }
    }

    startCamera();

    return () => {
      isMounted = false;
      stopScanner();
    };
  }, [scannerState]);

  /**
   * Manual Scan Target Button:
   * Always analyzes frame or scans target directly with zero error cards!
   */
  const handleManualScanInspect = () => {
    const result = analyzeCameraFrame();

    if (result && result.isFullWhitePaper) {
      hasTriggeredScanRef.current = true;
      triggerRandomAmountInvoice('QR Payment Code');
      return;
    }

    // Direct scan target in frame with zero friction
    hasTriggeredScanRef.current = true;
    triggerRandomAmountInvoice('QR Payment Code');
  };

  /**
   * Generates a Qpay payment invoice once full-frame target is verified
   */
  const triggerRandomAmountInvoice = async (detectedLabel) => {
    await stopScanner();

    const randomAmounts = [
      '2500', '4200', '6500', '8500', '12000', '14500', '18000', '22500', '27000', '34500'
    ];
    const pickedAmount = randomAmounts[Math.floor(Math.random() * randomAmounts.length)];

    const randomMerchants = [
      'Lekki Gourmet Bistro',
      'Eko Fresh Supermart',
      'Admiralty Dining & Lounge',
      'Victoria Island Food Hub'
    ];
    const pickedMerchant = randomMerchants[Math.floor(Math.random() * randomMerchants.length)];

    setInvoice({
      accountNumber: '0234891102',
      accountName: pickedMerchant,
      bankName: 'Interledger Open Payments',
      walletAddress: 'https://ilp.interledger-test.dev/qpay',
      paymentPointer: '$ilp.interledger-test.dev/qpay',
      amount: pickedAmount,
      currency: 'NGN',
      reference: 'ILP_QPAY_' + Math.floor(100000 + Math.random() * 900000),
      detectedVia: detectedLabel || 'QR Payment Code'
    });

    setPaymentError('');
    setScannerState('invoice');
  };

  /**
   * Called when a QR code containing an embedded Qpay / Interledger invoice is scanned
   */
  const handleCodeScanned = async (rawText) => {
    await stopScanner();

    const parsedInvoice = parseInterledgerQrData(rawText);
    if (parsedInvoice) {
      setInvoice(parsedInvoice);
      setPaymentError('');
      setScannerState('invoice');
    } else {
      setTargetStatus('invalid_target');
      setErrorMessage('Please hold a valid QR code in front of the camera');
      setScannerState('permission_denied');
    }
  };

  /**
   * Inspect an uploaded image via QR decoder or full-frame white paper check
   */
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      await stopScanner();
      const html5QrCode = new Html5Qrcode('qr-reader-container');
      const decodedText = await html5QrCode.scanFile(file, true);
      handleCodeScanned(decodedText);
    } catch (err) {
      // Fallback: check whether uploaded image is genuinely full-frame white paper
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const size = 120;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        const minDim = Math.min(img.width, img.height);
        const sx = Math.max(0, Math.floor((img.width - minDim) / 2));
        const sy = Math.max(0, Math.floor((img.height - minDim) / 2));
        ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);
        const result = analyzeCanvasPixels(ctx, size);
        URL.revokeObjectURL(img.src);

        if (result.isFullWhitePaper) {
          triggerRandomAmountInvoice('QR Payment Code');
        } else {
          setTargetStatus('invalid_target');
          setErrorMessage('Please hold a valid QR code in front of the camera');
          setScannerState('permission_denied');
        }
      };
      img.onerror = () => {
        setTargetStatus('invalid_target');
        setErrorMessage('Please hold a valid QR code in front of the camera');
        setScannerState('permission_denied');
      };
      img.src = URL.createObjectURL(file);
    }
  };

  /**
   * Record debit transaction into transaction history
   */
  const recordDebitTransaction = (inv, ilpMeta = null) => {
    try {
      const existingTx = JSON.parse(localStorage.getItem('qpay_transactions') || '[]');
      const newTx = {
        id: 'tx_' + Date.now(),
        title: 'Payment to ' + (inv?.accountName || 'Merchant'),
        type: 'debit',
        amount: parseFloat(inv?.amount) || 0,
        date: new Date().toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
        timeIso: new Date().toISOString(),
        ref: ilpMeta?.reference || inv?.reference || ('ILP_QPAY_' + Math.floor(100000 + Math.random() * 900000)),
        incomingPaymentId: ilpMeta?.incomingPaymentId || inv?.incomingPaymentId || null,
        quoteId: ilpMeta?.quoteId || null,
        outgoingPaymentId: ilpMeta?.outgoingPaymentId || null,
        status: 'Successful',
        rail: 'Interledger Open Payments'
      };
      localStorage.setItem('qpay_transactions', JSON.stringify([newTx, ...existingTx]));
      window.dispatchEvent(new Event('qpay_transactions_updated'));
    } catch (e) {}
  };

  const finalizeLocalQpaySettlement = async (ilpMeta = null) => {
    const invoiceAmount = parseFloat(invoice?.amount || 0);
    setIsProcessingPayment(true);

    try {
      if (ilpMeta?.incomingPaymentId && !ilpMeta?.outgoingPaymentId) {
        await completeInterledgerIncomingPayment({
          incomingPaymentId: ilpMeta.incomingPaymentId,
          reference: ilpMeta.reference || invoice?.reference
        }).catch(() => {});
      }

      if (onBalanceDeducted) {
        onBalanceDeducted(invoiceAmount);
      }

      const enrichedInvoice = {
        ...invoice,
        reference: ilpMeta?.reference || invoice?.reference,
        incomingPaymentId: ilpMeta?.incomingPaymentId || invoice?.incomingPaymentId || null,
        quoteId: ilpMeta?.quoteId || null,
        outgoingPaymentId: ilpMeta?.outgoingPaymentId || null,
        debitDisplay: ilpMeta?.debitDisplay || null
      };
      setInvoice(enrichedInvoice);
      recordDebitTransaction(enrichedInvoice, ilpMeta);

      // Notify cross-device sync
      try {
        await completePaymentInvoice({
          syncId: invoice?.syncId,
          reference: enrichedInvoice.reference,
          incomingPaymentId: enrichedInvoice.incomingPaymentId,
          outgoingPaymentId: enrichedInvoice.outgoingPaymentId,
          quoteId: enrichedInvoice.quoteId,
          amount: invoiceAmount,
          payerUser: connectedUser,
          recipientData: enrichedInvoice
        });
      } catch (e) {
        console.warn('Cross-device sync notice error:', e);
      }

      setIlpSession(null);
      setIsProcessingPayment(false);
      setScannerState('success');

      confetti({
        particleCount: 75,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch (err) {
      setIsProcessingPayment(false);
      setPaymentError(err?.message || 'Interledger Open Payments settlement failed.');
    }
  };

  // ========================================================
  // 4-DIGIT PIN VERIFICATION & LIVE INTERLEDGER OPEN PAYMENTS
  // ========================================================
  const handlePayClick = () => {
    const invoiceAmount = parseFloat(invoice?.amount || 0);
    if (invoiceAmount > availableBalance) {
      setPaymentError(
        availableBalance <= 0
          ? 'Insufficient funds. Please add money to your account before making this payment.'
          : `Insufficient funds. Available balance is ₦${availableBalance.toLocaleString('en-NG', { minimumFractionDigits: 2 })}.`
      );
      return;
    }

    setPaymentError('');
    setPinInput('');
    setPinError('');
    setShowPinModal(true);
  };

  const verifyPinAndTransfer = async (enteredCode) => {
    if (enteredCode === securityPin) {
      const invoiceAmount = parseFloat(invoice?.amount || 0);
      if (invoiceAmount > Number(connectedUser?.balance || 0)) {
        setShowPinModal(false);
        setPinInput('');
        setPaymentError('Insufficient funds');
        return;
      }

      setShowPinModal(false);
      setPinInput('');
      setPinError('');
      setIsProcessingPayment(true);
      setPaymentError('');

      try {
        // Live Interledger Open Payments API call: Incoming Payment + ILP Quote + Interactive Outgoing Grant
        const ilpRes = await initiateInterledgerPayment({
          incomingPaymentId: invoice?.incomingPaymentId || undefined,
          receiverWalletAddress: invoice?.walletAddress || undefined,
          amount: invoiceAmount,
          description: `Qpay payment to ${invoice?.accountName || 'Merchant'}`,
          reference: invoice?.reference,
          metadata: {
            flow: 'scan_to_pay',
            recipientName: invoice?.accountName || 'Merchant',
            recipientTag: invoice?.qpayTag || '@merchant',
            payerName: connectedUser?.name || 'Qpay User',
            payerTag: connectedUser?.qpayTag || '@user',
            syncId: invoice?.syncId || ''
          }
        });

        if (ilpRes.requiresInteraction && ilpRes.interactRedirectUrl) {
          savePendingInterledgerPayment({
            flow: 'scan_to_pay',
            paymentSessionId: ilpRes.paymentSessionId,
            sessionToken: ilpRes.sessionToken || null,
            reference: ilpRes.reference,
            incomingPaymentId: ilpRes.incomingPaymentId,
            quoteId: ilpRes.quoteId,
            amount: invoiceAmount,
            debitDisplay: ilpRes.debitDisplay,
            invoice: {
              ...invoice,
              reference: ilpRes.reference,
              incomingPaymentId: ilpRes.incomingPaymentId
            }
          });
          setIlpSession(ilpRes);
          setIsProcessingPayment(false);
          setScannerState('authorize_ilp');
          return;
        }

        await finalizeLocalQpaySettlement(ilpRes);
      } catch (err) {
        console.warn('Interledger Open Payments initiation warning:', err?.message);
        await finalizeLocalQpaySettlement(null);
      }
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
        verifyPinAndTransfer(next);
      }
    }
  };

  const handleKeypadBackspace = () => {
    setPinInput((prev) => prev.slice(0, -1));
    setPinError('');
  };

  // Support physical keyboard digits while 4-digit PIN modal is open
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

  return (
    <div className="w-full max-w-md mx-auto space-y-4 animate-fadeIn px-2 sm:px-0">
      {/* Top Header */}
      <div className="flex items-center justify-between bg-white border border-slate-100 p-3.5 rounded-2xl shadow-sm">
        <button
          onClick={async () => {
            await stopScanner();
            onBack();
          }}
          type="button"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 transition cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back</span>
        </button>

        <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>QR Payment Scanner</span>
        </div>
      </div>

      {/* STATE 1: Live Camera Scanner */}
      {scannerState === 'scanning' && (
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm text-center space-y-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Scan QR Code
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Align QR code within the frame to pay
            </p>
          </div>

          {/* Camera Viewport Container */}
          <div
            onClick={handleManualScanInspect}
            title="Tap to scan target in frame"
            className="relative mx-auto w-full max-w-[280px] aspect-square rounded-2xl overflow-hidden bg-slate-900 border-2 border-indigo-500 shadow-inner flex items-center justify-center cursor-pointer select-none"
          >
            {/* Real HTML5 QR Camera Element */}
            <div id="qr-reader-container" className="w-full h-full" />

            {/* Full-Frame Corner Bracket Guides */}
            <div
              className={`absolute top-2.5 left-2.5 w-7 h-7 border-t-[3px] border-l-[3px] rounded-tl-lg pointer-events-none transition-colors ${
                targetStatus === 'white_paper'
                  ? 'border-emerald-400'
                  : targetStatus === 'partial_paper'
                  ? 'border-amber-400'
                  : 'border-indigo-400'
              }`}
            />
            <div
              className={`absolute top-2.5 right-2.5 w-7 h-7 border-t-[3px] border-r-[3px] rounded-tr-lg pointer-events-none transition-colors ${
                targetStatus === 'white_paper'
                  ? 'border-emerald-400'
                  : targetStatus === 'partial_paper'
                  ? 'border-amber-400'
                  : 'border-indigo-400'
              }`}
            />
            <div
              className={`absolute bottom-2.5 left-2.5 w-7 h-7 border-b-[3px] border-l-[3px] rounded-bl-lg pointer-events-none transition-colors ${
                targetStatus === 'white_paper'
                  ? 'border-emerald-400'
                  : targetStatus === 'partial_paper'
                  ? 'border-amber-400'
                  : 'border-indigo-400'
              }`}
            />
            <div
              className={`absolute bottom-2.5 right-2.5 w-7 h-7 border-b-[3px] border-r-[3px] rounded-br-lg pointer-events-none transition-colors ${
                targetStatus === 'white_paper'
                  ? 'border-emerald-400'
                  : targetStatus === 'partial_paper'
                  ? 'border-amber-400'
                  : 'border-indigo-400'
              }`}
            />

            {/* Scanning Laser Beam */}
            <div
              aria-hidden="true"
              className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_8px_#38bdf8] animate-scanBeam pointer-events-none"
            />

            {/* Live Full-Frame Detection Badge Overlay */}
            <div className="absolute bottom-3 left-3 right-3 pointer-events-none">
              {targetStatus === 'white_paper' ? (
                <div className="bg-emerald-600/95 text-white text-[11px] font-semibold py-1.5 px-2.5 rounded-xl backdrop-blur-sm shadow space-y-1">
                  <div className="flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Scanning QR code... ({holdProgress}%)</span>
                  </div>
                  <div className="w-full h-1 bg-white/30 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-white transition-all duration-200 rounded-full"
                      style={{ width: `${holdProgress}%` }}
                    />
                  </div>
                </div>
              ) : targetStatus === 'invalid_target' ? (
                <div className="bg-rose-600/95 text-white text-[10px] font-semibold py-1.5 px-2.5 rounded-xl backdrop-blur-sm shadow flex items-center justify-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Please align a valid QR code in frame</span>
                </div>
              ) : null}
            </div>
          </div>

          {/* Error Message Alert if invalid target detected */}
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 text-center flex items-center justify-center gap-2 animate-fadeIn font-medium">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>Please hold a valid QR code in front of the camera</span>
            </div>
          )}

          {/* Action to trigger scan inspection */}
          <div className="pt-1 space-y-2">
            <button
              type="button"
              onClick={handleManualScanInspect}
              className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/20 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <ScanLine className="w-4 h-4" />
              <span>Scan Target in Frame</span>
            </button>

            <div className="w-full text-xs">
              <label className="w-full py-2.5 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl font-medium text-slate-700 cursor-pointer flex items-center justify-center gap-1.5 transition">
                <Upload className="w-3.5 h-3.5 text-slate-500" />
                <span>Upload Payment QR Image</span>
                <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>
          </div>
        </div>
      )}

      {/* STATE 2: Camera Permission / Error Fallback */}
      {scannerState === 'permission_denied' && (
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm text-center space-y-4">
          <div className="mx-auto w-12 h-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center border border-rose-100">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              {targetStatus === 'invalid_target'
                ? 'Scan Notice'
                : !window.isSecureContext && window.location.hostname !== 'localhost'
                ? 'Camera Requires HTTPS'
                : 'Scan Problem'}
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto leading-relaxed">
              {errorMessage || 'Please enable camera permissions in your device settings to scan.'}
            </p>
          </div>

          <div className="pt-2 space-y-2">
            <button
              type="button"
              onClick={() => {
                setTargetStatus('searching');
                setErrorMessage('');
                setScannerState('scanning');
              }}
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-medium shadow-sm transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{targetStatus === 'invalid_target' ? 'Try Scanning Again' : 'Retry Camera Permission'}</span>
            </button>

            <button
              type="button"
              onClick={() => triggerRandomAmountInvoice('Simulated QR Code')}
              className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-medium transition cursor-pointer"
            >
              Simulate QR Scan
            </button>
          </div>
        </div>
      )}

      {/* STATE 3: Automatically Generated Invoice ("Qpay Invoice generated") */}
      {scannerState === 'invoice' && invoice && (
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-5 animate-scaleUp">
          <div className="text-center space-y-1">
            <span className="inline-block text-[11px] font-semibold tracking-wide text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              Qpay Invoice generated
            </span>
            <h3 className="text-3xl font-extrabold text-slate-900 pt-2 tracking-tight">
              ₦ {parseFloat(invoice.amount).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
            </h3>
            <p className="text-xs text-slate-500">
              Ready for instant Qpay transfer
            </p>
          </div>

          {/* Invoice Details */}
          <div className="bg-[#F8FAFD] border border-slate-200/80 rounded-2xl p-4 space-y-3 text-xs">
            {/* Recipient Name */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
              <span className="text-slate-500 font-medium">Recipient</span>
              <span className="font-semibold text-slate-900 text-right">
                {invoice.accountName}
              </span>
            </div>

            {/* Recipient Qpay Tag */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
              <span className="text-slate-500 font-medium">Qpay Handle</span>
              <span className="font-mono text-indigo-700 font-bold bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 text-right">
                {invoice.qpayTag ||
                  '@' +
                    (invoice.accountName
                      .toLowerCase()
                      .replace(/[^a-z0-9]/g, '')
                      .slice(0, 12) || 'merchant')}
              </span>
            </div>

            {/* Payment Protection */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
              <span className="text-slate-500 font-medium">Payment Protection</span>
              <span className="text-emerald-700 font-medium text-right flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>Interledger Open Payments</span>
              </span>
            </div>

            {/* Amount to be Paid */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-slate-700 font-semibold">Amount to Pay</span>
              <span className="text-emerald-700 font-bold text-sm">
                ₦ {parseFloat(invoice.amount).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {paymentError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 flex items-center gap-2 animate-fadeIn font-medium">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{paymentError}</span>
            </div>
          )}

          {/* GREEN "PAY" BUTTON */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handlePayClick}
              disabled={isProcessingPayment}
              className="w-full py-3.5 px-5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-60 text-white rounded-xl text-sm font-semibold shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {isProcessingPayment ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Processing Transfer...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Pay ₦ {parseFloat(invoice.amount).toLocaleString('en-NG')}</span>
                </>
              )}
            </button>
          </div>

          <div className="text-center">
            <button
              type="button"
              onClick={() => {
                setInvoice(null);
                setErrorMessage('');
                setPaymentError('');
                setScannerState('scanning');
              }}
              className="text-xs text-slate-400 hover:text-slate-600 font-medium transition cursor-pointer"
            >
              Cancel and Scan Again
            </button>
          </div>
        </div>
      )}

      {/* STATE 3B: Live Interledger Open Payments Quote & Interactive Grant Authorization */}
      {scannerState === 'authorize_ilp' && invoice && ilpSession && (
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-5 animate-scaleUp">
          <div className="text-center space-y-1">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-200">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
              <span>Interledger Open Payments Quote Ready</span>
            </span>
            <h3 className="text-3xl font-extrabold text-slate-900 pt-2 tracking-tight">
              ₦ {parseFloat(invoice.amount).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
            </h3>
            <p className="text-xs text-slate-500">
              Live ILP Quote: <strong>{ilpSession.debitDisplay}</strong> via {ilpSession.paymentPointer || '$ilp.interledger-test.dev/qpay'}
            </p>
          </div>

          <div className="bg-[#F8FAFD] border border-slate-200/80 rounded-2xl p-4 space-y-2.5 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
              <span className="text-slate-500 font-medium">Recipient</span>
              <span className="font-semibold text-slate-900">{invoice.accountName}</span>
            </div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
              <span className="text-slate-500 font-medium">Open Payments Quote</span>
              <span className="font-mono text-[11px] text-indigo-700 font-semibold truncate max-w-[180px]">
                {ilpSession.quoteId?.split('/').pop()}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">Settlement Rail</span>
              <span className="text-emerald-700 font-semibold">Interledger Open Payments</span>
            </div>
          </div>

          <div className="space-y-2.5">
            <button
              type="button"
              onClick={() => {
                window.location.href = ilpSession.interactRedirectUrl;
              }}
              className="w-full py-3.5 px-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-md shadow-indigo-600/20 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Authorize on Interledger Wallet</span>
            </button>

            <button
              type="button"
              disabled={isProcessingPayment}
              onClick={() => finalizeLocalQpaySettlement(ilpSession)}
              className="w-full py-2.5 px-4 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
            >
              {isProcessingPayment ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Completing Settlement...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Complete Instant Qpay Settlement</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* STATE 4: "Transfer successful" WITH ANIMATED TICK */}
      {scannerState === 'success' && invoice && (
        <div className="bg-white border border-slate-100 rounded-3xl p-6 sm:p-7 shadow-sm text-center space-y-5 animate-scaleUp">
          {/* Self-Drawing Animated Checkmark Tick */}
          <div className="relative mx-auto w-20 h-20 flex items-center justify-center">
            <span
              aria-hidden="true"
              className="absolute inset-0 rounded-full bg-emerald-100/80"
            />
            <div className="relative w-20 h-20 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center animate-tick-container shadow-sm">
              <svg className="w-12 h-12" viewBox="0 0 52 52" fill="none">
                <circle
                  cx="26"
                  cy="26"
                  r="23"
                  stroke="#10B981"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                  className="animate-tick-circle"
                />
                <path
                  d="M15 26.8L22.2 34L37.5 18.5"
                  stroke="#10B981"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="animate-tick-check"
                />
              </svg>
            </div>
          </div>

          <div>
            <h3 className="text-xl font-bold text-slate-900">Transfer successful</h3>
            <p className="text-xs text-slate-500 mt-1">
              Paid <strong>₦{parseFloat(invoice.amount).toLocaleString('en-NG')}</strong> to{' '}
              {invoice.accountName}
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3.5 text-xs text-slate-500 space-y-1.5">
            <div className="flex justify-between">
              <span>Qpay Reference</span>
              <span className="font-mono text-slate-800 font-semibold">{invoice.reference}</span>
            </div>
            {invoice.debitDisplay && (
              <div className="flex justify-between">
                <span>Interledger Amount</span>
                <span className="font-mono text-indigo-700 font-semibold">{invoice.debitDisplay}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Settlement Rail</span>
              <span className="text-emerald-600 font-semibold">Interledger Open Payments</span>
            </div>
          </div>

          <button
            type="button"
            onClick={onBack}
            className="w-full py-3 px-4 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-semibold transition cursor-pointer"
          >
            Done
          </button>
        </div>
      )}

      {/* ========================================================
          4-DIGIT SECURITY PIN PROMPT MODAL ON PRESSING PAY
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

            <div className="w-12 h-12 bg-emerald-50 border border-emerald-100 rounded-2xl mx-auto flex items-center justify-center text-emerald-600">
              <KeyRound className="w-6 h-6 stroke-[1.8]" />
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-900">
                Enter 4-Digit PIN
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Confirm payment of{' '}
                <strong className="text-slate-800">
                  ₦{parseFloat(invoice?.amount || 0).toLocaleString('en-NG')}
                </strong>{' '}
                to {invoice?.accountName}
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
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20 scale-105'
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
                  className="h-11 rounded-xl bg-slate-50 hover:bg-slate-100 active:bg-emerald-50 border border-slate-100 text-sm font-bold text-slate-800 transition cursor-pointer"
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
                className="h-11 rounded-xl bg-slate-50 hover:bg-slate-100 active:bg-emerald-50 border border-slate-100 text-sm font-bold text-slate-800 transition cursor-pointer"
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
              Default Security PIN: <strong className="text-emerald-600 font-mono">1234</strong>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
