import React from 'react';
import { Button } from "@/components/ui/button";
import { X, FileText, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

export default function TabBar({ tabs, activeTab, onSelectTab, onCloseTab, onNavigatePrev, onNavigateNext, onNewTab }) {
  if (tabs.length === 0 && !onNewTab) return null;

  return (
    <div className="h-10 bg-slate-100 border-b border-slate-200 flex items-center gap-1 px-2 overflow-x-auto">
      {/* Navigation and New Tab Buttons */}
      <div className="flex items-center gap-1 shrink-0 mr-2">
        {tabs.length > 1 && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 md:h-7 md:w-7 min-h-[44px] min-w-[44px] md:min-h-auto md:min-w-auto"
              onClick={onNavigatePrev}
              title="Aba anterior (Ctrl+Shift+Tab)"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 md:h-7 md:w-7 min-h-[44px] min-w-[44px] md:min-h-auto md:min-w-auto"
              onClick={onNavigateNext}
              title="Próxima aba (Ctrl+Tab)"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </>
        )}
        {onNewTab && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 md:h-7 md:w-7 min-h-[44px] min-w-[44px] md:min-h-auto md:min-w-auto text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
            onClick={onNewTab}
            title="Nova nota (Ctrl+N)"
          >
            <Plus className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 flex-1 overflow-x-auto">
        <AnimatePresence mode="popLayout">
          {tabs.map((tab) => (
            <motion.div
              key={tab.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              layout
            >
              <div
                onClick={() => onSelectTab(tab)}
                className={cn(
                  "group flex items-center gap-2 px-3 h-8 rounded-md cursor-pointer transition-colors text-sm whitespace-nowrap",
                  activeTab?.id === tab.id
                    ? "bg-white border border-slate-200 text-slate-900"
                    : "text-slate-600 hover:bg-slate-200"
                )}
              >
                {tab.type === 'quickEditor' ? (
                  <Plus className="w-3 h-3 shrink-0" />
                ) : (
                  <FileText className="w-3 h-3 shrink-0" />
                )}
                <span className="max-w-[120px] truncate">{tab.title}</span>
                {tab.type === 'quickEditor' && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4 ml-1 opacity-0 group-hover:opacity-100 min-h-[44px] min-w-[44px] md:min-h-auto md:min-w-auto"
                    onClick={(e) => {
                      e.stopPropagation();
                      onCloseTab(tab.id);
                    }}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
