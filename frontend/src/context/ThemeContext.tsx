import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserSettings } from '../types';
import { api } from '../services/api';

interface ThemeContextType {
  theme: 'light' | 'dark' | 'system';
  colorTheme: 'blue' | 'emerald' | 'violet' | 'slate';
  highContrast: boolean;
  fontSize: 'small' | 'medium' | 'large';
  compactTables: boolean;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setColorTheme: (colorTheme: 'blue' | 'emerald' | 'violet' | 'slate') => void;
  setHighContrast: (contrast: boolean) => void;
  setFontSize: (size: 'small' | 'medium' | 'large') => void;
  setCompactTables: (compact: boolean) => void;
  syncFromBackend: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<'light' | 'dark' | 'system'>(() => {
    return (localStorage.getItem('pref_theme') as any) || 'light';
  });
  const [colorTheme, setColorThemeState] = useState<'blue' | 'emerald' | 'violet' | 'slate'>(() => {
    return (localStorage.getItem('pref_color_theme') as any) || 'blue';
  });
  const [highContrast, setHighContrastState] = useState<boolean>(() => {
    return localStorage.getItem('pref_contrast') === 'true';
  });
  const [fontSize, setFontSizeState] = useState<'small' | 'medium' | 'large'>(() => {
    return (localStorage.getItem('pref_font_size') as any) || 'medium';
  });
  const [compactTables, setCompactTablesState] = useState<boolean>(() => {
    return localStorage.getItem('pref_compact') === 'true';
  });

  const applyDomClasses = () => {
    const root = document.documentElement;
    
    // Theme mode
    let isDark = theme === 'dark';
    if (theme === 'system') {
      isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // Color theme
    root.setAttribute('data-color-theme', colorTheme);

    // High contrast
    if (highContrast) {
      root.classList.add('contrast-high');
    } else {
      root.classList.remove('contrast-high');
    }

    // Font size
    root.setAttribute('data-font-size', fontSize);
    
    // Compact table
    if (compactTables) {
      root.classList.add('compact-view');
    } else {
      root.classList.remove('compact-view');
    }
  };

  useEffect(() => {
    applyDomClasses();
  }, [theme, colorTheme, highContrast, fontSize, compactTables]);

  const setTheme = (t: 'light' | 'dark' | 'system') => {
    setThemeState(t);
    localStorage.setItem('pref_theme', t);
    saveToBackend({ theme: t });
  };

  const setColorTheme = (ct: 'blue' | 'emerald' | 'violet' | 'slate') => {
    setColorThemeState(ct);
    localStorage.setItem('pref_color_theme', ct);
  };

  const setHighContrast = (hc: boolean) => {
    setHighContrastState(hc);
    localStorage.setItem('pref_contrast', hc.toString());
    saveToBackend({ high_contrast: hc });
  };

  const setFontSize = (fs: 'small' | 'medium' | 'large') => {
    setFontSizeState(fs);
    localStorage.setItem('pref_font_size', fs);
    saveToBackend({ font_size: fs });
  };

  const setCompactTables = (c: boolean) => {
    setCompactTablesState(c);
    localStorage.setItem('pref_compact', c.toString());
    saveToBackend({ compact_tables: c });
  };

  const saveToBackend = async (data: Partial<UserSettings>) => {
    try {
      if (localStorage.getItem('hostel_token')) {
        await api.updateUserSettings(data);
      }
    } catch {
      // Non-blocking
    }
  };

  const syncFromBackend = async () => {
    try {
      if (localStorage.getItem('hostel_token')) {
        const s = await api.getUserSettings();
        setThemeState(s.theme);
        setHighContrastState(s.high_contrast);
        setFontSizeState(s.font_size);
        setCompactTablesState(s.compact_tables);
        localStorage.setItem('pref_theme', s.theme);
        localStorage.setItem('pref_contrast', s.high_contrast.toString());
        localStorage.setItem('pref_font_size', s.font_size);
        localStorage.setItem('pref_compact', s.compact_tables.toString());
      }
    } catch {
      // Non-blocking
    }
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        colorTheme,
        highContrast,
        fontSize,
        compactTables,
        setTheme,
        setColorTheme,
        setHighContrast,
        setFontSize,
        setCompactTables,
        syncFromBackend,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
