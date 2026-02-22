import { useState, useEffect, useRef, useCallback } from 'react';
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
import { useNotes } from '@/api/useNotes';
import { Skeleton } from '@/components/ui/skeleton';
import { AnimatePresence, motion } from 'framer-motion';
import { Sparkles, ChevronLeft, ChevronRight, Lock, Menu } from 'lucide-react';
// import { Brain, Sparkles, ChevronLeft, ChevronRight, Lock, Menu } from 'lucide-react';
import { useFolderHierarchy } from '@/api/useFolders';
import { Button } from '@/components/ui/button';
import { needsMigration, migrateAllNotes, getMigrationStatusMessage } from '@/lib/noteMigration';
import { isKeyAvailable } from '@/lib/keyManager';
import { NO_FOLDER_SENTINEL } from '@/lib/constants';
import { isFocusInTextInput } from '@/lib/keyboardUtils';
import { useSidebarState } from '@/hooks/useSidebarState';
import { useMobileLayout } from '@/hooks/useMobileLayout';
import { toast } from 'sonner';

/** @typedef {import('@/types/models').Note} Note */
/** @typedef {import('@/types/models').Folder} Folder */

/**
 * Home page component — V2 two-panel layout.
 * Desktop (≥ lg): [Sidebar] [NoteListPanel 320px] [NoteDetailPanel flex-1]
 * Mobile (< lg): full-screen list or detail (alternating).
 * @returns {JSX.Element}
 */
