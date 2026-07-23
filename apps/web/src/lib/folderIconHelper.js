/**
 * folderIconHelper.js - Helper para renderizar ícones de pasta com fallback
 * Garante que ícones inválidos do Lucide não causem crash
 */

import * as LucideIcons from 'lucide-react';

/**
 * Retorna o componente de ícone Lucide ou fallback se inválido
 * @param {string} iconName - Nome do ícone Lucide (ex: 'FolderOpen', 'Star')
 * @returns {React.ComponentType} Componente de ícone
 */
export function getFolderIcon(iconName) {
  if (!iconName || typeof iconName !== 'string') {
    return LucideIcons.Folder;
  }

  // Tentar obter o ícone do Lucide
  const Icon = LucideIcons[iconName];

  // Lucide 0.400+ usa forwardRef (typeof === 'object'), não 'function'
  if (!Icon) {
    return LucideIcons.Folder;
  }

  return Icon;
}

/**
 * Lista curada de ícones recomendados para pastas (validados no Lucide React v0.400+)
 */
export const FOLDER_ICON_SUGGESTIONS = [
  // Pastas
  'Folder',
  'FolderOpen',
  'FolderLock',
  'FolderHeart',
  'FolderCheck',
  'FolderCode',
  'FolderGit2',
  'FolderKanban',
  'FolderSearch',

  // Documentos & leitura
  'BookOpen',
  'Book',
  'BookMarked',
  'BookText',
  'Notebook',
  'NotebookPen',
  'FileText',
  'Files',
  'ClipboardList',

  // Trabalho & produtividade
  'Briefcase',
  'BriefcaseBusiness',
  'LayoutDashboard',
  'KanbanSquare',
  'ListChecks',
  'CheckCircle2',
  'CalendarDays',
  'Clock',
  'Timer',

  // Criatividade & arte
  'Palette',
  'Pen',
  'PenLine',
  'Pencil',
  'Brush',
  'ImagePlus',
  'Camera',
  'Music',
  'Mic',
  'Film',

  // Tech & código
  'Code2',
  'CodeXml',
  'Terminal',
  'Database',
  'Server',
  'Cpu',
  'Bot',
  'Globe',
  'Wifi',
  'Webhook',

  // Nuvem & arquivos
  'Cloud',
  'CloudUpload',
  'CloudDownload',
  'Archive',
  'Package',
  'Inbox',
  'Send',
  'MailOpen',

  // Favoritos & social
  'Star',
  'Heart',
  'Bookmark',
  'Trophy',
  'Medal',
  'ThumbsUp',
  'Smile',
  'Users',
  'User',
  'UserCircle',

  // Segurança
  'Lock',
  'LockOpen',
  'ShieldCheck',
  'Shield',
  'Eye',
  'EyeOff',

  // Natureza & misc
  'Leaf',
  'TreePine',
  'Sun',
  'Moon',
  'Zap',
  'Flame',
  'Sparkles',
  'Rocket',
  'Globe2',
  'Map',
  'MapPin',

  // Configurações & ferramentas
  'Settings',
  'Settings2',
  'Wrench',
  'Sliders',
  'SlidersHorizontal',
  'ToggleLeft',
  'Layers',
  'LayoutGrid',
  'Grid3x3',
  'List',
  'AlignLeft',

  // Dados & análise
  'BarChart2',
  'LineChart',
  'PieChart',
  'TrendingUp',
  'Activity',
  'Target',
  'Sigma',
  'Calculator',

  // Comunicação
  'MessageCircle',
  'MessageSquare',
  'Bell',
  'BellRing',
  'Share2',
  'Link',
  'AtSign',
  'Hash',
  'Phone',
];
