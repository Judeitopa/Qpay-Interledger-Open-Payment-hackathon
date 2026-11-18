// Device Detection and Interledger Wallet Verification Utilities

export const STORE_LINKS = {
  android: 'https://wallet.interledger-test.dev',
  ios: 'https://wallet.interledger-test.dev',
  fallback: 'https://wallet.interledger-test.dev'
};

/**
 * Detect user device OS
 */
export function getDeviceOS() {
  if (typeof window === 'undefined') return 'desktop';
  const ua = navigator.userAgent || navigator.vendor || window.opera;

  if (/windows phone/i.test(ua)) return 'windows_phone';
  if (/android/i.test(ua)) return 'android';
  if (/iPad|iPhone|iPod/.test(ua) && !window.MSStream) return 'ios';
  if (/Macintosh|Mac OS X/.test(ua)) return 'mac';
  return 'desktop';
}

export function getStoreUrl() {
  const os = getDeviceOS();
  if (os === 'android') return STORE_LINKS.android;
  if (os === 'ios') return STORE_LINKS.ios;
  return STORE_LINKS.fallback;
}

export async function checkInterledgerWalletReady(simulatedReadyState) {
  if (typeof simulatedReadyState === 'boolean') {
    return simulatedReadyState;
  }

  const savedState = localStorage.getItem('qpay_interledger_wallet_ready');
  if (savedState !== null) {
    return savedState === 'true';
  }

  return true;
}

// Legacy alias
export const checkKorapayInstallation = checkInterledgerWalletReady;

export function openAppStore() {
  window.open(STORE_LINKS.fallback, '_blank', 'noopener,noreferrer');
}
