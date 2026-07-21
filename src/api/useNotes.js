import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notesApi, relationsApi } from './client';
import { getKey } from '@/lib/keyManager';
import { encrypt, decrypt, encryptJSON, decryptJSON } from '@/lib/crypto';
import { handleEncryptionError, checkAndHandleEncryptionError } from '@/lib/errorHandlers';

/** @typedef {import('@/types/models').Note} Note */
/** @typedef {import('@/types/api').ApiSuccessResponse} ApiSuccessResponse */

const NOTES_QUERY_KEY = 'notes';
const STOP_WORDS = new Set(['para', 'com', 'sem', 'uma', 'das', 'dos', 'que', 'por', 'the', 'and', 'como', 'mais', 'isso']);

function tokenizeNote(note) {
  const source = [
    note.title,
    note.content,
    note.context,
    note.url,
    ...(Array.isArray(note.tags) ? note.tags : [])
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return new Set(
    source
      .split(/[^a-z0-9\u00C0-\u017F]+/i)
      .filter((token) => token.length >= 4 && !STOP_WORDS.has(token))
      .slice(0, 80)
  );
}

function calculateSimilarity(sourceNote, candidateNote) {
  const sourceTokens = tokenizeNote(sourceNote);
  const candidateTokens = tokenizeNote(candidateNote);

  if (sourceTokens.size === 0 || candidateTokens.size === 0) {
    return 0;
  }

  const intersection = [...sourceTokens].filter((token) => candidateTokens.has(token)).length;
  const union = new Set([...sourceTokens, ...candidateTokens]).size;
  const sharedTags = (sourceNote.tags || []).filter((tag) => (candidateNote.tags || []).includes(tag)).length;
  const urlDomainMatch = Boolean(sourceNote.url && candidateNote.url && (() => {
    try {
      return new URL(sourceNote.url).hostname === new URL(candidateNote.url).hostname;
    } catch {
      return false;
    }
  })());

  return Math.min(0.95, (intersection / union) + sharedTags * 0.08 + (urlDomainMatch ? 0.12 : 0));
}

async function upsertNoteIntoCache(queryClient, updatedNote) {
  const queries = queryClient.getQueriesData({ queryKey: [NOTES_QUERY_KEY] });

  queries.forEach(([queryKey, queryData]) => {
    if (!queryData?.data || !Array.isArray(queryData.data)) {
      return;
    }

    const nextData = queryData.data.map((note) => (note.id === updatedNote.id ? { ...note, ...updatedNote } : note));
    const hasNote = nextData.some((note) => note.id === updatedNote.id);

    queryClient.setQueryData(queryKey, {
      ...queryData,
      data: hasNote ? nextData : [updatedNote, ...nextData]
    });
  });
}

async function suggestRelationsFromCache(queryClient, note) {
  if (!note?.id) return;

  const notesQueries = queryClient.getQueriesData({ queryKey: [NOTES_QUERY_KEY] });
  const relationGraph = queryClient.getQueryData(['relations', 'graph']);
  const existingEdges = relationGraph?.data?.edges || [];
  const existingPairs = new Set(
    existingEdges.map((edge) => [edge.source, edge.target].sort().join(':'))
  );

  const notes = notesQueries
    .flatMap(([, queryData]) => (Array.isArray(queryData?.data) ? queryData.data : []))
    .filter(Boolean);

  const uniqueNotes = Array.from(new Map(notes.map((item) => [item.id, item])).values());

  const candidates = uniqueNotes
    .filter((candidate) => candidate.id !== note.id)
    .map((candidate) => ({
      candidate,
      score: calculateSimilarity(note, candidate)
    }))
    .filter(({ score }) => score >= 0.18)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  await Promise.all(
    candidates.map(async ({ candidate, score }) => {
      const pairKey = [note.id, candidate.id].sort().join(':');
      if (existingPairs.has(pairKey)) {
        return;
      }

      existingPairs.add(pairKey);

      try {
        await relationsApi.create({
          noteFromId: note.id,
          noteToId: candidate.id,
          relationType: 'semantic_suggested',
          strength: Number(score.toFixed(2)),
          context: 'Sugestao automatica por proximidade textual'
        });
      } catch (error) {
        if (error?.status !== 400) {
          console.warn('Falha ao sugerir relacao:', error);
        }
      }
    })
  );

  queryClient.invalidateQueries({ queryKey: ['relations'] });
}

/**
 * Reset encryption logout flag (called on successful login)
 */
export function resetEncryptionLogoutFlag() {
  // Flag removed - encryption state now managed by AuthContext
  console.log('✅ Encryption state reset on login');
}

/**
 * Encrypt note fields before sending to API
 * @param {Partial<Note>} noteData - Note data to encrypt
 * @returns {Promise<Partial<Note>>} Encrypted note data
 */
export async function encryptNoteData(noteData) {
  console.log('🔐 encryptNoteData: Starting encryption...');
  const key = await getKey();
  if (!key) {
    console.error('❌ encryptNoteData: Encryption key not available!');
    handleEncryptionError();
    throw new Error('Encryption key not available. Please log in again.');
  }

  console.log('✅ encryptNoteData: Encryption key available');
  const encrypted = { ...noteData, isEncrypted: true };

  if (noteData.title) {
    encrypted.title = await encrypt(noteData.title, key);
  }
  if (noteData.content) {
    encrypted.content = await encrypt(noteData.content, key);
  }
  if (noteData.context) {
    encrypted.context = await encrypt(noteData.context, key);
  }
  if (noteData.previewData) {
    encrypted.previewData = await encryptJSON(noteData.previewData, key);
  }
  if (noteData.tags && Array.isArray(noteData.tags)) {
    // Tags: encrypt as JSON string
    encrypted.tags = await encryptJSON(noteData.tags, key);
  }

  console.log('✅ encryptNoteData: Encryption completed');
  return encrypted;
}

/**
 * Decrypt note fields after receiving from API
 * @param {Note} note - Encrypted note
 * @returns {Promise<Note>} Decrypted note
 */
export async function decryptNoteData(note) {
  if (!note.isEncrypted) {
    // Legacy plaintext note - return as-is but ensure tags is array
    return {
      ...note,
      tags: Array.isArray(note.tags) ? note.tags : []
    };
  }

  const key = await getKey();
  if (!key) {
    // Key not available - return placeholder without triggering logout
    console.warn('Encryption key not available. Cannot decrypt note:', note.id);
    
    return {
      ...note,
      title: '[Encrypted - Login Required]',
      content: '[Encrypted content - Please log in to view]',
      tags: []
    };
  }

  try {
    const decrypted = { ...note };

    if (note.title) {
      decrypted.title = await decrypt(note.title, key);
    }
    if (note.content) {
      decrypted.content = await decrypt(note.content, key);
    }
    if (note.context) {
      decrypted.context = await decrypt(note.context, key);
    }
    if (note.previewData) {
      try {
        decrypted.previewData = await decryptJSON(note.previewData, key);
      } catch {
        decrypted.previewData = JSON.parse(note.previewData);
      }
    }
    if (note.tags) {
      // Tags stored as encrypted JSON string
      const decryptedTags = await decryptJSON(note.tags, key);
      decrypted.tags = Array.isArray(decryptedTags) ? decryptedTags : [];
    } else {
      decrypted.tags = [];
    }

    return decrypted;
  } catch (error) {
    console.error('Failed to decrypt note:', note.id, error);
    return {
      ...note,
      title: '[Decryption Failed]',
      content: '[Unable to decrypt content - Data may be corrupted]',
      tags: []
    };
  }
}

/**
 * Hook to fetch notes list with optional filters
 * @param {Object} filters - Filter options
 * @returns {import('@tanstack/react-query').UseQueryResult<ApiSuccessResponse<Note[]>>}
 */
export const useNotes = (filters = {}) => {
  return useQuery({
    queryKey: [NOTES_QUERY_KEY, filters],
    queryFn: async () => {
      const response = await notesApi.list(filters);
      
      // Decrypt all notes
      if (response.data && Array.isArray(response.data)) {
        response.data = await Promise.all(
          response.data.map(note => decryptNoteData(note))
        );
      }
      
      return response;
    },
    staleTime: 1000 * 60 * 5 // 5 minutes
  });
};

/**
 * Hook to fetch a single note by ID
 * @param {string} id - Note ID
 * @returns {import('@tanstack/react-query').UseQueryResult<ApiSuccessResponse<Note>>}
 */
export const useNote = (id, options = {}) => {
  return useQuery({
    queryKey: [NOTES_QUERY_KEY, id],
    queryFn: async () => {
      const response = await notesApi.get(id);
      
      // Decrypt note
      if (response.data) {
        response.data = await decryptNoteData(response.data);
      }
      
      return response;
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
    ...options
  });
};

/**
 * Hook to create a new note
 * @returns {import('@tanstack/react-query').UseMutationResult<ApiSuccessResponse<Note>, Error, Note>}
 */
export const useCreateNote = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (noteData) => {
      // Encrypt before sending
      const encrypted = await encryptNoteData(noteData);
      return notesApi.create(encrypted);
    },
    onSuccess: async (response, variables) => {
      const decrypted = response?.data ? await decryptNoteData(response.data) : null;

      if (decrypted) {
        await upsertNoteIntoCache(queryClient, decrypted);
        await suggestRelationsFromCache(queryClient, decrypted);
      }

      queryClient.invalidateQueries({ queryKey: [NOTES_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['relations'] });
      
      // Dispatch event for PWA install prompt trigger
      window.dispatchEvent(new Event('noteCreated'));
    }
  });
};

