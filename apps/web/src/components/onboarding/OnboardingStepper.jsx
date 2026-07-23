import { Check } from 'lucide-react';

/**
 * OnboardingStepper Component
 * Reusable stepper for onboarding flow
 */
export function OnboardingStepper({ currentStep, steps = [] }) {
  const stepOrder = ['STEP_1', 'STEP_2', 'STEP_3', 'STEP_4'];
  const defaultSteps = [
    { id: 'STEP_1', label: 'Empresa' },
    { id: 'STEP_2', label: 'Usuário' },
    { id: 'STEP_3', label: 'Plano' },
    { id: 'STEP_4', label: 'Confirmação' }
  ];

  const stepsToRender = steps.length > 0 ? steps : defaultSteps;
  const currentStepIndex = stepOrder.indexOf(currentStep);

  const getStepStatus = (stepIndex) => {
    if (stepIndex < currentStepIndex) return 'completed';
    if (stepIndex === currentStepIndex) return 'active';
    return 'pending';
  };

  return (
    <div className="bg-white border-b border-slate-200">
      <div className="max-w-4xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {stepsToRender.map((step, index) => {
            const status = getStepStatus(index);
            const isLast = index === stepsToRender.length - 1;

            return (
              <div key={step.id} className="flex items-center flex-1">
                {/* Step Indicator */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                      status === 'completed'
                        ? 'bg-green-500 text-white'
                        : status === 'active'
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-200 text-slate-900'
                    }`}
                  >
                    {status === 'completed' ? (
                      <Check size={16} />
                    ) : (
                      <span>{index + 1}</span>
                    )}
                  </div>
                  <span className="text-sm font-medium text-slate-700">
                    {step.label}
                  </span>
                </div>

                {/* Progress Line */}
                {!isLast && (
                  <div
                    className={`flex-1 h-1 mx-4 transition-colors ${
                      status === 'completed' ? 'bg-green-500' : 'bg-slate-200'
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
