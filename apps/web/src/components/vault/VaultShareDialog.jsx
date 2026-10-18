import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { encryptShareSnapshot } from '@/lib/vaultShareCrypto';
import { useCreateVaultShare } from '@/api/useVaultShares';

export default function VaultShareDialog({ open, onOpenChange, folder, entries }) {
  const [hours, setHours] = useState(24);
  const [maxViews, setMaxViews] = useState(1);
  const [busy, setBusy] = useState(false);
  const createShare = useCreateVaultShare();

  const create = async () => {
    setBusy(true);
    try {
      const expiresAt = new Date(Date.now() + Number(hours) * 3600000);
      const encrypted = await encryptShareSnapshot({
        version: 1,
        folder: folder.name,
        entries: entries.map(({ id, title, username, password, url, notes, tags }) => ({ id, title, username, password, url, notes, tags }))
      });
      const response = await createShare.mutateAsync({ folderNameSnapshot: folder.name, ciphertext: encrypted.ciphertext, iv: encrypted.iv, expiresAt: expiresAt.toISOString(), maxViews: Number(maxViews) });
      const share = response.data;
      const url = `${window.location.origin}/share/${share.id}#${encrypted.key}:${share.token}`;
      await navigator.clipboard.writeText(url);
      toast.success('Link seguro copiado. Compartilhe por um canal confiável.');
      onOpenChange(false);
    } catch (error) {
      toast.error(error?.message || 'Não foi possível criar o compartilhamento');
    } finally {
      setBusy(false);
    }
  };

  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Compartilhar pasta</DialogTitle>
        <DialogDescription>{folder?.name} · {entries.length} credencial(is). O link será somente leitura.</DialogDescription>
      </DialogHeader>
      <div className="space-y-4">
        <div className="space-y-2"><Label htmlFor="share-hours">Expira em horas</Label><Input id="share-hours" type="number" min="1" max="168" value={hours} onChange={(event) => setHours(event.target.value)} /></div>
        <div className="space-y-2"><Label htmlFor="share-views">Máximo de visualizações</Label><Input id="share-views" type="number" min="1" max="100" value={maxViews} onChange={(event) => setMaxViews(event.target.value)} /></div>
        <p className="text-xs text-amber-700">Qualquer pessoa com o link poderá abrir o snapshot até a expiração ou o limite definido.</p>
      </div>
      <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button onClick={create} disabled={busy}>Criar e copiar link</Button></DialogFooter>
    </DialogContent>
  </Dialog>;
}
