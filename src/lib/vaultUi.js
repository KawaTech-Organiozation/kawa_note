/**
 * Vault UI helpers: password-health analysis and deterministic avatar colors.
 * All client-side and zero-knowledge — nothing about a credential leaves the device.
 */

import { estimatePasswordStrength } from './passwordGenerator';

const AVATAR_PALETTE = [
  'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
  'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300',
  'bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300',
  'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
  'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300',
  'bg-teal-100 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300',
  'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300'
];

/**
 * Deterministic Tailwind color classes for a credential's letter avatar,
 * seeded by its title/url (no external favicon fetch → no domain leak).
 * @param {string} seed
 * @returns {string}
 */
export function avatarColorClass(seed = '') {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
}

/**
 * Compute password-health flags for every entry.
 * @param {Array} entries - credential view-models with a `password` field
 * @returns {Map<string, { score: number, weak: boolean, reused: boolean, short: boolean, hasPassword: boolean }>}
 */
export function computeVaultHealth(entries = []) {
  const counts = new Map();
  for (const e of entries) {
    if (e.password) counts.set(e.password, (counts.get(e.password) || 0) + 1);
  }

  const health = new Map();
  for (const e of entries) {
    const hasPassword = Boolean(e.password);
    const { score } = estimatePasswordStrength(e.password || '');
    health.set(e.id, {
      score,
      hasPassword,
      weak: hasPassword && score <= 2,
      reused: hasPassword && (counts.get(e.password) || 0) > 1,
      short: hasPassword && e.password.length < 8
    });
  }
  return health;
}

/**
 * @param {{ weak?: boolean, reused?: boolean, short?: boolean }} [h]
 * @returns {boolean}
 */
export function hasHealthIssue(h) {
  return Boolean(h && (h.weak || h.reused || h.short));
}
