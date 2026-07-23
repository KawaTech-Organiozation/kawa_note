import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/components/providers/AuthContext';
import { StepIdentificationComponent } from '@/components/onboarding/StepIdentificationComponent';
import { StepUserCredentialsComponent } from '@/components/onboarding/StepUserCredentialsComponent';
import { StepPlanSelectionComponent } from '@/components/onboarding/StepPlanSelectionComponent';
import { StepConfirmationComponent } from '@/components/onboarding/StepConfirmationComponent';
import { OnboardingStepper } from '@/components/onboarding/OnboardingStepper';
import { tenantsApi } from '@/api/client';

/**
 * Onboarding Page
 * Manages the multi-step onboarding flow
 */
export default function Onboarding() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState('STEP_1');
  const [tenantId, setTenantId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [summaryData, setSummaryData] = useState(null);

  // Check if user is authenticated
  useEffect(() => {
    // If user is authenticated, check their tenant status
    if (user) {
      checkUserTenant();
    } else {
      // If not authenticated, start from STEP_1 (create tenant)
      console.log('📝 No user, starting from STEP_1 (create tenant)');
      setLoading(false);
      setCurrentStep('STEP_1');
    }
  }, [user, navigate]);

  /**
   * Check if user has an existing tenant
   */
  const checkUserTenant = async () => {
    try {
      setLoading(true);
      // If user has tenantId, fetch their tenant
      if (user?.tenantId) {
        const response = await tenantsApi.get(user.tenantId);
        if (response.data) {
          setTenantId(response.data.tenantId);
          setCurrentStep(response.data.onboardingStep || 'STEP_1');

          // If onboarding is complete, redirect to home
          if (response.data.onboardingStatus === 'COMPLETED') {
            navigate('/');
            return;
          }
        }
      }
    } catch (err) {
      console.error('Error checking tenant:', err);
      // Continue with onboarding if tenant not found
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle successful tenant creation
   */
  const handleTenantCreated = (newTenantId) => {
    console.log('✅ Tenant created:', newTenantId);
    setTenantId(newTenantId);
    setCurrentStep('STEP_2');
  };

  /**
   * Handle successful user credentials update
   */
  const handleUserCredentialsUpdated = () => {
    setCurrentStep('STEP_3');
  };

  /**
   * Handle successful plan selection
   */
  const handlePlanSelected = () => {
    setCurrentStep('STEP_4');
  };

  /**
   * Handle onboarding completion
   */
  const handleOnboardingComplete = () => {
    // Redirect to home after successful completion
    navigate('/');
  };

  /**
   * Handle step back
   */
  const handleStepBack = () => {
    if (currentStep === 'STEP_2') {
      setCurrentStep('STEP_1');
    } else if (currentStep === 'STEP_3') {
      setCurrentStep('STEP_2');
    } else if (currentStep === 'STEP_4') {
      setCurrentStep('STEP_3');
    }
  };

  /**
   * Handle onboarding error
   */
  const handleOnboardingError = (errorMessage) => {
    setError(errorMessage);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900 mx-auto mb-4"></div>
          <p className="text-slate-600">Carregando onboarding...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold text-slate-900">Kawa Note</h1>
          <p className="text-sm text-slate-600 mt-1">Bem-vindo ao onboarding</p>
        </div>
      </div>

      {/* Stepper */}
      <OnboardingStepper currentStep={currentStep} />

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {currentStep === 'STEP_1' && (
          <StepIdentificationComponent
            onSuccess={handleTenantCreated}
            onError={handleOnboardingError}
          />
        )}

        {currentStep === 'STEP_2' && (
          <StepUserCredentialsComponent
            tenantId={tenantId}
            onSuccess={handleUserCredentialsUpdated}
            onError={handleOnboardingError}
            onBack={handleStepBack}
          />
        )}

        {currentStep === 'STEP_3' && (
          <StepPlanSelectionComponent
            tenantId={tenantId}
            onSuccess={handlePlanSelected}
            onError={handleOnboardingError}
            onBack={handleStepBack}
          />
        )}

        {currentStep === 'STEP_4' && (
          <StepConfirmationComponent
            tenantId={tenantId}
            onSuccess={handleOnboardingComplete}
            onError={handleOnboardingError}
            onBack={handleStepBack}
            summaryData={summaryData}
          />
        )}
      </div>
    </div>
  );
}