/**
 * Hook to update an existing note
 * @returns {import('@tanstack/react-query').UseMutationResult<ApiSuccessResponse<Note>, Error, {id: string, data: Partial<Note>}>}
 */
export const useUpdateNote = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }) => {
      // Encrypt fields that are being updated
      const encrypted = await encryptNoteData(data);
      return notesApi.update(id, encrypted);
    },
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: [NOTES_QUERY_KEY] });

      const snapshots = queryClient.getQueriesData({ queryKey: [NOTES_QUERY_KEY] });
      snapshots.forEach(([queryKey, queryData]) => {
        if (!queryData?.data || !Array.isArray(queryData.data)) {
          return;
        }

        queryClient.setQueryData(queryKey, {
          ...queryData,
          data: queryData.data.map((note) => (note.id === id ? { ...note, ...data } : note))
        });
      });

      return { snapshots };
    },
    onError: (_error, _variables, context) => {
      context?.snapshots?.forEach(([queryKey, snapshot]) => {
        queryClient.setQueryData(queryKey, snapshot);
      });
    },
    onSuccess: async (response, variables) => {
      const decrypted = response?.data ? await decryptNoteData(response.data) : null;

      if (decrypted) {
        await upsertNoteIntoCache(queryClient, decrypted);
        await suggestRelationsFromCache(queryClient, decrypted);
      }

      queryClient.invalidateQueries({ queryKey: [NOTES_QUERY_KEY, variables.id] });
      queryClient.invalidateQueries({ queryKey: ['relations'] });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [NOTES_QUERY_KEY] });
    }
  });
};

