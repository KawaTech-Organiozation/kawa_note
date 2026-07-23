import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { tenantsApi } from '@/api/client';
import { cpfSchema, cnpjSchema, phoneSchema, cepSchema, emailSchema } from '@/utils/validators';

/**
 * Validation schemas for PF and PJ
 */
const pfSchema = z.object({
  tenantType: z.literal('FISICA'),
  fullName: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  document: cpfSchema,
  phone: phoneSchema.optional().or(z.literal('')),
  mobilePhone: phoneSchema.optional().or(z.literal('')),
  email: emailSchema,
  street: z.string().min(3, 'Rua obrigatória'),
  number: z.string().min(1, 'Número obrigatório'),
  complement: z.string().optional(),
  district: z.string().min(2, 'Bairro obrigatório'),
  city: z.string().min(2, 'Cidade obrigatória'),
  state: z.string().length(2, 'Estado inválido'),
  zipCode: cepSchema
});

const pjSchema = z.object({
  tenantType: z.literal('JURIDICA'),
  tradeName: z.string().min(3, 'Razão social obrigatória'),
  document: cnpjSchema,
  fiscalNumber: z.string().optional(),
  responsibleName: z.string().min(3, 'Nome do responsável obrigatório'),
  responsiblePosition: z.string().min(2, 'Cargo obrigatório'),
  phone: phoneSchema.optional().or(z.literal('')),
  mobilePhone: phoneSchema.optional().or(z.literal('')),
  email: emailSchema,
  website: z.string().url('URL inválida').optional().or(z.literal('')),
  street: z.string().min(3, 'Rua obrigatória'),
  number: z.string().min(1, 'Número obrigatório'),
  complement: z.string().optional(),
  district: z.string().min(2, 'Bairro obrigatório'),
  city: z.string().min(2, 'Cidade obrigatória'),
  state: z.string().length(2, 'Estado inválido'),
  zipCode: cepSchema
});

/**
 * useIdentificationForm Hook
 * Manages form state and API calls for tenant identification
 */
export function useIdentificationForm(onSuccess, onError) {
  const [tenantType, setTenantType] = useState(null);

  // Get the appropriate schema based on tenant type
  const getSchema = () => {
    if (tenantType === 'FISICA') return pfSchema;
    if (tenantType === 'JURIDICA') return pjSchema;
    return z.object({});
  };

  const form = useForm({
    resolver: zodResolver(getSchema()),
    mode: 'onTouched', // Valida apenas quando o campo é tocado e perde o foco
    reValidateMode: 'onChange', // Revalida quando o valor muda após primeira validação
    defaultValues: {
      tenantType: tenantType || undefined,
      fullName: '',
      tradeName: '',
      document: '',
      fiscalNumber: '',
      responsibleName: '',
      responsiblePosition: '',
      phone: '',
      mobilePhone: '',
      email: '',
      website: '',
      street: '',
      number: '',
      complement: '',
      district: '',
      city: '',
      state: '',
      zipCode: ''
    }
  });

  // Mutation for creating tenant
  const createTenantMutation = useMutation({
    mutationFn: (data) => tenantsApi.create(data),
    onSuccess: (response) => {
      if (response.data?.tenantId) {
        onSuccess?.(response.data.tenantId);
      }
    },
    onError: (error) => {
      const errorMessage = error.data?.error?.message || 'Erro ao criar tenant';
      onError?.(errorMessage);
    }
  });

  const onSubmit = async (data) => {
    try {
      // Ensure tenantType is set
      const submitData = {
        ...data,
        tenantType: tenantType
      };

      await createTenantMutation.mutateAsync(submitData);
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  return {
    form,
    tenantType,
    setTenantType: (type) => {
      setTenantType(type);
      form.setValue('tenantType', type);
    },
    isSubmitting: createTenantMutation.isPending,
    error: createTenantMutation.error?.data?.error?.message || null,
    onSubmit: form.handleSubmit(onSubmit)
  };
}
