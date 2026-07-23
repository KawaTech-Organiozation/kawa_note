import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  KeyRound,
  Plus,
  Upload,
  Search,
  ChevronLeft,
  FolderClosed,
  FolderPlus,
  Layers,
  FileX,
  Wand2,
  MoreVertical,
  Pencil,
  Trash2
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { DragDropContext, Droppable } from '@hello-pangea/dnd';
import BottomNav from '@/components/layout/BottomNav';
import MobileFolderDropBar from '@/components/layout/MobileFolderDropBar';
import ModeSwitch from '@/components/layout/ModeSwitch';
import { useIsMobile } from '@/hooks/useMobile';
import { useMoveToFolder } from '@/api/useMoveToFolder';
import {
  DND_TYPE_ITEM,
  DROPPABLE_ROOT,
  folderDroppableId,
  parseFolderDroppableId
} from '@/lib/dnd';
import { useVaultEntries } from '@/api/useVault';
import { useFolderHierarchy, useCreateFolder, useUpdateFolder, useDeleteFolder } from '@/api/useFolders';
import { computeVaultHealth } from '@/lib/vaultUi';
import VaultList from '@/components/vault/VaultList';
import VaultDetailPanel from '@/components/vault/VaultDetailPanel';
import VaultEntryDialog from '@/components/vault/VaultEntryDialog';
import PasswordGenerator from '@/components/vault/PasswordGenerator';
import ImportWizardDialog from '@/components/import/ImportWizardDialog';

const ALL = '__all__';
const NO_FOLDER = '__no_folder__';

function flattenFolders(items, level = 0, result = []) {
  for (const item of items) {
    result.push({ id: item.id, name: item.name, level });
    if (item.children?.length) flattenFolders(item.children, level + 1, result);
  }
  return result;
}

/**
 * Cofre de Senha (Password Vault) page.
 * Credentials are stored as end-to-end encrypted notes (type='password').
 * @returns {JSX.Element}
 */
