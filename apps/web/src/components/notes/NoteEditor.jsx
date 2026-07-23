import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { X, Pin, Loader2, ExternalLink, FolderInput, Edit3, Eye, Check, CheckSquare, ArrowUp, ArrowDown, Save } from "lucide-react";
import { toast } from 'sonner';
import { useUpdateNote } from '@/api/useNotes';
import TagManager from './TagManager';
import UrlPreviewCard from './UrlPreviewCard';
import PlainTextRenderer from './PlainTextRenderer';
import { checkAndHandleEncryptionError } from '@/lib/errorHandlers';
import {
  toggleCheckbox,
  insertCheckboxItem,
  moveLineUp,
  moveLineDown,
  isCheckboxLine,
  isEmptyCheckboxLine,
} from '@/lib/markdownUtils';

const typeColors = {
  text: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
  url: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-200",
  image: "bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-200",
  word: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-200"
};

function getEditableSnapshot(note) {
  return {
    title: note?.title ?? '',
    content: note?.content ?? '',
    pinned: Boolean(note?.pinned),
    tags: Array.isArray(note?.tags) ? [...note.tags] : [],
  };
}

function editableSnapshotsMatch(left, right) {
  return (
    left.title === right.title &&
    left.content === right.content &&
    left.pinned === right.pinned &&
    JSON.stringify(left.tags) === JSON.stringify(right.tags)
  );
}

/**
 * NoteEditor - Editor de notas com salvamento manual e suporte a markdown
 * @param {Object} props - Props do componente
 * @param {Object} props.note - Nota a ser editada
 * @param {Function} props.onSave - Callback após salvar
 * @param {Function} [props.onClose] - Callback para fechar editor (apenas mode='standalone')
 * @param {Array} [props.allNotes] - Todas as notas (para autocomplete de tags)
 * @param {Function} [props.onMoveNote] - Callback para mover nota
 * @param {'standalone'|'panel'} [props.mode='standalone'] - Layout mode
 * @param {Function} [props.onSaveStatusChange] - Called with saveStatus whenever it changes
 * @returns {JSX.Element} Editor de notas com visualização e edição
 */
