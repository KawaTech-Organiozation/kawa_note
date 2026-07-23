import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Folder, FileX } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFolderHierarchy } from '@/api/useFolders';
import { useUpdateNote } from '@/api/useNotes';
import { toast } from 'sonner';
import { checkAndHandleEncryptionError } from '@/lib/errorHandlers';

const folderColorClasses = {
  slate: "text-slate-600",
  blue: "text-blue-600",
  purple: "text-purple-600",
  green: "text-green-600",
  amber: "text-amber-600",
  red: "text-red-600",
  pink: "text-pink-600"
};

/** Flatten the hierarchy tree into [{folder, depth}] preserving order */
function flattenTree(nodes, depth = 0, result = []) {
  for (const node of nodes) {
    result.push({ folder: node, depth });
    if (node.children?.length) {
      flattenTree(node.children, depth + 1, result);
    }
  }
  return result;
}

export default function MoveNoteDialog({ note, open, onOpenChange, onMoved }) {
  const { data: foldersResponse = { data: [] } } = useFolderHierarchy();
  const flatFolders = flattenTree(foldersResponse?.data || []);
  const updateNoteMutation = useUpdateNote();

  const handleMove = async (targetFolderId) => {
    try {
      await updateNoteMutation.mutateAsync({
        id: note.id,
        data: { folderId: targetFolderId }
      });
      const entry = flatFolders.find(e => e.folder.id === targetFolderId);
      const folderName = entry ? entry.folder.name : 'Sem pasta';
      toast.success(`Nota movida para "${folderName}"`);
      onOpenChange(false);
      if (onMoved) onMoved();
    } catch (error) {
      // Check if it's an encryption error and handle logout
      if (checkAndHandleEncryptionError(error)) {
        return;
      }

      const errorMessage = error?.data?.error?.message || error?.message || 'Erro ao mover nota';
      toast.error(errorMessage);
    }
  };

  const currentFolderId = note?.folderId || null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Mover nota para...</DialogTitle>
          <DialogDescription>
            Selecione a pasta de destino para "{note?.title}"
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[300px]">
          <div className="space-y-1">
            {/* Opção: Sem pasta */}
            <button
              onClick={() => handleMove(null)}
              disabled={currentFolderId === null || updateNoteMutation.isPending}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors text-left",
                currentFolderId === null
                  ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                  : "hover:bg-slate-100 text-slate-700 cursor-pointer"
              )}
            >
              <FileX className="w-4 h-4 shrink-0 text-slate-400" />
              <span className="flex-1">Sem pasta</span>
              {currentFolderId === null && (
                <span className="text-xs text-slate-400">(atual)</span>
              )}
            </button>

            {/* Lista completa de pastas (raiz + subpastas) com indentação por nível */}
            {flatFolders.map(({ folder, depth }) => {
              const isCurrent = currentFolderId === folder.id;
              const colorClass = folderColorClasses[folder.color] || folderColorClasses.slate;

              return (
                <button
                  key={folder.id}
                  onClick={() => handleMove(folder.id)}
                  disabled={isCurrent || updateNoteMutation.isPending}
                  style={{ paddingLeft: `${12 + depth * 16}px` }}
                  className={cn(
                    "w-full flex items-center gap-3 pr-3 py-2.5 rounded-lg text-sm transition-colors text-left",
                    isCurrent
                      ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                      : "hover:bg-slate-100 text-slate-700 cursor-pointer"
                  )}
                >
                  <Folder className={cn("w-4 h-4 shrink-0", colorClass)} />
                  <span className="flex-1 truncate">{folder.name}</span>
                  {isCurrent && (
                    <span className="text-xs text-slate-400 shrink-0">(atual)</span>
                  )}
                </button>
              );
            })}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
