/**
 * Password Generator & Strength Estimator
 *
 * Uses the Web Crypto API (crypto.getRandomValues) for cryptographically strong
 * randomness — never Math.random(). Strength estimation is a lightweight,
 * dependency-free entropy heuristic (no zxcvbn) suitable for a UI meter.
 */

const CHARSETS = {
  lowercase: 'abcdefghijklmnopqrstuvwxyz',
  uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  numbers: '0123456789',
  // Avoid quotes/backslash to keep passwords copy/paste-safe across contexts
  symbols: '!@#$%^&*()-_=+[]{};:,.<>?'
};

// Characters that are easy to confuse when read/typed
const AMBIGUOUS = new Set(['l', 'I', '1', 'O', '0', 'o']);

/** @typedef {Object} GeneratorOptions
 * @property {number} [length]
 * @property {boolean} [lowercase]
 * @property {boolean} [uppercase]
 * @property {boolean} [numbers]
 * @property {boolean} [symbols]
 * @property {boolean} [avoidAmbiguous]
 */

export const DEFAULT_GENERATOR_OPTIONS = {
  length: 20,
  lowercase: true,
  uppercase: true,
  numbers: true,
  symbols: true,
  avoidAmbiguous: false
};

/**
 * Pick a random integer in [0, max) without modulo bias.
 * @param {number} max
 * @returns {number}
 */
function randomInt(max) {
  if (max <= 0) return 0;
  const limit = Math.floor(0xffffffff / max) * max;
  const buf = new Uint32Array(1);
  let x = 0;
  do {
    crypto.getRandomValues(buf);
    x = buf[0];
  } while (x >= limit);
  return x % max;
}

/**
 * Generate a random password from the given options.
 * @param {GeneratorOptions} [options]
 * @returns {string}
 */
export function generatePassword(options = {}) {
  const opts = { ...DEFAULT_GENERATOR_OPTIONS, ...options };
  const length = Math.max(4, Math.min(128, opts.length || 20));

  let pools = [];
  if (opts.lowercase) pools.push(CHARSETS.lowercase);
  if (opts.uppercase) pools.push(CHARSETS.uppercase);
  if (opts.numbers) pools.push(CHARSETS.numbers);
  if (opts.symbols) pools.push(CHARSETS.symbols);
  if (pools.length === 0) pools = [CHARSETS.lowercase];

  if (opts.avoidAmbiguous) {
    pools = pools.map((pool) =>
      pool
        .split('')
        .filter((c) => !AMBIGUOUS.has(c))
        .join('')
    );
  }

  // Guarantee at least one char from each selected pool, then fill the rest.
  const chars = [];
  for (const pool of pools) {
    chars.push(pool[randomInt(pool.length)]);
  }

  const all = pools.join('');
  for (let i = chars.length; i < length; i++) {
    chars.push(all[randomInt(all.length)]);
  }

  // Fisher–Yates shuffle so the guaranteed chars aren't always at the front.
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join('');
}

/**
 * Estimate password strength via a rough Shannon-style entropy heuristic.
 * @param {string} password
 * @returns {{ score: 0|1|2|3|4, label: string, entropyBits: number }}
 */
export function estimatePasswordStrength(password) {
  if (!password) {
    return { score: 0, label: 'Vazia', entropyBits: 0 };
  }

  let poolSize = 0;
  if (/[a-z]/.test(password)) poolSize += 26;
  if (/[A-Z]/.test(password)) poolSize += 26;
  if (/[0-9]/.test(password)) poolSize += 10;
  if (/[^a-zA-Z0-9]/.test(password)) poolSize += 32;
  poolSize = poolSize || 1;

  const uniqueRatio = new Set(password).size / password.length;
  // Penalize very repetitive strings (e.g. "aaaaaaaa").
  const effectiveLength = password.length * Math.max(0.5, uniqueRatio);
  const entropyBits = Math.round(effectiveLength * Math.log2(poolSize));

  let score;
  if (entropyBits < 40) score = 1;
  else if (entropyBits < 60) score = 2;
  else if (entropyBits < 100) score = 3;
  else score = 4;

  const labels = { 1: 'Fraca', 2: 'Razoável', 3: 'Forte', 4: 'Excelente' };
  return { score, label: labels[score], entropyBits };
}
