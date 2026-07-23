import { Button } from '@/components/ui/button';
import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';

const THEME_ORDER = ['system', 'light', 'dark'];

function getNextTheme(currentTheme) {
  const index = THEME_ORDER.indexOf(currentTheme);
  return THEME_ORDER[(index + 1) % THEME_ORDER.length];
}

export default function ThemeToggle() {
  const { theme = 'system', setTheme } = useTheme();

  const Icon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor;
  const label = theme === 'dark' ? 'Tema escuro' : theme === 'light' ? 'Tema claro' : 'Tema do sistema';

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setTheme(getNextTheme(theme))}
      className="w-full justify-start text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-fuchsia-100 dark:hover:bg-fuchsia-950/30"
      title={label}
    >
      <Icon className="w-4 h-4 mr-2" />
      {label}
    </Button>
  );
}
