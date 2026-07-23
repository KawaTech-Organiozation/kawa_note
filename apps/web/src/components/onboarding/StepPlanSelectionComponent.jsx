import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, Loader2 } from 'lucide-react';
import { usePlanSelection } from './hooks/usePlanSelection';

/**
 * StepPlanSelectionComponent
 * Third step of onboarding - Plan selection
 */
export function StepPlanSelectionComponent({ tenantId, onSuccess, onError, onBack }) {
  const {
    plans,
    selectedPlan,
    isLoading,
    isSubmitting,
    error,
    selectPlan,
    onSubmit
  } = usePlanSelection(tenantId, onSuccess, onError);

  if (isLoading) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
          <p className="ml-4 text-slate-600">Carregando planos...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Escolha seu Plano</CardTitle>
        <CardDescription>
          Passo 3 de 4 - Selecione o plano que melhor se adequa às suas necessidades
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="space-y-6">
          {/* Plans Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <div
                key={plan.name}
                onClick={() => selectPlan(plan.name)}
                className={`relative p-6 rounded-lg border-2 cursor-pointer transition-all ${
                  selectedPlan === plan.name
                    ? 'border-slate-900 bg-slate-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                {/* Selected Badge */}
                {selectedPlan === plan.name && (
                  <div className="absolute top-4 right-4 bg-green-500 text-white rounded-full p-1">
                    <Check size={16} />
                  </div>
                )}

                {/* Plan Name */}
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  {plan.name}
                </h3>

                {/* Price */}
                <div className="mb-4">
                  <span className="text-3xl font-bold text-slate-900">
                    R$ {plan.priceMonthly.toFixed(2)}
                  </span>
                  <span className="text-sm text-slate-600 ml-2">/mês</span>
                </div>

                {/* Features */}
                <div className="space-y-2 mb-6">
                  <div className="text-sm text-slate-600">
                    <strong>Empresas:</strong> {plan.maxCompanies}
                  </div>
                  <div className="text-sm text-slate-600">
                    <strong>Usuários:</strong> {plan.maxUsers}
                  </div>
                  <div className="text-sm text-slate-600">
                    <strong>Clientes:</strong> {plan.maxCustomers}
                  </div>
                  <div className="text-sm text-slate-600">
                    <strong>Armazenamento:</strong> {plan.maxStorageGb} GB
                  </div>
                </div>

                {/* Feature List */}
                <div className="space-y-2 pt-4 border-t">
                  {plan.features.notes && (
                    <div className="flex items-center gap-2 text-sm text-slate-700">
                      <Check size={16} className="text-green-500" />
                      <span>Notas</span>
                    </div>
                  )}
                  {plan.features.folders && (
                    <div className="flex items-center gap-2 text-sm text-slate-700">
                      <Check size={16} className="text-green-500" />
                      <span>Pastas</span>
                    </div>
                  )}
                  {plan.features.relations && (
                    <div className="flex items-center gap-2 text-sm text-slate-700">
                      <Check size={16} className="text-green-500" />
                      <span>Relações</span>
                    </div>
                  )}
                  {plan.features.sharing && (
                    <div className="flex items-center gap-2 text-sm text-slate-700">
                      <Check size={16} className="text-green-500" />
                      <span>Compartilhamento</span>
                    </div>
                  )}
                  {plan.features.api && (
                    <div className="flex items-center gap-2 text-sm text-slate-700">
                      <Check size={16} className="text-green-500" />
                      <span>API</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

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
              type="button"
              className="flex-1"
              disabled={!selectedPlan || isSubmitting}
              onClick={onSubmit}
              size="lg"
            >
              {isSubmitting ? 'Processando...' : 'Continuar para Próximo Passo'}
            </Button>
          </div>

          {/* Helper Text */}
          <p className="text-xs text-slate-500 text-center">
            Você pode alterar seu plano a qualquer momento
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
