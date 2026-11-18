/**
 * Compatibility shim re-exporting Interledger Open Payments client helpers
 */
export {
  INTERLEDGER_CONFIG,
  INTERLEDGER_CONFIG as KORAPAY_CONFIG,
  getStoredInterledgerUser,
  getStoredInterledgerUser as getStoredKorapayUser,
  setStoredInterledgerUser,
  setStoredInterledgerUser as setStoredKorapayUser,
  connectToInterledger,
  connectToInterledger as connectToKorapay,
  disconnectInterledger,
  disconnectInterledger as disconnectKorapay,
  parseInterledgerQrData,
  parseInterledgerQrData as parseKorapayQrData,
  checkInterledgerHealth,
  resolveInterledgerWallet,
  createInterledgerIncomingPayment,
  getInterledgerIncomingPaymentStatus,
  completeInterledgerIncomingPayment,
  createInterledgerQuote,
  initiateInterledgerPayment,
  finalizeInterledgerPayment,
  listInterledgerPayments
} from './interledgerApi.js';
