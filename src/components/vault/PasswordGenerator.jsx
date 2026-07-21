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
import {
  generatePassword,
  DEFAULT_GENERATOR_OPTIONS
} from '@/lib/passwordGenerator';

/**
 * Password generator popover. Calls `onUse(password)` when the user applies one.
 * @param {{ onUse: (password: string) => void, triggerClassName?: string }} props
 * @returns {JSX.Element}
 */
export default function PasswordGenerator({ onUse, triggerClassName }) {
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

  const apply = () => {
    onUse(preview);
    setOpen(false);
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
          Usar esta senha
        </Button>
      </PopoverContent>
    </Popover>
  );
}
