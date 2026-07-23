import React, { memo } from 'react';
import { Button } from '@/components/ui/button';
import { Pin, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useMemo } from 'react';
import { getChecklistProgress } from '@/lib/markdownUtils';
import { useDeleteNote, useUpdateNote } from '@/api/useNotes';

/** @typedef {import('@/types/models').Note} Note */

/**
 * Type color dots — minimal visual indicator replacing full Badge
 */
const typeColorClasses = {
  text: 'bg-slate-400',
  url: 'bg-blue-500',
  image: 'bg-purple-500',
  word: 'bg-amber-500',
};


/**
 * NoteListItem — compact list row for the V2 two-panel layout.
 *
 * Replaces NoteCard in list view context. Designed for minimum 72px
 * fixed-height rows with scannable metadata, hover-revealed actions,
 * and theme-consistent active/hover states.
 *
 * @param {Object} props
 * @param {Note} props.note - The note to display
 * @param {boolean} props.isActive - Whether this note is currently selected in the panel
 * @param {Function} props.onClick - Called when the user selects this note
 * @param {Function} props.onDelete - Called after the note is deleted; receives note id
 * @param {Function} props.onTogglePin - Called after pin toggled; receives updated note
 * @returns {JSX.Element}
 */
const NoteListItem = memo(function NoteListItem({ note, isActive, onClick, onDelete, onTogglePin }) {
  const deleteNoteMutation = useDeleteNote();
  const updateNoteMutation = useUpdateNote();

  /** Checklist progress (computed only when content changes) */
  const checklistProgress = useMemo(
    () => getChecklistProgress(note.content),
    [note.content]
  );

  /** Relative date string (e.g. "há 3 dias") */
  const relativeDate = useMemo(() => {
    try {
      return formatDistanceToNow(new Date(note.createdAt), { addSuffix: true, locale: ptBR });
    } catch {
      return '';
    }
  }, [note.createdAt]);

  /** Plain-text preview — strip markdown syntax for readability */
  const contentPreview = useMemo(() => {
    if (!note.content) return '';
    return note.content
      .replace(/^#{1,6}\s+/gm, '')        // headings
      .replace(/\*\*(.+?)\*\*/g, '$1')    // bold
      .replace(/\*(.+?)\*/g, '$1')        // italic
      .replace(/`(.+?)`/g, '$1')          // inline code
      .replace(/- \[(x| )\] /gi, '')      // checkboxes
      .replace(/^[-*+]\s/gm, '')          // bullet points
      .replace(/\n+/g, ' ')              // collapse newlines
      .trim();
  }, [note.content]);

  /** Tags: show max 2, with "+N" overflow indicator */
  const visibleTags = useMemo(() => {
    const tags = note.tags || [];
    if (tags.length <= 2) return { shown: tags, overflow: 0 };
    return { shown: tags.slice(0, 2), overflow: tags.length - 2 };
  }, [note.tags]);

  const handleDelete = async (e) => {
    e.stopPropagation();
    try {
      await deleteNoteMutation.mutateAsync(note.id);
      if (onDelete) onDelete(note.id);
    } catch {
      // Error handled by React Query mutation state
    }
  };

  const handleTogglePin = async (e) => {
    e.stopPropagation();
    try {
      await updateNoteMutation.mutateAsync({
        id: note.id,
        data: { pinned: !note.pinned }
      });
      if (onTogglePin) onTogglePin({ ...note, pinned: !note.pinned });
    } catch {
      // Error handled by React Query mutation state
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -8 }}
      transition={{ duration: 0.15 }}
    >
      <div
        role="button"
        tabIndex={0}
        aria-label={`Nota: ${note.title || 'Sem título'}`}
        aria-selected={isActive}
        onClick={onClick}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); }}
        className={[
          'group relative flex items-start gap-3 px-3 py-3 cursor-pointer select-none',
          'border-l-2 transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 dark:focus-visible:ring-fuchsia-400',
          isActive
            ? 'border-l-indigo-500 bg-indigo-50 dark:border-l-fuchsia-400 dark:bg-fuchsia-950/30'
            : 'border-l-transparent hover:bg-slate-50 dark:hover:bg-slate-800/70',
        ].join(' ')}
      >
        {/* Type color dot */}
        <div className="mt-1 shrink-0">
          <div
            className={`w-2 h-2 rounded-full ${typeColorClasses[note.type] || 'bg-slate-400'}`}
            aria-hidden="true"
          />
        </div>

        {/* Main content column */}
        <div className="flex-1 min-w-0 pr-8">
          {/* Title */}
          <p className={[
            'text-sm font-medium leading-snug truncate',
            isActive ? 'text-indigo-900 dark:text-fuchsia-100' : 'text-slate-800 dark:text-slate-100',
          ].join(' ')}>
            {note.title || 'Sem título'}
          </p>

          {/* Content preview */}
          {contentPreview && (
            <p className="text-xs text-slate-400 dark:text-slate-500 leading-snug mt-0.5 line-clamp-2">
              {contentPreview}
            </p>
          )}

          {/* Metadata row */}
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {/* Pin indicator */}
            {note.pinned && (
              <Pin className="w-3 h-3 text-amber-500 fill-amber-500 shrink-0" aria-label="Fixada" />
            )}

            {/* Checklist progress */}
            {checklistProgress.total > 0 && (
              <span className="text-xs text-indigo-500 dark:text-fuchsia-300 font-medium shrink-0">
                ✓ {checklistProgress.completed}/{checklistProgress.total}
              </span>
            )}

            {/* Tags */}
            {visibleTags.shown.map((tag, idx) => (
              <span
                key={idx}
                className="inline-flex items-center px-1.5 py-0 text-xs bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300 rounded"
              >
                {tag}
              </span>
            ))}
            {visibleTags.overflow > 0 && (
              <span className="text-xs text-slate-400 dark:text-slate-500">+{visibleTags.overflow}</span>
            )}

            {/* Relative date (pushed to right) */}
            <span className="text-xs text-slate-400 dark:text-slate-500 ml-auto shrink-0">{relativeDate}</span>
          </div>
        </div>

        {/* Hover-reveal actions */}
        <div className="absolute right-2 top-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
          <Button
            variant="ghost"
            size="icon"
            className={`h-6 w-6 ${note.pinned ? 'text-amber-500' : 'text-slate-400 dark:text-slate-500'} hover:text-slate-700 dark:hover:text-slate-100`}
            onClick={handleTogglePin}
            title={note.pinned ? 'Desafixar' : 'Fixar'}
            aria-label={note.pinned ? 'Desafixar nota' : 'Fixar nota'}
            disabled={updateNoteMutation.isPending}
          >
            <Pin className={`w-3 h-3 ${note.pinned ? 'fill-amber-500' : ''}`} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-rose-300"
            onClick={handleDelete}
            title="Deletar nota"
            aria-label="Deletar nota"
            disabled={deleteNoteMutation.isPending}
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
});

export default NoteListItem;
