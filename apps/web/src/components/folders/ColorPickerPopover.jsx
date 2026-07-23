import { useState } from 'react';
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const FOLDER_COLORS = [
  { name: 'slate', bg: 'bg-slate-500', label: 'Cinza' },
  { name: 'blue', bg: 'bg-blue-500', label: 'Azul' },
  { name: 'purple', bg: 'bg-purple-500', label: 'Roxo' },
  { name: 'green', bg: 'bg-green-500', label: 'Verde' },
  { name: 'amber', bg: 'bg-amber-500', label: 'Âmbar' },
  { name: 'red', bg: 'bg-red-500', label: 'Vermelho' },
  { name: 'pink', bg: 'bg-pink-500', label: 'Rosa' }
];

/**
 * ColorPickerPopover - Popover para selecionar cor de pasta
 * @param {string} currentColor - Cor atual da pasta
 * @param {Function} onColorChange - Callback ao mudar cor
 * @param {React.ReactNode} trigger - Elemento trigger (opcional)
 */
export default function ColorPickerPopover({ currentColor = 'slate', onColorChange, trigger }) {
  const [open, setOpen] = useState(false);

  const handleColorSelect = (colorName) => {
    onColorChange(colorName);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm" className="text-xs">
            Alterar Cor
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-48 p-3" align="start">
        <div className="space-y-2">
          <p className="text-xs font-medium text-slate-600 uppercase tracking-wide">
            Cor da Pasta
          </p>
          <div className="grid grid-cols-4 gap-2">
            {FOLDER_COLORS.map(({ name, bg, label }) => (
              <button
                key={name}
                onClick={() => handleColorSelect(name)}
                className={cn(
                  "h-8 w-8 rounded-lg transition-all flex items-center justify-center",
                  bg,
                  currentColor === name && "ring-2 ring-offset-2 ring-slate-400"
                )}
                title={label}
              >
                {currentColor === name && (
                  <Check className="w-4 h-4 text-white" />
                )}
              </button>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
