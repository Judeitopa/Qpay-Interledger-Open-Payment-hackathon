/**
 * Compatibility shim re-exporting Interledger Open Payments Vault utilities
 */
export {
  formatTag,
  isQpayTagTaken,
  generateUniqueQpayTag,
  provisionInterledgerAccount,
  provisionInterledgerAccount as provisionKorapayVirtualAccount,
  resolveInternalVaultRecipient
} from './interledgerVault.js';
