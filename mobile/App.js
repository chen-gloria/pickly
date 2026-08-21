import React, { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "./src/context/AuthContext";
import { ThemeProvider, useTheme } from "./src/context/ThemeContext";
import RootNavigator from "./src/navigation/RootNavigator";
import { startVersionCheck } from "./src/utils/versionCheck";

// expo-status-bar's `style` names the icon color, not the bar's own
// background — "light" icons for a dark screen, "dark" icons for a light one.
function ThemedStatusBar() {
  const { scheme } = useTheme();
  return <StatusBar style={scheme === "light" ? "dark" : "light"} />;
}

export default function App() {
  // A backgrounded-and-resumed PWA can otherwise keep running whatever JS
  // it booted with indefinitely, silently missing every deploy since — see
  // utils/versionCheck.js for the full reasoning. No-op on native.
  useEffect(() => startVersionCheck(), []);

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <ThemedStatusBar />
          <RootNavigator />
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
