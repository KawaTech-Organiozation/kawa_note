import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Wand2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { copyWithAutoClear } from '@/lib/clipboard';
import {
  generatePassword,
  DEFAULT_GENERATOR_OPTIONS
} from '@/lib/passwordGenerator';

/**
 * Password generator popover.
 *
 * Two modes, both sharing the exact same controls:
 * - Field mode: pass `onUse` — the apply button fills the caller's password field.
 * - Standalone mode: omit `onUse` — the apply button copies to the clipboard
 *   (auto-clearing), so the generator works on its own from a toolbar.
 *
 * @param {Object} props
 * @param {(password: string) => void} [props.onUse]
 * @param {string} [props.triggerClassName]
 * @param {React.ReactNode} [props.trigger] - custom trigger (e.g. a labeled button)
 * @returns {JSX.Element}
 */
export default function PasswordGenerator({ onUse, triggerClassName, trigger }) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState(DEFAULT_GENERATOR_OPTIONS);
  const [preview, setPreview] = useState(() => generatePassword(DEFAULT_GENERATOR_OPTIONS));

  const regenerate = (next = options) => {
    setPreview(generatePassword(next));
  };

  const setOption = (key, value) => {
    const next = { ...options, [key]: value };
    // Never allow every character class to be off.
    if (!next.lowercase && !next.uppercase && !next.numbers && !next.symbols) {
      next.lowercase = true;
    }
    setOptions(next);
    regenerate(next);
  };

  const apply = async () => {
    if (onUse) {
      onUse(preview);
      setOpen(false);
      return;
    }
    // Standalone: copy the generated password.
    const ok = await copyWithAutoClear(preview);
    if (ok) {
      toast.success('Senha copiada — será limpa da área de transferência em 20s');
      setOpen(false);
    } else {
      toast.error('Não foi possível copiar');
    }
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) regenerate();
      }}
    >
      <PopoverTrigger asChild>
        {trigger || (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={triggerClassName}
            title="Gerar senha"
            aria-label="Gerar senha"
          >
            <Wand2 className="w-4 h-4" />
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 space-y-4">
        <div className="flex items-center gap-2">
          <code className="flex-1 rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-1.5 text-sm font-mono break-all">
            {preview}
          </code>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => regenerate()}
            title="Gerar outra"
            aria-label="Gerar outra"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Comprimento</Label>
            <span className="text-xs font-medium tabular-nums">{options.length}</span>
          </div>
          <Slider
            min={8}
            max={64}
            step={1}
            value={[options.length]}
            onValueChange={([value]) => setOption('length', value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          {[
            ['uppercase', 'Maiúsculas (A-Z)'],
            ['lowercase', 'Minúsculas (a-z)'],
            ['numbers', 'Números (0-9)'],
            ['symbols', 'Símbolos (!@#)'],
            ['avoidAmbiguous', 'Evitar ambíguos']
          ].map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 text-xs cursor-pointer">
              <Checkbox
                checked={options[key]}
                onCheckedChange={(checked) => setOption(key, checked === true)}
              />
              {label}
            </label>
          ))}
        </div>

        <Button type="button" className="w-full" onClick={apply}>
          {onUse ? 'Usar esta senha' : 'Copiar senha'}
        </Button>
      </PopoverContent>
    </Popover>
  );
}
