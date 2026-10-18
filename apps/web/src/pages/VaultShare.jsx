import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { sharesApi } from '@/api/client';
import { decryptShareSnapshot } from '@/lib/vaultShareCrypto';

export default function VaultShare() {
  const { id } = useParams();
  const [state, setState] = useState({ loading: true });
  useEffect(() => {
    const [key, token] = (window.location.hash.slice(1) || ':').split(':');
    if (!key || !token) { setState({ loading: false, error: 'Link inválido ou incompleto.' }); return; }
    sharesApi.publicGet(id, token).then(async (response) => {
      const data = response.data;
      const snapshot = await decryptShareSnapshot(data.ciphertext, data.iv, key);
      setState({ loading: false, snapshot });
      window.history.replaceState(null, '', window.location.pathname);
    }).catch(() => setState({ loading: false, error: 'Este compartilhamento está indisponível, expirou ou foi revogado.' }));
  }, [id]);
  if (state.loading) return <main className="min-h-screen grid place-items-center">Carregando compartilhamento…</main>;
  if (state.error) return <main className="min-h-screen grid place-items-center p-6 text-center text-rose-700">{state.error}</main>;
  return <main className="min-h-screen bg-slate-50 p-6"><div className="mx-auto max-w-2xl rounded-xl bg-white p-6 shadow"><h1 className="text-xl font-bold">{state.snapshot.folder}</h1><p className="mb-4 text-sm text-slate-500">Snapshot somente leitura</p><div className="space-y-3">{state.snapshot.entries.map((entry) => <article key={entry.id} className="rounded-lg border p-4"><h2 className="font-semibold">{entry.title || 'Sem título'}</h2><p className="text-sm">Usuário: {entry.username || '—'}</p><p className="break-all text-sm">Senha: {entry.password || '—'}</p>{entry.url && <p className="break-all text-sm">URL: {entry.url}</p>}</article>)}</div></div></main>;
}