/**
 * Hook to delete a note
 * @returns {import('@tanstack/react-query').UseMutationResult<ApiSuccessResponse<void>, Error, string>}
 */
export const useDeleteNote = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id) => notesApi.delete(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: [NOTES_QUERY_KEY] });

      const snapshots = queryClient.getQueriesData({ queryKey: [NOTES_QUERY_KEY] });
      snapshots.forEach(([queryKey, queryData]) => {
        if (!queryData) {
          return;
        }

        if (Array.isArray(queryData.data)) {
          queryClient.setQueryData(queryKey, {
            ...queryData,
            data: queryData.data.filter((note) => note.id !== id)
          });
          return;
        }

        if (queryData.data?.id === id) {
          queryClient.setQueryData(queryKey, {
            ...queryData,
            data: null
          });
        }
      });

      return { snapshots };
    },
    onError: (_error, _variables, context) => {
      context?.snapshots?.forEach(([queryKey, snapshot]) => {
        queryClient.setQueryData(queryKey, snapshot);
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [NOTES_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      queryClient.refetchQueries({ queryKey: ['folders'], type: 'active' });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [NOTES_QUERY_KEY] });
      queryClient.refetchQueries({ queryKey: ['folders'], type: 'active' });
    }
  });
};

/**
 * Hook to search notes
 * @param {string} query - Search query
 * @param {Object} options - Query options
 * @returns {import('@tanstack/react-query').UseQueryResult<ApiSuccessResponse<Note[]>>}
 */
