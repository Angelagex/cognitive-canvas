import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { AppThemeId, AppThemeConfig, APP_THEMES } from "./AppTheme";
import { getUserPreferences, saveUserPreferences } from "../services/StorageService";

interface AppThemeContextValue {
  themeId: AppThemeId;
  theme: AppThemeConfig;
  setAppTheme: (id: AppThemeId) => void;
}

const AppThemeContext = createContext<AppThemeContextValue>({
  themeId: "cobalto_crema",
  theme: APP_THEMES.cobalto_crema,
  setAppTheme: () => {},
});

export const AppThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themeId, setThemeIdState] = useState<AppThemeId>("cobalto_crema");

  useEffect(() => {
    getUserPreferences().then((prefs) => {
      if (prefs?.app_theme && APP_THEMES[prefs.app_theme as AppThemeId]) {
        setThemeIdState(prefs.app_theme as AppThemeId);
      }
    });
  }, []);

  const setAppTheme = useCallback((id: AppThemeId) => {
    setThemeIdState(id);
    saveUserPreferences({ app_theme: id });
  }, []);

  const value: AppThemeContextValue = {
    themeId,
    theme: APP_THEMES[themeId] || APP_THEMES.cobalto_crema,
    setAppTheme,
  };

  return <AppThemeContext.Provider value={value}>{children}</AppThemeContext.Provider>;
};

export const useAppTheme = () => useContext(AppThemeContext);

