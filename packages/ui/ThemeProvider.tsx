"use client";
import React, { ReactNode } from 'react';
import { ThemeProvider as NextThemesProvider, useTheme as useNextTheme } from 'next-themes';
import { themes, defaultTheme, type Theme, type ResolvedTheme } from './themes';

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  return (
    <NextThemesProvider
      attribute="data-theme"
      defaultTheme={defaultTheme}
      enableSystem={true}
      storageKey="theme"
      themes={[...themes]}
      disableTransitionOnChange={false}
    >
      {children}
    </NextThemesProvider>
  );
};

export const useTheme = () => {
  const { theme, setTheme, systemTheme, resolvedTheme } = useNextTheme();

  return {
    theme: theme as Theme,
    setTheme: (newTheme: Theme) => setTheme(newTheme),
    systemTheme,
    resolvedTheme: resolvedTheme as ResolvedTheme,
  };
};
