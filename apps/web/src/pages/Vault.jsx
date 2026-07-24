import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  KeyRound,
  Plus,
  Upload,
  Search,
  ChevronLeft,
  Wand2
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
import { DragDropContext } from '@hello-pangea/dnd';
import BottomNav from '@/components/layout/BottomNav';
import BrandHeader from '@/components/layout/BrandHeader';
import MobileFolderDropBar from '@/components/layout/MobileFolderDropBar';
import ModeSwitch from '@/components/layout/ModeSwitch';
import { useIsMobile, useIsBelowDesktop } from '@/hooks/useMobile';
import { useMoveToFolder } from '@/api/useMoveToFolder';
import { parseFolderDroppableId } from '@/lib/dnd';
import { useVaultEntries } from '@/api/useVault';
import { useFolderHierarchy, useCreateFolder, useUpdateFolder, useDeleteFolder } from '@/api/useFolders';
import { computeVaultHealth } from '@/lib/vaultUi';
import VaultList from '@/components/vault/VaultList';
import VaultFolderList, { ALL, NO_FOLDER } from '@/components/vault/VaultFolderList';
import VaultDetailPanel from '@/components/vault/VaultDetailPanel';
import VaultEntryDialog from '@/components/vault/VaultEntryDialog';
import PasswordGenerator from '@/components/vault/PasswordGenerator';
import ImportWizardDialog from '@/components/import/ImportWizardDialog';

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
  // O rail de pastas é `hidden lg:flex`: abaixo de 1024px ele não existe e a
  // barra de destinos passa a ser o único alvo de soltura da tela.
  const isBelowDesktop = useIsBelowDesktop();
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
  // Gaveta de pastas do mobile — é o que a aba "Pastas" da BottomNav abre
  // quando o usuário está no Cofre. O rail equivalente é `hidden lg:flex`.
  const [isFolderSheetOpen, setIsFolderSheetOpen] = useState(false);

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
    const previousFolderId = dragged?.folderId ?? null;
    if (!dragged || previousFolderId === folderId) return;

    const moved = await moveToFolder(draggableId, folderId);
    // Ver Home.jsx: o destino some da tela junto com o item, então o desfazer
    // precisa estar no próprio aviso de sucesso.
    if (moved) {
      toast.success('Credencial movida', {
        action: {
          label: 'Desfazer',
          onClick: () => moveToFolder(draggableId, previousFolderId)
        }
      });
    }
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

  // Uma varredura para todas as pastas, em vez de um `filter` por pasta a cada
  // render — o render dispara a cada tecla digitada na busca, e o cofre tem
  // centenas de credenciais.
  const { countsByFolder, unfolderedCount } = useMemo(() => {
    const counts = new Map();
    let unfoldered = 0;
    for (const entry of entries) {
      if (!entry.folderId) {
        unfoldered += 1;
        continue;
      }
      counts.set(entry.folderId, (counts.get(entry.folderId) ?? 0) + 1);
    }
    return { countsByFolder: counts, unfolderedCount: unfoldered };
  }, [entries]);

  /**
   * Abre um diálogo de gerenciamento fechando a gaveta antes.
   * Dialog do Radix sobre Sheet do Radix disputa o trap de foco.
   * @param {() => void} open
   */
  const openFolderDialog = useCallback((open) => {
    setIsFolderSheetOpen(false);
    open();
  }, []);

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
          {/* Marca antes do switch, na mesma ordem da Sidebar de Notas. O
              quadrado esmeralda/teal que vivia aqui usava a paleta aposentada
              pela decisão de identidade registrada em `lib/brand.js`. */}
          <BrandHeader section="Cofre" className="mb-4" />
          {/* Mesmo switch da Sidebar de Notas — a troca de modo é bidirecional
              e simétrica (PLAN-20260723-001, decisão D4). */}
          <ModeSwitch
            mode="vault"
            onModeChange={(next) => { if (next === 'notes') navigate('/'); }}
          />
        </div>

        <VaultFolderList
          folders={folderOptions}
          totalCount={entries.length}
          unfolderedCount={unfolderedCount}
          countsByFolder={countsByFolder}
          activeFilter={folderFilter}
          onSelectFilter={setFolderFilter}
          onCreateFolder={() => setFolderDraft({ id: null, name: '' })}
          onRenameFolder={(folder) => setFolderDraft(folder)}
          onDeleteFolder={(folder) => setDeletingFolder(folder)}
        />
      </aside>

      {/* Gaveta de pastas (mobile) — destino da aba "Pastas" da BottomNav. */}
      <Sheet open={isFolderSheetOpen} onOpenChange={setIsFolderSheetOpen}>
        <SheetContent side="left" className="w-3/4 max-w-[280px] p-0 flex flex-col">
          <SheetHeader className="p-4 border-b border-slate-200 dark:border-slate-800 text-left space-y-0">
            {/* O nome acessível da gaveta é o título; a marca é decoração e não
                repassa o `id` que o Radix injeta, então os dois são separados. */}
            <SheetTitle className="sr-only">Pastas do Cofre</SheetTitle>
            <BrandHeader section="Cofre" />
          </SheetHeader>
          <VaultFolderList
            folders={folderOptions}
            totalCount={entries.length}
            unfolderedCount={unfolderedCount}
            countsByFolder={countsByFolder}
            activeFilter={folderFilter}
            onSelectFilter={(value) => {
              setFolderFilter(value);
              setIsFolderSheetOpen(false);
            }}
            onCreateFolder={() => openFolderDialog(() => setFolderDraft({ id: null, name: '' }))}
            onRenameFolder={(folder) => openFolderDialog(() => setFolderDraft(folder))}
            onDeleteFolder={(folder) => openFolderDialog(() => setDeletingFolder(folder))}
            withDropTargets={false}
            alwaysShowActions
          />
        </SheetContent>
      </Sheet>

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
            {/* Abaixo de `lg` o rail não existe: sem esta marca o Cofre ficaria
                sem identidade em tablet e mobile. O nome do app já aparece
                dentro dela, então o h1 segue sendo só o rótulo da área. */}
            <BrandHeader isCollapsed className="lg:hidden shrink-0" />
            <div className="shrink-0">
              <h1 className="text-xl font-bold text-foreground leading-tight">
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

          {/* Busca do mobile. O filtro de pasta mora na gaveta da aba "Pastas",
              como nas Notas — dois controles para a mesma coisa na mesma tela
              era ruído. */}
          <div className="px-3 pb-3 sm:hidden">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar..."
                className="pl-9"
              />
            </div>
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

      {isBelowDesktop && isDraggingItem && (
        <MobileFolderDropBar folders={folderOptions} accent="vault" />
      )}

      {isMobile && (
        <BottomNav
          activeTab="vault"
          onTabChange={(tab) => {
            // "Pastas" é contextual: aqui abre as pastas do Cofre, e não as de
            // Notas. A gaveta é transitória, então a aba ativa segue "vault".
            // A busca vive no cabeçalho desta tela; as demais abas devolvem o
            // usuário ao Home, que é quem as trata.
            if (tab === 'folders') {
              setIsFolderSheetOpen(true);
            } else if (tab === 'notes' || tab === 'search' || tab === 'profile') {
              navigate('/');
            }
          }}
        />
      )}
    </div>
    </DragDropContext>
  );
}
