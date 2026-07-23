import { useRef, useEffect } from 'react';
import { FileText, Plus, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * MobileNoteStrip - Barra de navegação rápida entre notas para mobile
 *
 * Exibida acima da BottomNav quando uma nota está aberta.
 * Mostra chips horizontais scrolláveis de todas as notas filtradas.
 * A nota ativa é destacada e auto-scrollada para o centro.
 *
 * @param {Object} props
 * @param {Array}    props.tabs          - Lista de tabs/notas filtradas (mesmo array do Home)
 * @param {Object}   props.activeTab     - Tab atualmente ativa
 * @param {Function} props.onSelectTab   - Callback ao tocar em uma nota
 * @param {Function} props.onBack        - Callback do botão "← Voltar" (volta para lista)
 * @param {Function} props.onNewNote     - Callback para criar nova nota
 * @returns {JSX.Element|null}
 */
export default function MobileNoteStrip({ tabs = [], activeTab, onSelectTab, onBack, onNewNote }) {
  const stripRef = useRef(null);
  const activeChipRef = useRef(null);

  // Auto-scroll o chip ativo para o centro da barra
  useEffect(() => {
    if (!activeChipRef.current || !stripRef.current) return;
    const strip = stripRef.current;
    const chip = activeChipRef.current;
    const chipLeft = chip.offsetLeft;
    const chipWidth = chip.offsetWidth;
    const stripWidth = strip.offsetWidth;
    strip.scrollTo({
      left: chipLeft - stripWidth / 2 + chipWidth / 2,
      behavior: 'smooth'
    });
  }, [activeTab?.id]);

  // Só exibe quando há um editor aberto (activeTab existe e é nota ou quickEditor)
  if (!activeTab) return null;

  const noteCount = tabs.filter(t => t.type === 'note').length;

  return (
    <div className="fixed bottom-16 left-0 right-0 z-40 bg-white border-t border-slate-200 md:hidden">
      <div className="flex items-center gap-1 px-2 py-1.5">
        {/* Botão Voltar → volta para lista */}
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 shrink-0 text-slate-500"
          onClick={onBack}
          aria-label="Voltar para lista"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>

        {/* Chips das notas — scroll horizontal */}
        <div
          ref={stripRef}
          className="flex-1 flex items-center gap-1.5 overflow-x-auto scrollbar-none"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {tabs.map((tab) => {
            const isActive = activeTab?.id === tab.id;
            return (
              <button
                key={tab.id}
                ref={isActive ? activeChipRef : null}
                onClick={() => onSelectTab(tab)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap shrink-0 transition-all',
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 active:bg-slate-300'
                )}
                aria-current={isActive ? 'page' : undefined}
              >
                {tab.type === 'quickEditor' ? (
                  <Plus className="w-3 h-3" />
                ) : (
                  <FileText className="w-3 h-3" />
                )}
                <span className="max-w-[120px] truncate">{tab.title}</span>
              </button>
            );
          })}
        </div>

        {/* Contador + botão nova nota */}
        <div className="flex items-center gap-1 shrink-0">
          {noteCount > 0 && (
            <span className="text-xs text-slate-400 font-medium px-1">
              {tabs.findIndex(t => t.id === activeTab?.id) + 1}/{tabs.length}
            </span>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-blue-600"
            onClick={onNewNote}
            aria-label="Nova nota"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
