// Light/dark mode — mirrors AuthContext.js's shape (a provider + a hook,
// persisted to the device). "System" tracks the OS setting live; "light"/
// "dark" are explicit overrides that stick until changed again.
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Appearance } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { darkColors, lightColors } from "../theme";

const ThemeContext = createContext(null);
const MODE_KEY = "pickly_theme_mode"; // "system" | "light" | "dark"

export function ThemeProvider({ children }) {
  const [mode, setModeState] = useState("dark"); // sane default before storage loads
  const [systemScheme, setSystemScheme] = useState(() => Appearance.getColorScheme() || "dark");

  useEffect(() => {
    AsyncStorage.getItem(MODE_KEY).then((saved) => {
      if (saved === "light" || saved === "dark" || saved === "system") setModeState(saved);
    });
    const sub = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemScheme(colorScheme || "dark");
    });
    return () => sub.remove();
  }, []);

  function setMode(next) {
    setModeState(next);
    AsyncStorage.setItem(MODE_KEY, next).catch(() => {});
  }

  const resolvedScheme = mode === "system" ? systemScheme : mode;
  const colors = useMemo(
    () => (resolvedScheme === "light" ? lightColors : darkColors),
    [resolvedScheme]
  );

  return (
    <ThemeContext.Provider value={{ colors, mode, scheme: resolvedScheme, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
