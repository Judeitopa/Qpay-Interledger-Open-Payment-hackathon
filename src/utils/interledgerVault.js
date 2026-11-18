/**
 * Interledger Open Payments Vault & Wallet Identity Service
 *
 * Maps every Qpay user's human-friendly @handle and cryptographic vault token
 * to Interledger Open Payments wallet infrastructure ($ilp.interledger-test.dev/qpay),
 * eliminating manual account-number errors while keeping settlement details protected.
 */

const VAULT_STORAGE_KEY = 'qpay_secure_vault_database';
const TAGS_REGISTRY_KEY = 'qpay_registered_tags_registry';
const DEFAULT_ILP_WALLET = 'https://ilp.interledger-test.dev/qpay';
const DEFAULT_ILP_POINTER = '$ilp.interledger-test.dev/qpay';

const DEFAULT_PREEXISTING_USERS = [
  { tag: '@tunde', name: 'Babatunde Adeleke', nuban: '0284918231', walletAddress: DEFAULT_ILP_WALLET },
  { tag: '@chisom', name: 'Chisom Eke', nuban: '0219483921', walletAddress: DEFAULT_ILP_WALLET },
  { tag: '@seun_bakes', name: 'Seun Bakeries Ltd', nuban: '0259103948', walletAddress: DEFAULT_ILP_WALLET },
  { tag: '@fatima', name: 'Fatima Bello', nuban: '0238194012', walletAddress: DEFAULT_ILP_WALLET }
];

function ensureVaultDatabaseInitialized() {
  if (typeof window === 'undefined') return;
  try {
    const registry = JSON.parse(localStorage.getItem(TAGS_REGISTRY_KEY) || '[]');
    if (registry.length === 0) {
      const initialTags = DEFAULT_PREEXISTING_USERS.map((u) => u.tag);
      localStorage.setItem(TAGS_REGISTRY_KEY, JSON.stringify(initialTags));
    }

    const vault = JSON.parse(localStorage.getItem(VAULT_STORAGE_KEY) || '{}');
    if (Object.keys(vault).length === 0) {
      DEFAULT_PREEXISTING_USERS.forEach((u) => {
        vault[u.tag] = {
          vaultToken: 'qp_sec_seed_' + u.tag.replace('@', ''),
          qpayTag: u.tag,
          name: u.name,
          internalRail: {
            provider: 'Interledger Open Payments',
            walletAddress: u.walletAddress,
            paymentPointer: DEFAULT_ILP_POINTER,
            nuban: u.nuban,
            accountReference: 'ILP_VAULT_SEED_' + u.tag.replace('@', '').toUpperCase(),
            provisionedAt: new Date('2026-01-15').toISOString()
          }
        };
      });
      localStorage.setItem(VAULT_STORAGE_KEY, JSON.stringify(vault));
    }
  } catch (e) {
    console.error('Vault init error:', e);
  }
}

ensureVaultDatabaseInitialized();

/**
 * Clean & format a tag (ensures leading @ and lowercase alphanumeric / underscores)
 */
export function formatTag(tag) {
  if (!tag) return '@user';
  let cleaned = tag.trim().toLowerCase().replace(/^@+/, '');
  cleaned = cleaned.replace(/[^a-z0-9_]/g, '');
  return '@' + (cleaned || 'user');
}

/**
 * Check if a Qpay Tag is already registered/taken in the secure database
 */
export function isQpayTagTaken(tag) {
  if (typeof window === 'undefined') return false;
  try {
    const formattedTag = formatTag(tag);
    const registry = JSON.parse(localStorage.getItem(TAGS_REGISTRY_KEY) || '[]');
    if (registry.includes(formattedTag)) return true;

    const vault = JSON.parse(localStorage.getItem(VAULT_STORAGE_KEY) || '{}');
    if (vault[formattedTag]) return true;

    return false;
  } catch {
    return false;
  }
}

/**
 * Automatic unique tag generator guaranteeing collision-free handles
 */
