import { useState, useCallback } from 'react';
import { useIsMobile } from './useMobile';

/**
 * useMobileLayout - Centraliza toda a lógica de estado do layout mobile
 * Encapsula: isMobile, isSidebarOpen, activeBottomTab
 * 
 * @returns {Object} Layout state e setters
 * @returns {boolean} isMobile - Detecta se está em viewport mobile (< 768px)
 * @returns {boolean} isSidebarOpen - Estado do drawer sidebar em mobile
 * @returns {Function} openSidebar - Abre o drawer
 * @returns {Function} closeSidebar - Fecha o drawer
 * @returns {Function} toggleSidebar - Alterna estado do drawer
 * @returns {string} activeBottomTab - Tab ativo da bottom nav ('notes' | 'folders' | 'search' | 'profile')
 * @returns {Function} setActiveBottomTab - Define tab ativo
 */
export function useMobileLayout() {
  const isMobile = useIsMobile();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeBottomTab, setActiveBottomTab] = useState('notes');

  const openSidebar = useCallback(() => {
    setIsSidebarOpen(true);
  }, []);

  const closeSidebar = useCallback(() => {
    setIsSidebarOpen(false);
  }, []);

  const toggleSidebar = useCallback(() => {
    setIsSidebarOpen(prev => !prev);
  }, []);

  return {
    isMobile,
    isSidebarOpen,
    openSidebar,
    closeSidebar,
    toggleSidebar,
    activeBottomTab,
    setActiveBottomTab
  };
}
