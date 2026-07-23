import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import NoteEditor from '@/components/notes/NoteEditor';

const mutateAsyncMock = vi.fn();

vi.mock('@/api/useNotes', () => ({
  useUpdateNote: () => ({
    mutateAsync: mutateAsyncMock,
  })
}));

vi.mock('@/components/notes/TagManager', () => ({
  default: function TagManagerMock() {
    return <div>tag-manager</div>;
  }
}));

vi.mock('@/components/notes/UrlPreviewCard', () => ({
  default: function UrlPreviewCardMock() {
    return <div>url-preview</div>;
  }
}));

vi.mock('@/components/notes/PlainTextRenderer', () => ({
  default: function PlainTextRendererMock({ content }) {
    return <div>{content}</div>;
  }
}));

vi.mock('@/lib/errorHandlers', () => ({
  checkAndHandleEncryptionError: () => false,
}));

describe('NoteEditor', () => {
  const baseNote = {
    id: 'note-1',
    title: 'Nota original',
    content: 'conteudo inicial',
    type: 'text',
    tags: [],
    pinned: false,
    folder: { id: 'folder-a', name: 'Projetos' },
  };

  beforeEach(() => {
    mutateAsyncMock.mockReset();
    mutateAsyncMock.mockResolvedValue({
      data: {
        ...baseNote,
        title: 'Nota atualizada',
        content: 'conteudo alterado',
      }
    });
  });

  it('nao salva automaticamente ao perder foco', async () => {
    const user = userEvent.setup();
    render(<NoteEditor note={baseNote} onSave={vi.fn()} />);

    await user.clear(screen.getByPlaceholderText('Título da nota...'));
    await user.type(screen.getByPlaceholderText('Título da nota...'), 'Nota alterada');
    await user.tab();

    expect(mutateAsyncMock).not.toHaveBeenCalled();
    expect(screen.getByText('Alterações não salvas')).toBeInTheDocument();
  });

  it('salva manualmente pelo botao Salvar', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<NoteEditor note={baseNote} onSave={onSave} />);

    await user.click(screen.getByRole('button', { name: /Editar/i }));
    await user.clear(screen.getByPlaceholderText(/Escreva em Markdown/i));
    await user.type(screen.getByPlaceholderText(/Escreva em Markdown/i), 'conteudo alterado');
    await user.click(screen.getByRole('button', { name: /^Salvar$/i }));

    await waitFor(() => {
      expect(mutateAsyncMock).toHaveBeenCalledWith({
        id: 'note-1',
        data: {
          title: 'Nota original',
          content: 'conteudo alterado',
          pinned: false,
          tags: [],
        }
      });
    });

    expect(onSave).toHaveBeenCalled();
  });

  it('salva com Ctrl+S', async () => {
    const user = userEvent.setup();
    render(<NoteEditor note={baseNote} onSave={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /Editar/i }));
    await user.type(screen.getByPlaceholderText(/Escreva em Markdown/i), ' plus');
    await user.keyboard('{Control>}s{/Control}');

    await waitFor(() => {
      expect(mutateAsyncMock).toHaveBeenCalledTimes(1);
    });
  });
});
