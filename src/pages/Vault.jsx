import { useMemo, useState } from 'react';
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
import {
  KeyRound,
  Plus,
  Upload,
  Search,
  ArrowLeft,
  ChevronLeft,
  FolderClosed,
  Layers,
  FileX
} from 'lucide-react';
import { useVaultEntries } from '@/api/useVault';
import { useFolderHierarchy } from '@/api/useFolders';
import { computeVaultHealth } from '@/lib/vaultUi';
import VaultList from '@/components/vault/VaultList';
import VaultDetailPanel from '@/components/vault/VaultDetailPanel';
import VaultEntryDialog from '@/components/vault/VaultEntryDialog';
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
  const [search, setSearch] = useState('');
  const [folderFilter, setFolderFilter] = useState(ALL);
  const [activeId, setActiveId] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [importOpen, setImportOpen] = useState(false);

  const { data: vaultData = { data: [] }, isLoading, refetch } = useVaultEntries();
  const { data: foldersResponse = { data: [] } } = useFolderHierarchy();

  const entries = vaultData.data || [];
  const health = useMemo(() => computeVaultHealth(entries), [entries]);
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

  return (
    <div className="flex h-screen bg-white dark:bg-[#232733] overflow-hidden text-slate-900 dark:text-slate-100">
      {/* Folder rail (desktop) */}
      <aside className="hidden lg:flex flex-col w-56 shrink-0 border-r border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#202433]">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar para Notas
          </button>
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
          />
          <div className="pt-3 pb-1 px-2 text-xs font-medium text-slate-500 uppercase">Pastas</div>
          {folderOptions.map((folder) => (
            <FolderRow
              key={folder.id}
              icon={FolderClosed}
              label={folder.name}
              count={folderCount(folder.id)}
              active={folderFilter === folder.id}
              onClick={() => setFolderFilter(folder.id)}
              style={{ paddingLeft: `${folder.level * 12 + 8}px` }}
            />
          ))}
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
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
    </div>
  );
}

/**
 * @param {Object} props
 * @returns {JSX.Element}
 */
function FolderRow({ icon: Icon, label, count, active, onClick, style }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={style}
      className={cn(
        'w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-colors',
        active
          ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/45 dark:text-emerald-100'
          : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800/80'
      )}
    >
      <Icon className="w-4 h-4 shrink-0" />
      <span className="flex-1 truncate text-left">{label}</span>
      {count > 0 && <span className="text-xs text-slate-400 dark:text-slate-500">{count}</span>}
    </button>
  );
}
