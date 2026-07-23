import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useCreateFolder } from '@/api/useFolders';
import { toast } from 'sonner';
import { checkAndHandleEncryptionError } from '@/lib/errorHandlers';

/**
 * SubFolderCreateDialog - Dialog para criar subpasta
 * @param {Object} props - Props do componente
 * @param {boolean} props.open - Estado do dialog
 * @param {Function} props.onOpenChange - Callback para mudar estado
 * @param {string} props.parentFolderId - ID da pasta pai
 * @param {string} props.parentFolderName - Nome da pasta pai (para exibição)
 * @param {Function} props.onSuccess - Callback após criar com sucesso
 * @returns {JSX.Element} Dialog para criar subpasta
 */
export default function SubFolderCreateDialog({ 
  open = false, 
  onOpenChange, 
  parentFolderId, 
  parentFolderName = 'Pasta',
  onSuccess 
}) {
  const [folderName, setFolderName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const createFolderMutation = useCreateFolder();

  const handleCreate = async () => {
    if (!folderName.trim()) {
      toast.error('Nome da pasta não pode estar vazio');
      return;
    }

    try {
      setIsLoading(true);
      await createFolderMutation.mutateAsync({
        name: folderName.trim(),
        parentFolderId,
        color: 'slate'
      });
      
      toast.success('Subpasta criada com sucesso');
      setFolderName('');
      onOpenChange(false);
      
      if (onSuccess) onSuccess();
    } catch (error) {
      // Check if it's an encryption error and handle logout
      if (checkAndHandleEncryptionError(error)) {
        return;
      }
      
      const errorMessage = error?.data?.error?.message || error?.message || 'Erro ao criar subpasta';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleCreate();
    } else if (e.key === 'Escape') {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Criar Subpasta</DialogTitle>
          <DialogDescription>
            Criar uma nova subpasta dentro de <strong>{parentFolderName}</strong>
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <Input
            placeholder="Nome da subpasta..."
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
            disabled={isLoading}
          />
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleCreate}
            disabled={isLoading || !folderName.trim()}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            {isLoading ? 'Criando...' : 'Criar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
