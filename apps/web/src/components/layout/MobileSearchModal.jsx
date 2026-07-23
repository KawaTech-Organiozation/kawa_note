import { useEffect, useRef } from 'react';
import { X, Search, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useState, useMemo } from 'react';
import { useSearchIndex } from '@/hooks/useSearchIndex';
import { useNotes } from '@/api/useNotes';
import { useRelationGraph } from '@/api/useRelations';
import { format } from 'date-fns';

/**
 * MobileSearchModal - Modal de busca dedicado para mobile
 * Abre como overlay fullscreen quando o usuário toca em "Busca" na BottomNav
 *
 * @param {Object} props
 * @param {boolean} props.open - Controla visibilidade do modal
 * @param {Function} props.onClose - Callback para fechar o modal
 * @param {Function} props.onSelectResult - Callback ao selecionar uma nota
 * @returns {JSX.Element}
 */
export default function MobileSearchModal({ open, onClose, onSelectResult }) {
  const [searchTerm, setSearchTerm] = useState('');
  const inputRef = useRef(null);

  const { data: notesResponse = { data: [] } } = useNotes();
  const { data: relationGraphResponse = { data: { edges: [] } } } = useRelationGraph();
  const notes = notesResponse?.data || [];
  const relations = relationGraphResponse?.data?.edges || [];
  const { search, isIndexing, indexedCount } = useSearchIndex(notes, relations);

  const searchResults = useMemo(() => {
    if (!searchTerm) return [];
    return search(searchTerm, 15);
  }, [searchTerm, search]);

  // Auto-focus input when modal opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setSearchTerm('');
    }
  }, [open]);

  const handleSelect = (note) => {
    if (onSelectResult) onSelectResult(note);
    onClose();
    setSearchTerm('');
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-white dark:bg-slate-950 flex flex-col md:hidden">
      {/* Search Header */}
      <div className="flex items-center gap-2 px-3 py-3 border-b border-slate-200 dark:border-slate-800">
        <Search className="w-5 h-5 text-slate-400 dark:text-slate-500 shrink-0" />
        <Input
          ref={inputRef}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar notas..."
          className="flex-1 border-0 shadow-none focus-visible:ring-0 text-base px-0 bg-transparent text-slate-900 dark:text-slate-100"
        />
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 shrink-0"
          onClick={onClose}
          aria-label="Fechar busca"
        >
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto">
        {isIndexing && (
          <div className="p-4 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            Indexando {indexedCount} notas...
          </div>
        )}

        {!searchTerm && (
          <div className="p-6 text-center text-slate-400 dark:text-slate-500">
            <Search className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Digite para buscar suas notas</p>
          </div>
        )}

        {searchTerm && searchResults.length === 0 && !isIndexing && (
          <div className="p-6 text-center text-slate-400 dark:text-slate-500">
            <p className="text-sm">Nenhuma nota encontrada</p>
          </div>
        )}

        {searchResults.length > 0 && (
          <div>
            <div className="px-4 py-2 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide bg-slate-50 dark:bg-slate-900">
              {searchResults.length} resultado{searchResults.length !== 1 ? 's' : ''}
            </div>
            {searchResults.map((note) => (
              <button
                key={note.id}
                onClick={() => handleSelect(note)}
                className="w-full text-left px-4 py-3 border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 active:bg-slate-100 dark:active:bg-slate-800 transition-colors"
              >
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                  {note.title || 'Sem título'}
                </p>
                {note.content && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                    {note.content.substring(0, 100)}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded">
                    {note.type}
                  </span>
                  <span className="text-xs text-slate-400 dark:text-slate-500">
                    {format(new Date(note.createdAt), 'dd/MM/yyyy')}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