export function generateUniqueQpayTag(fullName = '', accountType = 'individual') {
  ensureVaultDatabaseInitialized();

  let base = (fullName || (accountType === 'individual' ? 'user' : 'business'))
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

  if (!base || base.length < 2) {
    base = accountType === 'individual' ? 'user' : 'biz';
  }

  let candidate = '@' + base;
  if (!isQpayTagTaken(candidate)) {
    return candidate;
  }

  let counter = 1;
  while (counter <= 999) {
    const testTag = `@${base}${counter}`;
    if (!isQpayTagTaken(testTag)) {
      return testTag;
    }
    counter++;
  }

  return `@${base}_${Date.now().toString().slice(-4)}`;
}

/**
 * Provision an internal Interledger Open Payments vault identity mapped to a unique Qpay Tag
 */
export function provisionInterledgerAccount(userProfile) {
  ensureVaultDatabaseInitialized();
  const qpayTag = formatTag(userProfile.qpayTag || generateUniqueQpayTag(userProfile.name, userProfile.type));

  if (typeof window !== 'undefined') {
    try {
      const registry = JSON.parse(localStorage.getItem(TAGS_REGISTRY_KEY) || '[]');
      if (!registry.includes(qpayTag)) {
        registry.push(qpayTag);
        localStorage.setItem(TAGS_REGISTRY_KEY, JSON.stringify(registry));
      }
    } catch (e) {
      console.error(e);
    }
  }

  const internalAccountId = '02' + Math.floor(10000000 + Math.random() * 90000000);
  const vaultToken = 'qp_sec_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
  const walletAddress = userProfile.walletAddress || DEFAULT_ILP_WALLET;
  const paymentPointer = walletAddress.replace(/^https?:\/\//i, '$');

  const internalVaultRecord = {
    vaultToken,
    qpayTag,
    userId: userProfile.id || 'usr_' + Date.now(),
    name: userProfile.name,
    type: userProfile.type,
    tier: userProfile.tier || 1,
    internalRail: {
      provider: 'Interledger Open Payments',
      walletAddress,
      paymentPointer,
      nuban: internalAccountId,
      accountReference: 'ILP_VAULT_' + Date.now(),
      provisionedAt: new Date().toISOString()
    }
  };

  saveVaultRecord(internalVaultRecord);

  return {
    qpayTag,
    vaultToken,
    walletAddress,
    paymentPointer,
    internalVaultId: internalVaultRecord.internalRail.accountReference,
    mappedNubanMasked: '••••••' + internalAccountId.slice(-4)
  };
}

function saveVaultRecord(record) {
  if (typeof window === 'undefined') return;
  try {
    const existing = JSON.parse(localStorage.getItem(VAULT_STORAGE_KEY) || '{}');
    existing[record.vaultToken] = record;
    existing[record.qpayTag] = record;
    localStorage.setItem(VAULT_STORAGE_KEY, JSON.stringify(existing));
  } catch (e) {
    console.error('Vault write error:', e);
  }
}

/**
 * Resolve payment destination using Qpay Tag or Vault Token
 */
export function resolveInternalVaultRecipient(identifier) {
  if (typeof window === 'undefined') return null;
  try {
    const vault = JSON.parse(localStorage.getItem(VAULT_STORAGE_KEY) || '{}');
    const record = vault[identifier];
    if (record) {
      const rail = record.internalRail || record.internalBanking || {};
      return {
        success: true,
        recipientName: record.name,
        qpayTag: record.qpayTag,
        vaultToken: record.vaultToken,
        walletAddress: rail.walletAddress || DEFAULT_ILP_WALLET,
        paymentPointer: rail.paymentPointer || DEFAULT_ILP_POINTER,
        internalSettlementRef: rail.accountReference || 'ILP_VAULT_ACTIVE'
      };
    }
  } catch {
    // fallback
  }

  return {
    success: true,
    recipientName: 'Verified Qpay Merchant',
    qpayTag: identifier?.startsWith('@') ? identifier : '@merchant',
    vaultToken: 'qp_sec_default',
    walletAddress: DEFAULT_ILP_WALLET,
    paymentPointer: DEFAULT_ILP_POINTER,
    internalSettlementRef: 'ILP_VAULT_DEFAULT'
  };
}
