import { useMemo } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Draggable, Droppable } from '@hello-pangea/dnd';
import { Brain, Plus, Loader2, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import NoteListItem from './NoteListItem';
import { DND_TYPE_ITEM, DROPPABLE_LIST } from '@/lib/dnd';

/** @typedef {import('@/types/models').Note} Note */

/**
 * NoteListPanel — the left panel in the V2 two-panel desktop layout.
 *
 * Contains the SearchBar, QuickEditor (Notion-style, at top), a "Fixadas"
 * section, and the regular notes list. Each section delegates rendering
 * to NoteListItem. All data mutation callbacks are forwarded to the items.
 *
 * @param {Object} props
 * @param {Note[]} props.notes - Full filtered list of notes to render
 * @param {string|null} props.activeNoteId - ID of the currently open note
 * @param {Function} props.onSelectNote - Called with (Note) when item is clicked
 * @param {Function} props.onDeleteNote - Called with (noteId) after deletion
 * @param {Function} props.onTogglePin - Called with (updatedNote) after pin toggle
 * @param {Function} props.onNewNote - Called when user clicks '+ Nova nota' button
 * @param {Function} props.onSearch - Called with (searchTerm) when search changes
 * @param {string} props.searchTerm - Current search term (controlled)
 * @param {Function} props.onFilterChange - Forwarded to SearchBar for type filters
 * @param {string} props.searchScope - 'global' | 'folder'
 * @param {Function} props.onSearchScopeChange - Forwarded to SearchBar
 * @param {Function} props.onSelectSearchResult - Called with (Note) on search result click
 * @param {Function} props.onNoteSaved - Called after QuickEditor creates a note
 * @param {string|null} props.folderId - Current folder ID for new notes via QuickEditor
 * @param {boolean} [props.isLoadingMore] - True while background batch pages are loading
 * @param {number} [props.totalLoaded] - Number of notes already loaded
 * @param {number} [props.total] - Total notes reported by server
 * @returns {JSX.Element}
 */
export default function NoteListPanel({
  notes = [],
  activeNoteId,
  onSelectNote,
  onDeleteNote,
  onTogglePin,
  searchTerm,
  onNewNote,
  isLoadingMore = false,
  totalLoaded = 0,
  total = 0,
}) {
  const pinnedNotes = useMemo(() => notes.filter(n => n.pinned), [notes]);
  const regularNotes = useMemo(() => notes.filter(n => !n.pinned), [notes]);

  const isEmpty = notes.length === 0;

  return (
    <div className="flex flex-col h-full border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-[#262b3a] overflow-hidden">

      {/* New Note button — creation happens in the right panel */}
      <div className="px-3 pt-2 pb-2 shrink-0">
        <Button
          id="btn-new-note"
          variant="outline"
          className="w-full justify-start gap-2 text-slate-500 dark:text-slate-300 border-dashed hover:border-indigo-400 hover:text-indigo-600 dark:hover:border-fuchsia-700 dark:hover:text-fuchsia-200 hover:bg-indigo-50 dark:hover:bg-fuchsia-950/25 transition-all"
          onClick={onNewNote}
          aria-label="Criar nova nota"
        >
          <Plus className="w-4 h-4" />
          Nova nota
        </Button>
      </div>

      {/* Divider */}
      <div className="mx-3 border-t border-slate-100 dark:border-slate-800 shrink-0" />

      {/* Loading more indicator — subtle footer shown during background batch loading */}
      {isLoadingMore && (
        <div className="px-3 py-1.5 shrink-0 flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
          <Loader2 className="w-3 h-3 animate-spin" />
          Carregando mais {totalLoaded}/{total} notas...
        </div>
      )}

      {/* Note list — scrollable area */}
      <div className="flex-1 overflow-y-auto">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 mb-3">
              <Brain className="h-6 w-6 text-slate-400" />
            </div>
            <p className="text-sm font-medium text-slate-600 dark:text-slate-200 mb-1">
              {searchTerm ? 'Nenhuma nota encontrada' : 'Sem notas aqui'}
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              {searchTerm
                ? 'Tente outros termos ou ajuste os filtros'
                : 'Crie sua primeira nota acima'}
            </p>
          </div>
        ) : (
          /* Um único Droppable cobre as duas seções: os índices dos Draggables
             precisam ser contíguos dentro do mesmo droppable. A lista é apenas
             origem do arraste — soltar aqui não move nada (ver onDragEnd). */
          <Droppable droppableId={DROPPABLE_LIST} type={DND_TYPE_ITEM} isDropDisabled>
            {(dropProvided) => (
              <div ref={dropProvided.innerRef} {...dropProvided.droppableProps}>
                {/* Pinned section */}
                {pinnedNotes.length > 0 && (
                  <div>
                    <p className="px-3 pt-3 pb-1 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                      Fixadas
                    </p>
                    <AnimatePresence initial={false}>
                      {pinnedNotes.map((note, index) => (
                        <DraggableNote
                          key={note.id}
                          note={note}
                          index={index}
                          isActive={note.id === activeNoteId}
                          onSelectNote={onSelectNote}
                          onDeleteNote={onDeleteNote}
                          onTogglePin={onTogglePin}
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                )}

                {/* Regular notes section */}
                {regularNotes.length > 0 && (
                  <div>
                    {pinnedNotes.length > 0 && (
                      <p className="px-3 pt-3 pb-1 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                        Notas
                      </p>
                    )}
                    <AnimatePresence initial={false}>
                      {regularNotes.map((note, index) => (
                        <DraggableNote
                          key={note.id}
                          note={note}
                          index={pinnedNotes.length + index}
                          isActive={note.id === activeNoteId}
                          onSelectNote={onSelectNote}
                          onDeleteNote={onDeleteNote}
                          onTogglePin={onTogglePin}
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                )}

                {dropProvided.placeholder}
              </div>
            )}
          </Droppable>
        )}
      </div>
    </div>
  );
}

/**
 * Envolve um NoteListItem num Draggable.
 *
 * O handle é uma alça própria, e não a linha inteira. `dragHandleProps` injeta
 * `role="button"` e `tabIndex=0`; no mesmo elemento que o card — que já é um
 * `role="button"` com seus próprios botões de fixar/excluir — isso produzia
 * controles aninhados, dois pontos de foco por item e anúncio duplicado em
 * leitor de tela (WCAG 2.1 AA é critério de HALT da governança de frontend).
 *
 * A alça fica sempre visível, e não só no hover: no toque não existe hover, e
 * arrastar é uma das interações principais da lista no mobile.
 *
 * @param {Object} props
 * @param {import('@/types/models').Note} props.note - Nota renderizada
 * @param {number} props.index - Índice dentro do droppable da lista
 * @param {boolean} props.isActive - Se é a nota aberta
 * @param {Function} props.onSelectNote - Callback de seleção
 * @param {Function} props.onDeleteNote - Callback de exclusão
 * @param {Function} props.onTogglePin - Callback de fixar/desafixar
 * @returns {JSX.Element}
 */
function DraggableNote({ note, index, isActive, onSelectNote, onDeleteNote, onTogglePin }) {
  return (
    <Draggable draggableId={note.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={cn(
            'flex items-stretch',
            snapshot.isDragging && 'opacity-90 rounded-lg shadow-lg'
          )}
        >
          <div
            {...provided.dragHandleProps}
            aria-label={`Mover nota: ${note.title || 'Sem título'}`}
            className="shrink-0 w-6 flex items-center justify-center cursor-grab active:cursor-grabbing text-slate-300 dark:text-slate-600 hover:text-slate-500 dark:hover:text-slate-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 dark:focus-visible:ring-fuchsia-400"
          >
            <GripVertical className="w-3.5 h-3.5" aria-hidden="true" />
          </div>
          <div className="flex-1 min-w-0">
            <NoteListItem
              note={note}
              isActive={isActive}
              onClick={() => onSelectNote(note)}
              onDelete={onDeleteNote}
              onTogglePin={onTogglePin}
            />
          </div>
        </div>
      )}
    </Draggable>
  );
}
