import { Droppable } from '@hello-pangea/dnd';
import { FileX, FolderClosed } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DND_TYPE_ITEM, DROPPABLE_ROOT, folderDroppableId } from '@/lib/dnd';

/**
 * MobileFolderDropBar — faixa de pastas-destino exibida durante um arraste no mobile.
 *
 * Por que existe: no mobile os alvos de soltura normais não estão na tela — a
 * Sidebar de Notas fica atrás de um drawer e o painel de pastas do Cofre é
 * `hidden lg:flex`. Sem esta barra, o arraste por toque inicia mas não tem onde
 * terminar.
 *
 * Montagem: precisa estar no DOM **antes** de a biblioteca medir os droppables.
 * Quem controla isso é o `onBeforeCapture` do DragDropContext na página, que é
 * disparado justamente antes da captura de dimensões. Montar em `onDragStart`
 * seria tarde demais e a barra não receberia soltura.
 *
 * @param {Object} props
 * @param {Array<{id: string, name: string}>} props.folders - Pastas do escopo atual
 * @param {boolean} [props.showRoot=true] - Exibe o destino "Sem Pasta" (raiz)
 * @param {'notes'|'vault'} [props.accent='notes'] - Cor de destaque do alvo ativo
 * @returns {JSX.Element}
 */
export default function MobileFolderDropBar({ folders = [], showRoot = true, accent = 'notes' }) {
  const activeRing =
    accent === 'vault'
      ? 'ring-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 dark:ring-emerald-400'
      : 'ring-indigo-500 bg-indigo-50 dark:bg-fuchsia-950/40 dark:ring-fuchsia-400';

  return (
    <div
      className="fixed bottom-16 left-0 right-0 z-40 md:hidden border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur px-2 py-2"
      role="region"
      aria-label="Solte em uma pasta"
    >
      <p className="px-1 pb-1.5 text-[11px] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
        Solte em uma pasta
      </p>

      {/* Rolagem horizontal: a biblioteca faz auto-scroll deste container
          enquanto o item é arrastado até a borda. */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {showRoot && (
          <DropChip
            droppableId={DROPPABLE_ROOT}
            icon={FileX}
            label="Sem Pasta"
            activeRing={activeRing}
          />
        )}

        {folders.map((folder) => (
          <DropChip
            key={folder.id}
            droppableId={folderDroppableId(folder.id)}
            icon={FolderClosed}
            label={folder.name}
            activeRing={activeRing}
          />
        ))}

        {folders.length === 0 && !showRoot && (
          <span className="px-2 py-2 text-xs text-slate-400">Nenhuma pasta ainda.</span>
        )}
      </div>
    </div>
  );
}

/**
 * Um alvo de soltura da barra.
 * @param {Object} props
 * @param {string} props.droppableId - Id do droppable
 * @param {React.ElementType} props.icon - Ícone do chip
 * @param {string} props.label - Nome exibido
 * @param {string} props.activeRing - Classes aplicadas quando o item paira sobre o alvo
 * @returns {JSX.Element}
 */
function DropChip({ droppableId, icon: Icon, label, activeRing }) {
  return (
    <Droppable droppableId={droppableId} type={DND_TYPE_ITEM}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.droppableProps}
          className={cn(
            'shrink-0 flex items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-medium transition-colors',
            'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300',
            // Alvo grande o suficiente para o dedo (min 44px de altura útil).
            'min-h-[40px] max-w-[160px]',
            snapshot.isDraggingOver && cn('ring-2', activeRing)
          )}
        >
          <span className="hidden">{provided.placeholder}</span>
          <Icon className="w-4 h-4 shrink-0" />
          <span className="truncate">{label}</span>
        </div>
      )}
    </Droppable>
  );
}
