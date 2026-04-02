import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Sidebar from '../components/layout/Sidebar';
import BottomNav from '../components/layout/BottomNav';
import FAB from '../components/layout/FAB';
import MobileSearchModal from '../components/layout/MobileSearchModal';
import MobileNoteStrip from '../components/layout/MobileNoteStrip';
import NoteListPanel from '../components/notes/NoteListPanel';
import NoteDetailPanel from '../components/notes/NoteDetailPanel';
import NoteEmptyPanel from '../components/notes/NoteEmptyPanel';
import QuickEditor from '../components/notes/QuickEditor';
import MoveNoteDialog from '../components/notes/MoveNoteDialog';
import { Skeleton } from '@/components/ui/skeleton';
import { AnimatePresence, motion } from 'framer-motion';
import { Sparkles, ChevronLeft, ChevronRight, Lock, Menu } from 'lucide-react';
import { useFolderHierarchy } from '@/api/useFolders';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { needsMigration, migrateAllNotes, getMigrationStatusMessage } from '@/lib/noteMigration';
import { isKeyAvailable } from '@/lib/keyManager';
import { NO_FOLDER_SENTINEL } from '@/lib/constants';
import { isFocusInTextInput } from '@/lib/keyboardUtils';
import { useSidebarState } from '@/hooks/useSidebarState';
import { useMobileLayout } from '@/hooks/useMobileLayout';
import { useAllNotes } from '@/api/useNotes';
import { toast } from 'sonner';

/** @typedef {import('@/types/models').Note} Note */
/** @typedef {import('@/types/models').Folder} Folder */

function flattenFolders(items, result = []) {
  for (const item of items) {
    result.push(item);
    if (item.children?.length) flattenFolders(item.children, result);
  }
  return result;
}

function collectDescendantIds(folderId, allFolders) {
  const ids = new Set([folderId]);
  const queue = [folderId];

  while (queue.length > 0) {
    const current = queue.shift();
    allFolders
      .filter((folder) => folder.parentFolderId === current)
      .forEach((folder) => {
        ids.add(folder.id);
        queue.push(folder.id);
      });
  }

  return ids;
}

/**
 * Home page component — V2 two-panel layout.
 * Desktop (≥ lg): [Sidebar] [NoteListPanel 320px] [NoteDetailPanel flex-1]
 * Mobile (< lg): full-screen list or detail (alternating).
 * @returns {JSX.Element}
 */
