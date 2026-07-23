import { useState, useEffect } from 'react';
import { X, Download } from 'lucide-react';

/**
 * InstallPrompt Component
 * Displays a contextual PWA installation prompt
 * Shows after user creates first note or after 3 visits
 * Dismissible and won't reappear after being dismissed
 */
export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Detect iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(isIOSDevice);

    // Check if user has dismissed the prompt
    const isDismissed = localStorage.getItem('kawa_install_dismissed') === 'true';
    if (isDismissed) {
      return;
    }

    // Listen for beforeinstallprompt event (Chrome/Android)
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      
      // Check if user has created at least one note (trigger condition)
      const hasCreatedNote = localStorage.getItem('kawa_install_shown') === 'true';
      if (hasCreatedNote) {
        setShowPrompt(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  // Trigger prompt after first note creation
  useEffect(() => {
    const handleNoteCreated = () => {
      const isDismissed = localStorage.getItem('kawa_install_dismissed') === 'true';
      if (!isDismissed && deferredPrompt) {
        localStorage.setItem('kawa_install_shown', 'true');
        setShowPrompt(true);
      }
    };

    // Listen for custom event from note creation
    window.addEventListener('noteCreated', handleNoteCreated);
    return () => window.removeEventListener('noteCreated', handleNoteCreated);
  }, [deferredPrompt]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setShowPrompt(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem('kawa_install_dismissed', 'true');
    setShowPrompt(false);
  };

  if (!showPrompt) {
    return null;
  }

  // iOS instructions
  if (isIOS) {
    return (
      <div className="fixed bottom-4 left-4 right-4 bg-white rounded-lg shadow-lg p-4 z-50 max-w-sm mx-auto">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <Download className="w-5 h-5 text-teal-700" />
            <h3 className="font-semibold text-gray-900">Install Kawa Note</h3>
          </div>
          <button
            onClick={handleDismiss}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Dismiss"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-sm text-gray-600 mb-3">
          Tap the Share button, then select "Add to Home Screen" to install Kawa Note as an app.
        </p>
        <button
          onClick={handleDismiss}
          className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
        >
          Got it
        </button>
      </div>
    );
  }

  // Android/Chrome prompt
  return (
    <div className="fixed bottom-4 left-4 right-4 bg-white rounded-lg shadow-lg p-4 z-50 max-w-sm mx-auto">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <Download className="w-5 h-5 text-teal-700" />
          <h3 className="font-semibold text-gray-900">Install Kawa Note</h3>
        </div>
        <button
          onClick={handleDismiss}
          className="text-gray-400 hover:text-gray-600"
          aria-label="Dismiss"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      <p className="text-sm text-gray-600 mb-4">
        Install Kawa Note on your device for quick access and offline support.
      </p>
      <div className="flex gap-2">
        <button
          onClick={handleInstall}
          className="flex-1 px-4 py-2 text-sm font-medium text-white bg-teal-700 rounded-lg hover:bg-teal-800 transition-colors"
        >
          Install
        </button>
        <button
          onClick={handleDismiss}
          className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
        >
          Not now
        </button>
      </div>
    </div>
  );
}
