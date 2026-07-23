/**
 * Error Handlers
 * Centralized error handling for encryption and authentication errors
 */

import { clearKey } from './keyManager';
import { toast } from 'sonner';

/**
 * Handle encryption key not available error
 * Performs logout and redirects to login page
 */
export function handleEncryptionError() {
  console.error('🔐 Encryption key not available - forcing logout');
  
  // Show toast notification
  toast.error('Chave de criptografia não disponível. Redirecionando para login...');
  
  // Clear encryption key from memory and sessionStorage
  clearKey();
  
  // Clear all auth-related data
  localStorage.removeItem('kawa_access_token');
  localStorage.removeItem('kawa_refresh_token');
  
  // Redirect to login page after a short delay
  setTimeout(() => {
    const currentUrl = window.location.href;
    const appId = new URLSearchParams(window.location.search).get('app_id');
    const loginUrl = appId 
      ? `/login?app_id=${appId}&from_url=${encodeURIComponent(currentUrl)}`
      : `/login?from_url=${encodeURIComponent(currentUrl)}`;
    
    window.location.href = loginUrl;
  }, 1000);
}

/**
 * Check if error is an encryption error and handle it
 * @param {Error} error - Error to check
 * @returns {boolean} True if it was an encryption error
 */
export function checkAndHandleEncryptionError(error) {
  const errorMessage = error?.message || error?.data?.error?.message || '';
  
  if (errorMessage.includes('Encryption key not available')) {
    handleEncryptionError();
    return true;
  }
  
  return false;
}
