import { useEffect, useMemo, useState } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X, SlidersHorizontal, Globe, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useSearchIndex } from '@/hooks/useSearchIndex';
import { useRelationGraph } from '@/api/useRelations';
import { format } from 'date-fns';

export default function SearchBar({
  onSearch,
  onFilterChange,
  onSearchScopeChange,
  searchScope = 'folder',
  onSelectResult,
  value = '',
  notes: providedNotes,
}) {
  const [searchTerm, setSearchTerm] = useState(value);
  const [filters, setFilters] = useState({
    text: true,
    url: true,
    image: true,
    word: true,
    pinnedOnly: false
  });
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchHistory, setSearchHistory] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem('searchHistory') || '[]');
    } catch {
      return [];
    }
  });

  const { data: relationGraphResponse = { data: { edges: [] } } } = useRelationGraph();
  const notes = providedNotes || [];
  const relations = relationGraphResponse?.data?.edges || [];
  
  // Usar hook de busca
  const { search, isIndexing, indexedCount } = useSearchIndex(notes, relations);

  useEffect(() => {
    setSearchTerm(value);
  }, [value]);

  // Filtrar resultados de busca
  const searchResults = useMemo(() => {
    if (!searchTerm) return [];

    const results = search(searchTerm, 10);
    
    return results.filter(note => {
      if (!filters[note.type]) return false;
      if (filters.pinnedOnly && !note.pinned) return false;
      return true;
    });
  }, [searchTerm, search, filters]);

  const handleSearch = (value) => {
    setSearchTerm(value);
    if (onSearch) onSearch(value);
    setIsSearchOpen(!!value);
  };

  const handleSelectResult = (note) => {
    // Adicionar ao histórico
    const newHistory = [searchTerm, ...searchHistory.filter(h => h !== searchTerm)].slice(0, 5);
    setSearchHistory(newHistory);
    sessionStorage.setItem('searchHistory', JSON.stringify(newHistory));

    // Callback
    if (onSelectResult) {
      onSelectResult(note);
    }

    setIsSearchOpen(false);
  };

  const handleFilterToggle = (key) => {
    const newFilters = { ...filters, [key]: !filters[key] };
    setFilters(newFilters);
    if (onFilterChange) onFilterChange(newFilters);
  };

  const clearSearch = () => {
    setSearchTerm('');
    if (onSearch) onSearch('');
    setIsSearchOpen(false);
  };

  const activeFiltersCount = Object.entries(filters)
    .filter(([key, value]) => key !== 'pinnedOnly' && !value)
    .length;

  return (
    <div className="flex flex-col gap-2">
      {/* Linha 1: Campo de pesquisa */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          value={searchTerm}
          onChange={(e) => handleSearch(e.target.value)}
          onFocus={() => setIsSearchOpen(true)}
          placeholder="Buscar notas, contextos, relações..."
          className="pl-10 pr-10 bg-white dark:bg-slate-900/90 border-slate-200 dark:border-slate-700/60"
        />
        {searchTerm && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
            onClick={clearSearch}
          >
            <X className="w-4 h-4" />
          </Button>
        )}

        {/* Search Results Dropdown */}
        {isSearchOpen && (searchTerm || searchHistory.length > 0) && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/70 rounded-lg shadow-lg z-50">
            {isIndexing && (
              <div className="p-3 flex items-center gap-2 text-sm text-slate-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                Indexando {indexedCount} notas...
              </div>
            )}

            {searchTerm ? (
              <>
                {searchResults.length > 0 ? (
                  <div className="max-h-64 md:max-h-96 overflow-y-auto">
                    {/* Resultados diretos */}
                    {searchResults.filter(r => !r.isRelated).length > 0 && (
                      <div>
                        <div className="px-3 py-2 text-xs font-medium text-slate-500 uppercase tracking-wide">
                          Resultados
                        </div>
                        {searchResults
                          .filter(r => !r.isRelated)
                          .map(note => (
                            <button
                              key={note.id}
                              onClick={() => handleSelectResult(note)}
                              className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors border-b border-slate-100 dark:border-slate-800/80 last:border-b-0"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                                    {note.title}
                                  </p>
                                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                    {note.content?.substring(0, 80)}...
                                  </p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 px-2 py-0.5 rounded">
                                      {note.type}
                                    </span>
                                    <span className="text-xs text-slate-400">
                                      {format(new Date(note.createdAt), 'dd/MM')}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </button>
                          ))}
                      </div>
                    )}

                    {/* Notas relacionadas */}
                    {searchResults.filter(r => r.isRelated).length > 0 && (
                      <div>
                        <div className="px-3 py-2 text-xs font-medium text-slate-500 uppercase tracking-wide">
                          Relacionadas
                        </div>
                        {searchResults
                          .filter(r => r.isRelated)
                          .map(note => (
                            <button
                              key={note.id}
                              onClick={() => handleSelectResult(note)}
                              className="w-full text-left px-3 py-2 hover:bg-amber-50 dark:hover:bg-amber-950/20 transition-colors border-b border-slate-100 dark:border-slate-800/80 last:border-b-0"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                                    {note.title}
                                  </p>
                                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                    {note.content?.substring(0, 80)}...
                                  </p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded">
                                      Relacionada
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </button>
                          ))}
                      </div>
                    )}
                  </div>
                ) : (
                    <div className="p-4 text-center text-sm text-slate-500 dark:text-slate-400">
                    Nenhuma nota encontrada
                  </div>
                )}
              </>
            ) : (
              <>
                {searchHistory.length > 0 && (
                  <div className="p-3 border-b border-slate-200 dark:border-slate-800">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
                      Buscas recentes
                    </p>
                    <div className="space-y-1">
                      {searchHistory.map((term, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSearch(term)}
                          className="w-full text-left px-2 py-1 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded transition-colors"
                        >
                          {term}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Linha 2: Botões */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          className={cn(
            "relative",
            searchScope === 'global' && "bg-indigo-100 border-indigo-300 text-indigo-700"
          )}
          onClick={() => {
            const newScope = searchScope === 'folder' ? 'global' : 'folder';
            if (onSearchScopeChange) onSearchScopeChange(newScope);
          }}
          title={searchScope === 'global' ? 'Pesquisando em todas as pastas' : 'Pesquisar em todas as pastas'}
        >
          <Globe className="w-4 h-4" />
        </Button>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="icon" className="relative">
              <SlidersHorizontal className="w-4 h-4" />
              {activeFiltersCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-indigo-600 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                  {activeFiltersCount}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56" align="end">
            <div className="space-y-3">
              <h4 className="font-medium text-sm text-slate-900 dark:text-slate-100">Tipos de nota</h4>
              <div className="space-y-2">
                {[
                  { key: 'text', label: 'Texto' },
                  { key: 'url', label: 'Links' },
                  { key: 'image', label: 'Imagens' },
                  { key: 'word', label: 'Palavras' }
                ].map(({ key, label }) => (
                  <div key={key} className="flex items-center space-x-2">
                    <Checkbox
                      id={key}
                      checked={filters[key]}
                      onCheckedChange={() => handleFilterToggle(key)}
                    />
                    <Label htmlFor={key} className="text-sm cursor-pointer">
                      {label}
                    </Label>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="pinnedOnly"
                    checked={filters.pinnedOnly}
                    onCheckedChange={() => handleFilterToggle('pinnedOnly')}
                  />
                  <Label htmlFor="pinnedOnly" className="text-sm cursor-pointer">
                    Apenas fixadas
                  </Label>
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
