import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi } from './client';
import { initializeEncryption, clearKey } from '@/lib/keyManager';
import { clearVaultCache } from '@/lib/vaultCache';
import { terminateDecryptPool } from '@/lib/decryptPool';
import { createEncryptionVerifier, generateSalt } from '@/lib/crypto';
import { setAppToken } from '@/lib/app-params';

const AUTH_QUERY_KEY = 'auth';
const USER_QUERY_KEY = 'user';

/**
 * Hook to fetch current user data
 */
export const useCurrentUser = (options = {}) => {
  return useQuery({
    queryKey: [AUTH_QUERY_KEY, USER_QUERY_KEY],
    queryFn: () => authApi.me(),
    retry: false,
    ...options
  });
};

/**
 * Hook to login
 */
export const useLogin = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (credentials) => {
      console.log('🔐 useLogin: Starting login process...');
      const response = await authApi.login(credentials);
      console.log('✅ useLogin: Login API response received');
      
      // Store token immediately so subsequent calls are authenticated
      if (response.data?.accessToken) {
        console.log('💾 useLogin: Storing access token...');
        setAppToken(response.data.accessToken);
        
        if (response.data.refreshToken) {
          localStorage.setItem('kawa_refresh_token', response.data.refreshToken);
        }
      }
      
      // Fetch fresh user data with /me (now authenticated)
      console.log('👤 useLogin: Fetching user data via /me...');
      const meResponse = await authApi.me();
      const user = meResponse.data;
      console.log('✅ useLogin: User data received');
      
      let salt = user.encryptionSalt;
      let verifier = user.encryptionVerifier;
      console.log('🔑 useLogin: Encryption salt:', salt ? 'EXISTS' : 'NULL - will generate');
      
      // First login: generate and save salt
      if (!salt) {
        console.log('🔑 useLogin: Generating new encryption salt...');
        salt = await generateSalt();
      }
      
      // Derive encryption key
      console.log('🔐 useLogin: Deriving encryption key from password...');
      const key = await initializeEncryption(credentials.password, salt);
      console.log('✅ useLogin: Encryption key initialized successfully');

      // Backfill verifier for existing users and persist new salt/verifier on first login.
      if (!verifier) {
        console.log('🔐 useLogin: Generating encryption verifier...');
        verifier = await createEncryptionVerifier(key);
        console.log('💾 useLogin: Saving encryption config to backend...');
        await authApi.updateEncryptionSalt(salt, verifier);
        console.log('✅ useLogin: Encryption config saved');
      }
      
      return response;
    },
    onSuccess: () => {
      console.log('🔄 useLogin: Invalidating auth queries...');
      queryClient.invalidateQueries({ queryKey: [AUTH_QUERY_KEY] });
    },
    onError: (error) => {
      console.error('❌ useLogin: Login failed:', error);
    }
  });
};

/**
 * Hook to logout
 */
export const useLogout = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      const response = await authApi.logout();
      clearKey(); // Clear encryption key
      // O cache local guarda ciphertext do usuário que estava logado: ele não
      // pode sobreviver ao logout nem vazar para a próxima conta.
      terminateDecryptPool();
      await clearVaultCache();
      return response;
    },
    onSuccess: () => {
      queryClient.clear();
    }
  });
};

/**
 * Hook to refresh token
 */
export const useRefreshToken = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (refreshToken) => authApi.refresh(refreshToken),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [AUTH_QUERY_KEY] });
    }
  });
};
