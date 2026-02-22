import { createContext, useState, useContext, useEffect } from 'react';
import { appParams, setAppToken } from '@/lib/app-params';
import { apiClient } from '@/api/client';
import { resetEncryptionLogoutFlag } from '@/api/useNotes';
import { clearKey } from '@/lib/keyManager';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isEncryptionReady, setIsEncryptionReady] = useState(false);
  const [requiresUnlock, setRequiresUnlock] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [appPublicSettings, setAppPublicSettings] = useState(null); // Contains only { id, public_settings }

  useEffect(() => {
    checkAppState();
  }, []);

  const handleAppError = (appError) => {
    // If app not found (404), allow app to continue without public settings
    if (appError.status === 404) {
      return { shouldContinue: true };
    }
    
    // Handle app-level errors
    if (appError.status === 403 && appError.data?.extra_data?.reason) {
      const reason = appError.data.extra_data.reason;
      const errorMap = {
        'auth_required': { type: 'auth_required', message: 'Authentication required' },
        'user_not_registered': { type: 'user_not_registered', message: 'User not registered for this app' }
      };
      
      return { 
        shouldContinue: false, 
        error: errorMap[reason] || { type: reason, message: appError.message }
      };
    }
    
    return { 
      shouldContinue: false, 
      error: { type: 'unknown', message: appError.message || 'Failed to load app' }
    };
  };

  const checkAppState = async () => {
    try {
      console.log('🔄 checkAppState - appParams.token:', appParams.token ? '✅ exists' : '❌ missing');
      setIsLoadingPublicSettings(true);
      setAuthError(null);
      
      // First, check app public settings using centralized apiClient
      try {
        // Only fetch public settings if appId is provided
        if (appParams.appId) {
          const publicSettings = await apiClient.get(`/apps/public/prod/public-settings/by-id/${appParams.appId}`);
          setAppPublicSettings(publicSettings);
        }
        
        // If we got the app public settings successfully, check if user is authenticated
        if (appParams.token) {
          console.log('🔐 Token found, checking user auth...');
          await checkUserAuth();
        } else {
          console.log('⚠️  No token found');
          setIsLoadingAuth(false);
          setIsAuthenticated(false);
        }
        setIsLoadingPublicSettings(false);
      } catch (appError) {
        console.error('❌ App error:', appError);
        const { shouldContinue, error } = handleAppError(appError);
        
        if (shouldContinue) {
          setAppPublicSettings(null);
          
          // Still check user auth if token exists
          if (appParams.token) {
            console.log('🔐 Token found (after error), checking user auth...');
            await checkUserAuth();
          } else {
            console.log('⚠️  No token found (after error)');
            setIsLoadingAuth(false);
            setIsAuthenticated(false);
          }
          setIsLoadingPublicSettings(false);
          return;
        }
        
        if (error) {
          setAuthError(error);
        }
        setIsLoadingPublicSettings(false);
        setIsLoadingAuth(false);
      }
    } catch (error) {
      console.error('❌ checkAppState error:', error);
      setAuthError({
        type: 'unknown',
        message: error.message || 'An unexpected error occurred'
      });
      setIsLoadingPublicSettings(false);
      setIsLoadingAuth(false);
    }
  };

  const checkUserAuth = async () => {
    try {
      // Now check if the user is authenticated using centralized apiClient
      setIsLoadingAuth(true);

      const response = await apiClient.get('/auth/me');
      const userData = response.data || response;
      console.log('✅ User authenticated:', userData);
      setUser(userData);
      setIsAuthenticated(true);
      
      // Check if encryption key is available in memory
      const { isKeyAvailable } = await import('@/lib/keyManager');
      const keyAvailable = await isKeyAvailable();
      
      if (keyAvailable) {
        console.log('✅ Encryption key available in memory');
        setIsEncryptionReady(true);
        setRequiresUnlock(false);
      } else {
        console.log('⚠️  Encryption key not available - user needs to unlock');
        setIsEncryptionReady(false);
        setRequiresUnlock(true);
      }
      
      setIsLoadingAuth(false);
    } catch (error) {
      console.error('❌ Auth check failed:', error);
      setIsLoadingAuth(false);
      setIsAuthenticated(false);
      setUser(null);
      setIsEncryptionReady(false);
      setRequiresUnlock(false);

      // If user auth fails, it might be an expired token
      if (error.status === 401 || error.status === 403) {
        setAuthError({
          type: 'auth_required',
          message: 'Authentication required'
        });
      }
    }
  };

  const logout = async (shouldRedirect = true) => {
    try {
      // Call logout endpoint to invalidate token on backend
      const refreshToken = localStorage.getItem('kawa_refresh_token');
      if (refreshToken) {
        await apiClient.post('/auth/logout', { refreshToken });
      }
    } catch (error) {
      // Continue logout even if backend call fails
    }
    
    // Clear encryption key
    clearKey();
    
    // Clear local state and storage
    setAppToken(null);
    localStorage.removeItem('kawa_refresh_token');
    setUser(null);
    setIsAuthenticated(false);
    setIsEncryptionReady(false);
    setRequiresUnlock(false);
    setAuthError(null);
    
    // Note: React Query cache will be cleared on page reload (redirect to /login)
    // If we need to clear cache before redirect, it should be done by the caller
    // who has access to QueryClient
    
    if (shouldRedirect) {
      window.location.href = '/login';
    }
  };

  const login = async (accessToken, refreshToken) => {
    try {
      // Store tokens
      setAppToken(accessToken);
      if (refreshToken) {
        localStorage.setItem('kawa_refresh_token', refreshToken);
      }

      // Reset encryption logout flag on successful login
      resetEncryptionLogoutFlag();

      // Check user auth to load user data
      await checkUserAuth();
      return { success: true };
    } catch (error) {
      setAppToken(null);
      localStorage.removeItem('kawa_refresh_token');
      return { success: false, error };
    }
  };

  const unlock = async (password) => {
    try {
      if (!user || !user.encryptionSalt) {
        throw new Error('User data or encryption salt not available');
      }

      console.log('🔐 AuthContext.unlock: Deriving encryption key...');
      const { initializeEncryption } = await import('@/lib/keyManager');
      await initializeEncryption(password, user.encryptionSalt);
      
      console.log('✅ AuthContext.unlock: Encryption key derived successfully');
      setIsEncryptionReady(true);
      setRequiresUnlock(false);
      
      return { success: true };
    } catch (error) {
      console.error('❌ AuthContext.unlock: Failed to derive encryption key:', error);
      return { success: false, error };
    }
  };

  const navigateToLogin = () => {
    // Redirect to login page using relative path (same domain)
    const params = new URLSearchParams();
    if (appParams.appId) params.set('app_id', appParams.appId);
    params.set('from_url', window.location.href);
    window.location.href = `/login?${params.toString()}`;
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated,
      isEncryptionReady,
      requiresUnlock,
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      logout,
      login,
      unlock,
      navigateToLogin,
      checkAppState
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
