import { FileText, FolderOpen, KeyRound, Search, User } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * BottomNav - Navegação inferior para mobile
 * Padrão nativo mobile com 5 itens principais
 *
 * O item "Cofre" reusa o ícone/cor da entrada do Cofre no desktop
 * (KeyRound + emerald) para manter a associação visual entre as duas telas.
 *
 * @param {Object} props - Props do componente
 * @param {string} props.activeTab - Tab ativo ('notes' | 'folders' | 'search' | 'vault' | 'profile')
 * @param {Function} props.onTabChange - Callback ao mudar de tab
 * @returns {JSX.Element} Bottom navigation bar
 */
export default function BottomNav({ activeTab = 'notes', onTabChange = () => {} }) {
  // Ordem por alcance do polegar: o que se usa mais fica à direita.
  // "Pastas" é contextual — abre as pastas da área em que o usuário está
  // (Notas ou Cofre); quem decide o que abrir é a página.
  const tabs = [
    { id: 'profile', label: 'Perfil', icon: User },
    { id: 'search', label: 'Busca', icon: Search },
    { id: 'vault', label: 'Cofre', icon: KeyRound },
    { id: 'notes', label: 'Notas', icon: FileText },
    { id: 'folders', label: 'Pastas', icon: FolderOpen }
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 h-16 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-around md:hidden safe-area-inset-b">
      {tabs.map(tab => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        const isVault = tab.id === 'vault';

        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "flex flex-col items-center justify-center h-full flex-1 min-w-0 transition-colors",
              isActive
                ? (isVault
                    ? "text-emerald-600 dark:text-emerald-300"
                    : "text-blue-600 dark:text-blue-400")
                : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            )}
            aria-label={tab.label}
            aria-current={isActive ? 'page' : undefined}
          >
            <Icon className="w-6 h-6 mb-1 shrink-0" />
            {/* truncate + min-w-0: com 5 abas, 320px é o pior caso de largura */}
            <span className="text-[11px] font-medium truncate max-w-full px-0.5">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
