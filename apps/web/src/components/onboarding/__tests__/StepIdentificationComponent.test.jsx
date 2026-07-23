import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StepIdentificationComponent } from '../StepIdentificationComponent';

// Mock the API
vi.mock('@/api/client', () => ({
  tenantsApi: {
    create: vi.fn()
  }
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false }
  }
});

const renderComponent = (props = {}) => {
  return render(
    <QueryClientProvider client={queryClient}>
      <StepIdentificationComponent
        onSuccess={vi.fn()}
        onError={vi.fn()}
        {...props}
      />
    </QueryClientProvider>
  );
};

describe('StepIdentificationComponent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the component', () => {
    renderComponent();
    expect(screen.getByText('Identificação da Organização')).toBeInTheDocument();
  });

  it('should display tenant type selector', () => {
    renderComponent();
    expect(screen.getByText('Pessoa Física')).toBeInTheDocument();
    expect(screen.getByText('Pessoa Jurídica')).toBeInTheDocument();
  });

  it('should show PF form when Pessoa Física is selected', async () => {
    const user = userEvent.setup();
    renderComponent();

    const pfRadio = screen.getByRole('radio', { name: /Pessoa Física/i });
    await user.click(pfRadio);

    await waitFor(() => {
      expect(screen.getByLabelText(/Nome Completo/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/CPF/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
    });
  });

  it('should show PJ form when Pessoa Jurídica is selected', async () => {
    const user = userEvent.setup();
    renderComponent();

    const pjRadio = screen.getByRole('radio', { name: /Pessoa Jurídica/i });
    await user.click(pjRadio);

    await waitFor(() => {
      expect(screen.getByLabelText(/Razão Social/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/CNPJ/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Nome do Responsável/i)).toBeInTheDocument();
    });
  });

  it('should show address form after tenant type selection', async () => {
    const user = userEvent.setup();
    renderComponent();

    const pfRadio = screen.getByRole('radio', { name: /Pessoa Física/i });
    await user.click(pfRadio);

    await waitFor(() => {
      expect(screen.getByLabelText(/Rua/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Número/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Bairro/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Cidade/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Estado/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/CEP/i)).toBeInTheDocument();
    });
  });

  it('should disable submit button when tenant type is not selected', () => {
    renderComponent();
    const submitButton = screen.getByRole('button', { name: /Continuar/i });
    expect(submitButton).toBeDisabled();
  });

  it('should enable submit button when tenant type is selected', async () => {
    const user = userEvent.setup();
    renderComponent();

    const pfRadio = screen.getByRole('radio', { name: /Pessoa Física/i });
    await user.click(pfRadio);

    await waitFor(() => {
      const submitButton = screen.getByRole('button', { name: /Continuar/i });
      expect(submitButton).not.toBeDisabled();
    });
  });

  it('should display validation errors for required fields', async () => {
    const user = userEvent.setup();
    renderComponent();

    const pfRadio = screen.getByRole('radio', { name: /Pessoa Física/i });
    await user.click(pfRadio);

    await waitFor(() => {
      const submitButton = screen.getByRole('button', { name: /Continuar/i });
      expect(submitButton).not.toBeDisabled();
    });

    const submitButton = screen.getByRole('button', { name: /Continuar/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Nome deve ter pelo menos 3 caracteres/i)).toBeInTheDocument();
    });
  });

  it('should call onSuccess callback on successful submission', async () => {
    const { tenantsApi } = await import('@/api/client');
    const onSuccess = vi.fn();
    const user = userEvent.setup();

    tenantsApi.create.mockResolvedValue({
      data: {
        tenantId: 'test-tenant-id',
        onboardingStep: 'STEP_1'
      }
    });

    renderComponent({ onSuccess });

    const pfRadio = screen.getByRole('radio', { name: /Pessoa Física/i });
    await user.click(pfRadio);

    await waitFor(() => {
      expect(screen.getByLabelText(/Nome Completo/i)).toBeInTheDocument();
    });

    // Fill in the form
    await user.type(screen.getByLabelText(/Nome Completo/i), 'João Silva');
    await user.type(screen.getByLabelText(/CPF/i), '12345678901');
    await user.type(screen.getByLabelText(/Email/i), 'joao@example.com');
    await user.type(screen.getByLabelText(/Rua/i), 'Rua A');
    await user.type(screen.getByLabelText(/Número/i), '123');
    await user.type(screen.getByLabelText(/Bairro/i), 'Centro');
    await user.type(screen.getByLabelText(/Cidade/i), 'São Paulo');
    await user.type(screen.getByLabelText(/CEP/i), '01310-100');

    // Select state
    const stateSelect = screen.getByLabelText(/Estado/i);
    await user.click(stateSelect);
    const spOption = await screen.findByText('São Paulo (SP)');
    await user.click(spOption);

    const submitButton = screen.getByRole('button', { name: /Continuar/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith('test-tenant-id');
    });
  });

  it('should display error message on failed submission', async () => {
    const { tenantsApi } = await import('@/api/client');
    const onError = vi.fn();
    const user = userEvent.setup();

    tenantsApi.create.mockRejectedValue({
      data: {
        error: {
          message: 'Documento já cadastrado'
        }
      }
    });

    renderComponent({ onError });

    const pfRadio = screen.getByRole('radio', { name: /Pessoa Física/i });
    await user.click(pfRadio);

    await waitFor(() => {
      expect(screen.getByLabelText(/Nome Completo/i)).toBeInTheDocument();
    });

    // Fill in the form
    await user.type(screen.getByLabelText(/Nome Completo/i), 'João Silva');
    await user.type(screen.getByLabelText(/CPF/i), '12345678901');
    await user.type(screen.getByLabelText(/Email/i), 'joao@example.com');
    await user.type(screen.getByLabelText(/Rua/i), 'Rua A');
    await user.type(screen.getByLabelText(/Número/i), '123');
    await user.type(screen.getByLabelText(/Bairro/i), 'Centro');
    await user.type(screen.getByLabelText(/Cidade/i), 'São Paulo');
    await user.type(screen.getByLabelText(/CEP/i), '01310-100');

    // Select state
    const stateSelect = screen.getByLabelText(/Estado/i);
    await user.click(stateSelect);
    const spOption = await screen.findByText('São Paulo (SP)');
    await user.click(spOption);

    const submitButton = screen.getByRole('button', { name: /Continuar/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Documento já cadastrado/i)).toBeInTheDocument();
    });
  });
});
