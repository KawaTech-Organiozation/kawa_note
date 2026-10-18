import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { sharesApi } from './client';

const SHARES_QUERY_KEY = ['vault', 'shares'];

export const useVaultShares = () => useQuery({ queryKey: SHARES_QUERY_KEY, queryFn: sharesApi.list });

export const useCreateVaultShare = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: sharesApi.create,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SHARES_QUERY_KEY })
  });
};

export const useRevokeVaultShare = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: sharesApi.revoke,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SHARES_QUERY_KEY })
  });
};
