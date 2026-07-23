import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';

/**
 * usePlanSelection Hook
 * Manages plan selection state and API calls
 */
export function usePlanSelection(tenantId, onSuccess, onError) {
  const [selectedPlan, setSelectedPlan] = useState(null);

  // Fetch plans — public endpoint, no Authorization header needed
  const { data: plansData, isLoading } = useQuery({
    queryKey: ['plans'],
    queryFn: async () => {
      const response = await fetch('/api/onboarding/plans');

      if (!response.ok) {
        throw new Error('Erro ao buscar planos');
      }

      const data = await response.json();
      return data.data || [];
    }
  });

  // Mutation for selecting plan — protected, uses token generated in Step 2
  const selectPlanMutation = useMutation({
    mutationFn: async (planName) => {
      const response = await fetch('/api/onboarding/step-3', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('kawa_access_token')}`
        },
        body: JSON.stringify({ planName })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Erro ao selecionar plano');
      }

      return response.json();
    },
    onSuccess: () => {
      onSuccess?.();
    },
    onError: (error) => {
      onError?.(error.message);
    }
  });

  const onSubmit = async () => {
    if (selectedPlan) {
      await selectPlanMutation.mutateAsync(selectedPlan);
    }
  };

  return {
    plans: plansData || [],
    selectedPlan,
    isLoading,
    isSubmitting: selectPlanMutation.isPending,
    error: selectPlanMutation.error?.message || null,
    selectPlan: setSelectedPlan,
    onSubmit
  };
}
