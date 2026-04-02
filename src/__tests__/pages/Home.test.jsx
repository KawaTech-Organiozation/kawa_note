import { forwardRef, useImperativeHandle } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Home from '@/pages/Home';

const editorControllerState = {
  dirty: false,
  saveResult: true,
  saveNote: vi.fn(async () => editorControllerState.saveResult),
  discardChanges: vi.fn(() => true),
};

const notesFixture = [
  {
    id: 'note-1',
    title: 'Primeira nota',
    content: 'conteudo alfa',
    type: 'text',
    tags: [],
    pinned: false,
    folderId: 'folder-a',
    folder: { id: 'folder-a', name: 'Projetos', color: 'blue' },
  },
  {
    id: 'note-2',
    title: 'Segunda nota',
    content: 'conteudo beta',
    type: 'text',
    tags: [],
    pinned: false,
    folderId: null,
    folder: null,
  },
];

vi.mock('@/components/layout/Sidebar', () => ({
  default: function SidebarMock({ onSearch, searchTerm }) {
    return (
      <div>
        <label htmlFor="sidebar-search">Busca</label>
        <input
          id="sidebar-search"
          value={searchTerm}
          onChange={(event) => onSearch(event.target.value)}
        />
      </div>
    );
  }
}));

vi.mock('@/components/layout/BottomNav', () => ({
  default: function BottomNavMock() {
    return null;
  }
}));

vi.mock('@/components/layout/FAB', () => ({
  default: function FABMock() {
    return null;
  }
}));

vi.mock('@/components/layout/MobileSearchModal', () => ({
  default: function MobileSearchModalMock() {
    return null;
  }
}));

vi.mock('@/components/layout/MobileNoteStrip', () => ({
  default: function MobileNoteStripMock() {
    return null;
  }
}));

vi.mock('@/components/notes/MoveNoteDialog', () => ({
  default: function MoveNoteDialogMock() {
    return null;
  }
}));

vi.mock('@/components/notes/QuickEditor', () => ({
  default: forwardRef(function QuickEditorMock(_props, ref) {
    useImperativeHandle(ref, () => ({
      hasUnsavedChanges: () => false,
      saveDraft: vi.fn(async () => true),
      discardDraft: vi.fn(() => true),
    }), []);
    return <div>quick-editor</div>;
  })
}));

vi.mock('@/components/notes/NoteDetailPanel', () => ({
  default: forwardRef(function NoteDetailPanelMock({ note }, ref) {
    useImperativeHandle(ref, () => ({
      hasUnsavedChanges: () => editorControllerState.dirty,
      saveNote: editorControllerState.saveNote,
      discardChanges: editorControllerState.discardChanges,
    }));

    return <div>nota ativa: {note.title}</div>;
  })
}));

vi.mock('@/components/notes/NoteListPanel', () => ({
  default: function NoteListPanelMock({ notes, onSelectNote }) {
    return (
      <div>
        <div data-testid="note-list-count">{notes.length}</div>
        {notes.map((note) => (
          <button key={note.id} onClick={() => onSelectNote(note)}>
            abrir {note.title}
          </button>
        ))}
      </div>
    );
  }
}));

vi.mock('@/api/useFolders', () => ({
  useFolderHierarchy: () => ({
    data: {
      data: [
        { id: 'folder-a', name: 'Projetos', order: 0, children: [] }
      ]
    }
  })
}));

vi.mock('@/api/useNotes', () => ({
  useAllNotes: () => ({
    notes: notesFixture,
    isLoading: false,
    isLoadingMore: false,
    totalLoaded: notesFixture.length,
    total: notesFixture.length,
    refetch: vi.fn(),
  })
}));

vi.mock('@/hooks/useSidebarState', () => ({
  useSidebarState: () => [false, vi.fn()]
}));

vi.mock('@/hooks/useMobileLayout', () => ({
  useMobileLayout: () => ({
    isMobile: false,
    isSidebarOpen: false,
    openSidebar: vi.fn(),
    closeSidebar: vi.fn(),
    activeBottomTab: 'notes',
    setActiveBottomTab: vi.fn(),
  })
}));

vi.mock('@/lib/noteMigration', () => ({
  needsMigration: () => false,
  migrateAllNotes: vi.fn(),
  getMigrationStatusMessage: () => 'ok',
}));

vi.mock('@/lib/keyManager', () => ({
  isKeyAvailable: vi.fn(async () => true),
}));

describe('Home', () => {
  beforeEach(() => {
    editorControllerState.dirty = false;
    editorControllerState.saveResult = true;
    editorControllerState.saveNote.mockClear();
    editorControllerState.discardChanges.mockClear();
  });

  it('mostra a pasta da nota ativa no header quando nenhuma pasta esta selecionada', async () => {
    const user = userEvent.setup();
    render(<Home />);

    expect(screen.getByText('Todas as Notas')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /abrir Primeira nota/i }));

    expect(screen.getByText('Projetos')).toBeInTheDocument();
    expect(screen.getByText('2 notas')).toBeInTheDocument();
  });

  it('mostra resultados da busca na lista central e atualiza o header para Pesquisa', async () => {
    const user = userEvent.setup();
    render(<Home />);

    await user.type(screen.getByLabelText('Busca'), 'segunda');

    expect(screen.getByText('Pesquisa')).toBeInTheDocument();
    expect(screen.getByTestId('note-list-count')).toHaveTextContent('1');
    expect(screen.getByText('1 nota')).toBeInTheDocument();
  });

  it('pede confirmacao antes de trocar de nota quando ha alteracoes nao salvas', async () => {
    const user = userEvent.setup();
    editorControllerState.dirty = true;

    render(<Home />);

    await user.click(screen.getByRole('button', { name: /abrir Primeira nota/i }));
    await user.click(screen.getByRole('button', { name: /abrir Segunda nota/i }));

    expect(screen.getByText('Você tem alterações não salvas')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Descartar e continuar/i }));

    expect(editorControllerState.discardChanges).toHaveBeenCalled();
    expect(screen.getByText('Sem Pasta')).toBeInTheDocument();
  });
});
