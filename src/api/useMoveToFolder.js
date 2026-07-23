import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { notesApi } from './client';
import { toast } from 'sonner';

/**
 * Movimentação de notas/credenciais entre pastas (drag & drop e diálogos).
 *
 * Notas e credenciais compartilham a mesma tabela e o mesmo endpoint
 * (`PUT /api/notes/:id { folderId }`), então um único hook serve às duas telas.
 *
 * Duas preocupações moram aqui:
 *
 * 1. **Invalidação com debounce.** Uma escrita no Cofre invalida `vault`,
 *    `notes` e `folders` de uma vez. Com drag & drop o usuário produz dezenas
 *    de movimentos em segundos, e invalidar a cada um vira uma tempestade de
 *    refetch capaz de consumir sozinha o orçamento de rate limit (300 req/min).
 *    Agrupamos as invalidações numa única janela.
 * 2. **Rollback.** O update é otimista; se o servidor recusar (por exemplo com
 *    `FOLDER_SCOPE_MISMATCH`), o cache volta ao estado anterior.
 */

// Janela de agrupamento das invalidações após o último movimento.
const INVALIDATE_DEBOUNCE_MS = 800;

/**
 * Mensagem de erro amigável a partir da resposta da API.
 * @param {any} error
 * @returns {string}
 */
export function moveErrorMessage(error) {
  const code = error?.data?.error?.code;

  if (code === 'FOLDER_SCOPE_MISMATCH') {
    return 'Esta pasta pertence a outra área. Credenciais só podem ir para pastas do Cofre, e notas para pastas de Notas.';
  }

  if (code === 'NOT_FOUND') {
    return 'Pasta não encontrada.';
  }

  return error?.data?.error?.message || error?.message || 'Não foi possível mover.';
}

/**
 * Reescreve o folderId do item alvo em uma coleção, seja ela um array puro
 * ou o formato `{ data: [...] }` devolvido pela API.
 * @param {any} cached - Valor atual no cache
 * @param {string} id - Id do item movido
 * @param {string|null} folderId - Nova pasta
 * @returns {any} Novo valor (ou o original, se o formato não for reconhecido)
 */
function withMovedItem(cached, id, folderId) {
  const remap = (rows) => rows.map((row) => (row?.id === id ? { ...row, folderId } : row));

  if (Array.isArray(cached)) {
    return remap(cached);
  }

  if (cached && typeof cached === 'object' && Array.isArray(cached.data)) {
    return { ...cached, data: remap(cached.data) };
  }

  return cached;
}

/**
 * @param {Object} [options]
 * @param {'notes'|'vault'} [options.scope='notes'] - Qual cache primário atualizar.
 * @returns {{ moveToFolder: Function, isMoving: boolean }}
 */
export function useMoveToFolder({ scope = 'notes' } = {}) {
  const queryClient = useQueryClient();
  const timerRef = useRef(/** @type {any} */ (null));

  // Cache primário da tela + caches derivados que exibem contagens.
  const primaryKey = scope === 'vault' ? 'vault' : 'notes';
  const invalidateKeys = useMemo(
    () => (scope === 'vault' ? ['vault', 'notes', 'folders'] : ['notes', 'folders']),
    [scope]
  );

  const flushInvalidations = useCallback(() => {
    for (const key of invalidateKeys) {
      queryClient.invalidateQueries({ queryKey: [key] });
    }
    queryClient.refetchQueries({ queryKey: ['folders'], type: 'active' });
  }, [queryClient, invalidateKeys]);

  const scheduleInvalidation = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      flushInvalidations();
    }, INVALIDATE_DEBOUNCE_MS);
  }, [flushInvalidations]);

  // Um movimento pendente não pode ficar sem refetch se a tela desmontar.
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        flushInvalidations();
      }
    };
  }, [flushInvalidations]);

  const mutation = useMutation({
    mutationFn: ({ id, folderId }) => notesApi.update(id, { folderId }),

    // Update otimista + snapshot para rollback fiel.
    onMutate: async ({ id, folderId }) => {
      await queryClient.cancelQueries({ queryKey: [primaryKey] });

      const snapshots = queryClient.getQueriesData({ queryKey: [primaryKey] });

      for (const [queryKey, data] of snapshots) {
        queryClient.setQueryData(queryKey, withMovedItem(data, id, folderId));
      }

      return { snapshots };
    },

    onError: (error, _variables, context) => {
      for (const [queryKey, data] of context?.snapshots || []) {
        queryClient.setQueryData(queryKey, data);
      }
      toast.error(moveErrorMessage(error));
    },

    onSuccess: () => {
      scheduleInvalidation();
    }
  });

  const { mutateAsync } = mutation;

  /**
   * Move um item para uma pasta, com atualização otimista.
   * @param {string} id - Id da nota/credencial
   * @param {string|null} folderId - Pasta destino (null = raiz)
   * @returns {Promise<boolean>} true se o servidor aceitou
   */
  const moveToFolder = useCallback(
    async (id, folderId) => {
      try {
        await mutateAsync({ id, folderId });
        return true;
      } catch {
        // onError já restaurou o cache e notificou o usuário.
        return false;
      }
    },
    [mutateAsync]
  );

  return { moveToFolder, isMoving: mutation.isPending };
}
