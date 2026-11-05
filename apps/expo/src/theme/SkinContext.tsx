import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { SkinId, Skin, skins, canvasPapers, CanvasPaperPreset, theme as vinkTheme } from "./vink-theme";
import { getUserPreferences, saveUserPreferences } from "../services/StorageService";

export interface SkinContextValue {
  skinId: SkinId;
  skinActivo: SkinId;
  skin: Skin;
  canvasPaper: (typeof canvasPapers)[keyof typeof canvasPapers];
  setSkin: (id: SkinId) => void;
  setSkinActivo: (id: SkinId) => void;
  theme: typeof vinkTheme;
}

const SkinContext = createContext<SkinContextValue>({
  skinId: "noche",
  skinActivo: "noche",
  skin: skins.noche,
  canvasPaper: canvasPapers.noche,
  setSkin: () => {},
  setSkinActivo: () => {},
  theme: vinkTheme,
});

export const SkinProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [skinId, setSkinIdState] = useState<SkinId>("noche");

  useEffect(() => {
    getUserPreferences().then((prefs) => {
      // Map legacy theme IDs if present
      if (prefs?.app_skin && skins[prefs.app_skin as SkinId]) {
        setSkinIdState(prefs.app_skin as SkinId);
      } else if (prefs?.app_theme === "tinta_papel") {
        setSkinIdState("tinta");
      } else if (prefs?.app_theme === "cobalto_crema") {
        setSkinIdState("noche");
      }
    });
  }, []);

  const setSkin = useCallback((id: SkinId) => {
    setSkinIdState(id);
    saveUserPreferences({ app_skin: id });
  }, []);

  const currentSkin = useMemo(() => skins[skinId] || skins.noche, [skinId]);
  const currentPaper = useMemo(() => canvasPapers[skinId] || canvasPapers.noche, [skinId]);

  const value: SkinContextValue = useMemo(
    () => ({
      skinId,
      skinActivo: skinId,
      skin: currentSkin,
      canvasPaper: currentPaper,
      setSkin,
      setSkinActivo: setSkin,
      theme: vinkTheme,
    }),
    [skinId, currentSkin, currentPaper, setSkin]
  );

  return <SkinContext.Provider value={value}>{children}</SkinContext.Provider>;
};

export const useSkin = () => useContext(SkinContext);

