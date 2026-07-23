import React, { useState, useMemo } from 'react';
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { X, Tag, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Tag Manager component - manages note tags with autocomplete
 * @param {Object} props
 * @param {string[]} props.tags - Current tags
 * @param {Function} props.onChange - Callback when tags change
 * @param {string[]} [props.allTags] - All available tags for autocomplete
 * @param {string[]} [props.suggestedTags] - Auto-suggested tags from metadata
 * @returns {JSX.Element}
 */
export default function TagManager({ tags = [], onChange, allTags = [], suggestedTags = [] }) {
  const [inputValue, setInputValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  // Filter autocomplete suggestions
  const suggestions = useMemo(() => {
    if (!inputValue.trim()) return [];
    
    const search = inputValue.toLowerCase();
    return allTags
      .filter(tag => 
        tag.toLowerCase().includes(search) && 
        !tags.includes(tag)
      )
      .slice(0, 5);
  }, [inputValue, allTags, tags]);

  // Add tag
  const addTag = (tag) => {
    const trimmed = tag.trim();
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed]);
      setInputValue('');
    }
  };

  // Remove tag
  const removeTag = (tagToRemove) => {
    onChange(tags.filter(t => t !== tagToRemove));
  };

  // Handle key down
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (suggestions.length > 0) {
        addTag(suggestions[0]);
      } else if (inputValue.trim()) {
        addTag(inputValue);
      }
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  };

  // Suggested tags not yet added
  const availableSuggestions = suggestedTags.filter(tag => !tags.includes(tag));

  return (
    <div className="space-y-3">
      {/* Current Tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag, idx) => (
            <Badge
              key={idx}
              variant="secondary"
              className="pl-2 pr-1 py-1 text-xs bg-indigo-100 text-indigo-700 border-indigo-200"
            >
              <Tag className="w-3 h-3 mr-1" />
              {tag}
              <button
                onClick={() => removeTag(tag)}
                className="ml-1 hover:bg-indigo-200 rounded-full p-0.5 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="relative">
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 200)}
          placeholder="Adicionar tag..."
          className="text-sm"
        />

        {/* Autocomplete Dropdown */}
        {isFocused && suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-10 overflow-hidden">
            {suggestions.map((suggestion, idx) => (
              <button
                key={idx}
                onClick={() => addTag(suggestion)}
                className="w-full px-3 py-2 text-left text-sm hover:bg-slate-100 transition-colors flex items-center gap-2"
              >
                <Tag className="w-3 h-3 text-slate-400" />
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Suggested Tags */}
      {availableSuggestions.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-slate-500 flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            Sugestões automáticas
          </p>
          <div className="flex flex-wrap gap-2">
            {availableSuggestions.map((tag, idx) => (
              <Badge
                key={idx}
                variant="outline"
                className={cn(
                  "cursor-pointer text-xs border-dashed hover:bg-indigo-50 hover:border-indigo-300 transition-colors",
                  "text-slate-600 border-slate-300"
                )}
                onClick={() => addTag(tag)}
              >
                <Sparkles className="w-3 h-3 mr-1" />
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-slate-400">
        Digite e pressione Enter para adicionar • Backspace para remover
      </p>
    </div>
  );
}
