import { useState, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { FOLDER_ICON_SUGGESTIONS, getFolderIcon } from '@/lib/folderIconHelper';

/**
 * IconPickerPopover - Popover para selecionar ícone de pasta
 * @param {string} currentIcon - Ícone atual da pasta
 * @param {Function} onIconChange - Callback ao mudar ícone
 * @param {React.ReactNode} trigger - Elemento trigger (opcional)
 */
export default function IconPickerPopover({ currentIcon = 'Folder', onIconChange, trigger }) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredIcons = useMemo(() => {
    if (!searchTerm) return FOLDER_ICON_SUGGESTIONS;
    
    const term = searchTerm.toLowerCase();
    return FOLDER_ICON_SUGGESTIONS.filter(icon => 
      icon.toLowerCase().includes(term)
    );
  }, [searchTerm]);

  const handleIconSelect = (iconName) => {
    onIconChange(iconName);
    setOpen(false);
    setSearchTerm('');
  };

  const renderIcon = (iconName) => {
    const Icon = getFolderIcon(iconName);
    return <Icon className="w-5 h-5" />;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm" className="text-xs">
            Alterar Ícone
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-80 p-3" align="start">
        <div className="space-y-3">
          <p className="text-xs font-medium text-slate-600 uppercase tracking-wide">
            Ícone da Pasta
          </p>

          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Buscar ícone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>

          <ScrollArea className="h-64 border border-slate-200 rounded-lg p-2">
            <div className="grid grid-cols-5 gap-1">
              {filteredIcons.map((iconName) => (
                <button
                  key={iconName}
                  onClick={() => handleIconSelect(iconName)}
                  className={cn(
                    "flex flex-col items-center justify-center gap-0.5 p-1.5 rounded-lg transition-all hover:bg-slate-100",
                    currentIcon === iconName && "bg-indigo-100 ring-2 ring-indigo-400"
                  )}
                  title={iconName}
                >
                  <div className="relative">
                    {renderIcon(iconName)}
                    {currentIcon === iconName && (
                      <Check className="w-3 h-3 text-indigo-600 absolute -bottom-1 -right-1 bg-white rounded-full" />
                    )}
                  </div>
                  <span className="text-[9px] text-slate-500 leading-tight text-center truncate w-full">
                    {iconName.replace(/([A-Z])/g, ' $1').trim()}
                  </span>
                </button>
              ))}
            </div>
          </ScrollArea>

          {filteredIcons.length === 0 && (
            <p className="text-xs text-slate-500 text-center py-4">
              Nenhum ícone encontrado
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
