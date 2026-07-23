/**
 * searchIndex.js - Wrapper Fuse.js para busca client-side com relation boosting
 */

import Fuse from 'fuse.js';

function normalizePreviewData(previewData) {
  if (!previewData) return {};

  try {
    return typeof previewData === 'string' ? JSON.parse(previewData) : previewData;
  } catch {
    return {};
  }
}

/**
 * Cria e gerencia um índice de busca Fuse.js
 */
export class SearchIndex {
  constructor(notes = [], relations = []) {
    this.notes = notes;
    this.relations = relations;
    this.fuse = null;
    this.buildIndex();
  }

  /**
   * Constrói o índice Fuse.js com dados enriquecidos
   */
  buildIndex() {
    // Enriquecer notas com dados de relações
    const enrichedNotes = this.notes.map(note => {
      const relatedNotes = this.getRelatedNotes(note.id);
      const previewData = normalizePreviewData(note.previewData);

      return {
        ...note,
        searchContext: [
          note.context,
          note.url,
          previewData.title,
          previewData.description,
          previewData.ogSiteName,
          previewData.domain,
          ...(Array.isArray(note.tags) ? note.tags : [])
        ].filter(Boolean).join(' '),
        relatedNoteIds: relatedNotes.map(r => r.id),
        relationStrengths: relatedNotes.map(r => r.strength)
      };
    });

    // Configurar Fuse.js
    const options = {
      keys: [
        { name: 'title', weight: 0.38 },
        { name: 'content', weight: 0.3 },
        { name: 'tags', weight: 0.16 },
        { name: 'searchContext', weight: 0.16 }
      ],
      threshold: 0.4,
      includeScore: true,
      includeMatches: true,
      minMatchCharLength: 2,
      ignoreLocation: true,
      useExtendedSearch: false
    };

    this.fuse = new Fuse(enrichedNotes, options);
  }

  /**
   * Busca por termo e retorna resultados com relation boosting
   * @param {string} query - Termo de busca
   * @param {number} limit - Limite de resultados (padrão: 10)
   * @returns {Array} Array de notas encontradas com scores
   */
  search(query, limit = 10) {
    if (!query || !this.fuse) return [];

    // Busca básica com Fuse.js
    const results = this.fuse.search(query);

    // Aplicar relation boosting
    const boostedResults = results.map(result => {
      let score = result.score;

      // Boost para notas relacionadas a resultados encontrados
      const relatedNotes = this.getRelatedNotes(result.item.id);
      if (relatedNotes.length > 0) {
        const avgStrength = relatedNotes.reduce((sum, r) => sum + r.strength, 0) / relatedNotes.length;
        score = score * (1 - avgStrength * 0.3); // Boost de até 30%
      }

      return {
        ...result,
        score,
        isRelated: false
      };
    });

    // Adicionar notas relacionadas aos resultados
    const resultIds = new Set(boostedResults.map(r => r.item.id));
    const relatedNotesSet = new Set();

    boostedResults.forEach(result => {
      const related = this.getRelatedNotes(result.item.id);
      related.forEach(r => {
        if (!resultIds.has(r.id)) {
          relatedNotesSet.add(r.id);
        }
      });
    });

    // Converter notas relacionadas em resultados
    const relatedResults = Array.from(relatedNotesSet)
      .map(noteId => {
        const note = this.notes.find(n => n.id === noteId);
        return note ? {
          item: {
            ...note,
            relatedNoteIds: [],
            relationStrengths: []
          },
          score: 1.0, // Score baixo para notas relacionadas
          isRelated: true,
          matches: []
        } : null;
      })
      .filter(Boolean);

    // Combinar e ordenar resultados
    const allResults = [...boostedResults, ...relatedResults]
      .sort((a, b) => a.score - b.score)
      .slice(0, limit);

    return allResults;
  }

  /**
   * Obtém notas relacionadas a uma nota específica
   * @param {string} noteId - ID da nota
   * @returns {Array} Array de notas relacionadas com strength
   */
  getRelatedNotes(noteId) {
    const related = [];

    this.relations.forEach(relation => {
      if (relation.noteFromId === noteId) {
        const relatedNote = this.notes.find(n => n.id === relation.noteToId);
        if (relatedNote) {
          related.push({
            id: relatedNote.id,
            strength: relation.strength || 0.5,
            context: relation.context || '',
            relationType: relation.relationType || 'semantic'
          });
        }
      } else if (relation.noteToId === noteId) {
        const relatedNote = this.notes.find(n => n.id === relation.noteFromId);
        if (relatedNote) {
          related.push({
            id: relatedNote.id,
            strength: relation.strength || 0.5,
            context: relation.context || '',
            relationType: relation.relationType || 'semantic'
          });
        }
      }
    });

    return related;
  }

  /**
   * Atualiza o índice com novas notas/relações
   */
  update(notes, relations) {
    this.notes = notes;
    this.relations = relations;
    this.buildIndex();
  }

  /**
   * Limpa o índice
   */
  clear() {
    this.notes = [];
    this.relations = [];
    this.fuse = null;
  }
}

/**
 * Factory para criar instância de SearchIndex
 */
export function createSearchIndex(notes = [], relations = []) {
  return new SearchIndex(notes, relations);
}
