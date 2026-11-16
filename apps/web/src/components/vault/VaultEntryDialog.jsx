import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import VaultEntryForm from './VaultEntryForm';

export default function VaultEntryDialog({ open, onOpenChange, entry = null, defaultFolderId = null }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{entry ? 'Editar credencial' : 'Nova credencial'}</DialogTitle>
          <DialogDescription>
            Os dados são criptografados no seu dispositivo antes de sair. O servidor nunca vê a senha.
          </DialogDescription>
        </DialogHeader>
        <VaultEntryForm entry={entry} defaultFolderId={defaultFolderId} onCancel={() => onOpenChange(false)} onSaved={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}
