import { useEffect, useState } from "react";
import { useColorScheme } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { DARK, LIGHT, ThemeContext, type ThemeMode } from "../src/theme";
import { getThemeMode, setThemeMode as persistMode } from "../src/session";
// Registra a task de localização em background.
import "../src/location";

export default function RootLayout() {
  const system = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode | null>(null);

  useEffect(() => {
    (async () => {
      const stored = await getThemeMode();
      setModeState(stored ?? (system === "light" ? "light" : "dark"));
    })();
  }, []);

  const effective: ThemeMode = mode ?? (system === "light" ? "light" : "dark");
  const colors = effective === "light" ? LIGHT : DARK;

  function setMode(m: ThemeMode) {
    setModeState(m);
    persistMode(m);
  }

  return (
    <ThemeContext.Provider value={{ mode: effective, colors, setMode }}>
      <StatusBar style={effective === "light" ? "dark" : "light"} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.ink },
          headerTintColor: colors.paper,
          headerTitleStyle: { fontWeight: "800" },
          contentStyle: { backgroundColor: colors.ink },
        }}
      >
        <Stack.Screen name="index" options={{ title: "Stop Rotas", headerShown: false }} />
        <Stack.Screen name="worker" options={{ title: "Expediente" }} />
        <Stack.Screen name="summary" options={{ title: "Comprovante" }} />
        <Stack.Screen name="(admin)" options={{ headerShown: false }} />
      </Stack>
    </ThemeContext.Provider>
  );
}
