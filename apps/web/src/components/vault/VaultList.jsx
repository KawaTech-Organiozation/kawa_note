import { Draggable, Droppable } from '@hello-pangea/dnd';
import { KeyRound, ChevronRight, AlertTriangle, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { avatarColorClass, hasHealthIssue } from '@/lib/vaultUi';
import { DND_TYPE_ITEM, DROPPABLE_LIST } from '@/lib/dnd';

/**
 * Credential list panel.
 * @param {Object} props
 * @param {Array} props.entries - credential view-models (already filtered)
 * @param {string|null} props.activeId
 * @param {(entry: Object) => void} props.onSelect
 * @param {Map<string, Object>} [props.health] - per-entry password-health flags
 * @returns {JSX.Element}
 */
export default function VaultList({ entries = [], activeId = null, onSelect, health }) {
  if (entries.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400 dark:text-slate-500">
        <KeyRound className="w-10 h-10 mb-3 opacity-50" />
        <p className="text-sm">Nenhuma credencial aqui ainda.</p>
      </div>
    );
  }

  return (
    /* Lista é só origem do arraste; o destino são as pastas do Cofre. */
    <Droppable droppableId={DROPPABLE_LIST} type={DND_TYPE_ITEM} isDropDisabled>
      {(dropProvided) => (
    <ul
      ref={dropProvided.innerRef}
      {...dropProvided.droppableProps}
      className="divide-y divide-slate-100 dark:divide-slate-800"
    >
      {entries.map((entry, index) => {
        const h = health?.get(entry.id);
        const issue = hasHealthIssue(h);
        return (
          <Draggable key={entry.id} draggableId={entry.id} index={index}>
            {(provided, snapshot) => (
          <li
            ref={provided.innerRef}
            {...provided.draggableProps}
            className={cn(
              'flex items-stretch',
              snapshot.isDragging && 'opacity-90 shadow-lg rounded-lg bg-white dark:bg-slate-900'
            )}
          >
            {/* Alça dedicada: `dragHandleProps` no mesmo elemento que o
                `<button>` de seleção criava botão dentro de botão e dois
                pontos de foco por item (WCAG 2.1 AA — critério de HALT). */}
            <div
              {...provided.dragHandleProps}
              aria-label={`Mover credencial: ${entry.title || 'Sem título'}`}
              className="shrink-0 w-6 flex items-center justify-center cursor-grab active:cursor-grabbing text-slate-300 dark:text-slate-600 hover:text-slate-500 dark:hover:text-slate-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:focus-visible:ring-emerald-400"
            >
              <GripVertical className="w-3.5 h-3.5" aria-hidden="true" />
            </div>
            <button
              type="button"
              onClick={() => onSelect(entry)}
              className={cn(
                'flex-1 min-w-0 flex items-center gap-3 pl-1 pr-4 py-3 text-left transition-colors',
                activeId === entry.id
                  ? 'bg-emerald-50 dark:bg-emerald-950/30'
                  : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
              )}
            >
              <div className={cn('h-9 w-9 rounded-lg flex items-center justify-center text-sm font-semibold shrink-0', avatarColorClass(entry.title || entry.url))}>
                {(entry.title || '?').charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{entry.title || 'Sem título'}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {entry.username || '—'}
                </p>
              </div>
              {issue && (
                <AlertTriangle
                  className="w-4 h-4 text-amber-500 shrink-0"
                  aria-label={[h?.weak && 'senha fraca', h?.reused && 'reutilizada', h?.short && 'curta'].filter(Boolean).join(', ')}
                />
              )}
              <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 shrink-0" />
            </button>
          </li>
            )}
          </Draggable>
        );
      })}
      {dropProvided.placeholder}
    </ul>
      )}
    </Droppable>
  );
}
