import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useConfirmation } from './hooks/useConfirmation';

/**
 * StepConfirmationComponent
 * Fourth step of onboarding - Confirmation
 */
export function StepConfirmationComponent({ tenantId, onSuccess, onError, onBack, summaryData }) {
  const [termsAccepted, setTermsAccepted] = useState(false);
  const {
    isSubmitting,
    error,
    onSubmit
  } = useConfirmation(tenantId, termsAccepted, onSuccess, onError);

  const handleSubmit = async () => {
    if (termsAccepted) {
      await onSubmit();
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Confirmação do Onboarding</CardTitle>
        <CardDescription>
          Passo 4 de 4 - Revise suas informações e conclua o onboarding
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="space-y-4">
            {/* Organization */}
            {summaryData?.organization && (
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                <h4 className="font-semibold text-slate-900 mb-2">Organização</h4>
                <div className="space-y-1 text-sm text-slate-600">
                  <div>
                    <strong>Tipo:</strong> {summaryData.organization.type === 'FISICA' ? 'Pessoa Física' : 'Pessoa Jurídica'}
                  </div>
                  <div>
                    <strong>Nome:</strong> {summaryData.organization.name}
                  </div>
                  <div>
                    <strong>Documento:</strong> {summaryData.organization.document}
                  </div>
                  <div>
                    <strong>Endereço:</strong> {summaryData.organization.address}
                  </div>
                </div>
              </div>
            )}

            {/* User */}
            {summaryData?.user && (
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                <h4 className="font-semibold text-slate-900 mb-2">Usuário Administrador</h4>
                <div className="space-y-1 text-sm text-slate-600">
                  <div>
                    <strong>Nome:</strong> {summaryData.user.name}
                  </div>
                  <div>
                    <strong>Email:</strong> {summaryData.user.email}
                  </div>
                  <div>
                    <strong>Telefone:</strong> {summaryData.user.phone}
                  </div>
                </div>
              </div>
            )}

            {/* Plan */}
            {summaryData?.plan && (
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                <h4 className="font-semibold text-slate-900 mb-2">Plano Selecionado</h4>
                <div className="space-y-1 text-sm text-slate-600">
                  <div>
                    <strong>Plano:</strong> {summaryData.plan.name}
                  </div>
                  <div>
                    <strong>Preço:</strong> R$ {summaryData.plan.price.toFixed(2)}/mês
                  </div>
                  <div>
                    <strong>Usuários:</strong> {summaryData.plan.maxUsers}
                  </div>
                  <div>
                    <strong>Armazenamento:</strong> {summaryData.plan.maxStorageGb} GB
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Alert */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg flex gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-700">
              <p className="font-semibold mb-1">Ao clicar em "Concluir e Acessar":</p>
              <p>Sua organização será criada e você será registrado como proprietário (OWNER). Você poderá convidar outros usuários posteriormente.</p>
            </div>
          </div>

          {/* Terms Checkbox */}
          <div className="flex items-start gap-3">
            <Checkbox
              id="terms"
              checked={termsAccepted}
              onCheckedChange={setTermsAccepted}
              className="mt-1"
            />
            <label htmlFor="terms" className="text-sm text-slate-700 cursor-pointer">
              Eu li e aceito os{' '}
              <a href="#" className="text-blue-600 hover:underline">
                Termos de Uso
              </a>
              {' '}e a{' '}
              <a href="#" className="text-blue-600 hover:underline">
                Política de Privacidade
              </a>
            </label>
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
              disabled={!termsAccepted || isSubmitting}
              onClick={handleSubmit}
              size="lg"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                'Concluir e Acessar'
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
