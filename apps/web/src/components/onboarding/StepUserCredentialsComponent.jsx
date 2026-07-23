import { FormProvider } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UserForm } from './forms/UserForm';
import { useUserCredentialsForm } from './hooks/useUserCredentialsForm';

/**
 * StepUserCredentialsComponent
 * Second step of onboarding - User credentials
 */
export function StepUserCredentialsComponent({ tenantId, onSuccess, onError, onBack }) {
  const {
    form,
    isSubmitting,
    error,
    onSubmit
  } = useUserCredentialsForm(tenantId, onSuccess, onError);

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Dados do Usuário Administrador</CardTitle>
        <CardDescription>
          Passo 2 de 4 - Complemente seus dados e defina uma senha
        </CardDescription>
      </CardHeader>

      <CardContent>
        <FormProvider {...form}>
          <form onSubmit={onSubmit} className="space-y-6">
            {/* User Form */}
            <UserForm />

            {/* Error Message */}
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-4 pt-6">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                disabled={isSubmitting}
                onClick={onBack}
                size="lg"
              >
                Voltar
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={isSubmitting}
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