export default function Vault() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [search, setSearch] = useState('');
  const [folderFilter, setFolderFilter] = useState(ALL);
  const [activeId, setActiveId] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [importOpen, setImportOpen] = useState(false);
  // Folder management: draft = { id: string|null, name } (id null → create).
  const [folderDraft, setFolderDraft] = useState(null);
  const [deletingFolder, setDeletingFolder] = useState(null);
  // Só true durante um arraste: controla a barra de destinos do mobile.
  const [isDraggingItem, setIsDraggingItem] = useState(false);

  const { data: vaultData = { data: [] }, isLoading, refetch } = useVaultEntries();
  const { data: foldersResponse = { data: [] } } = useFolderHierarchy('vault');
  const createFolder = useCreateFolder();
  const updateFolder = useUpdateFolder();
  const deleteFolder = useDeleteFolder();

  const { moveToFolder } = useMoveToFolder({ scope: 'vault' });

  const entries = vaultData.data || [];
  const health = useMemo(() => computeVaultHealth(entries), [entries]);

  /**
   * Conclui um arraste no Cofre: move a credencial para a pasta destino.
   * @param {import('@hello-pangea/dnd').DropResult} result
   */
  const handleDragEnd = useCallback(async (result) => {
    setIsDraggingItem(false);

    const { draggableId, destination } = result;
    if (!destination) return;

    const { isFolder, folderId } = parseFolderDroppableId(destination.droppableId);
    if (!isFolder) return;

    const dragged = entries.find((entry) => entry.id === draggableId);
    if (!dragged || (dragged.folderId ?? null) === folderId) return;

    const moved = await moveToFolder(draggableId, folderId);
    if (moved) toast.success('Credencial movida');
  }, [entries, moveToFolder]);
  const folderOptions = useMemo(
    () => flattenFolders(foldersResponse?.data || []),
    [foldersResponse?.data]
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return entries.filter((entry) => {
      if (folderFilter === NO_FOLDER && entry.folderId) return false;
      if (folderFilter !== ALL && folderFilter !== NO_FOLDER && entry.folderId !== folderFilter) return false;
      if (!term) return true;
      return (
        entry.title?.toLowerCase().includes(term) ||
        entry.username?.toLowerCase().includes(term) ||
        entry.url?.toLowerCase().includes(term) ||
        entry.notes?.toLowerCase().includes(term) ||
        entry.tags?.some((tag) => tag.toLowerCase().includes(term))
      );
    });
  }, [entries, search, folderFilter]);

  const activeEntry = useMemo(
    () => filtered.find((entry) => entry.id === activeId) || entries.find((entry) => entry.id === activeId) || null,
    [filtered, entries, activeId]
  );

  const openCreate = () => {
    setEditingEntry(null);
    setDialogOpen(true);
  };

  const openEdit = () => {
    if (activeEntry) {
      setEditingEntry(activeEntry);
      setDialogOpen(true);
    }
  };

  const handleDeleted = () => {
    setActiveId(null);
    refetch();
  };

  const folderCount = (folderId) => entries.filter((e) => e.folderId === folderId).length;

  const saveFolder = async () => {
    const name = folderDraft?.name?.trim();
    if (!name) {
      toast.error('Nome da pasta não pode estar vazio');
      return;
    }
    try {
      if (folderDraft.id) {
        await updateFolder.mutateAsync({ id: folderDraft.id, data: { name } });
        toast.success('Pasta renomeada');
      } else {
        // scope 'vault' keeps it out of the Notes folder tree.
        await createFolder.mutateAsync({ name, color: 'slate', scope: 'vault' });
        toast.success('Pasta criada');
      }
      setFolderDraft(null);
    } catch (err) {
      toast.error(err?.data?.error?.message || err?.message || 'Erro ao salvar pasta');
    }
  };

  const confirmDeleteFolder = async () => {
    if (!deletingFolder) return;
    try {
      await deleteFolder.mutateAsync(deletingFolder.id);
      toast.success('Pasta excluída');
      if (folderFilter === deletingFolder.id) setFolderFilter(ALL);
      refetch();
    } catch (err) {
      toast.error(err?.data?.error?.message || err?.message || 'Erro ao excluir pasta');
    } finally {
      setDeletingFolder(null);
    }
  };

  return (
    <DragDropContext
      /* Monta a barra de destinos ANTES da captura de dimensões. */
      onBeforeCapture={() => setIsDraggingItem(true)}
      onDragEnd={handleDragEnd}
    >
    <div className="flex h-screen bg-white dark:bg-[#232733] overflow-hidden text-slate-900 dark:text-slate-100">
      {/* Folder rail (desktop) */}
      <aside className="hidden lg:flex flex-col w-56 shrink-0 border-r border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#202433]">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800">
          {/* Mesmo switch da Sidebar de Notas — a troca de modo é bidirecional
              e simétrica (PLAN-20260723-001, decisão D4). */}
          <ModeSwitch
            mode="vault"
            onModeChange={(next) => { if (next === 'notes') navigate('/'); }}
          />
          <div className="flex items-center gap-2 mt-4">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-600 to-teal-600 flex items-center justify-center">
              <KeyRound className="w-5 h-5 text-white" />
            </div>
            <h1 className="font-bold text-foreground">Cofre</h1>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          <FolderRow
            icon={Layers}
            label="Todas"
            count={entries.length}
            active={folderFilter === ALL}
            onClick={() => setFolderFilter(ALL)}
          />
          <FolderRow
            icon={FileX}
            label="Sem Pasta"
            count={entries.filter((e) => !e.folderId).length}
            active={folderFilter === NO_FOLDER}
            onClick={() => setFolderFilter(NO_FOLDER)}
            droppableId={DROPPABLE_ROOT}
          />
          <div className="flex items-center justify-between pt-3 pb-1 px-2">
            <span className="text-xs font-medium text-slate-500 uppercase">Pastas</span>
            <button
              type="button"
              onClick={() => setFolderDraft({ id: null, name: '' })}
              title="Nova pasta"
              aria-label="Nova pasta"
              className="text-slate-400 hover:text-emerald-600 transition-colors"
            >
              <FolderPlus className="w-4 h-4" />
            </button>
          </div>
          {folderOptions.map((folder) => (
            <FolderRow
              key={folder.id}
              icon={FolderClosed}
              label={folder.name}
              count={folderCount(folder.id)}
              active={folderFilter === folder.id}
              onClick={() => setFolderFilter(folder.id)}
              onRename={() => setFolderDraft({ id: folder.id, name: folder.name })}
              onDelete={() => setDeletingFolder({ id: folder.id, name: folder.name })}
              style={{ paddingLeft: `${folder.level * 12 + 8}px` }}
              droppableId={folderDroppableId(folder.id)}
            />
          ))}
          {folderOptions.length === 0 && (
            <p className="px-2 py-1 text-xs text-slate-400">Nenhuma pasta ainda.</p>
          )}
        </div>
      </aside>

      {/* Main — pb-16 no mobile reserva a altura da BottomNav fixa (h-16) */}
      <div className={cn('flex-1 flex flex-col overflow-hidden', isMobile && 'pb-16')}>
        {/* Header */}
        <div className="border-b border-slate-200 dark:border-slate-700 shrink-0">
          <div className="flex items-center gap-2 px-3 md:px-6 py-3">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0 lg:hidden"
              onClick={() => navigate('/')}
              aria-label="Voltar para Notas"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div className="shrink-0">
              <h1 className="text-xl font-bold text-foreground leading-tight flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-emerald-600 lg:hidden" />
                Cofre de Senha
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {filtered.length} {filtered.length === 1 ? 'credencial' : 'credenciais'}
              </p>
            </div>

            <div className="flex-1" />

            <div className="relative hidden sm:block w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar..."
                className="pl-9"
              />
            </div>

            <PasswordGenerator
              trigger={
                <Button variant="outline" className="shrink-0" title="Gerar senha">
                  <Wand2 className="w-4 h-4 md:mr-2" />
                  <span className="hidden md:inline">Gerar senha</span>
                </Button>
              }
            />
            <Button variant="outline" onClick={() => setImportOpen(true)} className="shrink-0">
              <Upload className="w-4 h-4 md:mr-2" />
              <span className="hidden md:inline">Importar</span>
            </Button>
            <Button onClick={openCreate} className="shrink-0 bg-emerald-600 hover:bg-emerald-700">
              <Plus className="w-4 h-4 md:mr-2" />
              <span className="hidden md:inline">Nova credencial</span>
            </Button>
          </div>

          {/* Mobile filters */}
          <div className="flex items-center gap-2 px-3 pb-3 sm:hidden">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar..."
                className="pl-9"
              />
            </div>
            <Select value={folderFilter} onValueChange={setFolderFilter}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todas</SelectItem>
                <SelectItem value={NO_FOLDER}>Sem Pasta</SelectItem>
                {folderOptions.map((folder) => (
                  <SelectItem key={folder.id} value={folder.id}>
                    {folder.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex-1 p-6 space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-14 rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="flex-1 flex overflow-hidden">
            {/* List */}
            <div
              className={cn(
                'w-full lg:w-[340px] shrink-0 overflow-y-auto border-r border-slate-200 dark:border-slate-700',
                activeEntry ? 'hidden lg:block' : 'block'
              )}
            >
              <VaultList entries={filtered} activeId={activeId} onSelect={(entry) => setActiveId(entry.id)} health={health} />
            </div>

            {/* Detail */}
            <div className={cn('flex-1 overflow-hidden', activeEntry ? 'block' : 'hidden lg:block')}>
              {activeEntry ? (
                <div className="h-full flex flex-col">
                  <button
                    onClick={() => setActiveId(null)}
                    className="lg:hidden flex items-center gap-2 px-4 py-2 text-sm text-slate-500 border-b border-slate-200 dark:border-slate-700"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Voltar
                  </button>
                  <div className="flex-1 overflow-hidden">
                    <VaultDetailPanel entry={activeEntry} health={health.get(activeEntry.id)} onEdit={openEdit} onDeleted={handleDeleted} />
                  </div>
                </div>
              ) : (
                <div className="h-full hidden lg:flex flex-col items-center justify-center text-center p-8 text-slate-400 dark:text-slate-500">
                  <KeyRound className="w-12 h-12 mb-4 opacity-40" />
                  <p className="text-sm max-w-xs">
                    Selecione uma credencial para ver os detalhes, ou crie uma nova.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <VaultEntryDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        entry={editingEntry}
        defaultFolderId={folderFilter !== ALL && folderFilter !== NO_FOLDER ? folderFilter : null}
      />

      <ImportWizardDialog open={importOpen} onOpenChange={setImportOpen} onImported={refetch} />

      {/* Create / rename vault folder */}
      <Dialog open={!!folderDraft} onOpenChange={(open) => !open && setFolderDraft(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{folderDraft?.id ? 'Renomear pasta' : 'Nova pasta'}</DialogTitle>
          </DialogHeader>
          <Input
            autoFocus
            value={folderDraft?.name ?? ''}
            onChange={(e) => setFolderDraft((prev) => ({ ...prev, name: e.target.value }))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveFolder();
              if (e.key === 'Escape') setFolderDraft(null);
            }}
            placeholder="Nome da pasta"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setFolderDraft(null)}>Cancelar</Button>
            <Button
              onClick={saveFolder}
              disabled={createFolder.isPending || updateFolder.isPending}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {folderDraft?.id ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete vault folder */}
      <AlertDialog open={!!deletingFolder} onOpenChange={(open) => !open && setDeletingFolder(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir pasta "{deletingFolder?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              As credenciais dentro dela também serão movidas para a lixeira. Esta ação pode ser desfeita na lixeira.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteFolder} className="bg-rose-600 hover:bg-rose-700">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {isMobile && isDraggingItem && (
        <MobileFolderDropBar folders={folderOptions} accent="vault" />
      )}

      {isMobile && (
        <BottomNav
          activeTab="vault"
          onTabChange={(tab) => {
            // O Cofre não tem drawer de pastas nem modal de busca próprios: o
            // filtro de pasta e a busca já vivem no cabeçalho mobile desta tela.
            // As demais abas devolvem o usuário ao Home, que é quem as trata.
            if (tab === 'notes' || tab === 'folders' || tab === 'search' || tab === 'profile') {
              navigate('/');
            }
          }}
        />
      )}
    </div>
    </DragDropContext>
  );
}

/**
 * Linha de pasta do Cofre. Quando `droppableId` é informado, a linha vira alvo
 * de soltura do drag & drop.
 * @param {Object} props
 * @returns {JSX.Element}
 */
function FolderRow({ icon: Icon, label, count, active, onClick, onRename, onDelete, style, droppableId }) {
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
              className="shrink-0 p-1 rounded text-slate-400 opacity-0 group-hover:opacity-100 focus:opacity-100 hover:text-slate-700 dark:hover:text-slate-200 transition-opacity"
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
