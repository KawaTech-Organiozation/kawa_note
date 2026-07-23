import { forwardRef, useRef, useImperativeHandle } from 'react';
import NoteEditor from './NoteEditor';
import { useNote } from '@/api/useNotes';
import RelatedNotes from './RelatedNotes';

/** @typedef {import('@/types/models').Note} Note */

/**
 * NoteDetailPanel — the right pane in the V2 two-panel desktop layout.
 *
 * Wraps NoteEditor in panel mode, filling the available height.
 *
 * @param {Object} props
 * @param {Note} props.note - The note being displayed/edited
 * @param {Function} props.onUpdate - Called after a successful save (triggers refetch)
 * @param {Function} props.onDelete - Called with (noteId) after deletion
 * @param {Function} props.onMoveNote - Called with (note) to open MoveNoteDialog
 * @returns {JSX.Element}
 */
const NoteDetailPanel = forwardRef(function NoteDetailPanel({ note, onUpdate, onDelete: _onDelete, onMoveNote, allNotes = [] }, ref) {
  const editorRef = useRef(null);
  const { data: noteResponse } = useNote(note?.id, {
    refetchInterval: note?.metadataStatus === 'queued' || note?.metadataStatus === 'processing' ? 3000 : false
  });
  const currentNote = noteResponse?.data || note;

  useImperativeHandle(ref, () => ({
    hasUnsavedChanges: () => editorRef.current?.hasUnsavedChanges?.() ?? false,
    saveNote: () => editorRef.current?.saveNote?.() ?? Promise.resolve(true),
    discardChanges: () => editorRef.current?.discardChanges?.() ?? true,
  }), []);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#2a3040] min-w-0">
      <div className="flex-1 overflow-hidden">
        <NoteEditor
          ref={editorRef}
          note={currentNote}
          mode="panel"
          onSave={onUpdate}
          onClose={() => {}}
          onMoveNote={onMoveNote}
          allNotes={allNotes}
        />
      </div>
      <RelatedNotes currentNote={currentNote} />
    </div>
  );
});

export default NoteDetailPanel;
