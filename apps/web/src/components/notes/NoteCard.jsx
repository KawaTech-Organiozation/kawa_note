import React, { useState, useMemo } from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { safeUrlTransform } from '@/lib/constants';
import { preprocessContent, getChecklistProgress } from '@/lib/markdownUtils';
import {
  MoreVertical,
  Link as LinkIcon,
  Image as ImageIcon,
  Type,
  Hash,
  Pin,
  Trash2,
  ExternalLink,
  FolderInput,
  Folder,
  ChevronDown
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { useUpdateNote, useDeleteNote } from '@/api/useNotes';
import NoteEditor from './NoteEditor';

const typeIcons = {
  text: Type,
  url: LinkIcon,
  image: ImageIcon,
  word: Hash
};

const typeColors = {
  text: "bg-slate-100 text-slate-700",
  url: "bg-blue-100 text-blue-700",
  image: "bg-purple-100 text-purple-700",
  word: "bg-amber-100 text-amber-700"
};

export default function NoteCard({ note, onDelete, onUpdate, showFolderBadge = false, onMoveNote }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const updateNoteMutation = useUpdateNote();
  const deleteNoteMutation = useDeleteNote();
  const Icon = typeIcons[note.type] || Type;

  // F1 — Preprocessed content for view mode (preserves newlines)
  const processedContent = useMemo(
    () => preprocessContent(note.content),
    [note.content]
  );

  // F2 — Checklist progress indicator
  const checklistProgress = useMemo(
    () => getChecklistProgress(note.content),
    [note.content]
  );

  const handleDelete = async () => {
    try {
      await deleteNoteMutation.mutateAsync(note.id);
      if (onDelete) onDelete(note.id);
    } catch (error) {
      // Error handling is managed by React Query mutation state
    }
  };

  const handleTogglePin = async () => {
    try {
      await updateNoteMutation.mutateAsync({
        id: note.id,
        data: { pinned: !note.pinned }
      });
      if (onUpdate) onUpdate();
    } catch (error) {
      // Error handling is managed by React Query mutation state
    }
  };

  const handleCloseEditor = () => {
    setIsExpanded(false);
  };

  if (isExpanded) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        layout
      >
        <Card className="p-0 border-slate-200 bg-white overflow-hidden">
          <NoteEditor
            note={note}
            onSave={onUpdate}
            onClose={handleCloseEditor}
            onMoveNote={onMoveNote}
          />
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      layout
    >
      <Card 
        className="p-4 hover:shadow-md transition-all border-slate-200 bg-white relative group cursor-pointer"
        onClick={() => setIsExpanded(true)}
      >
        {note.pinned && (
          <div className="absolute top-2 left-2">
            <Pin className="w-4 h-4 text-amber-500 fill-amber-500" />
          </div>
        )}
        
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Badge className={`${typeColors[note.type]} border-0 text-xs`}>
                <Icon className="w-3 h-3 mr-1" />
                {note.type}
              </Badge>
              {note.tags?.map((tag, idx) => (
                <Badge key={idx} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {showFolderBadge && note.folder && (
                <Badge variant="outline" className="text-xs text-slate-500 border-slate-300">
                  <Folder className="w-3 h-3 mr-1" />
                  {note.folder.name}
                </Badge>
              )}
              {showFolderBadge && !note.folder && (
                <Badge variant="outline" className="text-xs text-slate-400 border-slate-200">
                  Sem pasta
                </Badge>
              )}
              {/* F2 — Checklist progress badge */}
              {checklistProgress.total > 0 && (
                <span className="text-xs text-indigo-600 font-medium">
                  ✓ {checklistProgress.completed}/{checklistProgress.total}
                </span>
              )}
            </div>
            
            <h3 className="font-medium text-slate-900 mb-1 line-clamp-1">
              {note.title}
            </h3>
            
            {note.type === 'url' && note.url && (
              <a
                href={note.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1 mb-2"
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink className="w-3 h-3" />
                <span className="truncate">{note.url}</span>
              </a>
            )}
            
            {note.type === 'image' && note.url && (
              <div className="my-2 rounded-lg overflow-hidden">
                <img 
                  src={note.url} 
                  alt={note.title}
                  className="w-full h-auto max-h-48 object-cover"
                />
              </div>
            )}
            
            <div className="text-sm text-slate-600 line-clamp-3 prose prose-sm max-w-none">
              <ReactMarkdown 
                remarkPlugins={[remarkGfm]}
                urlTransform={safeUrlTransform}
              >
                {processedContent}
              </ReactMarkdown>
            </div>
            
            {note.context && (
              <div className="mt-3 p-2 bg-indigo-50 border border-indigo-100 rounded-lg">
                <p className="text-xs text-indigo-700 leading-relaxed">
                  💡 {note.context}
                </p>
              </div>
            )}
            
            {/* <div className="flex items-center gap-2 mt-3 text-xs text-slate-400">
              <span>{format(new Date(note.createdAt), 'dd/MM/yyyy HH:mm')}</span>
            </div> */}
          </div>
          
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(true);
              }}
              title="Expandir para editar"
            >
              <ChevronDown className="w-4 h-4" />
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleTogglePin}>
                  <Pin className="w-4 h-4 mr-2" />
                  {note.pinned ? 'Desafixar' : 'Fixar'}
                </DropdownMenuItem>
                {onMoveNote && (
                  <DropdownMenuItem onClick={() => onMoveNote(note)}>
                    <FolderInput className="w-4 h-4 mr-2" />
                    Mover para...
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={handleDelete}
                  disabled={deleteNoteMutation.isPending}
                  className="text-red-600"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  {deleteNoteMutation.isPending ? 'Deletando...' : 'Deletar'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}