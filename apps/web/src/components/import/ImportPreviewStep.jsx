import { Badge } from '@/components/ui/badge';
import { FolderClosed, AlertTriangle, Copy } from 'lucide-react';

const PREVIEW_LIMIT = 15;

/**
 * Preview of the mapped credentials before import, with per-row flags
 * (empty / duplicate) and a per-folder summary.
 * @param {Object} props
 * @param {Array} props.credentials - annotated credential rows
 * @param {Object} props.stats - { total, empty, duplicates, toImport, byFolder }
 * @returns {JSX.Element}
 */
export default function ImportPreviewStep({ credentials = [], stats }) {
  const rows = credentials.slice(0, PREVIEW_LIMIT);
  const folderEntries = Object.entries(stats?.byFolder || {}).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-3">
      {/* Per-folder summary */}
      {folderEntries.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {folderEntries.slice(0, 12).map(([folder, count]) => (
            <Badge key={folder} variant="secondary" className="text-xs font-normal">
              <FolderClosed className="w-3 h-3 mr-1" />
              {folder} <span className="ml-1 text-slate-400">{count}</span>
            </Badge>
          ))}
          {folderEntries.length > 12 && (
            <Badge variant="outline" className="text-xs">+{folderEntries.length - 12} pastas</Badge>
          )}
        </div>
      )}

      <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
          <table className="min-w-full text-sm">
            <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800 z-10">
              <tr className="text-left text-xs uppercase text-slate-500 dark:text-slate-400">
                <th className="px-3 py-2 font-medium">Título</th>
                <th className="px-3 py-2 font-medium">Usuário</th>
                <th className="px-3 py-2 font-medium">Senha</th>
                <th className="px-3 py-2 font-medium">URL</th>
                <th className="px-3 py-2 font-medium">Pasta</th>
                <th className="px-3 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {rows.map((cred, idx) => (
                <tr key={idx} className={cred.isEmpty || cred.isDuplicate ? 'bg-amber-50/40 dark:bg-amber-950/10' : ''}>
                  <td className="px-3 py-2 max-w-[220px] truncate">{cred.title || <span className="text-slate-400">—</span>}</td>
                  <td className="px-3 py-2 max-w-[200px] truncate">{cred.username || <span className="text-slate-400">—</span>}</td>
                  <td className="px-3 py-2 font-mono text-slate-400">{cred.password ? '••••••' : '—'}</td>
                  <td className="px-3 py-2 max-w-[220px] truncate text-slate-500">{cred.url || '—'}</td>
                  <td className="px-3 py-2 max-w-[220px] truncate text-slate-500">{cred.folderPath || '—'}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {cred.isDuplicate && (
                      <Badge variant="outline" className="text-[10px] border-amber-300 text-amber-700 dark:text-amber-400 mr-1">
                        <Copy className="w-2.5 h-2.5 mr-0.5" /> duplicada
                      </Badge>
                    )}
                    {cred.isEmpty && (
                      <Badge variant="outline" className="text-[10px] border-slate-300 text-slate-500">
                        <AlertTriangle className="w-2.5 h-2.5 mr-0.5" /> sem senha
                      </Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {credentials.length > PREVIEW_LIMIT && (
          <div className="text-center py-2 text-xs text-slate-500 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700">
            … e mais {credentials.length - PREVIEW_LIMIT} credencial(is)
          </div>
        )}
      </div>
    </div>
  );
}
