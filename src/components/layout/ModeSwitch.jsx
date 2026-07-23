import { FileText, KeyRound } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * ModeSwitch - Alterna entre os dois modos do app: Notas e Cofre.
 *
 * Segmented control usado no desktop. Substitui a antiga entrada "Cofre de
 * Senha" da lista de pastas da Sidebar, tornando a troca de modo explícita e
 * bidirecional (a entrada anterior era um caminho só de ida).
 *
 * Em modo colapsado renderiza apenas os ícones, empilhados.
 *
 * @param {Object} props
 * @param {'notes'|'vault'} props.mode - Modo ativo
 * @param {Function} props.onModeChange - Callback recebendo o novo modo
 * @param {boolean} [props.isCollapsed=false] - Sidebar colapsada (só ícones)
 * @param {string} [props.className] - Classes adicionais do container
 * @returns {JSX.Element}
 */
export default function ModeSwitch({ mode = 'notes', onModeChange = () => {}, isCollapsed = false, className }) {
  const modes = [
    { id: 'notes', label: 'Notas', icon: FileText, activeClass: 'text-indigo-700 dark:text-indigo-300' },
    { id: 'vault', label: 'Cofre', icon: KeyRound, activeClass: 'text-emerald-700 dark:text-emerald-300' }
  ];

  return (
    <div
      role="tablist"
      aria-label="Alternar entre Notas e Cofre"
      className={cn(
        'flex gap-1 rounded-lg bg-slate-100 dark:bg-slate-800/60 p-1',
        isCollapsed ? 'flex-col' : 'flex-row',
        className
      )}
    >
      {modes.map((item) => {
        const Icon = item.icon;
        const isActive = mode === item.id;

        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-label={item.label}
            title={item.label}
            onClick={() => onModeChange(item.id)}
            className={cn(
              'flex items-center justify-center gap-1.5 rounded-md text-sm font-medium transition-colors',
              isCollapsed ? 'p-2' : 'flex-1 px-2 py-1.5',
              isActive
                ? cn('bg-white dark:bg-slate-900 shadow-sm', item.activeClass)
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100'
            )}
          >
            <Icon className={cn('shrink-0', isCollapsed ? 'w-5 h-5' : 'w-4 h-4')} />
            {!isCollapsed && <span>{item.label}</span>}
          </button>
        );
      })}
    </div>
  );
}
