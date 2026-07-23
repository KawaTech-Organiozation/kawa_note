import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Upload,
  CheckCircle2,
  Loader2,
  AlertCircle,
  ShieldCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { isKeyAvailable } from '@/lib/keyManager';
import { useCredentialImport } from '@/api/useCredentialImport';
import ColumnMappingStep from './ColumnMappingStep';
import ImportPreviewStep from './ImportPreviewStep';

const STEPS = [
  { key: 'upload', label: 'Arquivo' },
  { key: 'mapping', label: 'Mapear' },
  { key: 'preview', label: 'Revisar' },
  { key: 'importing', label: 'Importar' },
  { key: 'complete', label: 'Concluído' }
];

/**
 * Credential import wizard: Upload → Map columns → Preview → Import → Complete.
 * @param {Object} props
 * @param {boolean} props.open
 * @param {(open: boolean) => void} props.onOpenChange
 * @param {() => void} [props.onImported]
 * @returns {JSX.Element}
 */
export default function ImportWizardDialog({ open, onOpenChange, onImported }) {
  const fileInputRef = useRef(null);
  // Source of truth for "can we encrypt?": the in-memory key, not a context flag
  // (the flag can lag behind unlock in some sessions).
  const [keyReady, setKeyReady] = useState(true);
  const {
    step,
    setStep,
    parsed,
    presetName,
    mapping,
    updateMapping,
    missingRequired,
    buildPreview,
    results,
    progress,
    error,
    isBusy,
    parseFile,
    runImport,
    reset,
    commonRoot,
    stripRoot,
    setStripRoot,
    skipEmpty,
    setSkipEmpty,
    skipDuplicates,
    setSkipDuplicates,
    stats
  } = useCredentialImport();

  const previewCreds = useMemo(
    () => (step === 'preview' ? buildPreview() : []),
    [step, buildPreview]
  );

  useEffect(() => {
    if (open) {
      isKeyAvailable().then(setKeyReady).catch(() => setKeyReady(false));
    }
  }, [open]);

  const stepIndex = STEPS.findIndex((s) => s.key === step);

  const handleClose = () => {
    reset();
    onOpenChange(false);
  };

  const handleFinish = () => {
    onImported?.();
    handleClose();
  };

  const handleFile = (event) => {
    const file = event.target.files?.[0];
    if (file) parseFile(file);
    event.target.value = '';
  };

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : handleClose())}>
      <DialogContent className="max-w-5xl w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar credenciais</DialogTitle>
          <DialogDescription>
            Importe de Bitwarden, LastPass, Chrome/Edge (CSV) ou KeePass (XML). Os dados são
            criptografados no seu dispositivo antes de sair.
          </DialogDescription>
        </DialogHeader>

        {/* Stepper */}
        <div className="flex items-center justify-center gap-2 py-2">
          {STEPS.map((s, idx) => (
            <div key={s.key} className="flex items-center gap-2">
              <div
                className={cn(
                  'flex items-center gap-1.5 text-xs font-medium',
                  idx === stepIndex
                    ? 'text-emerald-600'
                    : idx < stepIndex
                    ? 'text-slate-500'
                    : 'text-slate-300 dark:text-slate-600'
                )}
              >
                <span
                  className={cn(
                    'w-5 h-5 rounded-full flex items-center justify-center text-[10px]',
                    idx < stepIndex
                      ? 'bg-emerald-500 text-white'
                      : idx === stepIndex
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300'
                      : 'bg-slate-100 dark:bg-slate-800'
                  )}
                >
                  {idx < stepIndex ? '✓' : idx + 1}
                </span>
                <span className="hidden sm:inline">{s.label}</span>
              </div>
              {idx < STEPS.length - 1 && <div className="w-4 h-px bg-slate-200 dark:bg-slate-700" />}
            </div>
          ))}
        </div>

        {!keyReady && (
          <div className="flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 p-3 text-sm text-amber-700 dark:text-amber-300">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            Desbloqueie o cofre (sua senha) para poder importar credenciais criptografadas.
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 p-3 text-sm text-rose-700 dark:text-rose-300">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        {/* Step content */}
        <div className="min-h-[180px] py-2">
          {step === 'upload' && (
            <div className="text-center">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-8 hover:border-emerald-400 transition-colors"
              >
                <Upload className="mx-auto h-10 w-10 text-slate-400" />
                <p className="mt-3 text-sm font-medium">Selecionar arquivo CSV ou XML</p>
                <p className="text-xs text-slate-400 mt-1">Máx. 10 MB — nada é enviado sem criptografia</p>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xml,text/csv,text/xml,application/xml"
                onChange={handleFile}
                className="hidden"
              />
              {isBusy && (
                <p className="mt-3 text-sm text-slate-500 flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Lendo arquivo…
                </p>
              )}
            </div>
          )}

          {step === 'mapping' && parsed && (
            <ColumnMappingStep
              columns={parsed.columns}
              mapping={mapping}
              onChange={updateMapping}
              presetName={presetName}
              missingRequired={missingRequired}
              sampleRows={parsed.rows.slice(0, 5)}
            />
          )}

          {step === 'preview' && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-medium">
                  <span className="text-emerald-600">{stats.toImport}</span> de {stats.total} serão importadas
                </span>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                  {commonRoot && (
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <Checkbox checked={stripRoot} onCheckedChange={(c) => setStripRoot(c === true)} />
                      Remover pasta-raiz &quot;{commonRoot}&quot;
                    </label>
                  )}
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <Checkbox checked={skipEmpty} onCheckedChange={(c) => setSkipEmpty(c === true)} />
                    Pular sem senha ({stats.empty})
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <Checkbox checked={skipDuplicates} onCheckedChange={(c) => setSkipDuplicates(c === true)} />
                    Pular duplicadas ({stats.duplicates})
                  </label>
                </div>
              </div>
              <ImportPreviewStep credentials={previewCreds} stats={stats} />
            </div>
          )}

          {step === 'importing' && (
            <div className="py-8 text-center space-y-4">
              <Loader2 className="mx-auto h-10 w-10 animate-spin text-emerald-600" />
              <p className="text-sm font-medium">Importando e criptografando…</p>
              <div className="max-w-sm mx-auto space-y-1">
                <Progress value={progress.total ? (progress.done / progress.total) * 100 : 0} />
                <p className="text-xs text-slate-500">
                  {progress.done} de {progress.total}
                </p>
              </div>
            </div>
          )}

          {step === 'complete' && results && (
            <div className="text-center space-y-4">
              <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
              <p className="text-lg font-semibold">Importação concluída</p>
              <div className="grid grid-cols-3 gap-3 max-w-md mx-auto">
                <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 p-3">
                  <div className="text-2xl font-bold text-emerald-600">{results.success}</div>
                  <div className="text-xs text-emerald-700 dark:text-emerald-400">Sucesso</div>
                </div>
                <div className="rounded-lg bg-rose-50 dark:bg-rose-950/30 p-3">
                  <div className="text-2xl font-bold text-rose-600">{results.errors}</div>
                  <div className="text-xs text-rose-700 dark:text-rose-400">Erros</div>
                </div>
                <div className="rounded-lg bg-slate-100 dark:bg-slate-800 p-3">
                  <div className="text-2xl font-bold">{results.total}</div>
                  <div className="text-xs text-slate-500">Total</div>
                </div>
              </div>
              {results.skipped > 0 && (
                <p className="text-xs text-slate-500">{results.skipped} linha(s) puladas (vazias/duplicadas).</p>
              )}
              {results.details?.length > 0 && (
                <div className="text-left max-h-32 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-700 p-3 text-xs text-rose-600 dark:text-rose-400 space-y-1">
                  {results.details.slice(0, 20).map((d, idx) => (
                    <div key={idx}>Linha {d.index}: {d.error}</div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="flex-row justify-between sm:justify-between">
          <div>
            {step === 'preview' && (
              <Button variant="ghost" onClick={() => setStep('mapping')}>
                Voltar
              </Button>
            )}
            {step === 'complete' && (
              <Button variant="ghost" onClick={reset}>
                Importar outro
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            {step !== 'complete' && step !== 'importing' && (
              <Button variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
            )}
            {step === 'mapping' && (
              <Button
                onClick={() => setStep('preview')}
                disabled={missingRequired.length > 0}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                Continuar
              </Button>
            )}
            {step === 'preview' && (
              <Button
                onClick={runImport}
                disabled={isBusy || !keyReady || stats.toImport === 0}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                <ShieldCheck className="w-4 h-4 mr-2" />
                Importar {stats.toImport}
              </Button>
            )}
            {step === 'complete' && (
              <Button onClick={handleFinish} className="bg-emerald-600 hover:bg-emerald-700">
                Concluir
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
