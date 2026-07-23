/**
 * useSearchIndex.js - Hook React para gerenciar índice de busca Fuse.js
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { createSearchIndex } from '@/lib/searchIndex';

/**
 * Hook para gerenciar índice de busca client-side
 * @param {Array} notes - Array de notas decriptadas
 * @param {Array} relations - Array de relações entre notas
 * @returns {Object} { search, isIndexing, indexedCount }
 */
export function useSearchIndex(notes = [], relations = []) {
  const indexRef = useRef(null);
  const [isIndexing, setIsIndexing] = useState(false);
  const [indexedCount, setIndexedCount] = useState(0);

  // Construir/atualizar índice quando notas mudam
  useEffect(() => {
    if (notes.length === 0) {
      indexRef.current = null;
      setIndexedCount(0);
      return;
    }

    setIsIndexing(true);

    // Usar setTimeout para não bloquear a UI
    const timer = setTimeout(() => {
      try {
        indexRef.current = createSearchIndex(notes, relations);
        setIndexedCount(notes.length);
      } catch (error) {
        console.error('Erro ao construir índice de busca:', error);
        indexRef.current = null;
        setIndexedCount(0);
      } finally {
        setIsIndexing(false);
      }
    }, 0);

    return () => clearTimeout(timer);
  }, [notes, relations]);

  /**
   * Realiza busca no índice
   * @param {string} query - Termo de busca
   * @param {number} limit - Limite de resultados
   * @returns {Array} Resultados da busca
   */
  const search = useCallback((query, limit = 10) => {
    if (!indexRef.current || !query) {
      return [];
    }

    try {
      const results = indexRef.current.search(query, limit);
      return results.map(result => ({
        ...result.item,
        score: result.score,
        isRelated: result.isRelated || false,
        matches: result.matches || []
      }));
    } catch (error) {
      console.error('Erro ao buscar:', error);
      return [];
    }
  }, []);

  return {
    search,
    isIndexing,
    indexedCount
  };
}