export default function Home() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    text: true,
    url: true,
    image: true,
    word: true,
    pinnedOnly: false,
  });
  const [selectedFolder, setSelectedFolder] = useState(/** @type {Folder | null} */ (null));
  const [searchScope, setSearchScope] = useState(/** @type {'folder' | 'global'} */ ('global'));
  const [activeNote, setActiveNote] = useState(/** @type {Note | null} */ (null));
  const [isCreatingNote, setIsCreatingNote] = useState(false);
  const [noteToMove, setNoteToMove] = useState(/** @type {Note | null} */ (null));
  const [migrationStatus, setMigrationStatus] = useState(/** @type {'idle' | 'running' | 'completed' | 'error'} */ ('idle'));
  const [migrationProgress, setMigrationProgress] = useState({ current: 0, total: 0 });
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useSidebarState();
  const { isMobile, isSidebarOpen, openSidebar, closeSidebar, activeBottomTab, setActiveBottomTab } = useMobileLayout();
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [mobileView, setMobileView] = useState('list');
  const [unsavedDialogOpen, setUnsavedDialogOpen] = useState(false);
  const [pendingActionLabel, setPendingActionLabel] = useState('continuar');
  const pendingActionRef = useRef(/** @type {null | (() => void)} */ (null));
  const detailEditorRef = useRef(null);
  const createEditorRef = useRef(null);
  const encryptionToastShown = useRef(false);

  const { notes, isLoading, isLoadingMore, totalLoaded, total, refetch } = useAllNotes();
  const { data: foldersResponse = { data: [] } } = useFolderHierarchy();
  const folders = useMemo(() => flattenFolders(foldersResponse?.data || []), [foldersResponse?.data]);
  const rootFolders = useMemo(
    () => folders.filter((folder) => !folder.parentFolderId),
    [folders]
  );

  useEffect(() => {
    async function checkAndMigrate() {
      if (notes.length === 0 || migrationStatus !== 'idle') return;

      const keyAvailable = await isKeyAvailable();
      if (!keyAvailable) return;

      if (needsMigration(notes)) {
        setMigrationStatus('running');

        try {
          const result = await migrateAllNotes(notes, (current, currentTotal) => {
            setMigrationProgress({ current, total: currentTotal });
          });

          setMigrationStatus('completed');
          await refetch();

          if (!encryptionToastShown.current) {
            encryptionToastShown.current = true;
            toast.success('🔒 Suas notas são encriptadas end-to-end. Apenas você pode lê-las.', {
              duration: 5000
            });
          }

          const message = getMigrationStatusMessage(result);
          console.log(message);
        } catch (error) {
          console.error('Migration failed:', error);
          setMigrationStatus('error');
        }
      } else if (notes.length > 0 && !encryptionToastShown.current) {
        encryptionToastShown.current = true;
        toast.success('🔒 Suas notas são encriptadas end-to-end. Apenas você pode lê-las.', {
          duration: 5000
        });
      }
    }

    checkAndMigrate();
  }, [migrationStatus, notes, refetch]);

  const navList = useMemo(
    () => [null, NO_FOLDER_SENTINEL, ...[...rootFolders].sort((a, b) => (a.order - b.order) || a.name.localeCompare(b.name))],
    [rootFolders]
  );

  const currentNavIndex = navList.findIndex((item) =>
    item === null ? selectedFolder === null : (item?.virtual ? selectedFolder?.virtual : item?.id === selectedFolder?.id)
  );

  const hasSearch = searchTerm.trim().length > 0;
  const selectedFolderIds = selectedFolder && !selectedFolder.virtual
    ? collectDescendantIds(selectedFolder.id, folders)
    : null;

  const folderScopedNotes = useMemo(() => {
    return notes.filter((note) => {
      if (!selectedFolder) return true;
      if (selectedFolder.virtual) return !note.folderId;
      return selectedFolderIds?.has(note.folderId) ?? false;
    });
  }, [notes, selectedFolder, selectedFolderIds]);

  const searchableNotes = useMemo(() => {
    if (!hasSearch) return folderScopedNotes;
    if (searchScope === 'global') return notes;
    return folderScopedNotes;
  }, [folderScopedNotes, hasSearch, notes, searchScope]);

  const filteredNotes = useMemo(() => {
    const sourceNotes = hasSearch && searchScope === 'global' ? notes : folderScopedNotes;

    return sourceNotes.filter((note) => {
      if (!filters[note.type]) return false;
      if (filters.pinnedOnly && !note.pinned) return false;
      if (!hasSearch) return true;

      const search = searchTerm.toLowerCase();
      return (
        note.title?.toLowerCase().includes(search) ||
        note.content?.toLowerCase().includes(search) ||
        note.tags?.some((tag) => tag.toLowerCase().includes(search)) ||
        note.context?.toLowerCase().includes(search)
      );
    });
  }, [filters, folderScopedNotes, hasSearch, notes, searchScope, searchTerm]);

  const visibleNoteCount = filteredNotes.length;
  const headerTitle = useMemo(() => {
    if (hasSearch) return 'Pesquisa';
    if (selectedFolder) return selectedFolder.name;
    if (activeNote?.folder?.name) return activeNote.folder.name;
    if (activeNote && !activeNote.folderId) return NO_FOLDER_SENTINEL.name;
    return 'Todas as Notas';
  }, [activeNote, hasSearch, selectedFolder]);

  useEffect(() => {
    if (!activeNote) return;
    const fresh = notes.find((note) => note.id === activeNote.id);
    if (!fresh) {
      setActiveNote(null);
    } else if (fresh !== activeNote) {
      setActiveNote(fresh);
    }
  }, [notes, activeNote]);

  const getActiveEditorController = useCallback(() => {
    if (isCreatingNote) return createEditorRef.current;
    if (activeNote) return detailEditorRef.current;
    return null;
  }, [activeNote, isCreatingNote]);

  const closeUnsavedDialog = useCallback(() => {
    pendingActionRef.current = null;
    setPendingActionLabel('continuar');
    setUnsavedDialogOpen(false);
  }, []);

  const runActionWithGuard = useCallback((label, action) => {
    const controller = getActiveEditorController();
    if (controller?.hasUnsavedChanges?.()) {
      pendingActionRef.current = action;
      setPendingActionLabel(label);
      setUnsavedDialogOpen(true);
      return;
    }

    action();
  }, [getActiveEditorController]);

  const handleConfirmSaveAndContinue = useCallback(async () => {
    const controller = getActiveEditorController();
    const action = pendingActionRef.current;
    const saved = await (controller?.saveNote?.() ?? controller?.saveDraft?.() ?? Promise.resolve(true));

    if (!saved) return;

    closeUnsavedDialog();
    action?.();
  }, [closeUnsavedDialog, getActiveEditorController]);

  const handleDiscardAndContinue = useCallback(() => {
    const controller = getActiveEditorController();
    controller?.discardChanges?.();
    controller?.discardDraft?.();
    const action = pendingActionRef.current;
    closeUnsavedDialog();
    action?.();
  }, [closeUnsavedDialog, getActiveEditorController]);

  const handleSelectNote = useCallback((note) => {
    runActionWithGuard('abrir outra nota', () => {
      setActiveNote(note);
      setIsCreatingNote(false);
      if (isMobile) setMobileView('detail');
    });
  }, [isMobile, runActionWithGuard]);

  const handleDeleteNote = useCallback((noteId) => {
    if (activeNote?.id === noteId) {
      setActiveNote(null);
      if (isMobile) setMobileView('list');
    }
    refetch();
  }, [activeNote, isMobile, refetch]);

  const handleTogglePin = useCallback(() => {
    refetch();
  }, [refetch]);

  const handleNewNote = useCallback(() => {
    runActionWithGuard('criar uma nova nota', () => {
      setActiveNote(null);
      setIsCreatingNote(true);
      if (isMobile) setMobileView('detail');
    });
  }, [isMobile, runActionWithGuard]);

  const handleNoteSaved = useCallback(async (newNote) => {
    setIsCreatingNote(false);
    await refetch();

    if (newNote?.id) {
      setTimeout(() => {
        const created = notes.find((currentNote) => currentNote.id === newNote.id);
        if (created) {
          setActiveNote(created);
        }
      }, 300);
    }
  }, [notes, refetch]);

  const handleFolderSelection = useCallback((folder) => {
    runActionWithGuard('trocar de pasta', () => {
      setSelectedFolder(folder);
      setActiveNote(null);
      setIsCreatingNote(false);
      if (isMobile) setMobileView('list');
    });
  }, [isMobile, runActionWithGuard]);

  const navigatePrev = useCallback(() => {
    const prevIndex = currentNavIndex <= 0 ? navList.length - 1 : currentNavIndex - 1;
    handleFolderSelection(navList[prevIndex]);
  }, [currentNavIndex, handleFolderSelection, navList]);

  const navigateNext = useCallback(() => {
    const nextIndex = currentNavIndex >= navList.length - 1 ? 0 : currentNavIndex + 1;
    handleFolderSelection(navList[nextIndex]);
  }, [currentNavIndex, handleFolderSelection, navList]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.key === 'n' && !e.shiftKey && !isCreatingNote && !isFocusInTextInput()) {
        e.preventDefault();
        handleNewNote();
      }

      if (!e.ctrlKey && !e.metaKey && !isFocusInTextInput() && filteredNotes.length > 0) {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          const currentIndex = activeNote
            ? filteredNotes.findIndex((note) => note.id === activeNote.id)
            : -1;

          if (e.key === 'ArrowDown') {
            const nextIndex = currentIndex < filteredNotes.length - 1 ? currentIndex + 1 : 0;
            handleSelectNote(filteredNotes[nextIndex]);
            e.preventDefault();
          } else {
            const prevIndex = currentIndex > 0 ? currentIndex - 1 : filteredNotes.length - 1;
            handleSelectNote(filteredNotes[prevIndex]);
            e.preventDefault();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeNote, filteredNotes, handleNewNote, handleSelectNote, isCreatingNote]);

  const handleFABClick = useCallback(() => {
    handleNewNote();
  }, [handleNewNote]);

  const handleMobileBack = useCallback(() => {
    runActionWithGuard('voltar para a lista', () => {
      setMobileView('list');
      setActiveNote(null);
      setIsCreatingNote(false);
    });
  }, [runActionWithGuard]);

  const LIST_PANEL_WIDTH = 'w-[320px] min-w-[240px]';

  return (
    <div className="flex h-screen bg-white dark:bg-slate-950 overflow-hidden text-slate-900 dark:text-slate-100">
      <Sidebar
        selectedFolder={selectedFolder}
        onSelectFolder={handleFolderSelection}
        notesCount={notes.length}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        isMobile={isMobile}
        isSidebarOpen={isSidebarOpen}
        onCloseSidebar={closeSidebar}
        onSearch={setSearchTerm}
        searchTerm={searchTerm}
        onSelectSearchResult={handleSelectNote}
        searchScope={searchScope}
        onSearchScopeChange={setSearchScope}
        onFilterChange={setFilters}
        searchableNotes={searchableNotes}
      />

      <div className={`flex-1 flex flex-col overflow-hidden ${isMobile ? (activeNote ? 'pb-28' : 'pb-16') : 'pb-0'}`}>
        <div className="border-b border-slate-200 dark:border-slate-700/70 bg-white dark:bg-slate-950/95 shrink-0">
          {migrationStatus === 'running' && (
            <div className="mx-3 md:mx-6 mt-3 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40 rounded-lg flex items-center gap-3">
              <Lock className="w-5 h-5 text-blue-600 dark:text-blue-300 animate-pulse" />
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">Encriptando suas notas...</p>
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  {migrationProgress.current} de {migrationProgress.total} notas processadas
                </p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 px-3 md:px-6 py-3">
            {isMobile && (
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 shrink-0 md:hidden"
                onClick={openSidebar}
                aria-label="Abrir menu lateral"
              >
                <Menu className="w-5 h-5" />
              </Button>
            )}

            {navList.length > 1 && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={navigatePrev}
                aria-label="Pasta anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
            )}

            <div className="shrink-0">
              <h1 className="text-xl font-bold text-foreground leading-tight">
                {headerTitle}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {visibleNoteCount} {visibleNoteCount === 1 ? 'nota' : 'notas'}
              </p>
            </div>

            {navList.length > 1 && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={navigateNext}
                aria-label="Próxima pasta"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            )}

            <div className="sm:flex hidden items-center gap-2 text-sm text-slate-500 dark:text-slate-400 ml-auto shrink-0">
              <Sparkles className="w-4 h-4" />
              <span>{notes.length} total</span>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex-1 p-6 space-y-3">
            {[1, 2, 3, 4].map((item) => (
              <Skeleton key={item} className="h-16 rounded-xl" />
            ))}
          </div>
        ) : (
          <>
            <div className="hidden lg:flex flex-1 overflow-hidden">
              <div className={`${LIST_PANEL_WIDTH} shrink-0 overflow-hidden`}>
                <NoteListPanel
                  notes={filteredNotes}
                  activeNoteId={activeNote?.id || null}
                  onSelectNote={handleSelectNote}
                  onDeleteNote={handleDeleteNote}
                  onTogglePin={handleTogglePin}
                  onSearch={setSearchTerm}
                  searchTerm={searchTerm}
                  onFilterChange={setFilters}
                  searchScope={searchScope}
                  onSearchScopeChange={setSearchScope}
                  onSelectSearchResult={handleSelectNote}
                  onNewNote={handleNewNote}
                  isLoadingMore={isLoadingMore}
                  totalLoaded={totalLoaded}
                  total={total}
                />
              </div>

              <div className="flex-1 overflow-hidden">
                <AnimatePresence mode="wait">
                  {isCreatingNote ? (
                    <motion.div
                      key="create"
                      className="h-full flex flex-col bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-700/70"
                      initial={{ opacity: 0, x: 16 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 16 }}
                      transition={{ duration: 0.15 }}
                    >
                      <div className="flex items-center justify-between px-6 py-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-100">Nova nota</span>
                        <button
                          className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                          onClick={() => runActionWithGuard('cancelar a criação', () => setIsCreatingNote(false))}
                          aria-label="Cancelar criação"
                        >
                          Cancelar
                        </button>
                      </div>
                      <div className="flex-1 overflow-y-auto px-6 py-4 bg-slate-50/60 dark:bg-slate-950">
                        <QuickEditor
                          ref={createEditorRef}
                          onNoteSaved={handleNoteSaved}
                          folderId={selectedFolder?.virtual ? null : (selectedFolder?.id || null)}
                          fullHeight
                        />
                      </div>
                    </motion.div>
                  ) : activeNote ? (
                    <motion.div
                      key={activeNote.id}
                      className="h-full"
                      initial={{ opacity: 0, x: 16 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 16 }}
                      transition={{ duration: 0.15 }}
                    >
                      <NoteDetailPanel
                        ref={detailEditorRef}
                        note={activeNote}
                        onUpdate={refetch}
                        onDelete={handleDeleteNote}
                        onMoveNote={setNoteToMove}
                        allNotes={notes}
                      />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="empty"
                      className="h-full"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                    >
                      <NoteEmptyPanel />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <div className="flex lg:hidden flex-1 overflow-hidden">
              <AnimatePresence mode="wait" initial={false}>
                {(mobileView === 'list' && !isCreatingNote) || (!activeNote && !isCreatingNote) ? (
                  <motion.div
                    key="mobile-list"
                    className="w-full h-full"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.18 }}
                  >
                    <NoteListPanel
                      notes={filteredNotes}
                      activeNoteId={activeNote?.id || null}
                      onSelectNote={handleSelectNote}
                      onDeleteNote={handleDeleteNote}
                      onTogglePin={handleTogglePin}
                      onSearch={setSearchTerm}
                      searchTerm={searchTerm}
                      onFilterChange={setFilters}
                      searchScope={searchScope}
                      onSearchScopeChange={setSearchScope}
                      onSelectSearchResult={handleSelectNote}
                      onNewNote={handleNewNote}
                      isLoadingMore={isLoadingMore}
                      totalLoaded={totalLoaded}
                      total={total}
                    />
                  </motion.div>
                ) : (
                  <motion.div
                    key="mobile-detail"
                    className="w-full h-full"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.18 }}
                  >
                    {isCreatingNote ? (
                      <div className="h-full flex flex-col bg-white dark:bg-slate-900">
                        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
                          <span className="text-sm font-semibold text-slate-700 dark:text-slate-100">Nova nota</span>
                          <button
                            className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                            onClick={() => runActionWithGuard('cancelar a criação', () => {
                              setIsCreatingNote(false);
                              setMobileView('list');
                            })}
                          >
                            Cancelar
                          </button>
                        </div>
                        <div className="flex-1 overflow-y-auto px-4 py-4 bg-slate-50/60 dark:bg-slate-950">
                          <QuickEditor
                            ref={createEditorRef}
                            onNoteSaved={handleNoteSaved}
                            folderId={selectedFolder?.virtual ? null : (selectedFolder?.id || null)}
                            fullHeight
                          />
                        </div>
                      </div>
                    ) : (
                      <NoteDetailPanel
                        ref={detailEditorRef}
                        note={activeNote}
                        onUpdate={refetch}
                        onDelete={handleDeleteNote}
                        onMoveNote={setNoteToMove}
                        allNotes={notes}
                      />
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </>
        )}
      </div>

      <MoveNoteDialog
        note={noteToMove}
        open={noteToMove !== null}
        onOpenChange={(open) => { if (!open) setNoteToMove(null); }}
        onMoved={refetch}
      />

      {isMobile && (
        <BottomNav
          activeTab={activeBottomTab}
          onTabChange={(tab) => {
            setActiveBottomTab(tab);
            if (tab === 'folders') {
              openSidebar();
            } else if (tab === 'search') {
              setIsMobileSearchOpen(true);
            } else if (tab === 'notes') {
              runActionWithGuard('voltar para as notas', () => {
                setSelectedFolder(null);
                setMobileView('list');
              });
            }
          }}
        />
      )}

      {isMobile && <FAB onClick={handleFABClick} elevated={isMobile && !!activeNote} />}

      {isMobile && (
        <MobileNoteStrip
          tabs={filteredNotes.map((note) => ({ id: note.id, title: note.title || 'Sem título', type: 'note', note }))}
          activeTab={activeNote ? { id: activeNote.id, title: activeNote.title || 'Sem título', type: 'note', note: activeNote } : null}
          onSelectTab={(tab) => {
            handleSelectNote(tab.note);
            setMobileView('detail');
          }}
          onBack={handleMobileBack}
          onNewNote={handleFABClick}
        />
      )}

      <MobileSearchModal
        open={isMobileSearchOpen}
        onClose={() => {
          setIsMobileSearchOpen(false);
          setActiveBottomTab('notes');
        }}
        onSelectResult={(note) => {
          handleSelectNote(note);
          setActiveBottomTab('notes');
        }}
      />

      <AlertDialog
        open={unsavedDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            closeUnsavedDialog();
            return;
          }
          setUnsavedDialogOpen(true);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem alterações não salvas</AlertDialogTitle>
            <AlertDialogDescription>
              Salve antes de {pendingActionLabel}, descarte o rascunho local ou volte para continuar editando.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={closeUnsavedDialog}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-slate-200 text-slate-900 hover:bg-slate-300"
              onClick={(event) => {
                event.preventDefault();
                handleDiscardAndContinue();
              }}
            >
              Descartar e continuar
            </AlertDialogAction>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void handleConfirmSaveAndContinue();
              }}
            >
              Salvar e continuar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
