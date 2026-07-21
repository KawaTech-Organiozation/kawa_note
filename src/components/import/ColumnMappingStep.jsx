import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Wand2 } from 'lucide-react';
import { TARGET_FIELDS } from '@/lib/importPresets';
import { FOLDER_PATH_COLUMN } from '@/lib/importParsers';

const NONE = '__none__';

function columnLabel(col) {
  return col === FOLDER_PATH_COLUMN ? 'Pasta (hierarquia do arquivo)' : col;
}

/**
 * Interactive column → target mapping ("reorganização de colunas").
 * @param {Object} props
 * @param {string[]} props.columns
 * @param {Record<string,string>} props.mapping
 * @param {(target: string, source: string) => void} props.onChange
 * @param {string} props.presetName
 * @param {string[]} props.missingRequired
 * @param {Array} props.sampleRows - first few raw rows, for a value hint
 * @returns {JSX.Element}
 */
export default function ColumnMappingStep({ columns, mapping, onChange, presetName, missingRequired, sampleRows = [] }) {
  const sample = (col) => {
    for (const row of sampleRows) {
      if (row[col]) return String(row[col]);
    }
    return '';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
        <Wand2 className="w-4 h-4 text-emerald-600" />
        Origem detectada: <Badge variant="secondary">{presetName}</Badge>
        <span className="text-slate-400">— ajuste o mapeamento se necessário.</span>
      </div>

      <div className="space-y-2">
        {TARGET_FIELDS.map((field) => {
          const value = mapping[field.key] || NONE;
          const isMissing = field.required && !mapping[field.key];
          return (
            <div key={field.key} className="grid grid-cols-[140px_1fr] items-center gap-3">
              <label className="text-sm font-medium flex items-center gap-1">
                {field.label}
                {field.required && <span className="text-rose-500">*</span>}
              </label>
              <div>
                <Select
                  value={value}
                  onValueChange={(val) => onChange(field.key, val === NONE ? '' : val)}
                >
                  <SelectTrigger className={isMissing ? 'border-rose-400' : ''}>
                    <SelectValue placeholder="— não importar —" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>— não importar —</SelectItem>
                    {columns.map((col) => (
                      <SelectItem key={col} value={col}>
                        {columnLabel(col)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {mapping[field.key] && sample(mapping[field.key]) && (
                  <p className="mt-1 text-xs text-slate-400 truncate">
                    ex.: {field.key === 'password' ? '••••••' : sample(mapping[field.key])}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {missingRequired.length > 0 && (
        <div className="flex items-start gap-2 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 p-3 text-sm text-rose-700 dark:text-rose-300">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>
            Mapeie os campos obrigatórios para continuar:{' '}
            <strong>
              {missingRequired
                .map((t) => TARGET_FIELDS.find((f) => f.key === t)?.label || t)
                .join(', ')}
            </strong>
            .
          </span>
        </div>
      )}
    </div>
  );
}
