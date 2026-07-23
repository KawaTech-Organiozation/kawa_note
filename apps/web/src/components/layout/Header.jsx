import { Menu, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import SearchBar from '@/components/notes/SearchBar';

/**
 * Header - Cabeçalho responsivo com navegação e busca
 * 
 * @param {Object} props - Props do componente
 * @param {string} props.title - Título do header
 * @param {string} props.subtitle - Subtítulo (contagem de notas)
 * @param {boolean} props.isMobile - Se está em modo mobile
 * @param {Function} props.onOpenSidebar - Callback para abrir sidebar (mobile)
 * @param {boolean} props.showNavButtons - Se deve mostrar botões de navegação
 * @param {Function} props.onNavigatePrev - Callback para navegar anterior
 * @param {Function} props.onNavigateNext - Callback para navegar próximo
 * @param {number} props.totalNotes - Total de notas
 * @param {Function} props.onSearch - Callback de busca
 * @param {Function} props.onFilterChange - Callback de mudança de filtros
 * @param {Function} props.onSearchScopeChange - Callback de mudança de escopo
 * @param {string} props.searchScope - Escopo de busca atual
 * @param {Function} props.onSelectResult - Callback ao selecionar resultado
 * @returns {JSX.Element} Header component
 */
export default function Header({
  title = 'Todas as Notas',
  subtitle = '0 notas',
  isMobile = false,
  onOpenSidebar = () => {},
  showNavButtons = true,
  onNavigatePrev = () => {},
  onNavigateNext = () => {},
  totalNotes = 0,
  onSearch = () => {},
  onFilterChange = () => {},
  onSearchScopeChange = () => {},
  searchScope = 'global',
  onSelectResult = () => {}
}) {
  return (
    <div className="border-b border-slate-200 bg-white">
      {/* Título + SearchBar na mesma linha */}
      <div className="flex items-center gap-2 px-3 md:px-6 py-3">
        {/* Hamburger menu - Mobile only */}
        {isMobile && (
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden h-10 w-10 shrink-0"
            onClick={onOpenSidebar}
          >
            <Menu className="w-5 h-5" />
          </Button>
        )}

        {showNavButtons && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={onNavigatePrev}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
        )}

        <div className="shrink-0">
          <h1 className="text-xl font-bold text-foreground leading-tight">
            {title}
          </h1>
          <p className="text-xs text-slate-500">
            {subtitle}
          </p>
        </div>

        {showNavButtons && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={onNavigateNext}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        )}

        {/* SearchBar inline */}
        <div className="flex-1">
          <SearchBar
            onSearch={onSearch}
            onFilterChange={onFilterChange}
            onSearchScopeChange={onSearchScopeChange}
            searchScope={searchScope}
            onSelectResult={onSelectResult}
          />
        </div>

        <div className="sm:flex hidden items-center gap-2 text-sm text-slate-500 shrink-0">
          <Sparkles className="w-4 h-4" />
          <span>{totalNotes} total</span>
        </div>
      </div>
    </div>
  );
}
