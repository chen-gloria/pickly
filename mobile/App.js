import React from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "./src/context/AuthContext";
import { ThemeProvider, useTheme } from "./src/context/ThemeContext";
import RootNavigator from "./src/navigation/RootNavigator";

// expo-status-bar's `style` names the icon color, not the bar's own
// background — "light" icons for a dark screen, "dark" icons for a light one.
function ThemedStatusBar() {
  const { scheme } = useTheme();
  return <StatusBar style={scheme === "light" ? "dark" : "light"} />;
}

export default function App() {
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
