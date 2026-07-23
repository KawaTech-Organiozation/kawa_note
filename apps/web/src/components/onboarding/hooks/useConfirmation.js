import { useMutation } from '@tanstack/react-query';

/**
 * useConfirmation Hook
 * Manages onboarding completion
 */
export function useConfirmation(tenantId, termsAccepted, onSuccess, onError) {
  // Mutation for completing onboarding — protected, uses token generated in Step 2
  const completeOnboardingMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('kawa_access_token')}`
        },
        body: JSON.stringify({})
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Erro ao completar onboarding');
      }

      return response.json();
    },
    onSuccess: (response) => {
      onSuccess?.();
    },
    onError: (error) => {
      onError?.(error.message);
    }
  });

  const onSubmit = async () => {
    if (termsAccepted) {
      await completeOnboardingMutation.mutateAsync();
    }
  };

  return {
    isSubmitting: completeOnboardingMutation.isPending,
    error: completeOnboardingMutation.error?.message || null,
    onSubmit
  };
}
