import { Droppable } from '@hello-pangea/dnd';
import {
  FolderClosed,
  FolderPlus,
  Layers,
  FileX,
  MoreVertical,
  Pencil,
  Trash2
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { DND_TYPE_ITEM, DROPPABLE_ROOT, folderDroppableId } from '@/lib/dnd';

/** Filtro "todas as credenciais". */
export const ALL = '__all__';
/** Filtro "credenciais sem pasta". */
export const NO_FOLDER = '__no_folder__';

/**
 * Lista de pastas do Cofre — usada pelo rail de desktop e pela gaveta mobile.
 *
 * As duas telas mostram exatamente a mesma coisa; o que muda é se as linhas são
 * alvo de soltura. Na gaveta elas não são, e não por economia: o registro de
 * droppables sobrescreve ids repetidos silenciosamente (quem monta por último
 * vence), e o rail continua montado mesmo quando o CSS o esconde. Dois donos do
 * mesmo `folder:<id>` seria um alvo morto em algum lugar. A gaveta não precisa
 * deles — não se arrasta com ela aberta.
 *
 * @param {Object} props
 * @param {Array<{id: string, name: string, level: number}>} props.folders - Pastas achatadas
 * @param {number} props.totalCount - Total de credenciais
 * @param {number} props.unfolderedCount - Credenciais sem pasta
 * @param {Map<string, number>} props.countsByFolder - Contagem por pasta
 * @param {string} props.activeFilter - Filtro atual (ALL, NO_FOLDER ou um folderId)
 * @param {(value: string) => void} props.onSelectFilter - Troca o filtro
 * @param {() => void} props.onCreateFolder - Abre o diálogo de nova pasta
 * @param {(folder: {id: string, name: string}) => void} props.onRenameFolder - Abre o diálogo de renomear
 * @param {(folder: {id: string, name: string}) => void} props.onDeleteFolder - Abre a confirmação de exclusão
 * @param {boolean} [props.withDropTargets=true] - Torna as linhas alvo de soltura
 * @param {boolean} [props.alwaysShowActions=false] - Menu de opções sempre visível (telas sem hover)
 * @param {string} [props.className] - Classes do container
 * @returns {JSX.Element}
 */
export default function VaultFolderList({
  folders = [],
  totalCount = 0,
  unfolderedCount = 0,
  countsByFolder,
  activeFilter,
  onSelectFilter,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  withDropTargets = true,
  alwaysShowActions = false,
  className
}) {
  return (
    <div className={cn('flex-1 overflow-y-auto p-3 space-y-1', className)}>
      <FolderRow
        icon={Layers}
        label="Todas"
        count={totalCount}
        active={activeFilter === ALL}
        onClick={() => onSelectFilter(ALL)}
      />
      <FolderRow
        icon={FileX}
        label="Sem Pasta"
        count={unfolderedCount}
        active={activeFilter === NO_FOLDER}
        onClick={() => onSelectFilter(NO_FOLDER)}
        droppableId={withDropTargets ? DROPPABLE_ROOT : undefined}
      />
      <div className="flex items-center justify-between pt-3 pb-1 px-2">
        <span className="text-xs font-medium text-slate-500 uppercase">Pastas</span>
        <button
          type="button"
          onClick={onCreateFolder}
          title="Nova pasta"
          aria-label="Nova pasta"
          className="text-slate-400 hover:text-emerald-600 transition-colors"
        >
          <FolderPlus className="w-4 h-4" />
        </button>
      </div>
      {folders.map((folder) => (
        <FolderRow
          key={folder.id}
          icon={FolderClosed}
          label={folder.name}
          count={countsByFolder?.get(folder.id) ?? 0}
          active={activeFilter === folder.id}
          onClick={() => onSelectFilter(folder.id)}
          onRename={() => onRenameFolder({ id: folder.id, name: folder.name })}
          onDelete={() => onDeleteFolder({ id: folder.id, name: folder.name })}
          style={{ paddingLeft: `${folder.level * 12 + 8}px` }}
          droppableId={withDropTargets ? folderDroppableId(folder.id) : undefined}
          alwaysShowActions={alwaysShowActions}
        />
      ))}
      {folders.length === 0 && (
        <p className="px-2 py-1 text-xs text-slate-400">Nenhuma pasta ainda.</p>
      )}
    </div>
  );
}

/**
 * Linha de pasta do Cofre. Quando `droppableId` é informado, a linha vira alvo
 * de soltura do drag & drop.
 * @param {Object} props
 * @returns {JSX.Element}
 */
function FolderRow({
  icon: Icon,
  label,
  count,
  active,
  onClick,
  onRename,
  onDelete,
  style,
  droppableId,
  alwaysShowActions = false
}) {
  const manageable = onRename || onDelete;

  const row = (dropProvided, dropSnapshot) => (
    <div
      ref={dropProvided?.innerRef}
      {...(dropProvided?.droppableProps || {})}
      style={style}
      className={cn(
        'group w-full flex items-center gap-2 pr-1 rounded-lg text-sm transition-colors',
        active
          ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/45 dark:text-emerald-100'
          : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800/80',
        dropSnapshot?.isDraggingOver && 'ring-2 ring-emerald-500 dark:ring-emerald-400'
      )}
    >
      {dropProvided && <span className="hidden">{dropProvided.placeholder}</span>}
      <button
        type="button"
        onClick={onClick}
        className="flex-1 flex items-center gap-2 px-2 py-1.5 min-w-0 text-left"
      >
        <Icon className="w-4 h-4 shrink-0" />
        <span className="flex-1 truncate">{label}</span>
        {count > 0 && <span className="text-xs text-slate-400 dark:text-slate-500">{count}</span>}
      </button>
      {manageable && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              onClick={(e) => e.stopPropagation()}
              className={cn(
                'shrink-0 p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-opacity',
                // Sem hover no toque: na gaveta o menu precisa estar visível,
                // senão criar/renomear/excluir ficam inalcançáveis no celular.
                alwaysShowActions
                  ? 'opacity-100'
                  : 'opacity-0 group-hover:opacity-100 focus:opacity-100'
              )}
              aria-label={`Opções da pasta ${label}`}
            >
              <MoreVertical className="w-4 h-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {onRename && (
              <DropdownMenuItem onClick={onRename}>
                <Pencil className="w-4 h-4 mr-2" /> Renomear
              </DropdownMenuItem>
            )}
            {onDelete && (
              <DropdownMenuItem onClick={onDelete} className="text-rose-600 focus:text-rose-600">
                <Trash2 className="w-4 h-4 mr-2" /> Excluir
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );

  if (!droppableId) {
    return row(null, null);
  }

  return (
    <Droppable droppableId={droppableId} type={DND_TYPE_ITEM}>
      {(dropProvided, dropSnapshot) => row(dropProvided, dropSnapshot)}
    </Droppable>
  );
}
