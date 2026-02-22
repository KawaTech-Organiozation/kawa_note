import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { X, Pin, Loader2, ExternalLink, FolderInput, Edit3, Eye, Check, CheckSquare, ArrowUp, ArrowDown } from "lucide-react";
import { format } from "date-fns";
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
} from '@/lib/markdownUtils';

const typeColors = {
  text: "bg-slate-100 text-slate-700",
  url: "bg-blue-100 text-blue-700",
  image: "bg-purple-100 text-purple-700",
  word: "bg-amber-100 text-amber-700"
};

/**
 * NoteEditor - Editor de notas com auto-save e suporte a markdown
 * @param {Object} props - Props do componente
 * @param {Object} props.note - Nota a ser editada
 * @param {Function} props.onSave - Callback após salvar
 * @param {Function} [props.onClose] - Callback para fechar editor (apenas mode='standalone')
 * @param {Array} [props.allNotes] - Todas as notas (para autocomplete de tags)
 * @param {Function} [props.onMoveNote] - Callback para mover nota
 * @param {'standalone'|'panel'} [props.mode='standalone'] - Layout mode.
 *   'standalone': preserves V1 behaviour (close button, double-click to edit).
 *   'panel': no close button, single-click activates Edit Mode.
 * @param {Function} [props.onSaveStatusChange] - Called with saveStatus whenever it changes.
 * @returns {JSX.Element} Editor de notas com visualização e edição
 */
