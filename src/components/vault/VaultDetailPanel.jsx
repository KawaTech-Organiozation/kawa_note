import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { Copy, Check, ExternalLink, Pencil, Trash2, Tag } from 'lucide-react';
import { toast } from 'sonner';
import { copyWithAutoClear } from '@/lib/clipboard';
import { useDeleteVaultEntry } from '@/api/useVault';
import { avatarColorClass } from '@/lib/vaultUi';
import { cn } from '@/lib/utils';
import PasswordField from './PasswordField';
import PasswordStrengthMeter from './PasswordStrengthMeter';

/**
 * Normalize a possibly-schemeless URL for opening in a new tab.
 * @param {string} url
 * @returns {string|null}
 */
function normalizeUrl(url) {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

/**
 * @param {Object} props
 * @param {Object} props.entry - credential view-model
 * @param {Object} [props.health] - password-health flags for this entry
 * @param {() => void} props.onEdit
 * @param {() => void} props.onDeleted
 * @returns {JSX.Element}
 */
export default function VaultDetailPanel({ entry, health, onEdit, onDeleted }) {
  const [copiedUser, setCopiedUser] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const deleteEntry = useDeleteVaultEntry();
  const href = normalizeUrl(entry.url);

  const copyUsername = async () => {
    if (!entry.username) return;
    const ok = await copyWithAutoClear(entry.username, { clearAfterMs: 15000 });
    if (ok) {
      setCopiedUser(true);
      toast.success('Usuário copiado');
      setTimeout(() => setCopiedUser(false), 2000);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteEntry.mutateAsync(entry.id);
      toast.success('Credencial excluída');
      setConfirmDelete(false);
      onDeleted?.();
    } catch (error) {
      toast.error(error?.data?.error?.message || error?.message || 'Erro ao excluir');
    }
  };

  return (
    <div className="h-full flex flex-col overflow-y-auto">
      <div className="flex items-start gap-3 p-6 border-b border-slate-200 dark:border-slate-700">
        <div className={cn('h-11 w-11 rounded-xl flex items-center justify-center font-semibold shrink-0', avatarColorClass(entry.title || entry.url))}>
          {(entry.title || '?').charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-foreground truncate">{entry.title || 'Sem título'}</h2>
          {entry.folder?.name && (
            <span className="text-xs text-slate-500 dark:text-slate-400">{entry.folder.name}</span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button variant="ghost" size="icon" onClick={onEdit} title="Editar" aria-label="Editar">
            <Pencil className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setConfirmDelete(true)}
            title="Excluir"
            aria-label="Excluir"
            className="text-rose-600 dark:text-rose-400"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="p-6 space-y-5">
        <div className="space-y-1.5">
          <Label>Usuário / e-mail</Label>
          <div className="flex items-center gap-1">
            <div className="flex-1 rounded-md border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm break-all min-h-[38px]">
              {entry.username || <span className="text-slate-400">—</span>}
            </div>
            {entry.username && (
              <Button variant="ghost" size="icon" onClick={copyUsername} title="Copiar usuário" aria-label="Copiar usuário">
                {copiedUser ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Senha</Label>
          <PasswordField value={entry.password} readOnly />
          {entry.password && <PasswordStrengthMeter password={entry.password} />}
          {(health?.reused || health?.short) && (
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {health.reused && (
                <Badge variant="outline" className="text-[10px] border-amber-300 text-amber-700 dark:text-amber-400">
                  senha reutilizada
                </Badge>
              )}
              {health.short && (
                <Badge variant="outline" className="text-[10px] border-amber-300 text-amber-700 dark:text-amber-400">
                  senha curta
                </Badge>
              )}
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <Label>URL / site</Label>
          <div className="flex items-center gap-1">
            <div className="flex-1 rounded-md border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm break-all min-h-[38px]">
              {entry.url || <span className="text-slate-400">—</span>}
            </div>
            {href && (
              <Button
                variant="ghost"
                size="icon"
                asChild
                title="Abrir site"
                aria-label="Abrir site"
              >
                <a href={href} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4" />
                </a>
              </Button>
            )}
          </div>
        </div>

        {entry.tags?.length > 0 && (
          <div className="space-y-1.5">
            <Label>Tags</Label>
            <div className="flex flex-wrap gap-2">
              {entry.tags.map((tag, idx) => (
                <Badge key={idx} variant="secondary" className="text-xs">
                  <Tag className="w-3 h-3 mr-1" />
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {entry.notes && (
          <div className="space-y-1.5">
            <Label>Notas</Label>
            <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap rounded-md border border-slate-200 dark:border-slate-700 px-3 py-2">
              {entry.notes}
            </p>
          </div>
        )}
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir credencial</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>{entry.title || 'esta credencial'}</strong>? Esta ação move a credencial para a lixeira.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 hover:bg-rose-700"
              onClick={(event) => {
                event.preventDefault();
                void handleDelete();
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
