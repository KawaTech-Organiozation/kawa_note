/**
 * Encryption Key Manager
 * Manages the lifecycle of the user's encryption key in memory
 * 
 * Security Model:
 * - Key stored in memory only (cleared on logout/page refresh)
 * - No persistence in sessionStorage (would require extractable key)
 * - Page refresh triggers unlock screen (handled by AuthContext)
 * - All keys cleared on logout
 */

import { deriveKey } from './crypto.js';

// In-memory key storage (cleared on logout/page refresh)
let encryptionKey = null;

/**
 * Initialize encryption with user password and salt
 * Derives the encryption key and stores it in memory
 * @param {string} password - User password
 * @param {string} salt - User's encryption salt (from backend)
 * @returns {Promise<CryptoKey>} Derived encryption key
 */
export async function initializeEncryption(password, salt) {
  console.log('🔐 keyManager: Initializing encryption...');
  console.log('🔐 keyManager: Salt length:', salt?.length || 0);
  
  // Derive main encryption key
  encryptionKey = await deriveKey(password, salt);
  console.log('✅ keyManager: Encryption key derived and stored in memory');
  
  return encryptionKey;
}

/**
 * Re-derive encryption key (used for unlock after page refresh)
 * @param {string} password - User password
 * @param {string} salt - User's encryption salt (from backend)
 * @returns {Promise<CryptoKey>} Derived encryption key
 */
export async function rederiveKey(password, salt) {
  console.log('🔐 keyManager: Re-deriving encryption key...');
  return initializeEncryption(password, salt);
}

/**
 * Get current encryption key
 * @returns {Promise<CryptoKey | null>} Current encryption key or null
 */
export async function getKey() {
  if (encryptionKey) {
    console.log('✅ keyManager.getKey: Key available in memory');
    return encryptionKey;
  }
  
  console.log('❌ keyManager.getKey: Key not available (page refresh or logout)');
  return null;
}

/**
 * Check if encryption key is available
 * @returns {Promise<boolean>} True if key is available
 */
export async function isKeyAvailable() {
  const key = await getKey();
  return key !== null;
}

/**
 * Clear encryption key from memory
 * Called on logout
 */
export function clearKey() {
  console.log('🔐 keyManager: Clearing encryption key from memory');
  encryptionKey = null;
}