const NoteEditor = forwardRef(function NoteEditor({
  note,
  onSave,
  onClose = () => {},
  allNotes = [],
  onMoveNote,
  mode = 'standalone',
  onSaveStatusChange,
}, ref) {
  const [editedNote, setEditedNote] = useState(note);
  const [persistedSnapshot, setPersistedSnapshot] = useState(() => getEditableSnapshot(note));
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState('clean'); // 'clean' | 'dirty' | 'saving' | 'error'
  const [error, setError] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const updateNoteMutation = useUpdateNote();
  const textareaRef = useRef(null);
  const latestNoteRef = useRef(note);

  useEffect(() => {
    latestNoteRef.current = note;
    setEditedNote(note);
    setPersistedSnapshot(getEditableSnapshot(note));
    setSaveStatus('clean');
    setError(null);
    setIsEditMode(false);
  }, [note]);

  const currentSnapshot = useMemo(() => getEditableSnapshot(editedNote), [editedNote]);
  const isDirty = useMemo(
    () => !editableSnapshotsMatch(currentSnapshot, persistedSnapshot),
    [currentSnapshot, persistedSnapshot]
  );

  useEffect(() => {
    if (saveStatus === 'saving' || saveStatus === 'error') return;
    if (!isDirty && saveStatus !== 'clean') {
      setSaveStatus('clean');
    }
  }, [isDirty, saveStatus]);

  useEffect(() => {
    if (onSaveStatusChange) onSaveStatusChange(saveStatus);
  }, [saveStatus, onSaveStatusChange]);

  const allTags = useMemo(() => {
    const tagSet = new Set();
    allNotes.forEach((currentNote) => {
      if (Array.isArray(currentNote.tags)) {
        currentNote.tags.forEach((tag) => tagSet.add(tag));
      }
    });
    return Array.from(tagSet);
  }, [allNotes]);

  const suggestedTags = useMemo(() => {
    const suggestions = [];

    if (editedNote.previewData) {
      try {
        const preview = typeof editedNote.previewData === 'string'
          ? JSON.parse(editedNote.previewData)
          : editedNote.previewData;

        if (preview.ogSiteName) suggestions.push(preview.ogSiteName);
        if (preview.ogType) suggestions.push(preview.ogType);
        if (preview.domain) suggestions.push(preview.domain);
      } catch {
        // Ignore parse errors
      }
    }

    return suggestions;
  }, [editedNote.previewData]);

  const handlePersist = useCallback(async () => {
    const snapshot = getEditableSnapshot(editedNote);

    if (!snapshot.content.trim()) {
      const message = 'O conteúdo da nota não pode ficar vazio.';
      setError(message);
      setSaveStatus('error');
      toast.error(message);
      return false;
    }

    if (!isDirty) {
      setSaveStatus('clean');
      return true;
    }

    try {
      setIsSaving(true);
      setSaveStatus('saving');
      setError(null);

      const response = await updateNoteMutation.mutateAsync({
        id: note.id,
        data: {
          title: snapshot.title.trim() || 'Sem título',
          content: snapshot.content,
          pinned: snapshot.pinned,
          tags: snapshot.tags,
        }
      });

      const savedNote = response?.data || response;
      setEditedNote((previous) => ({ ...previous, ...savedNote }));
      setPersistedSnapshot(getEditableSnapshot({ ...editedNote, ...savedNote }));
      setSaveStatus('clean');
      if (onSave) onSave(savedNote);
      return true;
    } catch (err) {
      if (checkAndHandleEncryptionError(err)) {
        return false;
      }

      const errorMessage = err?.data?.error?.message || err?.message || 'Erro ao salvar nota';
      setError(errorMessage);
      setSaveStatus('error');
      toast.error(errorMessage);
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [editedNote, isDirty, note.id, onSave, updateNoteMutation]);

  const handleDiscardChanges = useCallback(() => {
    const latestNote = latestNoteRef.current;
    setEditedNote(latestNote);
    setPersistedSnapshot(getEditableSnapshot(latestNote));
    setSaveStatus('clean');
    setError(null);
    setIsEditMode(false);
    return true;
  }, []);

  useImperativeHandle(ref, () => ({
    hasUnsavedChanges: () => isDirty,
    saveNote: () => handlePersist(),
    discardChanges: () => handleDiscardChanges(),
  }), [handleDiscardChanges, handlePersist, isDirty]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        void handlePersist();
      }

      if (e.key === 'Escape' && mode === 'standalone') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePersist, mode, onClose]);

  const handleChange = useCallback((field, value) => {
    setEditedNote((previous) => ({ ...previous, [field]: value }));
    setError(null);
    setSaveStatus('dirty');
  }, []);

  const handleTogglePin = useCallback(() => {
    handleChange('pinned', !editedNote.pinned);
  }, [editedNote.pinned, handleChange]);

  const previewData = useMemo(() => {
    if (!editedNote.previewData) return null;
    try {
      return typeof editedNote.previewData === 'string'
        ? JSON.parse(editedNote.previewData)
        : editedNote.previewData;
    } catch {
      return null;
    }
  }, [editedNote.previewData]);

  const renderSaveIndicator = () => {
    switch (saveStatus) {
      case 'dirty':
        return <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">Alterações não salvas</span>;
      case 'saving':
        return (
          <span className="text-xs text-blue-600 dark:text-blue-400 font-medium flex items-center gap-1">
            <Loader2 className="w-3 h-3 animate-spin" />
            Salvando...
          </span>
        );
      case 'error':
        return <span className="text-xs text-red-600 font-medium">Erro ao salvar</span>;
      case 'clean':
      default:
        return (
          <span className="text-xs text-green-600 dark:text-green-400 font-medium flex items-center gap-1">
            <Check className="w-3 h-3" />
            Salvo
          </span>
        );
    }
  };

  const handleInsertTodo = useCallback(() => {
    if (!isEditMode) {
      setIsEditMode(true);
      const { content: nextContent, cursorPosition } = insertCheckboxItem(editedNote.content, null);
      handleChange('content', nextContent);
      requestAnimationFrame(() => {
        const textarea = textareaRef.current;
        if (textarea) {
          textarea.focus();
          textarea.setSelectionRange(cursorPosition, cursorPosition);
        }
      });
      return;
    }

    const textarea = textareaRef.current;
    let cursorLineIndex = null;

    if (textarea) {
      const cursorPos = textarea.selectionStart;
      const textBeforeCursor = editedNote.content.substring(0, cursorPos);
      cursorLineIndex = textBeforeCursor.split('\n').length - 1;
    }

    const { content: nextContent, cursorPosition } = insertCheckboxItem(editedNote.content, cursorLineIndex);
    handleChange('content', nextContent);

    requestAnimationFrame(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(cursorPosition, cursorPosition);
      }
    });
  }, [editedNote.content, handleChange, isEditMode]);

  const getCursorLineIndex = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return 0;
    const cursorPos = textarea.selectionStart;
    const textBeforeCursor = textarea.value.substring(0, cursorPos);
    return textBeforeCursor.split('\n').length - 1;
  }, []);

  const setCursorToLine = useCallback((lineIndex) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const lines = textarea.value.split('\n');
    let position = 0;
    for (let index = 0; index < lineIndex && index < lines.length; index += 1) {
      position += lines[index].length + 1;
    }
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(position, position);
    }, 0);
  }, []);

  const handleMoveLineUp = useCallback(() => {
    const lineIndex = getCursorLineIndex();
    const result = moveLineUp(editedNote.content, lineIndex);
    if (result.content !== editedNote.content) {
      handleChange('content', result.content);
      setCursorToLine(result.newLineIndex);
    }
  }, [editedNote.content, getCursorLineIndex, handleChange, setCursorToLine]);

  const handleMoveLineDown = useCallback(() => {
    const lineIndex = getCursorLineIndex();
    const result = moveLineDown(editedNote.content, lineIndex);
    if (result.content !== editedNote.content) {
      handleChange('content', result.content);
      setCursorToLine(result.newLineIndex);
    }
  }, [editedNote.content, getCursorLineIndex, handleChange, setCursorToLine]);

  const handleTextareaKeyDown = useCallback((e) => {
    if (e.key === 'Enter') {
      const textarea = e.target;
      const cursorPos = textarea.selectionStart;
      const textBeforeCursor = editedNote.content.substring(0, cursorPos);
      const cursorLineIndex = textBeforeCursor.split('\n').length - 1;

      if (isCheckboxLine(editedNote.content, cursorLineIndex)) {
        e.preventDefault();

        if (isEmptyCheckboxLine(editedNote.content, cursorLineIndex)) {
          const lines = editedNote.content.split('\n');
          lines[cursorLineIndex] = '';
          const nextContent = lines.join('\n');
          handleChange('content', nextContent);

          let newPos = 0;
          for (let index = 0; index < cursorLineIndex; index += 1) {
            newPos += lines[index].length + 1;
          }
          requestAnimationFrame(() => {
            textarea.focus();
            textarea.setSelectionRange(newPos, newPos);
          });
        } else {
          const { content: nextContent, cursorPosition } = insertCheckboxItem(editedNote.content, cursorLineIndex);
          handleChange('content', nextContent);
          requestAnimationFrame(() => {
            textarea.focus();
            textarea.setSelectionRange(cursorPosition, cursorPosition);
          });
        }
      }
    } else if (e.altKey && e.key === 'ArrowUp') {
      e.preventDefault();
      handleMoveLineUp();
    } else if (e.altKey && e.key === 'ArrowDown') {
      e.preventDefault();
      handleMoveLineDown();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = e.target;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const content = editedNote.content;

      if (!e.shiftKey) {
        const nextContent = content.substring(0, start) + '  ' + content.substring(end);
        handleChange('content', nextContent);
        requestAnimationFrame(() => {
          textarea.selectionStart = start + 2;
          textarea.selectionEnd = start + 2;
        });
      } else {
        const before = content.substring(0, start);
        const spacesToRemove = before.endsWith('  ') ? 2 : before.endsWith(' ') ? 1 : 0;
        if (spacesToRemove > 0) {
          const nextContent = before.substring(0, before.length - spacesToRemove) + content.substring(end);
          handleChange('content', nextContent);
          requestAnimationFrame(() => {
            textarea.selectionStart = start - spacesToRemove;
            textarea.selectionEnd = start - spacesToRemove;
          });
        }
      }
    }
  }, [editedNote.content, handleChange, handleMoveLineDown, handleMoveLineUp, handlePersist]);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#2a3040]">
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2 min-w-0">
          <Badge className={`${typeColors[editedNote.type]} border-0 text-xs`}>
            {editedNote.type}
          </Badge>
          {editedNote.folder?.name ? (
            <Badge variant="outline" className="text-xs border-slate-300 dark:border-slate-600">
              {editedNote.folder.name}
            </Badge>
          ) : null}
          {renderSaveIndicator()}
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant={isDirty ? "default" : "outline"}
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => void handlePersist()}
            disabled={!isDirty || isSaving}
          >
            {isSaving ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1" />}
            Salvar
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={handleTogglePin}
            className={`h-7 w-7 ${editedNote.pinned ? "text-amber-500" : ""}`}
          >
            <Pin className={`w-3.5 h-3.5 ${editedNote.pinned ? 'fill-amber-500' : ''}`} />
          </Button>

          {onMoveNote && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onMoveNote(editedNote)}
              title="Mover para outra pasta"
            >
              <FolderInput className="w-3.5 h-3.5" />
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={handleInsertTodo}
            title="Adicionar item To-Do"
            aria-label="Adicionar item To-Do"
          >
            <CheckSquare className="w-3.5 h-3.5 mr-1" />
            To-Do
          </Button>

          {isEditMode && (
            <>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                onClick={handleMoveLineUp}
                title="Mover linha para cima (Alt+↑)"
                aria-label="Mover linha para cima"
              >
                <ArrowUp className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                onClick={handleMoveLineDown}
                title="Mover linha para baixo (Alt+↓)"
                aria-label="Mover linha para baixo"
              >
                <ArrowDown className="w-3.5 h-3.5" />
              </Button>
            </>
          )}

          <Button
            variant={isEditMode ? "secondary" : "outline"}
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => setIsEditMode((current) => !current)}
          >
            {isEditMode ? <Eye className="w-3.5 h-3.5 mr-1" /> : <Edit3 className="w-3.5 h-3.5 mr-1" />}
            {isEditMode ? 'Visualizar' : 'Editar'}
          </Button>

          {mode === 'standalone' && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onClose}
              aria-label="Fechar editor"
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col px-6 py-4">
        <div className="space-y-4">
          <Input
            value={editedNote.title}
            onChange={(e) => handleChange('title', e.target.value)}
            className="text-xl font-bold border-0 px-0 focus-visible:ring-0 bg-transparent dark:text-slate-50"
            placeholder="Título da nota..."
          />

          <div className="pt-2">
            <TagManager
              tags={editedNote.tags || []}
              onChange={(newTags) => handleChange('tags', newTags)}
              allTags={allTags}
              suggestedTags={suggestedTags}
            />
          </div>

          {editedNote.type === 'url' && editedNote.url && (
            <a
              href={editedNote.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 dark:text-blue-300 dark:hover:text-blue-200"
            >
              <ExternalLink className="w-4 h-4" />
              {editedNote.url}
            </a>
          )}

          {editedNote.type === 'image' && editedNote.url && (
            <div className="rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700/70">
              <img
                src={editedNote.url}
                alt={editedNote.title}
                className="w-full h-auto"
              />
            </div>
          )}
        </div>

        {isEditMode ? (
          <Textarea
            ref={textareaRef}
            value={editedNote.content}
            onChange={(e) => handleChange('content', e.target.value)}
            onKeyDown={handleTextareaKeyDown}
            className="flex-1 mt-4 min-h-[200px] border-0 px-0 text-sm leading-relaxed resize-none focus-visible:ring-0 font-mono text-slate-700 dark:text-slate-200 bg-transparent"
            placeholder="Escreva em Markdown... (- [ ] para criar to-do)"
            autoFocus
          />
        ) : (
          <div
            className="flex-1 mt-4 min-h-[200px] cursor-text"
            onClick={mode === 'panel' ? (e) => {
              if (e.target.tagName?.toLowerCase() === 'input' && e.target.type === 'checkbox') return;
              if (e.target.tagName?.toLowerCase() === 'a') return;
              setIsEditMode(true);
            } : undefined}
            onDoubleClick={mode === 'standalone' ? () => setIsEditMode(true) : undefined}
            title={mode === 'panel' ? 'Clique para editar' : 'Clique duplo para editar'}
          >
            {editedNote.content ? (
              <PlainTextRenderer
                content={editedNote.content}
                onCheckboxToggle={(lineIndex) => {
                  const nextContent = toggleCheckbox(editedNote.content, lineIndex);
                  handleChange('content', nextContent);
                }}
              />
            ) : (
              <p className="text-slate-400 dark:text-slate-500 font-mono text-sm">
                {mode === 'panel' ? 'Clique em Editar para começar...' : 'Clique duplo para editar...'}
              </p>
            )}
          </div>
        )}

        {(previewData || ['queued', 'processing'].includes(editedNote.metadataStatus)) && editedNote.url && (
          <div className="mt-4">
            <UrlPreviewCard previewData={previewData} url={editedNote.url} status={editedNote.metadataStatus} />
          </div>
        )}

        {editedNote.context && (
          <div className="mt-4 p-4 bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900/40 rounded-lg">
            <h4 className="text-sm font-medium text-indigo-900 dark:text-indigo-200 mb-2 flex items-center gap-2">
              Contexto da Internet
            </h4>
            <p className="text-sm text-indigo-700 dark:text-indigo-300 leading-relaxed">
              {editedNote.context}
            </p>
          </div>
        )}

        {error ? (
          <div className="mt-4 text-xs text-red-600">
            {error}
          </div>
        ) : null}
      </div>
    </div>
  );
});

export default NoteEditor;
