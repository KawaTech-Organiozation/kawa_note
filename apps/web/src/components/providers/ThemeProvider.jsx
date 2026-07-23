import { ThemeProvider as NextThemesProvider } from 'next-themes';

/**
 * @param {Object} props
 * @param {import('react').ReactNode} props.children
 */
export function ThemeProvider({ children }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {children}
    </NextThemesProvider>
  );
}
