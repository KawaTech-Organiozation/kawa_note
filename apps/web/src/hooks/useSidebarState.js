import { useState, useEffect } from 'react';

const STORAGE_KEY = 'kawa_sidebar_collapsed';

/**
 * Hook to manage sidebar collapsed state with localStorage persistence
 * @returns {[boolean, (collapsed: boolean) => void]} Tuple of [isCollapsed, setIsCollapsed]
 */
export function useSidebarState() {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, String(isCollapsed));
    } catch (error) {
      console.warn('Failed to persist sidebar state:', error);
    }
  }, [isCollapsed]);

  return [isCollapsed, setIsCollapsed];
}
