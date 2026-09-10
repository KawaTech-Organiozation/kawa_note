import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { setAppToken } from '@/lib/app-params';
import { authApi } from '@/api/client';
import { initializeEncryption } from '@/lib/keyManager';
import { createEncryptionVerifier, generateSalt } from '@/lib/crypto';

/**
 * Validation schema for user credentials
 * All fields are required in Step 2
 */
const userCredentialsSchema = z.object({
  name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  email: z.string().email('Email inválido').min(1, 'Email é obrigatório'),
  phone: z.string()
    .min(1, 'Telefone é obrigatório')
    .regex(/^\d{10,11}$/, 'Telefone deve ter 10 ou 11 dígitos'),
  password: z.string().min(8, 'Senha deve ter pelo menos 8 caracteres'),
  confirmPassword: z.string().min(1, 'Confirmação de senha é obrigatória')
}).refine(
  (data) => data.password === data.confirmPassword,
  {
    message: 'As senhas não coincidem',
    path: ['confirmPassword']
  }
);

/**
 * useUserCredentialsForm Hook
 * Manages form state and API calls for user credentials (STEP 2 — public)
 * Creates the user, receives accessToken + refreshToken, saves them.
 */
export function useUserCredentialsForm(tenantId, onSuccess, onError) {
  const form = useForm({
    resolver: zodResolver(userCredentialsSchema),
    mode: 'onBlur',
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: ''
    }
  });

  // Mutation for creating user credentials
  const createCredentialsMutation = useMutation({
    mutationFn: async (data) => {
      const response = await fetch('/api/onboarding/step-2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          tenantId,
          name: data.name,
          email: data.email,
          phone: data.phone,
          password: data.password
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Erro ao criar credenciais');
      }

      const result = await response.json();

      // The onboarding response already authenticates the new user. Initialize
      // the encryption key here as well, otherwise the first navigation to the
      // app incorrectly shows the unlock screen with no verifier to validate.
      if (result.data?.accessToken) {
        setAppToken(result.data.accessToken);
        if (result.data.refreshToken) {
          localStorage.setItem('kawa_refresh_token', result.data.refreshToken);
        }

        const salt = await generateSalt();
        const key = await initializeEncryption(data.password, salt);
        const verifier = await createEncryptionVerifier(key);
        await authApi.updateEncryptionSalt(salt, verifier);
      }

      return result;
    },
    onSuccess: (response) => {
      if (response.data?.accessToken) {
        setAppToken(response.data.accessToken);
        localStorage.setItem('kawa_refresh_token', response.data.refreshToken);
      }
      onSuccess?.();
    },
    onError: (error) => {
      onError?.(error.message);
    }
  });

  const onSubmit = async (data) => {
    try {
      // Clear a previous server error before retrying (e.g. after replacing a
      // document that was already registered).
      onError?.(null);
      await createCredentialsMutation.mutateAsync(data);
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  return {
    form,
    isSubmitting: createCredentialsMutation.isPending,
    error: createCredentialsMutation.error?.message || null,
    onSubmit: form.handleSubmit(onSubmit)
  };
}
