/**
 * End-to-End Encryption Module
 * Uses Web Crypto API (AES-256-GCM) for client-side encryption
 * 
 * Security Model:
 * - Encryption key derived from user password via PBKDF2 (600k iterations)
 * - AES-256-GCM provides authenticated encryption (confidentiality + integrity)
 * - IV (12 bytes) generated randomly per operation (never reused)
 * - Server never sees plaintext or encryption key (zero-knowledge)
 * 
 * Format: base64(iv + ciphertext + authTag)
 */

const PBKDF2_ITERATIONS = 600000; // OWASP recommendation for SHA-256
const SALT_LENGTH = 32; // 256 bits
const IV_LENGTH = 12; // 96 bits (GCM standard)
const ENCRYPTION_VERIFIER_PLAINTEXT = 'KAWA_NOTE_VERIFIER_V1';

/**
 * Returns crypto.subtle, or throws a clear, actionable error if Web Crypto is
 * unavailable. `crypto.subtle` only exists in SECURE CONTEXTS: HTTPS, or
 * http://localhost / http://127.0.0.1. Insecure origins like http://0.0.0.0 or
 * a LAN IP over http leave it undefined, which otherwise surfaces as a cryptic
 * "Cannot read properties of undefined (reading 'importKey')".
 * @returns {SubtleCrypto}
 */
function getSubtle() {
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    throw new Error(
      'Web Crypto indisponível: a criptografia ponta-a-ponta exige um contexto seguro. ' +
      'Acesse via https:// ou http://localhost (endereços como 0.0.0.0 ou IPs por http não são contextos seguros).'
    );
  }
  return crypto.subtle;
}

/**
 * Generate a random salt for key derivation
 * @returns {Promise<string>} Base64-encoded salt
 */
export async function generateSalt() {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  return arrayBufferToBase64(salt);
}

/**
 * Derive encryption key from password using PBKDF2
 * @param {string} password - User password
 * @param {string} saltBase64 - Base64-encoded salt
 * @returns {Promise<CryptoKey>} AES-256-GCM key
 */
export async function deriveKey(password, saltBase64) {
  const subtle = getSubtle();
  const salt = base64ToArrayBuffer(saltBase64);

  // Import password as raw key material
  const passwordKey = await subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  // Derive AES-256-GCM key
  const key = await subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256'
    },
    passwordKey,
    { name: 'AES-GCM', length: 256 },
    false, // not extractable
    ['encrypt', 'decrypt']
  );

  return key;
}

/**
 * Encrypt plaintext using AES-256-GCM
 * @param {string} plaintext - Text to encrypt
 * @param {CryptoKey} key - AES-256-GCM key
 * @returns {Promise<string>} Base64-encoded (iv + ciphertext + authTag)
 */
export async function encrypt(plaintext, key) {
  if (!plaintext) return '';
  
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encoded = new TextEncoder().encode(plaintext);

  const ciphertext = await getSubtle().encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoded
  );

  // Concatenate: iv + ciphertext (includes authTag)
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.length);

  return arrayBufferToBase64(combined);
}

/**
 * Decrypt ciphertext using AES-256-GCM
 * @param {string} ciphertextBase64 - Base64-encoded (iv + ciphertext + authTag)
 * @param {CryptoKey} key - AES-256-GCM key
 * @returns {Promise<string>} Decrypted plaintext
 */
export async function decrypt(ciphertextBase64, key) {
  if (!ciphertextBase64) return '';

  try {
    const combined = base64ToArrayBuffer(ciphertextBase64);
    
    // Extract iv and ciphertext
    const iv = combined.slice(0, IV_LENGTH);
    const ciphertext = combined.slice(IV_LENGTH);

    const decrypted = await getSubtle().decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext
    );

    return new TextDecoder().decode(decrypted);
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error('Failed to decrypt data. Invalid key or corrupted data.');
  }
}

/**
 * Encrypt JSON data
 * @param {any} data - Data to encrypt (will be JSON.stringified)
 * @param {CryptoKey} key - AES-256-GCM key
 * @returns {Promise<string>} Base64-encoded encrypted JSON
 */
export async function encryptJSON(data, key) {
  if (!data) return '';
  const json = JSON.stringify(data);
  return encrypt(json, key);
}

/**
 * Decrypt JSON data
 * @param {string} ciphertextBase64 - Base64-encoded encrypted JSON
 * @param {CryptoKey} key - AES-256-GCM key
 * @returns {Promise<any>} Decrypted and parsed JSON
 */
export async function decryptJSON(ciphertextBase64, key) {
  if (!ciphertextBase64) return null;
  const json = await decrypt(ciphertextBase64, key);
  return json ? JSON.parse(json) : null;
}

/**
 * Creates a deterministic-purpose encrypted verifier used to confirm the password-derived key.
 * The ciphertext is intentionally non-deterministic because AES-GCM uses a random IV.
 * @param {CryptoKey} key
 * @returns {Promise<string>}
 */
export async function createEncryptionVerifier(key) {
  return encrypt(ENCRYPTION_VERIFIER_PLAINTEXT, key);
}

/**
 * Validates that a derived key can decrypt the stored verifier.
 * @param {string} verifierCiphertext
 * @param {CryptoKey} key
 * @returns {Promise<boolean>}
 */
export async function validateEncryptionVerifier(verifierCiphertext, key) {
  if (!verifierCiphertext) return false;

  try {
    const plaintext = await decrypt(verifierCiphertext, key);
    return plaintext === ENCRYPTION_VERIFIER_PLAINTEXT;
  } catch {
    return false;
  }
}

// Utility functions

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
