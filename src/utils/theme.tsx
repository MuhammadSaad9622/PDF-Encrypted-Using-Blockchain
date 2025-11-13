import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Theme = 'dark' | 'light';
export type ColorScheme = 'purple-pink' | 'blue-purple' | 'green-blue' | 'orange-red' | 'cyan-purple';

interface ThemeContextType {
  theme: Theme;
  colorScheme: ColorScheme;
  setTheme: (theme: Theme) => void;
  setColorScheme: (scheme: ColorScheme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

const colorSchemes: Record<ColorScheme, { 
  primary: string; 
  secondary: string; 
  gradient: string;
  light: string;
  medium: string;
  dark: string;
  text: string;
}> = {
  'purple-pink': {
    primary: 'from-purple-600 to-pink-500',
    secondary: 'from-purple-500 to-pink-500',
    gradient: 'from-purple-600 to-pink-500',
    light: 'from-purple-400 to-pink-400',
    medium: 'from-purple-500 to-pink-500',
    dark: 'from-purple-900/20 to-pink-900/20',
    text: 'from-purple-400 to-pink-400',
  },
  'blue-purple': {
    primary: 'from-blue-600 to-purple-500',
    secondary: 'from-blue-500 to-purple-500',
    gradient: 'from-blue-600 to-purple-500',
    light: 'from-blue-400 to-purple-400',
    medium: 'from-blue-500 to-purple-500',
    dark: 'from-blue-900/20 to-purple-900/20',
    text: 'from-blue-400 to-purple-400',
  },
  'green-blue': {
    primary: 'from-green-500 to-blue-500',
    secondary: 'from-green-400 to-blue-400',
    gradient: 'from-green-500 to-blue-500',
    light: 'from-green-400 to-blue-400',
    medium: 'from-green-500 to-blue-500',
    dark: 'from-green-900/20 to-blue-900/20',
    text: 'from-green-400 to-blue-400',
  },
  'orange-red': {
    primary: 'from-orange-500 to-red-500',
    secondary: 'from-orange-400 to-red-400',
    gradient: 'from-orange-500 to-red-500',
    light: 'from-orange-400 to-red-400',
    medium: 'from-orange-500 to-red-500',
    dark: 'from-orange-900/20 to-red-900/20',
    text: 'from-orange-400 to-red-400',
  },
  'cyan-purple': {
    primary: 'from-cyan-500 to-purple-500',
    secondary: 'from-cyan-400 to-purple-400',
    gradient: 'from-cyan-500 to-purple-500',
    light: 'from-cyan-400 to-purple-400',
    medium: 'from-cyan-500 to-purple-500',
    dark: 'from-cyan-900/20 to-purple-900/20',
    text: 'from-cyan-400 to-purple-400',
  },
};

// Helper function to get gradient classes
export const getGradientClasses = (scheme: ColorScheme, variant: 'primary' | 'secondary' | 'light' | 'medium' | 'dark' | 'text' = 'primary') => {
  return colorSchemes[scheme][variant];
};

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = localStorage.getItem('theme');
    return (saved as Theme) || 'dark';
  });

  const [colorScheme, setColorSchemeState] = useState<ColorScheme>(() => {
    const saved = localStorage.getItem('colorScheme');
    return (saved as ColorScheme) || 'purple-pink';
  });

  useEffect(() => {
    localStorage.setItem('theme', theme);
    document.documentElement.classList.toggle('light', theme === 'light');
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('colorScheme', colorScheme);
    // Remove old color scheme classes
    Object.keys(colorSchemes).forEach(scheme => {
      document.documentElement.classList.remove(`color-scheme-${scheme}`);
    });
    // Add new color scheme class
    document.documentElement.classList.add(`color-scheme-${colorScheme}`);
  }, [colorScheme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  const setColorScheme = (newScheme: ColorScheme) => {
    setColorSchemeState(newScheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, colorScheme, setTheme, setColorScheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export { colorSchemes };

