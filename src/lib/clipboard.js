/**
 * Clipboard helpers for the Cofre (Password Vault).
 *
 * Copying secrets always uses auto-clear: after a timeout the clipboard is
 * overwritten (best-effort) so revealed passwords don't linger indefinitely.
 * Note: OS/browser clipboard history may still retain values — this reduces,
 * but cannot fully eliminate, exposure.
 */

const DEFAULT_CLEAR_MS = 20000;

let clearTimer = null;
let lastCopied = null;

/**
 * Copy text to the clipboard and schedule an auto-clear.
 * @param {string} text
 * @param {{ clearAfterMs?: number }} [options]
 * @returns {Promise<boolean>} true if the copy succeeded
 */
export async function copyWithAutoClear(text, { clearAfterMs = DEFAULT_CLEAR_MS } = {}) {
  if (!text) return false;

  try {
    await navigator.clipboard.writeText(text);
  } catch {
    return false;
  }

  lastCopied = text;
  if (clearTimer) {
    clearTimeout(clearTimer);
  }

  clearTimer = setTimeout(async () => {
    try {
      // Only clear if the clipboard still holds what we copied, to avoid
      // wiping something the user intentionally copied afterwards.
      let current = '';
      try {
        current = await navigator.clipboard.readText();
      } catch {
        current = lastCopied; // readText may be blocked; clear defensively
      }
      if (current === lastCopied) {
        await navigator.clipboard.writeText('');
      }
    } catch {
      // Best-effort; ignore failures (permissions, focus, etc.)
    } finally {
      clearTimer = null;
      lastCopied = null;
    }
  }, clearAfterMs);

  return true;
}
