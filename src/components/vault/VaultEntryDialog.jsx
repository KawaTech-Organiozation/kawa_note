import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { toast } from 'sonner';
import { useFolderHierarchy } from '@/api/useFolders';
import { useCreateVaultEntry, useUpdateVaultEntry } from '@/api/useVault';
import { checkAndHandleEncryptionError } from '@/lib/errorHandlers';
import TagManager from '@/components/notes/TagManager';
import PasswordField from './PasswordField';
import PasswordStrengthMeter from './PasswordStrengthMeter';

const NO_FOLDER_VALUE = '__none__';

function flattenFolders(items, level = 0, result = []) {
  for (const item of items) {
    result.push({ id: item.id, name: item.name, level });
    if (item.children?.length) flattenFolders(item.children, level + 1, result);
  }
  return result;
}

const emptyForm = { title: '', username: '', password: '', url: '', notes: '', tags: [], folderId: null };

/**
 * Create / edit a credential.
 * @param {Object} props
 * @param {boolean} props.open
 * @param {(open: boolean) => void} props.onOpenChange
 * @param {Object|null} [props.entry] - existing credential to edit, or null to create
 * @param {string|null} [props.defaultFolderId] - preselect a folder when creating
 * @returns {JSX.Element}
 */
export default function VaultEntryDialog({ open, onOpenChange, entry = null, defaultFolderId = null }) {
  const [form, setForm] = useState(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const { data: foldersResponse = { data: [] } } = useFolderHierarchy('vault');
  const createEntry = useCreateVaultEntry();
  const updateEntry = useUpdateVaultEntry();

  const folderOptions = useMemo(
    () => flattenFolders(foldersResponse?.data || []),
    [foldersResponse?.data]
  );

  useEffect(() => {
    if (!open) return;
    if (entry) {
      setForm({
        title: entry.title || '',
        username: entry.username || '',
        password: entry.password || '',
        url: entry.url || '',
        notes: entry.notes || '',
        tags: Array.isArray(entry.tags) ? entry.tags : [],
        folderId: entry.folderId ?? null
      });
    } else {
      setForm({ ...emptyForm, folderId: defaultFolderId ?? null });
    }
  }, [open, entry, defaultFolderId]);

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast.error('Informe um título para a credencial');
      return;
    }
    if (!form.password) {
      toast.error('Informe a senha');
      return;
    }

    const payload = {
      title: form.title.trim(),
      username: form.username,
      password: form.password,
      url: form.url,
      notes: form.notes,
      tags: form.tags,
      folderId: form.folderId
    };

    try {
      setIsSaving(true);
      if (entry?.id) {
        await updateEntry.mutateAsync({ id: entry.id, data: payload });
        toast.success('Credencial atualizada');
      } else {
        await createEntry.mutateAsync(payload);
        toast.success('Credencial criada');
      }
      onOpenChange(false);
    } catch (error) {
      if (checkAndHandleEncryptionError(error)) return;
      toast.error(error?.data?.error?.message || error?.message || 'Erro ao salvar credencial');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{entry ? 'Editar credencial' : 'Nova credencial'}</DialogTitle>
          <DialogDescription>
            Os dados são criptografados no seu dispositivo antes de sair. O servidor nunca vê a senha.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="cred-title">Título *</Label>
            <Input
              id="cred-title"
              value={form.title}
              onChange={(e) => setField('title', e.target.value)}
              placeholder="Ex.: Gmail pessoal"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cred-username">Usuário / e-mail</Label>
            <Input
              id="cred-username"
              value={form.username}
              onChange={(e) => setField('username', e.target.value)}
              placeholder="usuario@exemplo.com"
              autoComplete="off"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cred-password">Senha *</Label>
            <PasswordField
              id="cred-password"
              value={form.password}
              onChange={(value) => setField('password', value)}
              showGenerator
            />
            <PasswordStrengthMeter password={form.password} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cred-url">URL / site</Label>
            <Input
              id="cred-url"
              value={form.url}
              onChange={(e) => setField('url', e.target.value)}
              placeholder="https://exemplo.com"
              autoComplete="off"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Pasta</Label>
            <Select
              value={form.folderId ?? NO_FOLDER_VALUE}
              onValueChange={(value) => setField('folderId', value === NO_FOLDER_VALUE ? null : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sem pasta" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_FOLDER_VALUE}>Sem pasta</SelectItem>
                {folderOptions.map((folder) => (
                  <SelectItem key={folder.id} value={folder.id}>
                    {' '.repeat(folder.level * 2)}
                    {folder.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Tags</Label>
            <TagManager tags={form.tags} onChange={(tags) => setField('tags', tags)} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cred-notes">Notas</Label>
            <Textarea
              id="cred-notes"
              value={form.notes}
              onChange={(e) => setField('notes', e.target.value)}
              placeholder="Anotações adicionais (opcional)"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