export default function Home() {
  // ─── Filter & search state ───────────────────────────────────────────────
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

  // ─── V2: single active note replaces openTabs/activeTab ──────────────────
  /** @type {[Note|null, Function]} */
  const [activeNote, setActiveNote] = useState(null);
  /** Whether the right panel is in "create new note" mode */
  const [isCreatingNote, setIsCreatingNote] = useState(false);

  // ─── Other UI state ───────────────────────────────────────────────────────
  const [noteToMove, setNoteToMove] = useState(/** @type {Note | null} */ (null));
  const [migrationStatus, setMigrationStatus] = useState(/** @type {'idle' | 'running' | 'completed' | 'error'} */ ('idle'));
  const [migrationProgress, setMigrationProgress] = useState({ current: 0, total: 0 });
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useSidebarState();
  const { isMobile, isSidebarOpen, openSidebar, closeSidebar, activeBottomTab, setActiveBottomTab } = useMobileLayout();
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  /** Mobile view: 'list' | 'detail' */
  const [mobileView, setMobileView] = useState('list');
  const encryptionToastShown = useRef(false);

  // ─── Data fetching ────────────────────────────────────────────────────────
  const { data: notesResponse = { data: [] }, isLoading, refetch } = useNotes();
  const notes = notesResponse?.data || [];

  // ─── Auto-migration on mount ──────────────────────────────────────────────
  useEffect(() => {
    async function checkAndMigrate() {
      if (notes.length === 0 || migrationStatus !== 'idle') return;

      const keyAvailable = await isKeyAvailable();
      if (!keyAvailable) return;

      if (needsMigration(notes)) {
        setMigrationStatus('running');

        try {
          const result = await migrateAllNotes(notes, (current, total) => {
            setMigrationProgress({ current, total });
          });

          console.log('Migration completed:', result);
          if (result.errors.length > 0) {
            console.error('Migration errors:', result.errors);
          }

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
  }, [notes.length, migrationStatus, refetch]);

  // ─── Folder navigation ────────────────────────────────────────────────────
  const { data: foldersResponse = { data: [] } } = useFolderHierarchy();
  const flattenFolders = (items, result = []) => {
    for (const item of items) {
      result.push(item);
      if (item.children?.length) flattenFolders(item.children, result);
    }
    return result;
  };
  const folders = flattenFolders(foldersResponse?.data || []);
  const rootFolders = folders.filter((/** @type {Folder} */ f) => !f.parentFolderId);

  /** Collect the given folder ID plus all descendant IDs (recursive via children) */
  const collectDescendantIds = (folderId, allFolders) => {
    const ids = new Set([folderId]);
    const queue = [folderId];
    while (queue.length > 0) {
      const current = queue.shift();
      allFolders
        .filter(f => f.parentFolderId === current)
        .forEach(f => { ids.add(f.id); queue.push(f.id); });
    }
    return ids;
  };

  const navList = [null, NO_FOLDER_SENTINEL, ...rootFolders.sort((a, b) => (a.order - b.order) || a.name.localeCompare(b.name))];
  const currentNavIndex = navList.findIndex(item =>
    item === null ? selectedFolder === null : (item?.virtual ? selectedFolder?.virtual : item?.id === selectedFolder?.id)
  );

  const navigatePrev = () => {
    const prevIndex = currentNavIndex <= 0 ? navList.length - 1 : currentNavIndex - 1;
    setSelectedFolder(navList[prevIndex]);
  };

  const navigateNext = () => {
    const nextIndex = currentNavIndex >= navList.length - 1 ? 0 : currentNavIndex + 1;
    setSelectedFolder(navList[nextIndex]);
  };

  // ─── Filtering logic ──────────────────────────────────────────────────────
  const isGlobalSearch = searchScope === 'global' && searchTerm;

  // When a real folder is selected, include notes from all descendant subfolders
  const selectedFolderIds = selectedFolder && !selectedFolder.virtual
    ? collectDescendantIds(selectedFolder.id, folders)
    : null;

  const filteredNotes = notes.filter((/** @type {Note} */ note) => {
    if (!isGlobalSearch) {
      if (selectedFolder) {
        if (selectedFolder.virtual) {
          if (note.folderId) return false;
        } else {
          if (!selectedFolderIds.has(note.folderId)) return false;
        }
      }
    }
    if (!filters[note.type]) return false;
    if (filters.pinnedOnly && !note.pinned) return false;
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        note.title?.toLowerCase().includes(search) ||
        note.content?.toLowerCase().includes(search) ||
        note.tags?.some(tag => tag.toLowerCase().includes(search)) ||
        note.context?.toLowerCase().includes(search)
      );
    }
    return true;
  });

  const folderNoteCount = selectedFolder
    ? selectedFolder.virtual
      ? notes.filter(n => !n.folderId).length
      : notes.filter(n => selectedFolderIds.has(n.folderId)).length
    : notes.length;

  // ─── Active note lifecycle management ────────────────────────────────────
  // If the active note is no longer in the filtered list (deleted/moved), clear it
  useEffect(() => {
    if (activeNote && !filteredNotes.find(n => n.id === activeNote.id)) {
      setActiveNote(null);
    }
  }, [filteredNotes, activeNote]);

  // ─── Note selection ───────────────────────────────────────────────────────
  const handleSelectNote = useCallback((note) => {
    setActiveNote(note);
    setIsCreatingNote(false);
    if (isMobile) setMobileView('detail');
  }, [isMobile]);

  // ─── Note deletion from list ──────────────────────────────────────────────
  const handleDeleteNote = useCallback((noteId) => {
    if (activeNote?.id === noteId) {
      setActiveNote(null);
      if (isMobile) setMobileView('list');
    }
    refetch();
  }, [activeNote, isMobile, refetch]);

  // ─── Pin toggle from list ─────────────────────────────────────────────────
  const handleTogglePin = useCallback((_updatedNote) => {
    refetch();
  }, [refetch]);

  // ─── Open new note creation panel (right side) ────────────────────────────
  const handleNewNote = useCallback(() => {
    setActiveNote(null);
    setIsCreatingNote(true);
    if (isMobile) setMobileView('detail');
  }, [isMobile]);

  // ─── Note saved from QuickEditor (in right panel) ────────────────────────
  const handleNoteSaved = useCallback(async (newNote) => {
    setIsCreatingNote(false);
    await refetch();
    // Auto-select the newly created note in the detail panel
    if (newNote?.id) {
      setTimeout(() => {
        // notes list not yet updated, use a second refetch check
        setActiveNote(prev => prev); // trigger re-evaluation
      }, 50);
      // Try to find and select it after refetch updates the list
      setTimeout(() => {
        const created = notes.find(n => n.id === newNote.id);
        if (created) {
          setActiveNote(created);
        }
      }, 300);
    }
  }, [notes, refetch]);

  // ─── Keyboard shortcuts ───────────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl+N — create new note (guard: not when focus is in a text field or already creating)
      if (e.ctrlKey && e.key === 'n' && !e.shiftKey && !isCreatingNote && !isFocusInTextInput()) {
        e.preventDefault();
        // No explicit tab model needed; QuickEditor is always visible
      }
      // Arrow Up/Down — navigate between notes in the list
      // Guard: only when focus is NOT inside a text input (textarea, input, contentEditable)
      if (!e.ctrlKey && !e.metaKey && !isFocusInTextInput() && filteredNotes.length > 0) {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          const currentIndex = activeNote
            ? filteredNotes.findIndex(n => n.id === activeNote.id)
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
  }, [activeNote, filteredNotes, handleSelectNote, isCreatingNote]);

  // ─── Mobile: FAB creates note ─────────────────────────────────────────────
  const handleFABClick = useCallback(() => {
    handleNewNote();
  }, [handleNewNote]);

  // ─── Mobile: back from detail → list ─────────────────────────────────────
  const handleMobileBack = useCallback(() => {
    setMobileView('list');
    setActiveNote(null);
  }, []);

  // ─── Panel width: 320px fixed (Q4 = B) ───────────────────────────────────
  const LIST_PANEL_WIDTH = 'w-[320px] min-w-[240px]';

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      {/* Sidebar — Desktop only, or Mobile drawer */}
      <Sidebar
        selectedFolder={selectedFolder}
        onSelectFolder={(folder) => {
          setSelectedFolder(folder);
          setActiveNote(null); // clear selection when switching folder
        }}
        notesCount={notes.length}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        isMobile={isMobile}
        isSidebarOpen={isSidebarOpen}
        onCloseSidebar={closeSidebar}
        onSearch={setSearchTerm}
        onSelectSearchResult={handleSelectNote}
        searchScope={searchScope}
        onSearchScopeChange={setSearchScope}
      />

      {/* Main content area */}
      <div className={`flex-1 flex flex-col overflow-hidden ${isMobile ? (activeNote ? 'pb-28' : 'pb-16') : 'pb-0'}`}>

        {/* ── Top header ── */}
        <div className="border-b border-slate-200 bg-white shrink-0">
          {/* Migration Banner */}
          {migrationStatus === 'running' && (
            <div className="mx-3 md:mx-6 mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-3">
              <Lock className="w-5 h-5 text-blue-600 animate-pulse" />
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-900">Encriptando suas notas...</p>
                <p className="text-xs text-blue-700">
                  {migrationProgress.current} de {migrationProgress.total} notas processadas
                </p>
              </div>
            </div>
          )}

          {/* Folder navigation + title */}
          <div className="flex items-center gap-2 px-3 md:px-6 py-3">
            {/* Hamburger — Mobile */}
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
              <h1 className="text-xl font-bold text-slate-900 leading-tight">
                {isGlobalSearch ? 'Pesquisa Global' : (selectedFolder ? selectedFolder.name : 'Todas as Notas')}
              </h1>
              <p className="text-xs text-slate-500">
                {folderNoteCount} {folderNoteCount === 1 ? 'nota' : 'notas'}
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

            <div className="sm:flex hidden items-center gap-2 text-sm text-slate-500 ml-auto shrink-0">
              <Sparkles className="w-4 h-4" />
              <span>{notes.length} total</span>
            </div>
          </div>
        </div>

        {/* ── Content region ── */}
        {isLoading ? (
          <div className="flex-1 p-6 space-y-3">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-16 rounded-xl" />
            ))}
          </div>
        ) : (
          <>
            {/* ────────── DESKTOP LAYOUT (≥ lg) ────────── */}
            <div className="hidden lg:flex flex-1 overflow-hidden">
              {/* Left panel: note list + search + QuickEditor */}
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
                />
              </div>

              {/* Right panel: create / detail / empty */}
              <div className="flex-1 overflow-hidden">
                <AnimatePresence mode="wait">
                  {isCreatingNote ? (
                    <motion.div
                      key="create"
                      className="h-full flex flex-col bg-white border-l border-slate-200"
                      initial={{ opacity: 0, x: 16 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 16 }}
                      transition={{ duration: 0.15 }}
                    >
                      {/* Creator header */}
                      <div className="flex items-center justify-between px-6 py-3 border-b border-slate-100 shrink-0">
                        <span className="text-sm font-semibold text-slate-700">Nova nota</span>
                        <button
                          className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
                          onClick={() => setIsCreatingNote(false)}
                          aria-label="Cancelar criação"
                        >
                          Cancelar
                        </button>
                      </div>
                      {/* QuickEditor full-width in right panel */}
                      <div className="flex-1 overflow-y-auto px-6 py-4">
                        <QuickEditor
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
                        note={activeNote}
                        onUpdate={refetch}
                        onDelete={handleDeleteNote}
                        onMoveNote={setNoteToMove}
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

            {/* ────────── MOBILE LAYOUT (< lg) ────────── */}
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
                      <div className="h-full flex flex-col bg-white">
                        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 shrink-0">
                          <span className="text-sm font-semibold text-slate-700">Nova nota</span>
                          <button
                            className="text-xs text-slate-400 hover:text-slate-600"
                            onClick={() => { setIsCreatingNote(false); setMobileView('list'); }}
                          >
                            Cancelar
                          </button>
                        </div>
                        <div className="flex-1 overflow-y-auto px-4 py-4">
                          <QuickEditor
                            onNoteSaved={handleNoteSaved}
                            folderId={selectedFolder?.virtual ? null : (selectedFolder?.id || null)}
                            fullHeight
                          />
                        </div>
                      </div>
                    ) : (
                      <NoteDetailPanel
                        note={activeNote}
                        onUpdate={refetch}
                        onDelete={handleDeleteNote}
                        onMoveNote={setNoteToMove}
                      />
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </>
        )}
      </div>

      {/* MoveNoteDialog — shared between desktop and mobile */}
      <MoveNoteDialog
        note={noteToMove}
        open={noteToMove !== null}
        onOpenChange={(open) => { if (!open) setNoteToMove(null); }}
        onMoved={refetch}
      />

      {/* ── Mobile-only UI ── */}
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
              setSelectedFolder(null);
              setMobileView('list');
            }
          }}
        />
      )}

      {isMobile && <FAB onClick={handleFABClick} elevated={isMobile && !!activeNote} />}

      {isMobile && (
        <MobileNoteStrip
          tabs={filteredNotes.map(n => ({ id: n.id, title: n.title || 'Sem título', type: 'note', note: n }))}
          activeTab={activeNote ? { id: activeNote.id, title: activeNote.title || 'Sem título', type: 'note', note: activeNote } : null}
          onSelectTab={(tab) => {
            setActiveNote(tab.note);
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
    </div>
  );
}