export const useSearchNotes = (query, options = {}) => {
  return useQuery({
    queryKey: [NOTES_QUERY_KEY, 'search', query],
    queryFn: async () => {
      const response = await notesApi.search(query);

      // Decrypt search results
      if (response.data && Array.isArray(response.data)) {
        response.data = await Promise.all(
          response.data.map(note => decryptNoteData(note))
        );
      }

      return response;
    },
    enabled: !!query && query.length > 0,
    ...options
  });
};

const BATCH_LIMIT = 100;
const BATCH_CONCURRENCY = 3;

/**
 * Hook to fetch ALL notes using transparent batch loading.
 *
 * Strategy:
 * - Fetches page 1 (limit=100) immediately and exposes it while subsequent pages load.
 * - If total > 100, fetches remaining pages in groups of 3 in parallel.
 * - All filtering/search remains client-side (required by E2E encryption constraint).
 *
 * @returns {{
 *   notes: Note[],
 *   isLoading: boolean,
 *   isLoadingMore: boolean,
 *   totalLoaded: number,
 *   total: number,
 *   isComplete: boolean,
 *   error: Error|null,
 *   refetch: Function
 * }}
 */
export function useAllNotes() {
  const [notes, setNotes] = useState(/** @type {Note[]} */ ([]));
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [totalLoaded, setTotalLoaded] = useState(0);
  const [total, setTotal] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState(/** @type {Error|null} */ (null));
  const runIdRef = useRef(0);

  const fetchAll = async () => {
    const runId = ++runIdRef.current;

    setIsLoading(true);
    setIsLoadingMore(false);
    setIsComplete(false);
    setError(null);

    try {
      // ── Page 1 ──────────────────────────────────────────────────────────
      // excludeType 'password' keeps Cofre credentials out of the Notes list,
      // counts, client-side search and relation suggestions entirely.
      const firstResponse = await notesApi.list({ page: 1, limit: BATCH_LIMIT, excludeType: 'password' });

      // Abort if a newer run has started
      if (runId !== runIdRef.current) return;

      const serverTotal = firstResponse.pagination?.total ?? firstResponse.total ?? firstResponse.data?.length ?? 0;
      const totalPages = firstResponse.pagination?.totalPages ?? firstResponse.totalPages ?? Math.ceil(serverTotal / BATCH_LIMIT) ?? 1;

      const firstDecrypted = await Promise.all(
        (firstResponse.data || []).map(note => decryptNoteData(note))
      );

      if (runId !== runIdRef.current) return;

      setNotes(firstDecrypted);
      setTotalLoaded(firstDecrypted.length);
      setTotal(serverTotal);
      setIsLoading(false);

      if (totalPages <= 1) {
        setIsComplete(true);
        return;
      }

      // ── Pages 2..N in batches of BATCH_CONCURRENCY ───────────────────
      setIsLoadingMore(true);

      const remainingPages = [];
      for (let p = 2; p <= totalPages; p++) remainingPages.push(p);

      let accumulated = [...firstDecrypted];

      for (let i = 0; i < remainingPages.length; i += BATCH_CONCURRENCY) {
        if (runId !== runIdRef.current) return;

        const batch = remainingPages.slice(i, i + BATCH_CONCURRENCY);
        const batchResponses = await Promise.all(
          batch.map(page => notesApi.list({ page, limit: BATCH_LIMIT, excludeType: 'password' }))
        );

        if (runId !== runIdRef.current) return;

        const batchDecrypted = await Promise.all(
          batchResponses.flatMap(res => (res.data || []).map(note => decryptNoteData(note)))
        );

        if (runId !== runIdRef.current) return;

        accumulated = [...accumulated, ...batchDecrypted];
        setNotes([...accumulated]);
        setTotalLoaded(accumulated.length);
      }

      setIsLoadingMore(false);
      setIsComplete(true);
    } catch (err) {
      if (runId !== runIdRef.current) return;
      setError(err);
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    notes,
    isLoading,
    isLoadingMore,
    totalLoaded,
    total,
    isComplete,
    error,
    refetch: fetchAll,
  };
}
