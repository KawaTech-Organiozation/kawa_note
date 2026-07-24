import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const updateMock = vi.fn();
const toastErrorMock = vi.fn();

vi.mock('@/api/client', () => ({
  notesApi: {
    update: (...args) => updateMock(...args)
  }
}));

vi.mock('sonner', () => ({
  toast: {
    error: (...args) => toastErrorMock(...args)
  }
}));

const { useMoveToFolder, moveErrorMessage } = await import('@/api/useMoveToFolder');

/**
 * Cria um QueryClient isolado e o wrapper do provider.
 * @returns {{ queryClient: QueryClient, wrapper: Function }}
 */
function setup() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  });
  const wrapper = ({ children }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { queryClient, wrapper };
}

/** Erro no formato que o client da API propaga. */
function apiError(code) {
  return { data: { error: { code, message: `código ${code}` } } };
}

describe('moveErrorMessage', () => {
  it('explica o escopo quando o destino é de outra área', () => {
    expect(moveErrorMessage(apiError('FOLDER_SCOPE_MISMATCH'))).toContain('outra área');
  });

  it('traduz pasta inexistente', () => {
    expect(moveErrorMessage(apiError('NOT_FOUND'))).toBe('Pasta não encontrada.');
  });

  it('cai na mensagem da API quando o código é desconhecido', () => {
    expect(moveErrorMessage(apiError('QUALQUER_OUTRO'))).toBe('código QUALQUER_OUTRO');
  });
});

describe('useMoveToFolder', () => {
  beforeEach(() => {
    updateMock.mockReset();
    toastErrorMock.mockReset();
  });

  it('move com sucesso e aplica o update otimista no cache', async () => {
    updateMock.mockResolvedValue({ data: { id: 'n1' } });
    const { queryClient, wrapper } = setup();
    queryClient.setQueryData(['notes', 'list'], { data: [{ id: 'n1', folderId: null }] });

    const { result } = renderHook(() => useMoveToFolder({ scope: 'notes' }), { wrapper });

    let moved;
    await act(async () => {
      moved = await result.current.moveToFolder('n1', 'f9');
    });

    expect(moved).toBe(true);
    expect(updateMock).toHaveBeenCalledWith('n1', { folderId: 'f9' });
    expect(queryClient.getQueryData(['notes', 'list']).data[0].folderId).toBe('f9');
  });

  it('desfaz o update otimista e avisa quando o servidor recusa o escopo', async () => {
    updateMock.mockRejectedValue(apiError('FOLDER_SCOPE_MISMATCH'));
    const { queryClient, wrapper } = setup();
    queryClient.setQueryData(['vault', 'list'], { data: [{ id: 'c1', folderId: 'origem' }] });

    const { result } = renderHook(() => useMoveToFolder({ scope: 'vault' }), { wrapper });

    let moved;
    await act(async () => {
      moved = await result.current.moveToFolder('c1', 'pasta-de-notas');
    });

    expect(moved).toBe(false);
    // Cache de volta ao estado anterior, não no destino recusado.
    expect(queryClient.getQueryData(['vault', 'list']).data[0].folderId).toBe('origem');
    expect(toastErrorMock).toHaveBeenCalledWith(
      expect.stringContaining('outra área')
    );
  });

  it('agrupa as invalidações de vários movimentos numa única janela', async () => {
    updateMock.mockResolvedValue({ data: {} });
    const { queryClient, wrapper } = setup();
    queryClient.setQueryData(['notes', 'list'], {
      data: [{ id: 'n1', folderId: null }, { id: 'n2', folderId: null }]
    });

    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useMoveToFolder({ scope: 'notes' }), { wrapper });

    await act(async () => {
      await result.current.moveToFolder('n1', 'f1');
      await result.current.moveToFolder('n2', 'f1');
    });

    // Nada de refetch imediato: dezenas de arrastes em segundos consumiriam
    // sozinhos o orçamento de rate limit.
    expect(invalidateSpy).not.toHaveBeenCalled();

    // Um único flush cobrindo as duas chaves do escopo 'notes'.
    await waitFor(() => expect(invalidateSpy).toHaveBeenCalledTimes(2), { timeout: 3000 });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['notes'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['folders'] });
  });
});
