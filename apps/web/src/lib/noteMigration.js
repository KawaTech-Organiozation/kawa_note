/**
 * Note Migration Utility
 * Migrates existing plaintext notes to encrypted format
 * 
 * Migration Strategy:
 * - Detects notes with isEncrypted: false
 * - Encrypts title, content, context, previewData, tags
 * - Updates notes in batch with rate limiting
 * - Provides progress tracking
 */

import { getKey } from './keyManager';
import { encrypt, encryptJSON } from './crypto';
import { notesApi } from '@/api/client';
import { handleEncryptionError } from './errorHandlers';

/**
 * Check if migration is needed
 * @param {Array} notes - All notes
 * @returns {boolean} True if any notes need migration
 */
export function needsMigration(notes) {
  return notes.some(note => !note.isEncrypted);
}

/**
 * Get notes that need migration
 * @param {Array} notes - All notes
 * @returns {Array} Notes with isEncrypted: false
 */
export function getNotesToMigrate(notes) {
  return notes.filter(note => !note.isEncrypted);
}

/**
 * Migrate a single note to encrypted format
 * @param {Object} note - Note to migrate
 * @param {CryptoKey} key - Encryption key
 * @returns {Promise<Object>} Encrypted note data
 */
async function migrateNote(note, key) {
  const encrypted = {
    isEncrypted: true
  };

  if (note.title) {
    encrypted.title = await encrypt(note.title, key);
  }
  if (note.content) {
    encrypted.content = await encrypt(note.content, key);
  }
  if (note.context) {
    encrypted.context = await encrypt(note.context, key);
  }
  if (note.previewData) {
    encrypted.previewData = await encryptJSON(note.previewData, key);
  }
  if (note.tags && Array.isArray(note.tags)) {
    encrypted.tags = await encryptJSON(note.tags, key);
  }

  return encrypted;
}

/**
 * Migrate all plaintext notes to encrypted format
 * @param {Array} notes - All notes
 * @param {Function} onProgress - Progress callback (current, total)
 * @returns {Promise<Object>} Migration result { success: number, failed: number, errors: Array }
 */
export async function migrateAllNotes(notes, onProgress = () => {}) {
  const key = await getKey();
  if (!key) {
    handleEncryptionError();
    throw new Error('Encryption key not available. Please log in again.');
  }

  const notesToMigrate = getNotesToMigrate(notes);
  const total = notesToMigrate.length;
  
  if (total === 0) {
    return { success: 0, failed: 0, errors: [] };
  }

  let success = 0;
  let failed = 0;
  const errors = [];

  // Migrate in batches of 5 with 100ms delay between batches
  const BATCH_SIZE = 5;
  const BATCH_DELAY = 100;

  for (let i = 0; i < notesToMigrate.length; i += BATCH_SIZE) {
    const batch = notesToMigrate.slice(i, i + BATCH_SIZE);
    
    const results = await Promise.allSettled(
      batch.map(async (note) => {
        try {
          const encrypted = await migrateNote(note, key);
          await notesApi.update(note.id, encrypted);
          return { success: true, noteId: note.id };
        } catch (error) {
          return { success: false, noteId: note.id, error: error.message };
        }
      })
    );

    // Process results
    results.forEach((result, idx) => {
      const current = i + idx + 1;
      
      if (result.status === 'fulfilled' && result.value.success) {
        success++;
      } else {
        failed++;
        errors.push({
          noteId: result.value?.noteId || batch[idx].id,
          error: result.value?.error || result.reason?.message || 'Unknown error'
        });
      }
      
      onProgress(current, total);
    });

    // Delay between batches (except last batch)
    if (i + BATCH_SIZE < notesToMigrate.length) {
      await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
    }
  }

  return { success, failed, errors };
}

/**
 * Get migration status message
 * @param {Object} result - Migration result
 * @returns {string} Status message
 */
export function getMigrationStatusMessage(result) {
  if (result.failed === 0) {
    return `✅ Successfully migrated ${result.success} notes to encrypted format.`;
  } else {
    return `⚠️ Migrated ${result.success} notes. ${result.failed} failed. Check console for details.`;
  }
}