export default function NoteEditor({ note, onSave, onClose = () => {}, allNotes = [], onMoveNote, mode = 'standalone', onSaveStatusChange }) {
  const [editedNote, setEditedNote] = useState(note);
  const [isDirty, setIsDirty] = useState(false);
  const [_isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState('idle'); // 'idle' | 'dirty' | 'saving' | 'saved' | 'error'
  const [_error, setError] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const updateNoteMutation = useUpdateNote();
  const debounceTimerRef = useRef(null);
  const saveToastShownRef = useRef(false);
  const textareaRef = useRef(null);

  useEffect(() => {
    setEditedNote(note);
    setIsDirty(false);
    setSaveStatus('idle');
    setError(null);
    setIsEditMode(false);
    saveToastShownRef.current = false;
  }, [note]);

  // Extract all unique tags from all notes for autocomplete
  const allTags = useMemo(() => {
    const tagSet = new Set();
    allNotes.forEach(n => {
      if (n.tags && Array.isArray(n.tags)) {
        n.tags.forEach(tag => tagSet.add(tag));
      }
    });
    return Array.from(tagSet);
  }, [allNotes]);

  // Generate suggested tags from metadata
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

  // Propagate saveStatus to parent (NoteDetailPanel) via callback
  useEffect(() => {
    if (onSaveStatusChange) onSaveStatusChange(saveStatus);
  }, [saveStatus, onSaveStatusChange]);

  // Auto-save effect com debounce
  useEffect(() => {
    if (!isDirty) return;

    setSaveStatus('dirty');

    // Limpar timer anterior
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Configurar novo timer (1500ms debounce)
    debounceTimerRef.current = setTimeout(() => {
      handleAutoSave();
    }, 1500);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [isDirty, editedNote]);

  const handleAutoSave = useCallback(async () => {
    if (!isDirty) return;

    // Do not attempt to save if content is empty — API requires at least 1 character.
    // The user may be mid-edit; silently skip and let them continue.
    if (!editedNote.content?.trim()) {
      setSaveStatus('idle');
      return;
    }

    try {
      setSaveStatus('saving');
      setIsSaving(true);
      setError(null);

      await updateNoteMutation.mutateAsync({
        id: note.id,
        data: {
          title: editedNote.title?.trim() || 'Sem título',
          content: editedNote.content,
          pinned: editedNote.pinned,
          tags: editedNote.tags
        }
      });

      setSaveStatus('saved');
      setIsDirty(false);

      // Mostrar indicador "Salvo" por 3 segundos
      setTimeout(() => {
        setSaveStatus('idle');
      }, 3000);

      if (onSave) onSave();
    } catch (err) {
      // Check if it's an encryption error and handle logout
      if (checkAndHandleEncryptionError(err)) {
        return;
      }

      const errorMessage = err?.data?.error?.message || err?.message || 'Erro ao salvar nota';
      setError(errorMessage);
      setSaveStatus('error');
      
      // Mostrar toast de erro apenas uma vez
      if (!saveToastShownRef.current) {
        saveToastShownRef.current = true;
        toast.error(errorMessage);
      }
    } finally {
      setIsSaving(false);
    }
  }, [editedNote, note.id, updateNoteMutation, isDirty, onSave]);

  // Força save imediato com Ctrl+S
  const handleForceSave = useCallback(async () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    await handleAutoSave();
  }, [handleAutoSave]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleForceSave();
      }
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleForceSave, onClose]);


  // F2 — Insert a new To-Do item
  const handleInsertTodo = useCallback(() => {
    if (!isEditMode) {
      // Switch to edit mode and append
      setIsEditMode(true);
      const newContent = insertCheckboxItem(editedNote.content, null);
      handleChange('content', newContent);
    } else {
      // In edit mode: insert at cursor position or at end
      const textarea = textareaRef.current;
      let cursorLineIndex = null;
      if (textarea) {
        const cursorPos = textarea.selectionStart;
        const textBeforeCursor = editedNote.content.substring(0, cursorPos);
        cursorLineIndex = textBeforeCursor.split('\n').length - 1;
      }
      const newContent = insertCheckboxItem(editedNote.content, cursorLineIndex);
      handleChange('content', newContent);
      // Focus textarea after insert
      setTimeout(() => {
        if (textareaRef.current) textareaRef.current.focus();
      }, 50);
    }
  }, [isEditMode, editedNote.content]);

  // F3 — Get current cursor line index from textarea
  const getCursorLineIndex = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return 0;
    const cursorPos = textarea.selectionStart;
    const textBeforeCursor = textarea.value.substring(0, cursorPos);
    return textBeforeCursor.split('\n').length - 1;
  }, []);

  // F3 — Set cursor to a specific line in the textarea
  const setCursorToLine = useCallback((lineIndex) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const lines = textarea.value.split('\n');
    let pos = 0;
    for (let i = 0; i < lineIndex && i < lines.length; i++) {
      pos += lines[i].length + 1; // +1 for \n
    }
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(pos, pos);
    }, 0);
  }, []);

  // F3 — Handle move line up
  const handleMoveLineUp = useCallback(() => {
    const lineIndex = getCursorLineIndex();
    const result = moveLineUp(editedNote.content, lineIndex);
    if (result.content !== editedNote.content) {
      handleChange('content', result.content);
      setCursorToLine(result.newLineIndex);
    }
  }, [editedNote.content, getCursorLineIndex, setCursorToLine]);

  // F3 — Handle move line down
  const handleMoveLineDown = useCallback(() => {
    const lineIndex = getCursorLineIndex();
    const result = moveLineDown(editedNote.content, lineIndex);
    if (result.content !== editedNote.content) {
      handleChange('content', result.content);
      setCursorToLine(result.newLineIndex);
    }
  }, [editedNote.content, getCursorLineIndex, setCursorToLine]);

  // Keyboard shortcut handler for the textarea (Edit Mode)
  // Handles: Alt+Up / Alt+Down (line move), Tab / Shift+Tab (indentation)
  const handleTextareaKeyDown = useCallback((e) => {
    if (e.altKey && e.key === 'ArrowUp') {
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
        // Tab → insert 2 spaces at cursor position
        const newContent = content.substring(0, start) + '  ' + content.substring(end);
        handleChange('content', newContent);
        // Restore cursor after the inserted spaces
        requestAnimationFrame(() => {
          textarea.selectionStart = start + 2;
          textarea.selectionEnd = start + 2;
        });
      } else {
        // Shift+Tab → remove up to 2 spaces before cursor
        const before = content.substring(0, start);
        const spacesToRemove = before.endsWith('  ') ? 2 : before.endsWith(' ') ? 1 : 0;
        if (spacesToRemove > 0) {
          const newContent = before.substring(0, before.length - spacesToRemove) + content.substring(end);
          handleChange('content', newContent);
          requestAnimationFrame(() => {
            textarea.selectionStart = start - spacesToRemove;
            textarea.selectionEnd = start - spacesToRemove;
          });
        }
      }
    }
  }, [handleMoveLineUp, handleMoveLineDown, editedNote.content]);

  const handleChange = (field, value) => {
    setEditedNote(prev => ({ ...prev, [field]: value }));
    setIsDirty(true);
    saveToastShownRef.current = false;
  };

  const handleTogglePin = async () => {
    const newPinned = !editedNote.pinned;
    setEditedNote(prev => ({ ...prev, pinned: newPinned }));
    try {
      setError(null);
      await updateNoteMutation.mutateAsync({
        id: note.id,
        data: { pinned: newPinned }
      });
      toast.success('Nota atualizada');
      if (onSave) onSave();
    } catch (err) {
      // Check if it's an encryption error and handle logout
      if (checkAndHandleEncryptionError(err)) {
        return;
      }
      
      const errorMessage = err?.data?.error?.message || err?.message || 'Erro ao atualizar nota';
      setError(errorMessage);
      toast.error(errorMessage);
    }
  };

  // Parse preview data
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

  // Render save status indicator
  const renderSaveIndicator = () => {
    switch (saveStatus) {
      case 'dirty':
        return <span className="text-xs text-amber-600 font-medium">• Não salvo</span>;
      case 'saving':
        return (
          <span className="text-xs text-blue-600 font-medium flex items-center gap-1">
            <Loader2 className="w-3 h-3 animate-spin" />
            Salvando...
          </span>
        );
      case 'saved':
        return (
          <span className="text-xs text-green-600 font-medium flex items-center gap-1">
            <Check className="w-3 h-3" />
            Salvo
          </span>
        );
      case 'error':
        return <span className="text-xs text-red-600 font-medium">• Erro ao salvar</span>;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <Badge className={`${typeColors[editedNote.type]} border-0 text-xs`}>
            {editedNote.type}
          </Badge>
          {/* <span className="text-xs text-slate-400">
            {format(new Date(editedNote.createdAt), 'dd/MM/yyyy HH:mm')}
          </span> */}
          {renderSaveIndicator()}
        </div>

        <div className="flex items-center gap-1">
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

          {/* F2 — To-Do button */}
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

          {/* F3 — Line move buttons (visible only in Edit Mode) */}
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
            onClick={() => setIsEditMode(!isEditMode)}
          >
            {isEditMode ? <Eye className="w-3.5 h-3.5 mr-1" /> : <Edit3 className="w-3.5 h-3.5 mr-1" />}
            {isEditMode ? 'Visualizar' : 'Editar'}
          </Button>

          {/* Close button — standalone mode only */}
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

      {/* Content */}
      <div className="flex-1 overflow-y-auto flex flex-col px-6 py-4">
        {/* Static metadata section */}
        <div className="space-y-4">
          <Input
            value={editedNote.title}
            onChange={(e) => handleChange('title', e.target.value)}
            className="text-xl font-bold border-0 px-0 focus-visible:ring-0"
            placeholder="Título da nota..."
          />

          {/* Tags */}
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
              className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800"
            >
              <ExternalLink className="w-4 h-4" />
              {editedNote.url}
            </a>
          )}

          {editedNote.type === 'image' && editedNote.url && (
            <div className="rounded-lg overflow-hidden border border-slate-200">
              <img
                src={editedNote.url}
                alt={editedNote.title}
                className="w-full h-auto"
              />
            </div>
          )}
        </div>

        {/* ── Content area — expands to fill remaining space ── */}
        {isEditMode ? (
          // EDIT MODE (both panel and standalone): plain textarea, no distractions
          <Textarea
            ref={textareaRef}
            value={editedNote.content}
            onChange={(e) => handleChange('content', e.target.value)}
            onKeyDown={handleTextareaKeyDown}
            className="flex-1 mt-4 min-h-[200px] border-0 px-0 text-sm leading-relaxed resize-none focus-visible:ring-0 font-mono text-slate-700"
            placeholder="Escreva em Markdown... (- [ ] para criar to-do)"
            autoFocus
          />
        ) : (
          // VIEW MODE: plain text renderer preserving whitespace, with clickable URLs and interactive checkboxes.
          <div
            className="flex-1 mt-4 min-h-[200px] cursor-text"
            onClick={mode === 'panel' ? (e) => {
              // Don't enter edit mode when clicking a checkbox or link — let their own handlers run.
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
                  const newContent = toggleCheckbox(editedNote.content, lineIndex);
                  handleChange('content', newContent);
                }}
              />
            ) : (
              <p className="text-slate-400 font-mono text-sm">
                {mode === 'panel' ? 'Clique em Editar para começar...' : 'Clique duplo para editar...'}
              </p>
            )}
          </div>
        )}

        {/* URL Preview Card */}
        {previewData && editedNote.url && (
          <div className="mt-4">
            <UrlPreviewCard previewData={previewData} url={editedNote.url} />
          </div>
        )}

        {editedNote.context && (
          <div className="mt-4 p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
            <h4 className="text-sm font-medium text-indigo-900 mb-2 flex items-center gap-2">
              💡 Contexto da Internet
            </h4>
            <p className="text-sm text-indigo-700 leading-relaxed">
              {editedNote.context}
            </p>
          </div>
        )}
      </div>

      {/* Footer hint - Desktop only */}
      {/* <div className="hidden md:block px-6 py-2 border-t border-slate-200 bg-slate-50">
        <p className="text-xs text-slate-500">
          ⌘/Ctrl + S para salvar • ESC para fechar{isEditMode ? ' • Alt+↑/↓ para mover linha' : ''}
        </p>
      </div> */}
    </div>
  );
}
