import { FormProvider } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TenantTypeSelector } from './forms/TenantTypeSelector';
import { PFForm } from './forms/PFForm';
import { PJForm } from './forms/PJForm';
import { AddressForm } from './forms/AddressForm';
import { useIdentificationForm } from './hooks/useIdentificationForm';

/**
 * StepIdentificationComponent
 * First step of onboarding - Tenant identification
 */
export function StepIdentificationComponent({ onSuccess, onError }) {
  const {
    form,
    tenantType,
    setTenantType,
    isSubmitting,
    error,
    onSubmit
  } = useIdentificationForm(onSuccess, onError);

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Identificação da Organização</CardTitle>
        <CardDescription>
          Passo 1 de 4 - Forneça informações básicas sobre sua organização
        </CardDescription>
      </CardHeader>

      <CardContent>
        <FormProvider {...form}>
          <form onSubmit={onSubmit} className="space-y-6">
            {/* Tenant Type Selection */}
            <TenantTypeSelector
              value={tenantType}
              onChange={setTenantType}
              disabled={isSubmitting}
            />

            {/* Conditional Forms */}
            {tenantType && (
              <div className="space-y-6 pt-6 border-t">
                {tenantType === 'FISICA' && <PFForm />}
                {tenantType === 'JURIDICA' && <PJForm />}

                {/* Address Form (shared) */}
                <div className="pt-6 border-t">
                  <h3 className="text-lg font-semibold mb-4">Endereço</h3>
                  <AddressForm />
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex gap-4 pt-6">
              <Button
                type="submit"
                className="flex-1"
                disabled={!tenantType || isSubmitting}
                size="lg"
              >
                {isSubmitting ? 'Processando...' : 'Continuar para Próximo Passo'}
              </Button>
            </div>

            {/* Helper Text */}
            <p className="text-xs text-slate-500 text-center">
              * Campos obrigatórios
            </p>
          </form>
        </FormProvider>
      </CardContent>
    </Card>
  );
}
